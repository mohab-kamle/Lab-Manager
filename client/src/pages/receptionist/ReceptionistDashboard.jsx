import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, ListGroup, Spinner, Alert, Badge } from 'react-bootstrap';
import { Users, FileText, Plus, Activity, UserPlus, ClipboardList, DollarSign, CreditCard, TrendingUp, Phone, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
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
      title: 'New Patient',
      description: 'Register a new patient',
      icon: <UserPlus size={24} />,
      variant: 'primary',
      action: () => navigate('/admin/dashboard/patients')
    },
    {
      title: 'Create Invoice',
      description: 'Generate new invoice',
      icon: <FileText size={24} />,
      variant: 'success',
      action: () => navigate('/admin/dashboard/invoices')
    },
    {
      title: 'View Reports',
      description: 'Check medical reports',
      icon: <ClipboardList size={24} />,
      variant: 'info',
      action: () => navigate('/admin/dashboard/medical-reports')
    },
    {
      title: 'Patient List',
      description: 'Manage patients',
      icon: <Users size={24} />,
      variant: 'warning',
      action: () => navigate('/admin/dashboard/patients')
    }
  ];

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
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
                  <Col md={3} key={index} className="mb-3">
                    <Button
                      variant={action.variant}
                      className="w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3"
                      onClick={action.action}
                    >
                      <div className="mb-2">{action.icon}</div>
                      <strong>{action.title}</strong>
                      <small className="d-block mt-1">{action.description}</small>
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
                          {invoice.patient?.name || 'Unknown Patient'}
                        </small>
                      </div>
                      <Badge bg={invoice.status === 'paid' ? 'success' : 'warning'}>
                        {invoice.status || 'pending'}
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
  );
};

export default ReceptionistDashboard; 