import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, ListGroup, Spinner, Alert, Badge } from 'react-bootstrap';
import { Eye, FileText, Plus, Activity, User, ClipboardList, TestTube, Beaker, TrendingUp, AlertTriangle, CheckCircle, Users, ScanBarcode, FlaskConical, Microscope, LayoutGrid, FlaskRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { resetNavbarTitles, resetNavbarActiveState } from '../../components/layout/MainNavBar';
import SampleQuickInfoModal from '../../components/samples/SampleQuickInfoModal';

const EmployeeDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showScanModal, setShowScanModal] = useState(false);
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
        const [reportsResponse, testsResponse, invoicesResponse] = await Promise.all([
          axios.get(`${apiUrl}/medical-reports`, { headers }),
          axios.get(`${apiUrl}/tests`, { headers }),
          axios.get(`${apiUrl}/invoices`, { headers })
        ]);

        const stats = {
          totalReports: reportsResponse.data.length || 0,
          totalTests: testsResponse.data.length || 0,
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

  const actions = [
    {
      icon: <ScanBarcode size={20} />,
      label: 'Scan Sample',
      onClick: () => setShowScanModal(true),
    },
    {
      icon: <FileText size={20} />,
      label: 'Medical Reports',
      onClick: () => navigate(`/${user.role}/medical-reports`),
    },
    {
      icon: <Activity size={20} />,
      label: 'Samples Kanban',
      onClick: () => navigate(`/${user.role}/samples-kanban`),
    },
    {
      icon: <ClipboardList size={20} />,
      label: 'Invoices',
      onClick: () => navigate(`/${user.role}/invoices`),
    },
    {
      icon: <Microscope size={20} />,
      label: 'Test Catalog',
      onClick: () => navigate(`/${user.role}/tests`),
    },
    {
      icon: <LayoutGrid size={20} />,
      label: 'Categories',
      onClick: () => navigate(`/${user.role}/categories`),
    },
    {
      icon: <FlaskRound size={20} />,
      label: 'Outsourced Labs',
      onClick: () => navigate(`/${user.role}/outsourced-labs`),
    },
    {
      icon: <User size={20} />,
      label: 'My Profile',
      onClick: () => navigate('/employee/profile'),
    },
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
      <Row className="g-3 mb-3">
        <Col xs={6} sm={4}>
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Body>
              <div className="mb-2 text-primary">
                <FileText size={28} />
              </div>
              <h4 className="mb-1">{stats?.totalReports || 0}</h4>
              <div className="text-muted small">Medical Reports</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} sm={4}>
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Body>
              <div className="mb-2 text-success">
                <TestTube size={28} />
              </div>
              <h4 className="mb-1">{stats?.totalTests || 0}</h4>
              <div className="text-muted small">Available Tests</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Body>
              <div className="mb-2 text-warning">
                <ClipboardList size={28} />
              </div>
              <h4 className="mb-1">{stats?.totalInvoices || 0}</h4>
              <div className="text-muted small">Total Invoices</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Action Shortcuts */}
      <Row className="g-3 mb-4">
        {actions.map((action, idx) => (
          <Col xs={6} sm={3} key={idx}>
            <Button
              className="btn-dashboard-action w-100"
              onClick={action.onClick}
            >
              {action.icon}
              <span className="small fw-bold">{action.label}</span>
            </Button>
          </Col>
        ))}
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
                    <strong>Tests Catalog</strong>
                    <br />
                    <small className="text-muted">Browse test catalog</small>
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
    </>
  );
};

export default EmployeeDashboard; 