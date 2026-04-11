import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, ListGroup, Spinner, Alert, Badge } from 'react-bootstrap';
import { Stethoscope, FileText, Plus, Activity, User, ClipboardList, Heart, TrendingUp, AlertTriangle, CheckCircle, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { resetNavbarTitles, resetNavbarActiveState } from '../../components/layout/MainNavBar';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const DoctorDashboard = () => {
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
        
        // Fetch doctor-specific stats
        const [reportsResponse, patientsResponse] = await Promise.all([
          axios.get(`${apiUrl}/medical-reports`, { headers }),
          axios.get(`${apiUrl}/patient`, { headers })
        ]);

        const stats = {
          totalReports: reportsResponse.data.length || 0,
          totalPatients: patientsResponse.data.length || 0,
          recentReports: reportsResponse.data.slice(0, 5) || [],
          pendingReports: reportsResponse.data.filter(report => report.status === 'pending').length || 0,
          completedReports: reportsResponse.data.filter(report => report.status === 'completed').length || 0
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
      description: 'View patient reports',
      icon: <FileText size={24} />,
      variant: 'outline-primary',
      action: () => navigate('/doctor/medical-reports')
    },
    {
      title: 'Patient Data',
      description: 'Access patient information',
      icon: <User size={24} />,
      variant: 'outline-success',
      action: () => navigate('/doctor/patients')
    },
    {
      title: 'Test Results',
      description: 'Review lab results',
      icon: <ClipboardList size={24} />,
      variant: 'outline-info',
      action: () => navigate('/doctor/medical-reports')
    },
    {
      title: 'Diagnosis',
      description: 'Enter medical diagnoses',
      icon: <Stethoscope size={24} />,
      variant: 'outline-warning',
      action: () => navigate('/doctor/medical-reports')
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
            <Stethoscope size={28} className="me-2" />
            Doctor Dashboard
          </h2>
          <p className="text-muted">Welcome back, Dr. {user?.name || 'Doctor'}! Review patient reports and medical data.</p>
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
              <p className="text-muted mb-0">Total Reports</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body>
              <CheckCircle size={32} className="text-success mb-2" />
              <h4>{stats?.completedReports || 0}</h4>
              <p className="text-muted mb-0">Completed Reports</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body>
              <AlertTriangle size={32} className="text-warning mb-2" />
              <h4>{stats?.pendingReports || 0}</h4>
              <p className="text-muted mb-0">Pending Reports</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body>
              <Users size={32} className="text-info mb-2" />
              <h4>{stats?.totalPatients || 0}</h4>
              <p className="text-muted mb-0">Total Patients</p>
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
              <h5 className="mb-0">Medical Overview</h5>
            </Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Patient Consultations</strong>
                    <br />
                    <small className="text-muted">Today's appointments</small>
                  </div>
                  <Badge bg="info">0</Badge>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Critical Results</strong>
                    <br />
                    <small className="text-muted">Require immediate attention</small>
                  </div>
                  <Badge bg="danger">0</Badge>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Follow-up Cases</strong>
                    <br />
                    <small className="text-muted">Scheduled follow-ups</small>
                  </div>
                  <Badge bg="warning">0</Badge>
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DoctorDashboard; 