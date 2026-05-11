import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Form, Alert, Row, Col, ListGroup, Card, InputGroup } from 'react-bootstrap';
import { useToast } from '../ui/ToastContext';
import { formatDate } from '../../utils/dateFormatter';
import { RefreshCcw, AlertTriangle, ShieldCheck, History, CheckCircle, KeyRound, Info } from 'lucide-react';
import axios from 'axios';
import { useLab } from '../../context/LabContext';

const RefundModal = ({ show, onHide, invoice, onRefundProcessed }) => {
  const { toast, showConfirm } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState({ tests: [], packages: [] });
  const [amountLabPays, setAmountLabPays] = useState('0');
  const [isSure, setIsSure] = useState(false);
  const [authKey, setAuthKey] = useState('');
  const [ignoreDue, setIgnoreDue] = useState(false);
  const [patientData, setPatientData] = useState(null);
  const [fetchingPatient, setFetchingPatient] = useState(false);

  const { getSetting } = useLab();
  const patientDueLimit = parseFloat(getSetting('patient_due_limit', 0));

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
      setIgnoreDue(false);
      
      if (invoice?.patient_id) {
        fetchPatientData();
      }
    }
  }, [show, invoice?.patient_id]);

  const fetchPatientData = async () => {
    setFetchingPatient(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/patient/${invoice.patient_id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPatientData(response.data);
    } catch (error) {
      console.error('Error fetching patient data:', error);
    } finally {
      setFetchingPatient(false);
    }
  };

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

  const patientTotalBalance = useMemo(() => {
    // Overall patient balance from fetched data
    // Falls back to current invoice due if data isn't fetched yet
    if (!patientData) {
      return parseFloat(invoice?.due || 0);
    }
    return parseFloat(patientData.due || 0);
  }, [patientData, invoice]);

  const isLimitExceeded = useMemo(() => {
    if (patientDueLimit <= 0 || !patientData) return false;
    return parseFloat(patientData.due || 0) > patientDueLimit;
  }, [patientDueLimit, patientData]);

  // Debt to subtract: if ignoreDue is true and balance is positive (debt), we ignore it.
  // We never ignore negative balance (overpayment/credit).
  const debtToSubtract = (ignoreDue && patientTotalBalance > 0) ? 0 : patientTotalBalance;
  
  const totalRefundDue = Math.max(0, totalRefundableAmount - debtToSubtract);
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
          <div className="bg-theme-inset p-3 rounded mb-3 border-start border-4 border-primary shadow-sm">
            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted">Refund Amount:</span>
              <span className="fw-bold">EGP {totalRefundDue.toFixed(2)}</span>
            </div>
            <div className="d-flex justify-content-between mb-2 border-top border-muted pt-2">
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
          ignoreDue: ignoreDue,
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
              <strong className="text-theme">Manager Authorization Required</strong>
              <br />
              <span className="small text-muted">
                This invoice was created more than 24 hours ago ({formatDate(new Date(invoice.date))}).
                Manager authorization key will be required for confirmation.
              </span>
            </div>
          </Alert>
        )}

        <Row className="mb-4 align-items-start">
          <Col md={7}>
            <h6 className="text-uppercase small fw-bold text-muted mb-3 ls-wide">Select Items to Refund</h6>
            <Card className="border-0 shadow-sm overflow-hidden">
              <ListGroup variant="flush">
                {invoice?.tests?.map(test => (
                  <ListGroup.Item 
                    key={`test-${test.id}`}
                    className={`d-flex justify-content-between align-items-center py-3 px-3 cursor-pointer ${selectedItems.tests.find(i => i.id === test.id) ? 'bg-subtle border-start border-4 border-primary' : 'hover-bg'}`}
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
                    className={`d-flex justify-content-between align-items-center py-3 px-3 cursor-pointer ${selectedItems.packages.find(i => i.id === pkg.id) ? 'bg-subtle border-start border-4 border-primary' : 'hover-bg'}`}
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
            <div className="sticky-top" style={{ top: '0', zIndex: 1 }}>
              <h6 className="text-uppercase small fw-bold text-muted mb-3 ls-wide">Refund Summary</h6>
              <Card className="border-0 shadow-sm bg-theme-inset">
                <Card.Body className="p-4">
                  <div className="mb-4">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Selected Items:</span>
                      <span className="fw-bold text-theme">EGP {totalRefundableAmount.toFixed(2)}</span>
                    </div>
                    
                    {patientData && (
                      <div className="mt-3 pt-3 border-top border-secondary-subtle">
                        <div className="d-flex justify-content-between mb-1">
                          <span className="text-muted small">Gross Debt:</span>
                          <span className="fw-bold text-danger">EGP {parseFloat(patientData.gross_debt || 0).toFixed(2)}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-1">
                          <span className="text-muted small">Gross Credit:</span>
                          <span className="fw-bold text-success">EGP {parseFloat(patientData.gross_credit || 0).toFixed(2)}</span>
                        </div>
                        <div className="d-flex justify-content-between mt-2 pt-2 border-top border-muted">
                          <span className="fw-bold small">Net Patient Balance:</span>
                          <span className={`fw-bold ${(ignoreDue && patientTotalBalance > 0) ? 'text-decoration-line-through text-muted' : (patientTotalBalance > 0 ? 'text-danger' : 'text-success')}`}>
                            EGP {Math.abs(patientTotalBalance).toFixed(2)} {patientTotalBalance > 0 ? '(Debt)' : '(Credit)'}
                          </span>
                        </div>
                        
                        {patientTotalBalance > 0 && (
                          <Form.Group className="mt-3 mb-2">
                            <Form.Check 
                              type="checkbox"
                              id="ignore-due-checkbox"
                              label={
                                <span className={`small ${isLimitExceeded ? 'text-muted' : 'text-theme fw-medium'}`}>
                                  Ignore whole debt (Net) for this refund
                                </span>
                              }
                              checked={ignoreDue}
                              disabled={isLimitExceeded || fetchingPatient}
                              onChange={(e) => setIgnoreDue(e.target.checked)}
                              className="user-select-none"
                            />
                            {isLimitExceeded && (
                              <div className="text-danger small mt-1 d-flex align-items-center bg-danger-subtle p-2 rounded">
                                <AlertTriangle size={14} className="me-2" />
                                <span>
                                  <strong>Limit Exceeded:</strong> Whole due (EGP {patientTotalBalance.toFixed(2)}) 
                                  exceeds the lab limit (EGP {patientDueLimit.toFixed(2)}).
                                </span>
                              </div>
                            )}
                          </Form.Group>
                        )}
                      </div>
                    )}
                    <hr className="border-secondary" />
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="fs-6 fw-bold text-theme">Total Refund:</span>
                      <span className="fs-5 fw-bold text-primary">EGP {totalRefundDue.toFixed(2)}</span>
                    </div>
                  </div>

                  <Form.Group className="mb-4">
                    <Form.Label className="small fw-bold text-theme">Amount Lab will pay now (Cash)</Form.Label>
                    <InputGroup>
                      <InputGroup.Text className="bg-theme-surface border-end-0">EGP</InputGroup.Text>
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
            </div>
          </Col>
        </Row>
      </Modal.Body>
    </Modal>
  );
};

export default RefundModal;
