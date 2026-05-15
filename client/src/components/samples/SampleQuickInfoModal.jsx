import React, { useState, useEffect, useRef } from 'react';
import { Modal, Row, Col, Badge, Spinner, Alert, Card, Button, Form, InputGroup } from 'react-bootstrap';
import { User, FlaskConical, MapPin, Building, Activity, FileText, Calendar, Beaker, Link as LinkIcon, ScanBarcode, Search, Smartphone } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../utils/dateFormatter';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/ToastContext';
import MobileScannerBridge from '../scanner/MobileScannerBridge';

const SampleQuickInfoModal = ({ show, onHide, initialBarcode }) => {
  const [barcodeData, setBarcodeData] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [sampleData, setSampleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(true);
  const [useMobileScanner, setUseMobileScanner] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef(null);
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (show) {
      // Focus input when modal opens
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
      
      if (initialBarcode) {
        setManualInput(initialBarcode);
        fetchSampleData(initialBarcode);
      }
    }
  }, [show, initialBarcode]);

  useEffect(() => {
    if (!show) {
      setBarcodeData('');
      setManualInput('');
      setSampleData(null);
      setError(null);
      setIsScanning(true);
      setUseMobileScanner(false);
      return;
    }

    let timeout;
    const handleKeyDown = (e) => {
      if (!isScanning || useMobileScanner) return;
      
      // If user is typing in the manual input, let them
      if (document.activeElement === inputRef.current) return;

      // Ignore input if it's coming from an actual input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Enter') {
        if (barcodeData.trim() !== '') {
          setManualInput(barcodeData.trim());
          fetchSampleData(barcodeData.trim());
          setBarcodeData('');
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setBarcodeData(prev => prev + e.key);
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          setBarcodeData('');
        }, 150); // Scanner speed is fast, 150ms should be enough
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [show, barcodeData, isScanning, useMobileScanner]);

  const fetchSampleData = async (barcode) => {
    if (!barcode || !barcode.trim()) return;
    
    setLoading(true);
    setError(null);
    setIsScanning(false);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${apiUrl}/tracked-samples/lookup/${barcode.trim()}`, { headers });
      setSampleData(response.data);
      if (useMobileScanner) setUseMobileScanner(false);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Sample not found or an error occurred.';
      setError(errorMsg);
      toast.error(errorMsg);
      setSampleData(null);
    } finally {
      setLoading(false);
      setIsScanning(true);
      // Refocus input for next scan
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    fetchSampleData(manualInput);
  };

  const handleNavigateToReport = () => {
    if (sampleData?.report?.id) {
      onHide();
      const rolePrefix = user?.role || 'admin';
      navigate(`/${rolePrefix}/medical-reports/${sampleData.report.id}`);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending Collection': return <Badge bg="warning" className="text-dark">Pending Collection</Badge>;
      case 'Collected': return <Badge bg="info" className="text-dark">Collected</Badge>;
      case 'Dispatched': return <Badge bg="primary">Dispatched</Badge>;
      case 'In Process': return <Badge bg="secondary">In Process</Badge>;
      case 'Completed': return <Badge bg="success">Completed</Badge>;
      case 'Rejected': return <Badge bg="danger">Rejected</Badge>;
      default: return <Badge bg="secondary" className="bg-opacity-10 text-theme">{status}</Badge>;
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static" animation={false}>
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title className="d-flex align-items-center">
          <ScanBarcode className="me-2" size={24} />
          Sample Quick Info
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-body-tertiary">
        {!useMobileScanner ? (
          <div className="mb-4">
            <Form onSubmit={handleManualSubmit}>
              <Form.Label className="small fw-bold text-muted d-flex justify-content-between">
                SCANNER INPUT
                <Button 
                  variant="link" 
                  className="p-0 text-decoration-none small d-flex align-items-center"
                  onClick={() => setUseMobileScanner(true)}
                >
                  <Smartphone size={14} className="me-1" /> Use Phone as Scanner
                </Button>
              </Form.Label>
              <InputGroup>
                <InputGroup.Text className="bg-body">
                  <ScanBarcode size={18} className="text-primary" />
                </InputGroup.Text>
                <Form.Control
                  ref={inputRef}
                  type="text"
                  placeholder="Scan barcode or type manually..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  autoFocus
                />
                <Button type="submit" variant="primary" disabled={loading || !manualInput.trim()}>
                  <Search size={18} className="me-1" /> Search
                </Button>
              </InputGroup>
              <Form.Text className="text-muted small ms-1">
                Ensure physical scanner is active, or type ID and press Enter.
              </Form.Text>
            </Form>
          </div>
        ) : (
          <div className="mb-4">
            <MobileScannerBridge 
              onScan={(data) => {
                setManualInput(data);
                fetchSampleData(data);
              }}
              onClose={() => setUseMobileScanner(false)}
            />
          </div>
        )}

        {loading && (
          <div className="d-flex flex-column justify-content-center align-items-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 text-muted">Fetching sample data...</p>
          </div>
        )}

        {error && (
          <Alert variant="danger" className="d-flex align-items-center">
            <Activity className="me-2" />
            {error}
          </Alert>
        )}

        {!loading && !sampleData && !error && (
          <div className="text-center py-5 text-muted">
            <ScanBarcode size={64} className="mb-3 opacity-50" />
            <h5>Ready to Scan</h5>
            <p>Scan a sample barcode to view its details.</p>
          </div>
        )}

        {!loading && sampleData && (
          <div className="sample-details">
            <Row className="g-3">
              {/* Patient Section */}
              <Col md={6}>
                <Card className="h-100 shadow-sm border-0 bg-body">
                  <Card.Header className="bg-transparent border-bottom-0 pt-3">
                    <h6 className="mb-0 text-primary d-flex align-items-center">
                      <User size={18} className="me-2" />
                      Patient Details
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <p className="mb-1"><strong>Name:</strong> {sampleData.patient?.name}</p>
                    <p className="mb-1"><strong>ID:</strong> {sampleData.patient?.id}</p>
                    <p className="mb-1"><strong>Phone:</strong> {sampleData.patient?.phone}</p>
                    <p className="mb-1">
                      <strong>Age/Sex:</strong> {sampleData.patient?.age} / {sampleData.patient?.sex}
                    </p>
                  </Card.Body>
                </Card>
              </Col>

              {/* Lab Section */}
              <Col md={6}>
                <Card className="h-100 shadow-sm border-0 bg-body">
                  <Card.Header className="bg-transparent border-bottom-0 pt-3">
                    <h6 className="mb-0 text-primary d-flex align-items-center">
                      <Building size={18} className="me-2" />
                      Lab Details
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <p className="mb-1"><strong>Branch:</strong> {sampleData.lab?.branch_name}</p>
                    {sampleData.test?.lab_to_lab_status === 'OUT' && (
                      <div className="mt-2 p-2 bg-light border rounded text-danger">
                        <strong>Outsourced To:</strong> {sampleData.test?.lab_name}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              {/* Sample & Test Section */}
              <Col md={12}>
                <Card className="shadow-sm border-0 mt-2 bg-body">
                  <Card.Header className="bg-transparent border-bottom-0 pt-3 d-flex justify-content-between align-items-center">
                    <h6 className="mb-0 text-primary d-flex align-items-center">
                      <FlaskConical size={18} className="me-2" />
                      Sample & Test Information
                    </h6>
                    {getStatusBadge(sampleData.sample?.status)}
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col sm={6}>
                        <p className="mb-1"><strong>Sample ID:</strong> {sampleData.sample?.id}</p>
                        <p className="mb-1"><strong>Type:</strong> {sampleData.sample?.type}</p>
                      </Col>
                      <Col sm={6}>
                        <p className="mb-1"><strong>Test Name:</strong> {sampleData.test?.name}</p>
                        <p className="mb-1 d-flex align-items-center">
                          <strong>Medical Report:</strong>
                          <Button 
                            variant="link" 
                            className="p-0 ms-2 d-flex align-items-center"
                            onClick={handleNavigateToReport}
                          >
                            #{sampleData.report?.id}
                            <LinkIcon size={14} className="ms-1" />
                          </Button>
                        </p>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>

              {/* Status Timeline Section */}
              <Col md={12}>
                <Card className="shadow-sm border-0 mt-2 bg-body">
                  <Card.Header className="bg-transparent border-bottom-0 pt-3">
                    <h6 className="mb-0 text-primary d-flex align-items-center">
                      <Activity size={18} className="me-2" />
                      Status Timeline
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <div className="d-flex flex-wrap gap-2">
                      {sampleData.sample?.status_history && Object.entries(sampleData.sample.status_history).map(([key, value]) => {
                        if (!value) return null;
                        const label = key.replace('_at', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                        return (
                          <div key={key} className="p-2 border rounded bg-body-tertiary">
                            <small className="d-block text-muted">{label}</small>
                            <strong>{formatDate(value, true)}</strong>
                          </div>
                        );
                      })}
                      {!sampleData.sample?.status_history || Object.keys(sampleData.sample.status_history).filter(k => sampleData.sample.status_history[k]).length === 0 ? (
                        <span className="text-muted">No history available</span>
                      ) : null}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SampleQuickInfoModal;