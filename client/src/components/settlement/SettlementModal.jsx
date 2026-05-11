import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Table, Badge } from 'react-bootstrap';
import Select from 'react-select';
import axios from 'axios';
import { useToast } from '../ui/ToastContext';
import LoadingSpinner from '../ui/LoadingSpinner';
import { Search, Receipt, Calculator, X, CheckCircle, CreditCard, ListChecks, Wand2 } from 'lucide-react';
import { formatDate } from '../../utils/dateFormatter';

/**
 * SettlementModal - Phase 2: Settlement Logic (UI)
 * Implements Manual selection, Custom (Automated) allocation preview, and payment details.
 * 
 * @param {boolean} show - Control modal visibility
 * @param {function} onHide - Close handler
 * @param {number|string} initialPatientId - Optional pre-selected patient ID
 * @param {string} patientName - Optional pre-selected patient name
 * @param {string} patientCode - Optional user-facing patient code
 */
const SettlementModal = ({ show, onHide, initialPatientId, patientName, patientCode }) => {
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

  // Settlement Logic State
  const [strategy, setStrategy] = useState('automated'); // 'automated' | 'manual'
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Phase 1: Fetch all patients for the searchable dropdown
  const fetchPatients = useCallback(async () => {
    setPatientsLoading(true);
    try {
      const token = localStorage.getItem("token");
      /* 
      // API TODO: Implement patient list fetching for settlement
      const response = await axios.get(`${apiUrl}/patient`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatients(response.data || []);
      */

      // Placeholder logic for now
      console.log("Settlement: Fetching patients placeholder");
      setPatients([]);
    } catch (err) {
      console.error("Error fetching patients:", err);
      toast.error("Failed to load patient list");
    } finally {
      setPatientsLoading(false);
    }
  }, [apiUrl, toast]);

  // Phase 1: Fetch invoices with outstanding balance for a specific patient
  const fetchDueInvoices = useCallback(async (patientId) => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      /*
      // API TODO: Implement GET /invoices/patient/:id/due
      const response = await axios.get(`${apiUrl}/invoices/patient/${patientId}/due`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDueInvoices(response.data || []);
      */

      // Placeholder logic for now
      console.log(`Settlement: Fetching due invoices for patient ${patientId}`);
      setDueInvoices([]);
    } catch (err) {
      console.error("Error fetching due invoices:", err);
      setError("Failed to load outstanding invoices for this patient.");
    } finally {
      setLoading(false);
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

  // Effects
  useEffect(() => {
    if (show) {
      if (!initialPatientId) {
        fetchPatients();
      } else {
        // If we have an initial ID, fetch invoices immediately
        fetchDueInvoices(initialPatientId);
        setSelectedPatient({ value: initialPatientId, label: patientName || 'Selected Patient' });
      }
      fetchPaymentMethods();
    }
  }, [show, initialPatientId, patientName, fetchPatients, fetchDueInvoices, fetchPaymentMethods]);

  useEffect(() => {
    if (!initialPatientId && show && patients.length > 0) {
      // Logic for pre-selecting from a list if needed (optional)
    }
  }, [initialPatientId, show, patients]);

  const handlePatientChange = (selectedOption) => {
    setSelectedPatient(selectedOption);
    setDueInvoices([]);
    setPaymentAmount('');
    setSelectedInvoiceIds([]);
    if (selectedOption) {
      fetchDueInvoices(selectedOption.value);
    }
  };

  // Phase 2: Allocation Logic
  const calculateAllocation = () => {
    let remaining = parseFloat(paymentAmount) || 0;
    const allocationMap = {};

    if (strategy === 'automated') {
      // Sort by ID or Date (FIFO)
      const sortedInvoices = [...dueInvoices].sort((a, b) => a.id - b.id);
      for (const inv of sortedInvoices) {
        const toApply = Math.min(remaining, parseFloat(inv.due));
        allocationMap[inv.id] = toApply;
        remaining -= toApply;
      }
    } else {
      // Manual distribution (optional: simple split or just selected invoices)
      selectedInvoiceIds.forEach(id => {
        const inv = dueInvoices.find(i => i.id === id);
        if (inv) {
          // In manual mode, we might just pay full due for selected ones
          // or have specific inputs per row. For now, we'll assume pay full due 
          // of selected until total amount is reached.
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
  const remainingAfterPayment = Math.max(0, totalDue - (parseFloat(paymentAmount) || 0));

  const handleToggleInvoice = (id) => {
    setSelectedInvoiceIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        patient_id: selectedPatient.value,
        amount: parseFloat(paymentAmount),
        payment_method_id: paymentMethod,
        date: paymentDate,
        notes,
        strategy,
        invoice_ids: strategy === 'manual' ? selectedInvoiceIds : []
      };

      console.log("Submitting Settlement:", payload);

      /*
      // API TODO: POST /settlements
      await axios.post(`${apiUrl}/settlements`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Settlement processed successfully");
      onHide();
      */

      toast.info("API placeholder: Processing settlement...");
    } catch (err) {
      console.error("Error processing settlement:", err);
      toast.error(err.response?.data?.error || "Failed to process settlement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const patientOptions = patients.map(p => ({
    value: p.id,
    label: `${p.name} (${p.patientcode || 'N/A'}) - ${p.phone || ''}`
  }));

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      backdrop="static"
      className="settlement-modal"
    >
      <Modal.Header closeButton className="bg-theme-surface">
        <Modal.Title className="d-flex align-items-center gap-2">
          <Calculator className="text-primary" />
          <span>Patient Bill Settlement</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form>
          {/* Patient Selection Section - Only show if no initial patient */}
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
              <Badge bg="primary" className="px-3 py-2">
                ID: #{patientCode || initialPatientId}
              </Badge>
            </div>
          )}

          {selectedPatient && (
            <>
              {/* Strategy Selection */}
              <div className="settlement-section mb-4 p-3 border rounded bg-theme-surface shadow-sm">
                <h6 className="section-title mb-3 d-flex align-items-center gap-2 text-primary">
                  <ListChecks size={18} />
                  2. Choose Strategy
                </h6>
                <div className="d-flex gap-4">
                  <Form.Check
                    type="radio"
                    id="strat-auto"
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
                  />
                  <Form.Check
                    type="radio"
                    id="strat-manual"
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

              {/* Invoices List */}
              <div className="settlement-section mb-4 p-3 border rounded bg-theme-surface shadow-sm">
                <h6 className="section-title mb-3 d-flex align-items-center gap-2 text-primary">
                  <Receipt size={18} />
                  3. Due Invoices
                </h6>

                {loading ? (
                  <div className="py-4">
                    <LoadingSpinner message="Loading invoices..." />
                  </div>
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
                              <td className="text-end">
                                EGP {remaining.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-theme-inset fw-bold text-theme border-top-2 border-muted">
                        <tr>
                          <td colSpan={strategy === 'manual' ? 3 : 2}>Total</td>
                          <td className="text-end">EGP {totalDue.toFixed(2)}</td>
                          <td className="text-end text-primary">
                            EGP {(parseFloat(paymentAmount) || 0).toFixed(2)}
                          </td>
                          <td className="text-end text-danger">
                            EGP {remainingAfterPayment.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </Table>
                  </div>
                ) : (
                  <Alert variant="success" className="d-flex align-items-center gap-2">
                    <CheckCircle size={20} />
                    <span>This patient has no outstanding balances.</span>
                  </Alert>
                )}
              </div>

              {/* Payment Details */}
              <div className="settlement-section mb-4 p-3 border rounded bg-theme-surface shadow-sm">
                <h6 className="section-title mb-3 d-flex align-items-center gap-2 text-primary">
                  <CreditCard size={18} />
                  4. Payment Details
                </h6>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="text-theme">Amount to Pay *</Form.Label>
                      <Form.Control
                        type="number"
                        placeholder="0.00"
                        value={paymentAmount}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || parseFloat(val) <= totalDue) {
                            setPaymentAmount(val);
                          } else {
                            setPaymentAmount(totalDue.toString());
                            toast.warning("Cannot pay more than total due balance.");
                          }
                        }}
                        max={totalDue}
                        className="bg-theme-inset text-theme border-muted"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="text-theme">Payment Method *</Form.Label>
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
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="text-theme">Payment Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="bg-theme-inset text-theme border-muted"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="text-theme">Notes</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={1}
                        placeholder="Optional remarks..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="bg-theme-inset text-theme border-muted"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            </>
          )}
        </Form>
      </Modal.Body>

      <Modal.Footer className="bg-theme-surface border-top">
        <Button variant="outline-secondary" onClick={onHide} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="success"
          disabled={!selectedPatient || dueInvoices.length === 0 || !paymentAmount || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? "Processing..." : "Confirm Settlement"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SettlementModal;
