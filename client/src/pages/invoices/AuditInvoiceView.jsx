import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Button, Badge, Table } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import { motion } from "framer-motion";
import axios from "axios";
import {
  ArrowLeft,
  Receipt,
  PersonBadge,
  Calendar,
  Building,
  CreditCard,
  Percent,
  CashStack
} from "react-bootstrap-icons";
import { formatDate, formatDateTime } from "../../utils/dateFormatter";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { useToast } from "../../components/ui/ToastContext";
import { formatCurrency } from "../../utils/currencyFormatter";

const AuditInvoiceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${apiUrl}/invoices/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setInvoice(res.data);
      } catch (error) {
        console.error("Error fetching invoice:", error);
        toast.error("Failed to load invoice details");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id, apiUrl, navigate, toast]);

  if (loading) {
    return <LoadingSpinner message="Loading invoice audit..." />;
  }

  if (!invoice) return null;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <div className="cheerful-container py-4">
      <Container>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-4"
        >
          <Button
            variant="link"
            onClick={() => navigate(-1)}
            className="d-flex align-items-center gap-2 text-decoration-none text-primary p-0"
          >
            <ArrowLeft size={20} />
            <span>Back to Invoices</span>
          </Button>
        </motion.div>

        <motion.div
          className="text-center cheerful-header mb-5 position-relative"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="mb-2 text-muted d-flex align-items-center justify-content-center gap-2">
            <Receipt size={24} /> <span>Invoice Audit</span>
          </div>
          <h1 className="welcome-text display-5 mb-2">#{invoice.id}</h1>
          <p className="lead text-muted">
            Date: <span className="fw-bold">{formatDateTime(invoice.date)}</span>
          </p>
        </motion.div>

        <Row className="justify-content-center">
          <Col lg={10}>
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="d-flex flex-column gap-4">
              
              {/* General Info Row */}
              <Row className="g-4">
                <Col md={6}>
                  <motion.div variants={itemVariants}>
                    <Card className="h-100 shadow-sm border-0 bg-body">
                      <Card.Body>
                        <h5 className="mb-3 fw-bold text-theme d-flex align-items-center gap-2">
                          <PersonBadge className="text-primary" /> Patient Details
                        </h5>
                        <div className="d-flex flex-column gap-2">
                          <div><span className="text-muted small">Name:</span> <span className="fw-bold">{invoice.patient_name || "N/A"}</span></div>
                          <div><span className="text-muted small">ID/Code:</span> <span className="fw-bold">#{invoice.patientcode || "N/A"}</span></div>
                          {invoice.patient_phones && invoice.patient_phones.length > 0 && (
                            <div><span className="text-muted small">Phone:</span> <span>{invoice.patient_phones.join(", ")}</span></div>
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  </motion.div>
                </Col>

                <Col md={6}>
                  <motion.div variants={itemVariants}>
                    <Card className="h-100 shadow-sm border-0 bg-body">
                      <Card.Body>
                        <h5 className="mb-3 fw-bold text-theme d-flex align-items-center gap-2">
                          <Building className="text-primary" /> Metadata
                        </h5>
                        <div className="d-flex flex-column gap-2">
                          <div><span className="text-muted small">Referring Doctor:</span> <span className="fw-bold">{invoice.referred_doctor_name || "Self / None"}</span></div>
                          <div><span className="text-muted small">Branch:</span> <span className="fw-bold">{invoice.branch_id || "Main Branch"}</span></div>
                          <div><span className="text-muted small">Creator:</span> <span className="fw-bold">{invoice.receptionist_name || "System"} (ID: {invoice.receptionist_id})</span></div>
                        </div>
                      </Card.Body>
                    </Card>
                  </motion.div>
                </Col>
              </Row>

              {/* Items List */}
              <motion.div variants={itemVariants}>
                <Card className="shadow-sm border-0 bg-body">
                  <Card.Header className="bg-transparent border-bottom-0 pt-4 pb-0">
                    <h5 className="fw-bold text-theme">Tests & Packages</h5>
                  </Card.Header>
                  <Card.Body>
                    <Table responsive hover className="mb-0 border-top mt-2">
                      <thead className="bg-body-tertiary">
                        <tr>
                          <th>Item</th>
                          <th>Type</th>
                          <th className="text-end">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.tests?.map((t, i) => (
                          <tr key={`test-${i}`}>
                            <td className="fw-bold">{t.name}</td>
                            <td><Badge bg="info">Test</Badge></td>
                            <td className="text-end">{formatCurrency(t.price)}</td>
                          </tr>
                        ))}
                        {invoice.packages?.map((p, i) => (
                          <tr key={`pkg-${i}`}>
                            <td className="fw-bold">{p.name}</td>
                            <td><Badge bg="warning" className="text-dark">Package/Offer</Badge></td>
                            <td className="text-end">{formatCurrency(p.price)}</td>
                          </tr>
                        ))}
                        {(!invoice.tests?.length && !invoice.packages?.length) && (
                          <tr><td colSpan="3" className="text-center text-muted">No items found</td></tr>
                        )}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </motion.div>

              {/* Financials & Payments */}
              <Row className="g-4">
                <Col md={6}>
                  <motion.div variants={itemVariants}>
                    <Card className="h-100 shadow-sm border-0 bg-body">
                      <Card.Body>
                        <h5 className="mb-3 fw-bold text-theme d-flex align-items-center gap-2">
                          <CashStack className="text-primary" /> Financial Summary
                        </h5>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Subtotal:</span>
                          <span className="fw-bold">{formatCurrency(invoice.subtotal)}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted d-flex align-items-center gap-1"><Percent size={12}/> Discount:</span>
                          <span className="text-danger">-{formatCurrency(invoice.discount)}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Tax ({(parseFloat(invoice.tax_rate || 0) * 100).toFixed(2)}%):</span>
                          <span>+{formatCurrency(invoice.tax)}</span>
                        </div>
                        <hr />
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted fw-bold">Total:</span>
                          <span className="fw-bold fs-5 text-primary">{formatCurrency(invoice.total)}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Paid:</span>
                          <span className="fw-bold text-success">{formatCurrency(invoice.paid)}</span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Due:</span>
                          <span className={`fw-bold ${parseFloat(invoice.due || 0) > 0 ? 'text-danger' : parseFloat(invoice.due || 0) < 0 ? 'text-info' : 'text-success'}`}>
                            {parseFloat(invoice.due || 0) < 0 ? 'Credit: ' : ''}
                            {formatCurrency(Math.abs(invoice.due || 0))}
                          </span>
                        </div>
                      </Card.Body>
                    </Card>
                  </motion.div>
                </Col>

                <Col md={6}>
                  <motion.div variants={itemVariants}>
                    <Card className="h-100 shadow-sm border-0 bg-body">
                      <Card.Body>
                        <h5 className="mb-3 fw-bold text-theme d-flex align-items-center gap-2">
                          <CreditCard className="text-primary" /> Payment Methods
                        </h5>
                        {invoice.payments?.length > 0 ? (
                          <div className="d-flex flex-column gap-3 mt-3">
                            {invoice.payments.map((pm, i) => (
                              <div key={i} className="d-flex justify-content-between align-items-center p-3 border rounded bg-body-tertiary">
                                <span className="fw-bold">{pm.payment_method_name}</span>
                                <Badge bg="success" className="fs-6 px-3 py-2">{formatCurrency(pm.paid_amount)}</Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center text-muted mt-4">
                            No payments recorded.
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </motion.div>
                </Col>
              </Row>

            </motion.div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default AuditInvoiceView;
