import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import { TestTube, Receipt, FileText, FlaskConical } from "lucide-react";
import axios from "axios";

const AddSampleModal = ({
  show,
  onHide,
  onAdd,
  initialReportId = "",
  initialInvoiceId = "",
  initialTestId = ""
}) => {
  const [formData, setFormData] = useState({
    medical_report_id: initialReportId,
    invoice_id: initialInvoiceId,
    test_id: initialTestId,
    sample_type_id: ""
  });
  const [sampleTypes, setSampleTypes] = useState([]);
  const [availableTests, setAvailableTests] = useState([]);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (show) {
      setFormData({
        medical_report_id: initialReportId,
        invoice_id: initialInvoiceId,
        test_id: initialTestId,
        sample_type_id: ""
      });
      setError("");
      setAvailableTests([]);
      
      // Fetch sample types
      const fetchSampleTypes = async () => {
        try {
          const token = localStorage.getItem("token");
          const apiUrl = import.meta.env.VITE_API_URL;
          const response = await axios.get(`${apiUrl}/samples`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setSampleTypes(response.data);
        } catch (err) {
          console.error("Failed to fetch sample types", err);
        }
      };
      fetchSampleTypes();

      if (initialReportId) {
        fetchReportDetails(initialReportId);
      }
    }
  }, [show, initialReportId, initialInvoiceId, initialTestId]);

  const fetchReportDetails = async (reportId) => {
    if (!reportId) return;
    setIsLoadingReport(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.get(`${apiUrl}/medical-reports/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const report = response.data;
      setAvailableTests(report.tests || []);
      
      // Auto-fill invoice ID if available
      if (report.bill_id || report.invoice_id) {
        setFormData(prev => ({
          ...prev,
          invoice_id: report.invoice_id || report.bill_id
        }));
      }
    } catch (err) {
      console.error("Failed to fetch report details", err);
      setError("Could not find medical report details. Please check the ID.");
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    if (name === "medical_report_id" && value) {
      // debounce or fetch on blur would be better, but let's do a simple check
      if (value.length >= 1) {
        fetchReportDetails(value);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Now invoice_id and test_id are optional if they can be inferred, 
    // but the backend still needs them or will auto-fill.
    // We enforce medical_report_id at minimum.
    if (!formData.medical_report_id || !formData.test_id) {
      setError("Medical Report ID and Test are required.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem("token");
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const response = await axios.post(`${apiUrl}/tracked-samples`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      onAdd(response.data);
      onHide();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add sample. Please check the details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static" size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center text-primary">
          <TestTube size={24} className="me-2" />
          Add New Sample
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <p className="text-muted mb-4">
            Enter the Medical Report ID. We'll automatically fetch the associated tests and invoice details.
          </p>

          <div className="row">
            <div className="col-md-12">
              <Form.Group className="mb-3">
                <Form.Label className="d-flex align-items-center">
                  <FileText size={16} className="me-2" />
                  Medical Report ID
                </Form.Label>
                <Form.Control
                  type="text"
                  name="medical_report_id"
                  value={formData.medical_report_id}
                  onChange={handleChange}
                  onBlur={() => fetchReportDetails(formData.medical_report_id)}
                  placeholder="e.g. 101"
                  readOnly={!!initialReportId}
                  required
                />
                {isLoadingReport && <Form.Text className="text-primary">Loading report details...</Form.Text>}
              </Form.Group>
            </div>
          </div>

          <Form.Group className="mb-3">
            <Form.Label className="d-flex align-items-center">
              <TestTube size={16} className="me-2" />
              Select Test(s)
            </Form.Label>
            {availableTests.length > 0 ? (
              <Form.Select
                name="test_id"
                value={formData.test_id}
                onChange={handleChange}
                required
              >
                <option value="">Select a test...</option>
                {availableTests.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Form.Select>
            ) : (
              <Form.Control
                type="text"
                name="test_id"
                value={formData.test_id}
                onChange={handleChange}
                placeholder="Enter Test ID manually if not found"
              />
            )}
            <Form.Text className="text-muted">
              Choose the specific test for this sample.
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="d-flex align-items-center">
              <FlaskConical size={16} className="me-2" />
              Sample Type
            </Form.Label>
            <Form.Select
              name="sample_type_id"
              value={formData.sample_type_id}
              onChange={handleChange}
            >
              <option value="">Auto-detect from test (preferred)</option>
              {sampleTypes.map(st => (
                <option key={st.id} value={st.id}>{st.type}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting || isLoadingReport}>
            {isSubmitting ? "Creating..." : "Add Sample"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default AddSampleModal;
