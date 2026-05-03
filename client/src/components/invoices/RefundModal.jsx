import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Form, Alert, Row, Col, ListGroup, Card, InputGroup } from 'react-bootstrap';
import { useToast } from '../ui/ToastContext';
import { formatDate } from '../../utils/dateFormatter';
import { RefreshCcw, AlertTriangle, ShieldCheck, History, CheckCircle, KeyRound } from 'lucide-react';
import axios from 'axios';

const RefundModal = ({ show, onHide, invoice, onRefundProcessed }) => {
  const { toast, showConfirm } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState({ tests: [], packages: [] });
  const [amountLabPays, setAmountLabPays] = useState('0');
  const [isSure, setIsSure] = useState(false);
  const [authKey, setAuthKey] = useState('');

  // Calculate invoice age
  const isOlderThan24Hours = useMemo(() => {
    if (!invoice?.date) return false;
    const createdDate = new Date(invoice.date);
    const now = new Date();
    const diffInHours = (now - createdDate) / (1000 * 60 * 60);
    return diffInHours > 24;
  }, [invoice]);

  // Reset state when modal opens
  useEffect(() => {
    if (show) {
      setSelectedItems({ tests: [], packages: [] });
      setAmountLabPays('0');
      setIsSure(false);
      setAuthKey('');
    }
  }, [show]);

  const toggleItemSelection = (type, item) => {
    setSelectedItems(prev => {
      const currentList = prev[type];
      const isSelected = currentList.find(i => i.id === item.id);
      
      if (isSelected) {
        return { ...prev, [type]: currentList.filter(i => i.id !== item.id) };
      } else {
        return { ...prev, [type]: [...currentList, item] };
      }
    });
  };

  // Calculations
  const totalRefundableAmount = useMemo(() => {
    const testTotal = selectedItems.tests.reduce((sum, item) => sum + parseFloat(item.price || 0), 0);
    const packageTotal = selectedItems.packages.reduce((sum, item) => sum + parseFloat(item.price || 0), 0);
    return testTotal + packageTotal;
  }, [selectedItems]);

  const currentInvoiceCredit = useMemo(() => {
    // Overpayment (negative due)
    const due = parseFloat(invoice?.due || 0);
    return due < 0 ? Math.abs(due) : 0;
  }, [invoice]);

  const currentInvoiceDebt = useMemo(() => {
    // Unpaid balance (positive due)
    const due = parseFloat(invoice?.due || 0);
    return due > 0 ? due : 0;
  }, [invoice]);

  const totalRefundDue = Math.max(0, totalRefundableAmount + currentInvoiceCredit - currentInvoiceDebt);
  const creditToAdd = Math.max(0, totalRefundDue - amountLabPays);

  const handleRefund = async () => {
    if (totalRefundDue <= 0) {
      toast.error('Please select items or use invoice credit to refund');
      return;
    }

    const payout = parseFloat(amountLabPays) || 0;
    if (payout > totalRefundDue) {
      toast.error(`Payout amount cannot exceed the total refund due (EGP ${totalRefundDue.toFixed(2)})`);
      return;
    }

    if (isOlderThan24Hours && !isSure) {
      toast.error('Please confirm you are sure you want to process this refund');
      return;
    }

    // Confirmation workflow
    const confirmOptions = {
      title: 'Confirm Refund Transaction',
      message: (
        <div>
          <p>You are about to process a refund for <strong>{invoice.patient_name}</strong>.</p>
          <div className="bg-light p-3 rounded mb-3 border-start border-4 border-primary shadow-sm">
            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted">Refund Amount:</span>
              <span className="fw-bold">EGP {totalRefundDue.toFixed(2)}</span>
            </div>
            <div className="d-flex justify-content-between mb-2 border-top pt-2">
              <span className="text-muted">Lab Payout (Cash):</span>
              <span className="fw-bold text-danger">EGP {parseFloat(amountLabPays).toFixed(2)}</span>
            </div>
            {creditToAdd > 0 && (
              <div className="d-flex justify-content-between text-success mt-1">
                <span className="text-muted small">Added to Patient Credit:</span>
                <span className="fw-bold small">EGP {creditToAdd.toFixed(2)}</span>
              </div>
            )}
          </div>
          <p className="small text-muted mb-0">Please type <strong>Confirm Refund</strong> below to proceed.</p>
        </div>
      ),
      type: 'warning',
      confirmText: 'Process Refund',
      requireMatch: 'Confirm Refund',
    };

    const result = await showConfirm(confirmOptions);

    if (result === true || (result && result.confirmed)) {
      setLoading(true);
      try {
        const payload = {
          items: selectedItems,
          amountLabPays: parseFloat(amountLabPays) || 0,
          creditAdded: creditToAdd,
          // Auth key is collected from the modal state (not the confirm popup)
          authKey: isOlderThan24Hours ? authKey : null
        };

        /* 
        TODO: IMPLEMENT BACKEND API CALL
        await axios.post(`${import.meta.env.VITE_API_URL}/invoices/${invoice.id}/refund`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        */
        
        toast.success('Refund processed successfully');
        onRefundProcessed && onRefundProcessed();
        onHide();
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to process refund');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      size="lg" 
      centered 
      backdrop="static"
      enforceFocus={false}
    >
      <Modal.Header closeButton className="bg-primary text-white" data-bs-theme="dark">
        <Modal.Title className="d-flex align-items-center">
          <RefreshCcw className="me-2" />
          Invoice Refund - #{invoice?.id}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        {isOlderThan24Hours && (
          <Alert variant="warning" className="d-flex align-items-center border-0 shadow-sm mb-4">
            <AlertTriangle className="me-3 fs-3 text-warning" />
            <div>
              <strong className="text-dark">Manager Authorization Required</strong>
              <br />
              <span className="small text-muted">
                This invoice was created more than 24 hours ago ({formatDate(new Date(invoice.date))}).
                Manager authorization key will be required for confirmation.
              </span>
            </div>
          </Alert>
        )}

        <Row className="mb-4">
          <Col md={7}>
            <h6 className="text-uppercase small fw-bold text-muted mb-3 ls-wide">Select Items to Refund</h6>
            <Card className="border-0 shadow-sm overflow-hidden">
              <ListGroup variant="flush">
                {invoice?.tests?.map(test => (
                  <ListGroup.Item 
                    key={`test-${test.id}`}
                    className={`d-flex justify-content-between align-items-center py-3 px-3 cursor-pointer hover-bg-light ${selectedItems.tests.find(i => i.id === test.id) ? 'bg-light-blue border-start border-4 border-primary' : ''}`}
                    onClick={() => toggleItemSelection('tests', test)}
                  >
                    <div className="d-flex align-items-center">
                      <Form.Check 
                        type="checkbox"
                        checked={!!selectedItems.tests.find(i => i.id === test.id)}
                        onChange={() => {}} // Controlled component
                        onClick={(e) => e.stopPropagation()}
                        className="me-3"
                      />
                      <div>
                        <div className="fw-bold">{test.name}</div>
                        <div className="text-muted small">Test Item</div>
                      </div>
                    </div>
                    <div className="fw-bold text-primary">EGP {parseFloat(test.price).toFixed(2)}</div>
                  </ListGroup.Item>
                ))}
                {invoice?.packages?.map(pkg => (
                  <ListGroup.Item 
                    key={`pkg-${pkg.id}`}
                    className={`d-flex justify-content-between align-items-center py-3 px-3 cursor-pointer hover-bg-light ${selectedItems.packages.find(i => i.id === pkg.id) ? 'bg-light-blue border-start border-4 border-primary' : ''}`}
                    onClick={() => toggleItemSelection('packages', pkg)}
                  >
                    <div className="d-flex align-items-center">
                      <Form.Check 
                        type="checkbox"
                        checked={!!selectedItems.packages.find(i => i.id === pkg.id)}
                        onChange={() => {}} // Controlled component
                        onClick={(e) => e.stopPropagation()}
                        className="me-3"
                      />
                      <div>
                        <div className="fw-bold">{pkg.name}</div>
                        <div className="text-muted small">Package Item</div>
                      </div>
                    </div>
                    <div className="fw-bold text-primary">EGP {parseFloat(pkg.price).toFixed(2)}</div>
                  </ListGroup.Item>
                ))}
                {(!invoice?.tests?.length && !invoice?.packages?.length) && (
                  <div className="p-4 text-center text-muted">No refundable items found</div>
                )}
              </ListGroup>
            </Card>
          </Col>
          <Col md={5}>
            <h6 className="text-uppercase small fw-bold text-muted mb-3 ls-wide">Refund Summary</h6>
            <Card className="border-0 shadow-sm bg-light">
              <Card.Body className="p-4">
                <div className="mb-4">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Selected Items:</span>
                    <span className="fw-bold text-dark">EGP {totalRefundableAmount.toFixed(2)}</span>
                  </div>
                  {currentInvoiceCredit > 0 && (
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Invoice Overpayment (+):</span>
                      <span className="fw-bold text-success">EGP {currentInvoiceCredit.toFixed(2)}</span>
                    </div>
                  )}
                  {currentInvoiceDebt > 0 && (
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Unpaid Balance (-):</span>
                      <span className="fw-bold text-danger">EGP {currentInvoiceDebt.toFixed(2)}</span>
                    </div>
                  )}
                  <hr />
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fs-6 fw-bold">Total Refund:</span>
                    <span className="fs-5 fw-bold text-primary">EGP {totalRefundDue.toFixed(2)}</span>
                  </div>
                </div>

                <Form.Group className="mb-4">
                  <Form.Label className="small fw-bold">Amount Lab will pay now (Cash)</Form.Label>
                  <InputGroup>
                    <InputGroup.Text className="bg-white border-end-0">EGP</InputGroup.Text>
                    <Form.Control 
                      type="number"
                      step="0.01"
                      min="0"
                      max={totalRefundDue}
                      value={amountLabPays}
                      onChange={(e) => setAmountLabPays(e.target.value)}
                      onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                      className="border-start-0"
                    />
                  </InputGroup>
                  <Form.Text className="text-muted small">
                    Remaining <strong>EGP {creditToAdd.toFixed(2)}</strong> will be added to patient credit.
                  </Form.Text>
                </Form.Group>

                {isOlderThan24Hours && (
                  <Form.Group className="mb-3">
                    <Form.Check 
                      type="checkbox"
                      id="sure-checkbox"
                      label={<span className="small fw-bold text-danger">I am sure I want to process this refund</span>}
                      checked={isSure}
                      onChange={(e) => {
                        setIsSure(e.target.checked);
                        // Clear auth key when unchecking for security
                        if (!e.target.checked) setAuthKey('');
                      }}
                      className="user-select-none"
                    />
                  </Form.Group>
                )}

                {/* Authorization Key input — revealed only when the checkbox is checked */}
                {isOlderThan24Hours && isSure && (
                  <Form.Group className="mb-4">
                    <Form.Label className="small fw-bold d-flex align-items-center">
                      <KeyRound size={14} className="me-1 text-warning" />
                      Manager Authorization Key
                    </Form.Label>
                    <Form.Control 
                      type="password"
                      placeholder="Enter 16-digit authorization key"
                      value={authKey}
                      onChange={(e) => setAuthKey(e.target.value)}
                      autoFocus
                    />
                  </Form.Group>
                )}

                <div className="d-grid">
                  <Button 
                    variant="primary" 
                    size="lg" 
                    onClick={handleRefund}
                    disabled={loading || totalRefundDue <= 0 || (isOlderThan24Hours && (!isSure || !authKey.trim()))}
                    className="shadow-sm"
                  >
                    {loading ? 'Processing...' : 'Proceed to Confirm'}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Modal.Body>
    </Modal>
  );
};

export default RefundModal;
