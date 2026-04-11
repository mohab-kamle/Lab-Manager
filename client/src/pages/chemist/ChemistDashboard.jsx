import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, ListGroup, Spinner, Alert, Badge } from 'react-bootstrap';
import { FlaskConical, FileText, Plus, Activity, TestTube, ClipboardList, Microscope, Beaker, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { resetNavbarTitles, resetNavbarActiveState } from '../../components/layout/MainNavBar';

const ChemistDashboard = () => {
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
        
        // Fetch chemist-specific stats
        const [reportsResponse, testsResponse] = await Promise.all([
          axios.get(`${apiUrl}/medical-reports`, { headers }),
          axios.get(`${apiUrl}/tests`, { headers })
        ]);

        const stats = {
          totalReports: reportsResponse.data.length || 0,
          totalTests: testsResponse.data.length || 0,
          recentReports: reportsResponse.data.slice(0, 5) || [],
          pendingReports: reportsResponse.data.filter(report => report.status === 'pending').length || 0
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
      title: 'Medical Reports',
      description: 'View and manage reports',
      icon: <FileText size={24} />,
      variant: 'primary',
      action: () => navigate('/admin/dashboard/medical-reports')
    },
    {
      title: 'Test Groups',
      description: 'Manage test configurations',
      icon: <TestTube size={24} />,
      variant: 'success',
      action: () => navigate('/admin/dashboard/test-groups')
    },

    {
      title: 'Tests',
      description: 'View test catalog',
      icon: <Microscope size={24} />,
      variant: 'warning',
      action: () => navigate('/admin/dashboard/tests')
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
            <FlaskConical size={28} className="me-2" />
            Chemist Dashboard
          </h2>
          <p className="text-muted">Welcome back, {user?.name || 'Chemist'}! Manage lab work, test results, and medical reports.</p>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="text-center h-100">
            <Card.Body>
              <FileText size={32} className="text-primary mb-2" />
              <h4>{stats?.totalReports || 0}</h4>
              <p className="text-muted mb-0">Total Reports</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center h-100">
            <Card.Body>
              <AlertTriangle size={32} className="text-warning mb-2" />
              <h4>{stats?.pendingReports || 0}</h4>
              <p className="text-muted mb-0">Pending Reports</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center h-100">
            <Card.Body>
              <TestTube size={32} className="text-success mb-2" />
              <h4>{stats?.totalTests || 0}</h4>
              <p className="text-muted mb-0">Available Tests</p>
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
                  <Col md={4} key={index} className="mb-3">
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
              <h5 className="mb-0">Lab Status</h5>
            </Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Equipment Status</strong>
                    <br />
                    <small className="text-muted">All systems operational</small>
                  </div>
                  <CheckCircle size={20} className="text-success" />
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Sample Processing</strong>
                    <br />
                    <small className="text-muted">Normal queue</small>
                  </div>
                  <Badge bg="info">Normal</Badge>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Quality Control</strong>
                    <br />
                    <small className="text-muted">All tests passed</small>
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

export default ChemistDashboard; 