import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Badge, Button, Table } from "react-bootstrap";
import { motion } from "framer-motion";
import { Receipt, Download, ClockHistory, ArrowLeft } from "react-bootstrap-icons";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { formatDate } from "../../utils/dateFormatter";
import axios from "axios";
import { useToast } from "../../components/ui/ToastContext";

const PatientInvoices = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchInvoices = async () => {
    /* 
    // API placeholder for when the backend endpoint is ready
    try {
      setLoading(true);
      const response = await axios.get("/api/patient/invoices");
      setInvoices(response.data);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to load invoice history");
    } finally {
      setLoading(false);
    }
    */
  };

  useEffect(() => {
    if (user) {
      fetchInvoices();
    }
  }, [user]);

  if (!user || loading) {
    return <LoadingSpinner message="Loading your invoices..." />;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  const getStatusBadge = (status) => {
    switch (status.toLowerCase()) {
      case "paid":
        return <Badge bg="success" className="px-3 py-2 rounded-pill">Paid</Badge>;
      case "pending":
        return <Badge bg="warning" text="dark" className="px-3 py-2 rounded-pill">Pending</Badge>;
      default:
        return <Badge bg="secondary" className="px-3 py-2 rounded-pill">{status}</Badge>;
    }
  };

  return (
    <div className="cheerful-container py-5">
      <Container>
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-4 d-flex align-items-center gap-3"
        >
          <Button
            variant="link"
            onClick={() => navigate(-1)}
            className="text-decoration-none text-primary p-0 d-flex align-items-center"
            style={{ width: "40px", height: "40px", justifyContent: "center", borderRadius: "50%", background: "var(--bg-elevated)" }}
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h2 className="fw-bold mb-0 text-theme">My Invoices</h2>
            <p className="text-muted mb-0">View and manage your billing history</p>
          </div>
        </motion.div>

        {/* Invoices List */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {invoices.length === 0 ? (
            <motion.div variants={itemVariants}>
              <Card className="patient-profile-card border-0 p-5 text-center">
                <Card.Body>
                  <div className="mb-3 text-muted opacity-50">
                    <Receipt size={64} />
                  </div>
                  <h4 className="fw-bold text-muted">No Invoices Found</h4>
                  <p className="text-muted mb-0">You don't have any invoices history yet.</p>
                </Card.Body>
              </Card>
            </motion.div>
          ) : (
            <Row className="g-4">
              {invoices.map((invoice) => (
                <Col lg={6} key={invoice._id}>
                  <motion.div variants={itemVariants}>
                    <Card className="patient-profile-card border-0 h-100">
                      <Card.Body className="p-4">
                        <div className="d-flex justify-content-between align-items-start mb-4">
                          <div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <Receipt className="text-primary" size={20} />
                              <h5 className="fw-bold mb-0 text-theme">#{invoice.id}</h5>
                            </div>
                            <small className="text-muted d-flex align-items-center gap-1">
                              <ClockHistory size={14} />
                              {formatDate(invoice.date)}
                            </small>
                          </div>
                          <div>{getStatusBadge(invoice.status)}</div>
                        </div>

                        <div className="bg-theme-surface rounded p-3 mb-4 border border-muted">
                          <p className="text-muted small mb-2 text-uppercase fw-bold">Tests Included</p>
                          <ul className="list-unstyled mb-0">
                            {invoice.tests && invoice.tests.map((test, idx) => (
                              <li key={idx} className="mb-1 text-theme">• {test.name || test}</li>
                            ))}
                            {invoice.packages && invoice.packages.map((pkg, idx) => (
                              <li key={idx} className="mb-1 text-theme">• {pkg.name} (Package)</li>
                            ))}
                          </ul>
                        </div>

                        <div className="d-flex justify-content-between align-items-center border-top border-muted pt-3">
                          <div>
                            <p className="text-muted small mb-0">Total Amount</p>
                            <h4 className="fw-bold text-primary mb-0">${parseFloat(invoice.total || 0).toFixed(2)}</h4>
                          </div>
                          <Button 
                            variant="outline-primary" 
                            className="d-flex align-items-center gap-2 rounded-pill px-4"
                            onClick={() => toast.info("Download receipt feature coming soon!")}
                          >
                            <Download size={18} />
                            Download
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </motion.div>
                </Col>
              ))}
            </Row>
          )}
        </motion.div>
      </Container>
    </div>
  );
};

export default PatientInvoices;
