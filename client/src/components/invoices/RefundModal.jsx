import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Form, Alert, Row, Col, ListGroup, Card, InputGroup } from 'react-bootstrap';
import { useToast } from '../ui/ToastContext';
import { formatDate } from '../../utils/dateFormatter';
import { RefreshCcw, AlertTriangle, ShieldCheck, History, CheckCircle, KeyRound, Info } from 'lucide-react';
import axios from 'axios';
import { useLab } from '../../context/LabContext';

const RefundModal = ({ show, onHide, invoice, onRefundProcessed, paymentMethods = [] }) => {
  const { toast, showConfirm } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState({ tests: [], packages: [] });
  const [amountLabPays, setAmountLabPays] = useState('0');
  const [isSure, setIsSure] = useState(false);
  const [authKey, setAuthKey] = useState('');
  const [patientData, setPatientData] = useState(null);
  const [fetchingPatient, setFetchingPatient] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState('');

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
      setPaymentMethodId('');
      
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

  const debtToPayOff = useMemo(() => {
    if (patientTotalBalance <= 0) return 0;
    return Math.min(totalRefundableAmount, patientTotalBalance);
  }, [patientTotalBalance, totalRefundableAmount]);

  const totalRefundDue = useMemo(() => {
    // If we have credit (negative balance), we add it to the refund amount
    if (patientTotalBalance < 0) {
      return totalRefundableAmount + Math.abs(patientTotalBalance);
    }
    // Otherwise, we subtract the portion used to pay off debt
    return Math.max(0, totalRefundableAmount - debtToPayOff);
  }, [totalRefundableAmount, patientTotalBalance, debtToPayOff]);

  const creditToAdd = useMemo(() => {
    const payout = parseFloat(amountLabPays) || 0;
    return Math.max(0, Math.round((totalRefundDue - payout) * 100) / 100);
  }, [totalRefundDue, amountLabPays]);

  const newTotal = useMemo(() => Math.max(0, Math.round((parseFloat(invoice?.total || 0) - totalRefundableAmount) * 100) / 100), [invoice?.total, totalRefundableAmount]);
  const newPaid = useMemo(() => Math.max(0, Math.round((parseFloat(invoice?.paid || 0) - (parseFloat(amountLabPays) || 0)) * 100) / 100), [invoice?.paid, amountLabPays]);
  const newDue = useMemo(() => Math.max(0, Math.round((newTotal - newPaid) * 100) / 100), [newTotal, newPaid]);

  const hasSelectedItems = selectedItems.tests.length > 0 || selectedItems.packages.length > 0;

  const handleRefund = async () => {
    if (!hasSelectedItems) {
      toast.error('Please select items to refund');
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
              <span className="text-muted">Total Gross Refund:</span>
              <span className="fw-bold">EGP {totalRefundableAmount.toFixed(2)}</span>
            </div>
            {debtToPayOff > 0 && (
              <div className="d-flex justify-content-between mb-2 text-secondary">
                <span className="text-muted">Applied to Bill Due:</span>
                <span className="fw-bold">EGP {debtToPayOff.toFixed(2)}</span>
              </div>
            )}
            <div className="d-flex justify-content-between mb-2 border-top border-muted pt-2 text-info">
              <span className="text-muted">Net Refunded Amount:</span>
              <span className="fw-bold">EGP {totalRefundDue.toFixed(2)}</span>
            </div>
            <div className="d-flex justify-content-between mb-2 text-danger">
              <span className="text-muted">Lab Paid (Cash):</span>
              <span className="fw-bold">EGP {parseFloat(amountLabPays).toFixed(2)}</span>
            </div>
            {creditToAdd > 0 && (
              <div className="d-flex justify-content-between text-success mt-1">
                <span className="text-muted">Added to Bill Credit:</span>
                <span className="fw-bold">EGP {creditToAdd.toFixed(2)}</span>
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
          authKey: isOlderThan24Hours ? authKey : null,
          payment_method_id: paymentMethodId || null
        };

        await axios.post(`${import.meta.env.VITE_API_URL}/invoices/${invoice.id}/refund`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
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
      scrollable={true}
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

        <Row className="mb-4">
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
            <div className="sticky-top" style={{ top: '1.5rem', zIndex: 1 }}>
              <h6 className="text-uppercase small fw-bold text-muted mb-3 ls-wide">Refund Summary</h6>
              <Card className="border-0 shadow-sm bg-theme-inset">
                <Card.Body className="p-4">
                    {/* Metrics Grid */}
                    <Row className="g-3 mb-4">
                      {/* 1. Refunded Amount: Net amount available to the patient after debt reduction */}
                      {totalRefundDue > 0 && (
                        <Col xs={6}>
                          <div className="p-3 bg-theme-surface rounded shadow-sm border-start border-4 border-info h-100 transition-all">
                            <div className="text-muted x-small fw-bold text-uppercase ls-wide mb-1">Refunded Amount</div>
                            <div className="h5 mb-0 fw-bold text-info d-flex align-items-center">
                              <RefreshCcw size={16} className="me-2" />
                              EGP {totalRefundDue.toFixed(2)}
                            </div>
                          </div>
                        </Col>
                      )}

                      {/* 5. Total: Gross value of selected items */}
                      {totalRefundableAmount > 0 && (
                        <Col xs={6}>
                          <div className="p-3 bg-theme-surface rounded shadow-sm border-start border-4 border-primary h-100 transition-all">
                            <div className="text-muted x-small fw-bold text-uppercase ls-wide mb-1">Total</div>
                            <div className="h5 mb-0 fw-bold text-primary d-flex align-items-center">
                              <Info size={16} className="me-2" />
                              EGP {totalRefundableAmount.toFixed(2)}
                            </div>
                          </div>
                        </Col>
                      )}

                      {/* 2. Bill Due: Portion of refund used to offset debt */}
                      {debtToPayOff > 0 && (
                        <Col xs={6}>
                          <div className="p-3 bg-theme-surface rounded shadow-sm border-start border-4 border-secondary h-100 transition-all">
                            <div className="text-muted x-small fw-bold text-uppercase ls-wide mb-1">Bill Due</div>
                            <div className="h5 mb-0 fw-bold text-secondary d-flex align-items-center">
                              <AlertTriangle size={16} className="me-2" />
                              EGP {debtToPayOff.toFixed(2)}
                            </div>
                          </div>
                        </Col>
                      )}

                      {/* 6. Paid: Actual cash being handed back */}
                      {parseFloat(amountLabPays) > 0 && (
                        <Col xs={6}>
                          <div className="p-3 bg-theme-surface rounded shadow-sm border-start border-4 border-danger h-100 transition-all">
                            <div className="text-muted x-small fw-bold text-uppercase ls-wide mb-1">Paid (Cash)</div>
                            <div className="h5 mb-0 fw-bold text-danger d-flex align-items-center">
                              <CheckCircle size={16} className="me-2" />
                              EGP {parseFloat(amountLabPays).toFixed(2)}
                            </div>
                          </div>
                        </Col>
                      )}

                      {/* 3. Bill Credit: Remainder added to credit */}
                      {creditToAdd > 0 && (
                        <Col xs={6}>
                          <div className="p-3 bg-theme-surface rounded shadow-sm border-start border-4 border-success h-100 transition-all">
                            <div className="text-muted x-small fw-bold text-uppercase ls-wide mb-1">Bill Credit</div>
                            <div className="h5 mb-0 fw-bold text-success d-flex align-items-center">
                              <ShieldCheck size={16} className="me-2" />
                              EGP {creditToAdd.toFixed(2)}
                            </div>
                          </div>
                        </Col>
                      )}
                    </Row>

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

                  {parseFloat(amountLabPays) > 0 && (
                    <Form.Group className="mb-4">
                      <Form.Label className="small fw-bold text-theme">Payout Method</Form.Label>
                      <Form.Select 
                        value={paymentMethodId}
                        onChange={(e) => setPaymentMethodId(e.target.value)}
                        className="shadow-sm"
                      >
                        <option value="">Select Method (Default: Cash)</option>
                        {paymentMethods.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  )}

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
