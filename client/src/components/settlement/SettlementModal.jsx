import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, ButtonGroup, Form, Row, Col, Alert, Table, Badge, InputGroup } from 'react-bootstrap';
import Select from 'react-select';
import axios from 'axios';
import { useToast } from '../ui/ToastContext';
import LoadingSpinner from '../ui/LoadingSpinner';
import { Search, Receipt, Calculator, CheckCircle, CreditCard, ListChecks, Wand2, Wallet, ShieldCheck, Send } from 'lucide-react';
import { formatDate } from '../../utils/dateFormatter';

/**
 * SettlementModal - Settlement Logic with Credit & OTP Support
 * Supports cash, credit, or mixed payments.
 * Credit-only settlements require WhatsApp OTP verification from patient.
 *
 * @param {boolean} show - Control modal visibility
 * @param {function} onHide - Close handler
 * @param {number|string} initialPatientId - Optional pre-selected patient ID
 * @param {string} patientName - Optional pre-selected patient name
 * @param {string} patientCode - Optional user-facing patient code
 * @param {number|string} initialInvoiceId - Optional specific invoice to target
 * @param {number} initialDueAmount - Optional pre-filled due amount for the specific invoice
 */
const SettlementModal = ({ show, onHide, initialPatientId, patientName, patientCode, initialInvoiceId, initialDueAmount, onSettled }) => {
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_URL;

  // State
  const [loading, setLoading] = useState(false);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [dueInvoices, setDueInvoices] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [error, setError] = useState(null);

  // Patient data (for credit balance)
  const [patientData, setPatientData] = useState(null);

  // Settlement Logic State
  const [strategy, setStrategy] = useState('automated');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState('settlement');

  // Credit state
  const [useCredit, setUseCredit] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');

  // OTP state (for credit-only settlements)
  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpMaskedPhone, setOtpMaskedPhone] = useState('');
  const [otpError, setOtpError] = useState('');

  // Fetch all patients for the searchable dropdown
  const fetchPatients = useCallback(async () => {
    setPatientsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${apiUrl}/patient`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatients(response.data || []);
    } catch (err) {
      console.error("Error fetching patients:", err);
      toast.error("Failed to load patient list");
    } finally {
      setPatientsLoading(false);
    }
  }, [apiUrl, toast]);

  // Fetch invoices with outstanding balance for a specific patient
  const fetchDueInvoices = useCallback(async (patientId) => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${apiUrl}/patient/${patientId}/due`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDueInvoices(response.data || []);
    } catch (err) {
      console.error("Error fetching due invoices:", err);
      setError("Failed to load outstanding invoices for this patient.");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  // Fetch patient details (for credit balance)
  const fetchPatientData = useCallback(async (patientId) => {
    if (!patientId) return;
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${apiUrl}/patient/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatientData(response.data);
    } catch (err) {
      console.error("Error fetching patient data:", err);
    }
  }, [apiUrl]);

  // Fetch Payment Methods
  const fetchPaymentMethods = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${apiUrl}/payment-methods`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPaymentMethods(response.data || []);
    } catch (err) {
      console.error("Error fetching payment methods:", err);
    }
  }, [apiUrl]);

  // Reset all state when modal closes/opens
  const resetState = useCallback(() => {
    setActiveTab('settlement');
    setUseCredit(false);
    setCreditAmount('');
    setOtpSending(false);
    setOtpSent(false);
    setOtpValue('');
    setOtpMaskedPhone('');
    setOtpError('');
    setPaymentAmount('');
    setSelectedInvoiceIds([]);
    setPaymentMethod('');
    setNotes('');
    setPatientData(null);
    setDueInvoices([]);
    setError(null);
    setPaymentDate(new Date().toISOString().split('T')[0]);
  }, []);

  // Effects
  useEffect(() => {
    if (show) {
      resetState();
      if (!initialPatientId) {
        fetchPatients();
      } else {
        fetchDueInvoices(initialPatientId);
        fetchPatientData(initialPatientId);
        setSelectedPatient({ value: initialPatientId, label: patientName || 'Selected Patient' });

        // If targeting a specific invoice, handle normal due vs credit invoices
        if (initialInvoiceId) {
          const parsedDue = parseFloat(initialDueAmount || 0);
          if (parsedDue < 0) {
            // It's a credit invoice! Enable cashout mode with its absolute value
            setActiveTab('cashout');
            setCreditAmount(Math.abs(parsedDue).toString());
            setPaymentAmount('');
          } else {
            // Normal due invoice
            setActiveTab('settlement');
            setStrategy('manual');
            setSelectedInvoiceIds([initialInvoiceId]);
            setPaymentAmount(parsedDue.toString());
          }
        }
      }
      fetchPaymentMethods();
    }
  }, [show, initialPatientId, patientName, initialInvoiceId, initialDueAmount, fetchPatients, fetchDueInvoices, fetchPatientData, fetchPaymentMethods, resetState]);

  const handlePatientChange = (selectedOption) => {
    setSelectedPatient(selectedOption);
    resetState();
    if (selectedOption) {
      fetchDueInvoices(selectedOption.value);
      fetchPatientData(selectedOption.value);
    }
  };

  // --- Calculations ---
  const patientCredit = Math.max(
    parseFloat(patientData?.credit || 0),
    parseFloat(patientData?.gross_credit || 0),
    parseFloat(patientData?.due || 0) < 0 ? Math.abs(parseFloat(patientData.due)) : 0
  );
  const cashPay = parseFloat(paymentAmount) || 0;
  const creditPay = useCredit ? (parseFloat(creditAmount) || 0) : 0;
  const totalPayment = Math.round((cashPay + creditPay) * 100) / 100;
  const isCreditOnly = cashPay === 0 && creditPay > 0;
  // Credit cashout mode: active tab is cashout
  const isCreditCashout = activeTab === 'cashout';
  // Cashout amount — how much credit is being returned as cash
  const cashoutAmount = parseFloat(creditAmount) || 0;

  // Auto-fill cashout amount with available credit in cashout mode
  useEffect(() => {
    if (isCreditCashout && !creditAmount && patientCredit > 0) {
      setCreditAmount(patientCredit.toString());
    }
  }, [isCreditCashout, patientCredit, creditAmount]);

  // Auto-switch to cashout tab if patient has credit but no due invoices
  useEffect(() => {
    if (show && selectedPatient && !loading) {
      if (dueInvoices.length === 0 && patientCredit > 0) {
        setActiveTab('cashout');
      }
    }
  }, [show, selectedPatient, loading, dueInvoices.length, patientCredit]);

  // Allocation Logic
  const calculateAllocation = () => {
    let remaining = totalPayment;
    const allocationMap = {};

    if (strategy === 'automated') {
      const sortedInvoices = [...dueInvoices].sort((a, b) => a.id - b.id);
      for (const inv of sortedInvoices) {
        const toApply = Math.min(remaining, parseFloat(inv.due));
        allocationMap[inv.id] = toApply;
        remaining -= toApply;
      }
    } else {
      selectedInvoiceIds.forEach(id => {
        const inv = dueInvoices.find(i => i.id === id);
        if (inv) {
          const toApply = Math.min(remaining, parseFloat(inv.due));
          allocationMap[inv.id] = toApply;
          remaining -= toApply;
        }
      });
    }
    return allocationMap;
  };

  const allocations = calculateAllocation();
  const totalDue = dueInvoices.reduce((sum, inv) => sum + parseFloat(inv.due), 0);
  const remainingAfterPayment = Math.max(0, totalDue - totalPayment);

  const handleToggleInvoice = (id) => {
    setSelectedInvoiceIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // --- OTP Flow ---
  const handleSendOtp = async () => {
    setOtpSending(true);
    setOtpError('');
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${apiUrl}/reconciliation/send-otp`, {
        patient_id: selectedPatient.value
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setOtpSent(true);
      setOtpMaskedPhone(response.data.masked_phone || '');
      toast.success(response.data.message || 'OTP sent successfully');
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to send OTP';
      const errCode = err.response?.data?.code;

      if (errCode === 'NO_PHONE') {
        setOtpError('Patient has no phone number. Cannot process credit-only settlement.');
      } else if (errCode === 'WHATSAPP_DISCONNECTED') {
        setOtpError('WhatsApp is not connected. Please connect it in lab settings.');
      } else {
        setOtpError(errMsg);
      }
      toast.error(errMsg);
    } finally {
      setOtpSending(false);
    }
  };

  // --- Submit ---
  const handleSubmit = async () => {
    // Credit cashout mode validation
    if (isCreditCashout) {
      if (cashoutAmount <= 0) {
        toast.error("Please enter an amount to cash out");
        return;
      }
      if (cashoutAmount > patientCredit) {
        toast.error(`Cannot exceed available credit (EGP ${patientCredit.toFixed(2)})`);
        return;
      }
      if (!paymentMethod) {
        toast.error("Please select a payment method for the cashout");
        return;
      }
      if (!otpSent || !otpValue.trim()) {
        toast.error("Please verify OTP before cashing out credit");
        return;
      }
    } else {
      // Normal settlement validation
      if (totalPayment <= 0) {
        toast.error("Total payment must be greater than zero");
        return;
      }
      if (cashPay > 0 && !paymentMethod) {
        toast.error("Please select a payment method for the cash portion");
        return;
      }
      if (creditPay > patientCredit) {
        toast.error(`Credit amount cannot exceed patient's available credit (EGP ${patientCredit.toFixed(2)})`);
        return;
      }
      if (isCreditOnly && !otpSent) {
        toast.error("Please send and verify OTP for credit-only settlements");
        return;
      }
      if (isCreditOnly && !otpValue.trim()) {
        toast.error("Please enter the OTP code");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");

      // Build payload based on mode
      const payload = isCreditCashout
        ? {
            patient_id: selectedPatient.value,
            amount: 0,
            payment_method_id: paymentMethod,
            date: paymentDate,
            notes: notes || 'Credit cashout',
            // Cashout-specific fields
            credit_cashout: true,
            credit_amount: cashoutAmount,
            otp: otpValue.trim()
          }
        : {
            patient_id: selectedPatient.value,
            amount: cashPay,
            payment_method_id: cashPay > 0 ? paymentMethod : null,
            date: paymentDate,
            notes,
            strategy,
            invoice_ids: strategy === 'manual' ? selectedInvoiceIds : [],
            use_credit: useCredit && creditPay > 0,
            credit_amount: creditPay,
            otp: isCreditOnly ? otpValue.trim() : undefined
          };

      await axios.post(`${apiUrl}/reconciliation`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Settlement processed successfully");
      onSettled && onSettled();
      onHide();

    } catch (err) {
      console.error("Error processing settlement:", err);
      const errCode = err.response?.data?.code;
      if (errCode === 'OTP_INVALID' || errCode === 'OTP_EXPIRED' || errCode === 'OTP_MAX_ATTEMPTS') {
        setOtpError(err.response.data.error);
      }
      toast.error(err.response?.data?.error || "Failed to process settlement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const patientOptions = patients.map(p => ({
    value: p.id,
    label: `${p.name} (${p.patientcode || 'N/A'}) - ${p.phone || ''}`
  }));

  // Determine if submit is allowed
  const canSubmit = selectedPatient
    && (
      // Normal settlement: has due invoices and a payment
      (dueInvoices.length > 0 && totalPayment > 0)
      // Credit cashout: no due invoices but cashing out credit
      || (isCreditCashout && cashoutAmount > 0)
    )
    && (
      // Payment method required for cash portion OR for credit cashout
      (cashPay > 0 || isCreditCashout) ? !!paymentMethod : true
    )
    && (
      // OTP required for credit-only (no cash) settlements and credit cashouts
      (isCreditOnly || isCreditCashout)
        ? (otpSent && otpValue.trim().length > 0)
        : true
    )
    && !isSubmitting;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static" className="settlement-modal">
      <Modal.Header closeButton className="bg-theme-surface">
        <Modal.Title className="d-flex align-items-center gap-2">
          <Calculator className="text-primary" />
          <span>Patient Bill Settlement</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form>
          {/* Patient Selection Section */}
          {!initialPatientId ? (
            <div className="settlement-section mb-4 p-3 border rounded bg-theme-surface shadow-sm">
              <h6 className="section-title mb-3 d-flex align-items-center gap-2 text-primary">
                <Search size={18} />
                1. Select Patient
              </h6>
              <Form.Group>
                <Select
                  options={patientOptions}
                  value={selectedPatient}
                  onChange={handlePatientChange}
                  placeholder="Search patient by name, code or phone..."
                  isLoading={patientsLoading}
                  isClearable
                  classNamePrefix="select"
                />
              </Form.Group>
            </div>
          ) : (
            <div className="mb-4 p-3 border rounded bg-subtle d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <div className="bg-primary text-white rounded-circle p-2 d-flex align-items-center justify-content-center">
                  <Search size={20} />
                </div>
                <div>
                  <div className="text-muted small">Reconciling for Patient:</div>
                  <h5 className="mb-0 fw-bold text-theme">{patientName}</h5>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2">
                {patientCredit > 0 && (
                  <Badge bg="success" className="px-3 py-2">
                    <Wallet size={12} className="me-1" />
                    Credit: EGP {patientCredit.toFixed(2)}
                  </Badge>
                )}
                <Badge bg="primary" className="px-3 py-2">
                  ID: #{patientCode || initialPatientId}
                </Badge>
              </div>
            </div>
          )}

          {selectedPatient && (
            <>
              {/* Mode Tabs if patient has both credit and due invoices */}
              {patientCredit > 0 && dueInvoices.length > 0 && (
                <div className="d-flex justify-content-center mb-4">
                  <ButtonGroup className="w-100 shadow-sm rounded-pill p-1 bg-theme-inset border border-muted">
                    <Button
                      variant={activeTab === 'settlement' ? 'primary' : 'outline-primary'}
                      onClick={() => {
                        setActiveTab('settlement');
                        setCreditAmount('');
                        setUseCredit(false);
                      }}
                      className={`w-50 rounded-pill border-0 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 ${
                        activeTab === 'settlement' ? 'text-white font-weight-bold bg-primary' : 'text-theme bg-transparent'
                      }`}
                    >
                      <Receipt size={16} /> Settle Invoices
                    </Button>
                    <Button
                      variant={activeTab === 'cashout' ? 'danger' : 'outline-danger'}
                      onClick={() => {
                        setActiveTab('cashout');
                        setCreditAmount(patientCredit.toString());
                      }}
                      className={`w-50 rounded-pill border-0 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 ${
                        activeTab === 'cashout' ? 'text-white font-weight-bold bg-danger' : 'text-theme bg-transparent'
                      }`}
                    >
                      <Wallet size={16} /> Cash Out Credit
                    </Button>
                  </ButtonGroup>
                </div>
              )}

              {/* Strategy Selection — only for normal settlement, not cashout */}
              {!isCreditCashout && (
              <div className="settlement-section mb-4 p-3 border rounded bg-theme-surface shadow-sm">
                <h6 className="section-title mb-3 d-flex align-items-center gap-2 text-primary">
                  <ListChecks size={18} />
                  2. Choose Strategy
                </h6>
                <div className="d-flex gap-4">
                  <Form.Check
                    type="radio" id="strat-auto"
                    label={
                      <div className="ms-2">
                        <div className="fw-bold d-flex align-items-center gap-1 text-theme">
                          <Wand2 size={14} /> Automated
                        </div>
                        <small className="text-muted">Pay oldest invoices first</small>
                      </div>
                    }
                    name="strategy"
                    checked={strategy === 'automated'}
                    onChange={() => setStrategy('automated')}
                    disabled={!!initialInvoiceId}
                  />
                  <Form.Check
                    type="radio" id="strat-manual"
                    label={
                      <div className="ms-2">
                        <div className="fw-bold d-flex align-items-center gap-1 text-theme">
                          <ListChecks size={14} /> Specific Selection
                        </div>
                        <small className="text-muted">Choose invoices manually</small>
                      </div>
                    }
                    name="strategy"
                    checked={strategy === 'manual'}
                    onChange={() => setStrategy('manual')}
                  />
                </div>
              </div>
              )}

              {/* Invoices List */}
              <div className="settlement-section mb-4 p-3 border rounded bg-theme-surface shadow-sm">
                <h6 className="section-title mb-3 d-flex align-items-center gap-2 text-primary">
                  <Receipt size={18} />
                  3. Due Invoices
                </h6>

                {loading ? (
                  <div className="py-4"><LoadingSpinner message="Loading invoices..." /></div>
                ) : error ? (
                  <Alert variant="danger">{error}</Alert>
                ) : dueInvoices.length > 0 ? (
                  <div className="table-responsive">
                    <Table hover size="sm" className="align-middle border-muted">
                      <thead className="bg-theme-inset text-theme">
                        <tr>
                          {strategy === 'manual' && <th>Select</th>}
                          <th>Date</th>
                          <th>Invoice #</th>
                          <th className="text-end">Total Due</th>
                          <th className="text-end text-primary">Paid Now</th>
                          <th className="text-end">Remaining</th>
                        </tr>
                      </thead>
                      <tbody className="text-theme">
                        {dueInvoices.map(inv => {
                          const paidNow = allocations[inv.id] || 0;
                          const remaining = Math.max(0, parseFloat(inv.due) - paidNow);
                          return (
                            <tr key={inv.id} className={paidNow > 0 ? "bg-subtle" : ""}>
                              {strategy === 'manual' && (
                                <td>
                                  <Form.Check
                                    checked={selectedInvoiceIds.includes(inv.id)}
                                    onChange={() => handleToggleInvoice(inv.id)}
                                  />
                                </td>
                              )}
                              <td>{formatDate(inv.date)}</td>
                              <td><Badge bg="secondary">#{inv.id}</Badge></td>
                              <td className="text-end">EGP {parseFloat(inv.due).toFixed(2)}</td>
                              <td className="text-end text-primary fw-bold">
                                {paidNow > 0 ? `+ EGP ${paidNow.toFixed(2)}` : "-"}
                              </td>
                              <td className="text-end">EGP {remaining.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-theme-inset fw-bold text-theme border-top-2 border-muted">
                        <tr>
                          <td colSpan={strategy === 'manual' ? 3 : 2}>Total</td>
                          <td className="text-end">EGP {totalDue.toFixed(2)}</td>
                          <td className="text-end text-primary">EGP {totalPayment.toFixed(2)}</td>
                          <td className="text-end text-danger">EGP {remainingAfterPayment.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </Table>
                  </div>
                ) : isCreditCashout ? (
                  /* Credit Cashout Mode — patient has credit but no due invoices */
                  <div className="p-3 border rounded bg-success bg-opacity-10">
                    <div className="text-center mb-3">
                      <Wallet size={32} className="text-success mb-2" />
                      <h5 className="text-theme fw-bold mb-1">Patient Credit Available</h5>
                      <h3 className="text-success fw-bold">EGP {patientCredit.toFixed(2)}</h3>
                      <p className="text-muted small mb-0">
                        This patient has no outstanding invoices but has credit on their account.
                        You can cash out this credit — hand the money to the patient.
                      </p>
                    </div>
                    <hr />

                    <Row>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-bold text-theme">Cashout Amount (EGP) *</Form.Label>
                          <InputGroup>
                            <Form.Control
                              type="number" step="0.01" min="0.01"
                              max={patientCredit}
                              placeholder={`Max: ${patientCredit.toFixed(2)}`}
                              value={creditAmount}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                if (val > patientCredit) {
                                  setCreditAmount(patientCredit.toString());
                                  toast.warning(`Cannot exceed available credit of EGP ${patientCredit.toFixed(2)}`);
                                } else {
                                  setCreditAmount(e.target.value);
                                }
                              }}
                              onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                              className="bg-theme-inset text-theme border-muted"
                            />
                            <Button 
                              variant="outline-success" 
                              onClick={() => setCreditAmount(patientCredit.toString())}
                            >
                              Max
                            </Button>
                          </InputGroup>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-bold text-theme">Payment Method *</Form.Label>
                          <Form.Select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="bg-theme-inset text-theme border-muted"
                          >
                            <option value="">Select Method</option>
                            {paymentMethods.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </Form.Select>
                          <Form.Text className="text-muted small">
                            How are you returning this money to the patient?
                          </Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-bold text-theme">Date</Form.Label>
                          <Form.Control
                            type="date" value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            className="bg-theme-inset text-theme border-muted"
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={12}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-bold text-theme">Notes</Form.Label>
                          <Form.Control
                            as="textarea" rows={1}
                            placeholder="Optional remarks or reason for cashout..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="bg-theme-inset text-theme border-muted"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    {/* OTP for cashout */}
                    {cashoutAmount > 0 && (
                      <div className="mt-3 p-3 border rounded bg-warning bg-opacity-10">
                        <h6 className="d-flex align-items-center gap-2 text-warning mb-2">
                          <ShieldCheck size={16} />
                          Patient OTP Verification Required
                        </h6>
                        <p className="text-muted small mb-2">
                          An OTP will be sent to the patient's WhatsApp to authorize this credit cashout.
                        </p>

                        {otpError && <Alert variant="danger" className="py-2 small">{otpError}</Alert>}

                        {!otpSent ? (
                          <Button variant="warning" size="sm" onClick={handleSendOtp} disabled={otpSending}
                            className="d-flex align-items-center gap-2"
                          >
                            <Send size={14} />
                            {otpSending ? 'Sending OTP...' : 'Send OTP to Patient WhatsApp'}
                          </Button>
                        ) : (
                          <div>
                            <Alert variant="success" className="py-2 small d-flex align-items-center gap-2">
                              <CheckCircle size={16} />
                              OTP sent to {otpMaskedPhone}. Ask the patient for the code.
                            </Alert>
                            <InputGroup size="sm" className="mt-2" style={{ maxWidth: 300 }}>
                              <InputGroup.Text>OTP Code</InputGroup.Text>
                              <Form.Control
                                type="text" placeholder="Enter 6-digit code"
                                value={otpValue} maxLength={6}
                                onChange={(e) => {
                                  setOtpValue(e.target.value.replace(/\D/g, ''));
                                  setOtpError('');
                                }}
                                autoFocus
                              />
                            </InputGroup>
                            <Button variant="link" size="sm" className="mt-1 p-0 text-muted"
                              onClick={handleSendOtp} disabled={otpSending}
                            >
                              {otpSending ? 'Resending...' : 'Resend OTP'}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <Alert variant="success" className="d-flex align-items-center gap-2">
                    <CheckCircle size={20} />
                    <span>This patient has no outstanding balances and no credit.</span>
                  </Alert>
                )}
              </div>

              {/* Payment Details — only for normal settlement, not cashout */}
              {!isCreditCashout && (
              <div className="settlement-section mb-4 p-3 border rounded bg-theme-surface shadow-sm">
                <h6 className="section-title mb-3 d-flex align-items-center gap-2 text-primary">
                  <CreditCard size={18} />
                  4. Payment Details
                </h6>

                {/* Credit Toggle — only show if patient has credit */}
                {patientCredit > 0 && (
                  <div className="mb-3 p-3 border rounded bg-success bg-opacity-10">
                    <Form.Check
                      type="switch" id="use-credit-switch"
                      label={
                        <span className="fw-medium text-theme">
                          <Wallet size={14} className="me-1 text-success" />
                          Use Patient Credit (Available: <strong className="text-success">EGP {patientCredit.toFixed(2)}</strong>)
                        </span>
                      }
                      checked={useCredit}
                      onChange={(e) => {
                        setUseCredit(e.target.checked);
                        if (!e.target.checked) {
                          setCreditAmount('');
                          // Reset OTP state when disabling credit
                          setOtpSent(false);
                          setOtpValue('');
                          setOtpError('');
                        }
                      }}
                    />
                    {useCredit && (
                      <div className="mt-2">
                        <InputGroup size="sm">
                          <InputGroup.Text>EGP</InputGroup.Text>
                          <Form.Control
                            type="number" step="0.01" min="0"
                            max={Math.min(patientCredit, totalDue)}
                            placeholder={`Max: ${Math.min(patientCredit, totalDue).toFixed(2)}`}
                            value={creditAmount}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const maxCredit = Math.min(patientCredit, totalDue);
                              if (val > maxCredit) {
                                setCreditAmount(maxCredit.toString());
                                toast.warning(`Credit cannot exceed EGP ${maxCredit.toFixed(2)}`);
                              } else {
                                setCreditAmount(e.target.value);
                              }
                            }}
                            onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                          />
                          <Button
                            variant="outline-success" size="sm"
                            onClick={() => {
                              const maxCredit = Math.min(patientCredit, totalDue);
                              setCreditAmount(maxCredit.toString());
                            }}
                          >
                            Use Max
                          </Button>
                        </InputGroup>
                      </div>
                    )}
                  </div>
                )}

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="text-theme">
                        {useCredit ? 'Cash Amount' : 'Amount to Pay *'}
                      </Form.Label>
                      <Form.Control
                        type="number" placeholder="0.00"
                        value={paymentAmount}
                        onChange={(e) => {
                          const val = e.target.value;
                          const maxCash = totalDue - creditPay;
                          if (val === '' || parseFloat(val) <= maxCash) {
                            setPaymentAmount(val);
                          } else {
                            setPaymentAmount(maxCash.toFixed(2));
                            toast.warning(`Cash cannot exceed EGP ${maxCash.toFixed(2)} (accounting for credit).`);
                          }
                        }}
                        max={totalDue - creditPay}
                        className="bg-theme-inset text-theme border-muted"
                      />
                      {useCredit && creditPay > 0 && (
                        <Form.Text className="text-muted small">
                          Credit covers EGP {creditPay.toFixed(2)}. Remaining due: EGP {Math.max(0, totalDue - creditPay).toFixed(2)}
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="text-theme">Payment Method {cashPay > 0 ? '*' : ''}</Form.Label>
                      <Form.Select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="bg-theme-inset text-theme border-muted"
                        disabled={cashPay === 0 && !isCreditCashout}
                      >
                        <option value="">{ (cashPay === 0 && !isCreditCashout) ? 'N/A (Credit Only)' : 'Select Method'}</option>
                        {paymentMethods.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="text-theme">Payment Date</Form.Label>
                      <Form.Control
                        type="date" value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="bg-theme-inset text-theme border-muted"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="text-theme">Notes</Form.Label>
                      <Form.Control
                        as="textarea" rows={1}
                        placeholder="Optional remarks..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="bg-theme-inset text-theme border-muted"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>
              )}

              {/* OTP Verification — only shown for credit-only settlements (not cashout, which has its own OTP) */}
              {isCreditOnly && !isCreditCashout && (
                <div className="settlement-section mb-4 p-3 border rounded bg-warning bg-opacity-10 shadow-sm">
                  <h6 className="section-title mb-3 d-flex align-items-center gap-2 text-warning">
                    <ShieldCheck size={18} />
                    5. Patient OTP Verification
                  </h6>
                  <p className="text-muted small mb-3">
                    Since this settlement uses <strong>only patient credit</strong>, an OTP must be sent to the patient's WhatsApp for authorization.
                  </p>

                  {otpError && (
                    <Alert variant="danger" className="py-2 small">{otpError}</Alert>
                  )}

                  {!otpSent ? (
                    <Button
                      variant="warning" size="sm"
                      onClick={handleSendOtp}
                      disabled={otpSending}
                      className="d-flex align-items-center gap-2"
                    >
                      <Send size={14} />
                      {otpSending ? 'Sending OTP...' : 'Send OTP to Patient WhatsApp'}
                    </Button>
                  ) : (
                    <div>
                      <Alert variant="success" className="py-2 small d-flex align-items-center gap-2">
                        <CheckCircle size={16} />
                        OTP sent to {otpMaskedPhone}. Ask the patient for the code.
                      </Alert>
                      <InputGroup size="sm" className="mt-2" style={{ maxWidth: 300 }}>
                        <InputGroup.Text>OTP Code</InputGroup.Text>
                        <Form.Control
                          type="text" placeholder="Enter 6-digit code"
                          value={otpValue} maxLength={6}
                          onChange={(e) => {
                            // Only allow digits
                            const cleaned = e.target.value.replace(/\D/g, '');
                            setOtpValue(cleaned);
                            setOtpError('');
                          }}
                          autoFocus
                        />
                      </InputGroup>
                      <Button
                        variant="link" size="sm" className="mt-1 p-0 text-muted"
                        onClick={handleSendOtp} disabled={otpSending}
                      >
                        {otpSending ? 'Resending...' : 'Resend OTP'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </Form>
      </Modal.Body>

      <Modal.Footer className="bg-theme-surface border-top">
        <Button variant="outline-secondary" onClick={onHide} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="success" disabled={!canSubmit} onClick={handleSubmit}>
          {isSubmitting ? "Processing..." : (isCreditCashout ? "Confirm Credit Cashout" : "Confirm Settlement")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SettlementModal;
