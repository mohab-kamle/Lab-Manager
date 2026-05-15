import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, ListGroup, Spinner, Alert, Badge } from 'react-bootstrap';
import { Users, FileText, Plus, Activity, UserPlus, ClipboardList, DollarSign, CreditCard, TrendingUp, Phone, Calendar, Receipt, ScanBarcode } from 'lucide-react';
import SettlementModal from '../../components/settlement/SettlementModal';
import SampleQuickInfoModal from '../../components/samples/SampleQuickInfoModal';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { resetNavbarTitles, resetNavbarActiveState } from '../../components/layout/MainNavBar';

const ReceptionistDashboard = () => {
  useEffect(() => {
  resetNavbarTitles();
  resetNavbarActiveState();
}, []);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        
        // Fetch receptionist-specific stats
        const [invoicesResponse, patientsResponse] = await Promise.all([
          axios.get(`${apiUrl}/invoices`, { headers }),
          axios.get(`${apiUrl}/patient`, { headers })
        ]);

        const stats = {
          totalInvoices: invoicesResponse.data.length || 0,
          totalPatients: patientsResponse.data.length || 0,
          recentInvoices: invoicesResponse.data.slice(0, 5) || [],
          recentPatients: patientsResponse.data.slice(0, 5) || []
        };

        setStats(stats);
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Failed to load dashboard stats.');
      }
      setLoading(false);
    };
    fetchStats();
  }, [apiUrl]);

  const quickActions = [
    {
      title: 'Scan Sample',
      description: 'Quick scan a sample barcode',
      icon: <ScanBarcode size={24} />,
      action: () => setShowScanModal(true)
    },
    {
      title: 'New Patient',
      description: 'Register a new patient',
      icon: <UserPlus size={24} />,
      action: () => navigate(`/${user?.role}/patients`, { state: { openAddModal: true } })
    },
    {
      title: 'Create Invoice',
      description: 'Generate new invoice',
      icon: <FileText size={24} />,
      action: () => navigate(`/${user?.role}/invoices`, { state: { openAddModal: true } })
    },
    {
      title: 'View Reports',
      description: 'Check medical reports',
      icon: <ClipboardList size={24} />,
      action: () => navigate(`/${user?.role}/medical-reports`)
    },
    {
      title: 'Patient List',
      description: 'Manage patients',
      icon: <Users size={24} />,
      action: () => navigate(`/${user?.role}/patients`)
    },
    {
      title: 'Settlement',
      description: 'Settle patient bills',
      icon: <Receipt size={24} />,
      action: () => setShowSettlementModal(true)
    }
  ];

  if (loading) {
    return (
      <LoadingSpinner message="Loading dashboard stats..." />
    );
  }

  return (
    <>
    <SampleQuickInfoModal show={showScanModal} onHide={() => setShowScanModal(false)} />
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="mb-3 text-center text-md-center">
            <Phone size={28} className="me-2" />
            Receptionist Dashboard
          </h2>
          <p className="text-muted">Welcome back, {user?.name || 'Receptionist'}! Manage patients, invoices, and appointments.</p>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body>
              <FileText size={32} className="text-primary mb-2" />
              <h4>{stats?.totalInvoices || 0}</h4>
              <p className="text-muted mb-0">Total Invoices</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body>
              <Users size={32} className="text-success mb-2" />
              <h4>{stats?.totalPatients || 0}</h4>
              <p className="text-muted mb-0">Total Patients</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body>
              <Calendar size={32} className="text-info mb-2" />
              <h4>Today</h4>
              <p className="text-muted mb-0">Appointments</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body>
              <DollarSign size={32} className="text-warning mb-2" />
              <h4>Active</h4>
              <p className="text-muted mb-0">Payment Methods</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Quick Actions</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                {quickActions.map((action, index) => (
                  <Col xs={6} md={4} lg={2} key={index} className="mb-3">
                    <Button
                      className="btn-dashboard-action w-100"
                      onClick={action.action}
                    >
                      <div className="mb-1">{action.icon}</div>
                      <strong>{action.title}</strong>
                      <small className="d-block text-center mt-1">{action.description}</small>
                    </Button>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Activity */}
      <Row>
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Recent Invoices</h5>
            </Card.Header>
            <Card.Body>
              {stats?.recentInvoices?.length > 0 ? (
                <ListGroup variant="flush">
                  {stats.recentInvoices.map((invoice, index) => (
                    <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>Invoice #{invoice.id}</strong>
                        <br />
                        <small className="text-muted">
                          {invoice.patient_name || 'Unknown Patient'}
                        </small>
                      </div>
                      <Badge bg={(invoice.status?.state || invoice.status) === 'paid' ? 'success' : 'warning'}>
                        {invoice.status?.state || invoice.status || 'pending'}
                      </Badge>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <p className="text-muted text-center">No recent invoices</p>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Recent Patients</h5>
            </Card.Header>
            <Card.Body>
              {stats?.recentPatients?.length > 0 ? (
                <ListGroup variant="flush">
                  {stats.recentPatients.map((patient, index) => (
                    <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{patient.name}</strong>
                        <br />
                        <small className="text-muted">
                          ID: {patient.patientcode}
                        </small>
                      </div>
                      <Badge bg="info">Active</Badge>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <p className="text-muted text-center">No recent patients</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>

      <SettlementModal
        show={showSettlementModal}
        onHide={() => setShowSettlementModal(false)}
      />
    </>
  );
};

export default ReceptionistDashboard; 