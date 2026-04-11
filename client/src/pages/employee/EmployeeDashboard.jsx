import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, ListGroup, Spinner, Alert, Badge } from 'react-bootstrap';
import { Eye, FileText, Plus, Activity, User, ClipboardList, TestTube, Beaker, TrendingUp, AlertTriangle, CheckCircle, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { resetNavbarTitles, resetNavbarActiveState } from '../../components/layout/MainNavBar';

const EmployeeDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL;
  useEffect(() => {
      resetNavbarTitles();
      resetNavbarActiveState();
    }, []);
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        
        // Fetch employee-accessible stats (read-only)
        const [reportsResponse, testsResponse, culturesResponse, invoicesResponse] = await Promise.all([
          axios.get(`${apiUrl}/medical-reports`, { headers }),
          axios.get(`${apiUrl}/tests`, { headers }),
          axios.get(`${apiUrl}/cultures`, { headers }),
          axios.get(`${apiUrl}/invoices`, { headers })
        ]);

        const stats = {
          totalReports: reportsResponse.data.length || 0,
          totalTests: testsResponse.data.length || 0,
          totalCultures: culturesResponse.data.length || 0,
          totalInvoices: invoicesResponse.data.length || 0,
          recentReports: reportsResponse.data.slice(0, 5) || [],
          recentInvoices: invoicesResponse.data.slice(0, 5) || []
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
      title: 'View Reports',
      description: 'Browse medical reports',
      icon: <FileText size={24} />,
      variant: 'primary',
      action: () => navigate('/admin/dashboard/medical-reports')
    },
    {
      title: 'View Tests',
      description: 'Browse test catalog',
      icon: <TestTube size={24} />,
      variant: 'success',
      action: () => navigate('/admin/dashboard/tests')
    },
    {
      title: 'View Cultures',
      description: 'Browse culture types',
      icon: <Beaker size={24} />,
      variant: 'info',
      action: () => navigate('/admin/dashboard/cultures')
    },
    {
      title: 'View Invoices',
      description: 'Browse invoices',
      icon: <ClipboardList size={24} />,
      variant: 'warning',
      action: () => navigate('/admin/dashboard/invoices')
    }
  ];

  if (loading) {
    return (
      <LoadingSpinner message="Loading dashboard stats..." />
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="mb-3 text-center text-md-center">
            <Eye size={28} className="me-2" />
            Employee Dashboard
          </h2>
          <p className="text-muted">Welcome back, {user?.name || 'Employee'}! You have read-only access to system information.</p>
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
              <h4>{stats?.totalReports || 0}</h4>
              <p className="text-muted mb-0">Medical Reports</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body>
              <TestTube size={32} className="text-success mb-2" />
              <h4>{stats?.totalTests || 0}</h4>
              <p className="text-muted mb-0">Available Tests</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body>
              <Beaker size={32} className="text-info mb-2" />
              <h4>{stats?.totalCultures || 0}</h4>
              <p className="text-muted mb-0">Culture Types</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body>
              <ClipboardList size={32} className="text-warning mb-2" />
              <h4>{stats?.totalInvoices || 0}</h4>
              <p className="text-muted mb-0">Total Invoices</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Quick Actions (Read-Only)</h5>
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
              <h5 className="mb-0">Recent Medical Reports</h5>
            </Card.Header>
            <Card.Body>
              {stats?.recentReports?.length > 0 ? (
                <ListGroup variant="flush">
                  {stats.recentReports.map((report, index) => (
                    <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>Report #{report.id}</strong>
                        <br />
                        <small className="text-muted">
                          Patient: {report.patient?.name || 'Unknown'}
                        </small>
                      </div>
                      <Badge bg={report.status === 'completed' ? 'success' : report.status === 'pending' ? 'warning' : 'secondary'}>
                        {report.status || 'pending'}
                      </Badge>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <p className="text-muted text-center">No recent reports</p>
              )}
            </Card.Body>
          </Card>
        </Col>
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
      </Row>

      {/* Access Information */}
      <Row className="mt-4">
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Your Access Level</h5>
            </Card.Header>
            <Card.Body>
              <Alert variant="info">
                <strong>Read-Only Access:</strong> You can view system information but cannot create, edit, or delete records.
                <br />
                <small>Contact your administrator if you need additional permissions.</small>
              </Alert>
              <ListGroup variant="flush">
                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Medical Reports</strong>
                    <br />
                    <small className="text-muted">View patient reports and results</small>
                  </div>
                  <CheckCircle size={20} className="text-success" />
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Tests & Cultures</strong>
                    <br />
                    <small className="text-muted">Browse test and culture catalogs</small>
                  </div>
                  <CheckCircle size={20} className="text-success" />
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Invoices</strong>
                    <br />
                    <small className="text-muted">View invoice information</small>
                  </div>
                  <CheckCircle size={20} className="text-success" />
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default EmployeeDashboard; 