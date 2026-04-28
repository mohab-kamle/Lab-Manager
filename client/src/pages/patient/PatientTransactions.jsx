import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Button, ListGroup } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Wallet2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Receipt, 
  Building,
  ClockHistory
} from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../utils/currencyFormatter';
import { formatDate } from '../../utils/dateFormatter';
import TransactionStatusBadge from '../../components/ui/TransactionStatusBadge';
import { useToast } from '../../components/ui/ToastContext';

/**
 * PatientTransactions component to display personal financial history for patients.
 */
// MOCK DATA for patient financial history
const MOCK_PATIENT_TRANSACTIONS = [
  {
    transactionId: "TXN-10001",
    date: "2024-04-28T14:30:00Z",
    amount: 1250.00,
    processType: "Payment",
    paidWith: "Visa",
    branchName: "Maadi Main Branch",
    summary: "CBC, Liver Profile, Lipid Profile",
    invoiceId: "INV-5001"
  },
  {
    transactionId: "TXN-10004",
    date: "2024-04-27T11:20:00Z",
    amount: 750.00,
    processType: "Due Settlement",
    paidWith: "Wallet",
    branchName: "Maadi Main Branch",
    summary: "Settlement for INV-9902",
    invoiceId: "INV-9902"
  },
  {
    transactionId: "TXN-10002",
    date: "2024-04-25T15:45:00Z",
    amount: 300.00,
    processType: "Refund",
    paidWith: "Cash",
    branchName: "Maadi Main Branch",
    summary: "Refund for Vitamin D (Cancelled)",
    invoiceId: "INV-4998"
  },
  {
    transactionId: "TXN-10009",
    date: "2024-04-20T10:00:00Z",
    amount: 2500.00,
    processType: "Due",
    paidWith: "N/A",
    branchName: "Dokki Branch",
    summary: "MRI Scan - Lumbar Spine",
    invoiceId: "INV-4882"
  }
];

