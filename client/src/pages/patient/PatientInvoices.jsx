import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Badge, Button } from "react-bootstrap";
import { motion } from "framer-motion";
import { Receipt, Download, ClockHistory, ArrowLeft, Building, GeoAlt } from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { formatDate } from "../../utils/dateFormatter";
import axios from "axios";
import { useToast } from "../../components/ui/ToastContext";

// ─── Mock data for development ───────────────────────────────────────────────
// Replace with real API data when the backend endpoint is ready.
// Status logic:
//   "paid"    → fully settled, no outstanding balance
//   "pending" → outstanding balance exists (due > 0 means patient owes lab,
//               credit > 0 means lab owes patient)
const MOCK_INVOICES = [
  {
    _id: "mock-inv-001",
    id: "INV-2025-001",
    date: "2025-04-20T10:30:00.000Z",
    status: "paid",
    due: 0,
    credit: 0,
    total: 1250.00,
    lab_name: "BioLab Diagnostics",
    branch_name: "Downtown Branch",
    tests: [
      { name: "Complete Blood Count (CBC)", price: 350 },
      { name: "Glucose Fasting", price: 200 },
      { name: "Liver Function Test (LFT)", price: 400 },
    ],
    packages: [
      { name: "Basic Checkup Package", price: 300 },
    ],
  },
  {
    _id: "mock-inv-002",
    id: "INV-2025-002",
    date: "2025-04-22T14:15:00.000Z",
    status: "pending",
    due: 150.50,    // Patient owes the lab 150.50
    credit: 0,
    total: 650.50,
    lab_name: "BioLab Diagnostics",
    branch_name: "Nasr City Branch",
    tests: [
      { name: "Thyroid Panel (TSH, T3, T4)", price: 450 },
      { name: "Urine Analysis", price: 200.50 },
    ],
    packages: [],
  },
  {
    _id: "mock-inv-003",
    id: "INV-2025-003",
    date: "2025-04-25T09:00:00.000Z",
    status: "pending",
    due: 0,
    credit: 75.00,  // Lab owes the patient 75.00 (overpayment)
    total: 500.00,
    lab_name: "BioLab Diagnostics",
    branch_name: "Downtown Branch",
    tests: [
      { name: "Vitamin D", price: 300 },
      { name: "Iron Studies", price: 200 },
    ],
    packages: [],
  },
  {
    _id: "mock-inv-004",
    id: "INV-2025-004",
    date: "2025-03-10T08:45:00.000Z",
    status: "paid",
    due: 0,
    credit: 0,
    total: 1800.00,
    lab_name: "BioLab Diagnostics",
    branch_name: "Heliopolis Branch",
    tests: [
      { name: "HbA1c", price: 250 },
      { name: "Lipid Profile", price: 350 },
    ],
    packages: [
      { name: "Comprehensive Health Screening", price: 1200 },
    ],
  },
];

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

    // Load mock data for now
    setInvoices(MOCK_INVOICES);
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

  /**
   * Renders the status badge for an invoice.
   * - "paid"    → green badge, fully settled
   * - "pending" → yellow badge, with due/credit amount shown beside it
   */
  const getStatusBadge = (invoice) => {
    const status = (invoice.status || "").toLowerCase();
    const due = parseFloat(invoice.due || 0);
    const credit = parseFloat(invoice.credit || 0);

    switch (status) {
      case "paid":
        return <Badge bg="success" className="px-3 py-2 rounded-pill">Paid</Badge>;
      case "pending":
        return (
          <div className="d-flex flex-column align-items-end gap-1">
            <Badge bg="warning" text="dark" className="px-3 py-2 rounded-pill">Pending</Badge>
            {/* Show the outstanding amount (due or credit) next to the badge */}
            {due > 0 && (
              <small className="text-danger fw-semibold">
                Due: EGP {due.toFixed(2)}
              </small>
            )}
            {credit > 0 && (
              <small className="text-success fw-semibold">
                Credit: EGP {credit.toFixed(2)}
              </small>
            )}
          </div>
        );
      default:
        return <Badge bg="secondary" className="px-3 py-2 rounded-pill">{invoice.status}</Badge>;
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
                        {/* Invoice header: ID, date, status */}
                        <div className="d-flex justify-content-between align-items-start mb-3">
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
                          <div>{getStatusBadge(invoice)}</div>
                        </div>

                        {/* Lab name & branch name */}
                        <div className="d-flex flex-wrap gap-3 mb-3 text-muted small">
                          {invoice.lab_name && (
                            <span className="d-flex align-items-center gap-1">
                              <Building size={14} />
                              {invoice.lab_name}
                            </span>
                          )}
                          {invoice.branch_name && (
                            <span className="d-flex align-items-center gap-1">
                              <GeoAlt size={14} />
                              {invoice.branch_name}
                            </span>
                          )}
                        </div>

                        {/* Tests & packages with individual prices */}
                        <div className="bg-theme-surface rounded p-3 mb-4 border border-muted">
                          <p className="text-muted small mb-2 text-uppercase fw-bold">Tests Included</p>
                          <ul className="list-unstyled mb-0">
                            {invoice.tests && invoice.tests.map((test, idx) => (
                              <li key={idx} className="mb-1 d-flex justify-content-between text-theme">
                                <span>• {test.name || test}</span>
                                {/* Show individual test price if available */}
                                {test.price !== undefined && (
                                  <span className="text-muted fw-semibold">
                                    EGP {parseFloat(test.price).toFixed(2)}
                                  </span>
                                )}
                              </li>
                            ))}
                            {invoice.packages && invoice.packages.map((pkg, idx) => (
                              <li key={`pkg-${idx}`} className="mb-1 d-flex justify-content-between text-theme">
                                <span>• {pkg.name} <Badge bg="info" className="ms-1 fw-normal" style={{ fontSize: "0.7rem" }}>Package</Badge></span>
                                {pkg.price !== undefined && (
                                  <span className="text-muted fw-semibold">
                                    EGP {parseFloat(pkg.price).toFixed(2)}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Footer: total amount & download */}
                        <div className="d-flex justify-content-between align-items-center border-top border-muted pt-3">
                          <div>
                            <p className="text-muted small mb-0">Total Amount</p>
                            <h4 className="fw-bold text-primary mb-0">EGP {parseFloat(invoice.total || 0).toFixed(2)}</h4>
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