const PatientTransactions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        /*
        // REAL API CALL - Commented out for development
        const response = await api.get('/patient/transactions');
        setTransactions(response.data || []);
        */

        // Using MOCK DATA for testing
        setTimeout(() => {
          setTransactions(MOCK_PATIENT_TRANSACTIONS);
          setLoading(false);
        }, 800);

      } catch (error) {
        console.error('Error fetching transactions:', error);
        // For development, we might fallback to empty or mock if backend isn't ready
        setTransactions([]);
        toast.error('Failed to load transaction history');
      } finally {
        // setLoading(false); // Handled in setTimeout above
      }
    };

    if (user) {
      fetchTransactions();
    }
  }, [user, toast]);

  const totals = useMemo(() => {
    return transactions.reduce((acc, curr) => {
      const amount = parseFloat(curr.amount) || 0;
      const type = curr.processType?.toLowerCase();
      if (type === 'payment' || type === 'due settlement') {
        acc.payments += amount;
      } else if (type === 'due') {
        acc.dues += amount;
      } else if (type === 'refund') {
        acc.payments -= amount;
      }
      return acc;
    }, { payments: 0, dues: 0 });
  }, [transactions]);

  if (loading) return <LoadingSpinner message="Loading your transaction history..." />;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
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
            className="text-decoration-none text-primary p-0 d-flex align-items-center justify-content-center"
            style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-elevated)' }}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h2 className="fw-bold mb-0 text-theme">Financial History</h2>
            <p className="text-muted mb-0">Track your payments and personal billing transparency</p>
          </div>
        </motion.div>

        {/* Financial Summary Breakdown */}
        <Row className="mb-5 g-4">
            <Col md={6}>
                <Card className="patient-profile-card border-0 bg-success bg-opacity-10 shadow-sm h-100 overflow-hidden">
                    <Card.Body className="d-flex align-items-center p-4">
                        <div className="rounded-circle bg-success p-3 me-3 text-white shadow-sm">
                            <ArrowUpRight size={24} />
                        </div>
                        <div>
                            <small className="text-muted d-block text-uppercase fw-bold ls-1">Total Paid</small>
                            <h3 className="mb-0 fw-bold text-success">{formatCurrency(totals.payments)}</h3>
                        </div>
                    </Card.Body>
                </Card>
            </Col>
            <Col md={6}>
                <Card className="patient-profile-card border-0 bg-danger bg-opacity-10 shadow-sm h-100 overflow-hidden">
                    <Card.Body className="d-flex align-items-center p-4">
                        <div className="rounded-circle bg-danger p-3 me-3 text-white shadow-sm">
                            <ArrowDownLeft size={24} />
                        </div>
                        <div>
                            <small className="text-muted d-block text-uppercase fw-bold ls-1">Outstanding Dues</small>
                            <h3 className="mb-0 fw-bold text-danger">{formatCurrency(totals.dues)}</h3>
                        </div>
                    </Card.Body>
                </Card>
            </Col>
        </Row>

        {/* Transactions Timeline */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          {transactions.length === 0 ? (
            <Card className="patient-profile-card border-0 p-5 text-center shadow-sm">
                <Card.Body>
                  <div className="mb-3 text-muted opacity-25">
                    <Wallet2 size={64} />
                  </div>
                  <h4 className="fw-bold text-muted">No Transactions Found</h4>
                  <p className="text-muted mb-0">Your financial event history is currently empty.</p>
                </Card.Body>
            </Card>
          ) : (
            <ListGroup className="gap-3">
              {transactions.map((txn) => (
                <motion.div key={txn.transactionId} variants={itemVariants}>
                  <Card className="patient-profile-card border-0 shadow-sm overflow-hidden hover-shadow-lg transition-all">
                    <Card.Body className="p-4">
                      <Row className="align-items-center">
                        <Col md={2} className="mb-3 mb-md-0 border-end-md">
                           <div className="small text-muted mb-1 d-flex align-items-center gap-1">
                               <ClockHistory size={14} />
                               {formatDate(txn.date)}
                           </div>
                           <div className="text-monospace small fw-bold text-primary">#{txn.transactionId}</div>
                        </Col>
                        <Col md={2} className="mb-3 mb-md-0 text-center">
                            <TransactionStatusBadge processType={txn.processType} />
                        </Col>
                        <Col md={3} className="mb-3 mb-md-0">
                            <div className="d-flex align-items-center gap-2 mb-1">
                                <Building className="text-primary" size={16} />
                                <span className="fw-semibold small text-theme">{txn.branchName}</span>
                            </div>
                            <div className="small text-muted ps-4">Paid via: {txn.paidWith || 'N/A'}</div>
                        </Col>
                        <Col md={3} className="mb-3 mb-md-0">
                             <div className="small text-muted mb-1 fw-bold text-uppercase ls-1" style={{ fontSize: '0.7rem' }}>Service Summary</div>
                             <div className="small text-truncate text-theme" title={txn.summary}>
                                 {txn.summary || 'General Service'}
                             </div>
                        </Col>
                        <Col md={2} className="text-md-end">
                            <h4 className={`fw-bold mb-0 ${txn.processType?.toLowerCase() === 'refund' ? 'text-danger' : 'text-success'}`}>
                                {txn.processType?.toLowerCase() === 'refund' ? '-' : ''}
                                {formatCurrency(txn.amount)}
                            </h4>
                            {txn.invoiceId && (
                                <Button 
                                  variant="link" 
                                  size="sm" 
                                  className="p-0 mt-1 small text-decoration-none d-flex align-items-center justify-content-md-end gap-1 mx-auto ms-md-auto me-md-0"
                                  onClick={() => toast.info(`Invoice ${txn.invoiceId} details coming soon`)}
                                >
                                    <Receipt size={14} />
                                    <span>Invoice #{txn.invoiceId}</span>
                                </Button>
                            )}
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </motion.div>
              ))}
            </ListGroup>
          )}
        </motion.div>
      </Container>
    </div>
  );
};

export default PatientTransactions;
