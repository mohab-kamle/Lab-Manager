import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, ListGroup, Spinner, Alert, Badge } from 'react-bootstrap';
import { FlaskConical, FileText, Plus, Activity, TestTube, ClipboardList, Microscope, Beaker, TrendingUp, AlertTriangle, CheckCircle, ScanBarcode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { resetNavbarTitles, resetNavbarActiveState } from '../../components/layout/MainNavBar';
import SampleQuickInfoModal from '../../components/samples/SampleQuickInfoModal';

const ChemistDashboard = () => {
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
        
        const [reportsResponse, testsResponse] = await Promise.all([
          axios.get(`${apiUrl}/medical-reports`, { headers }),
          axios.get(`${apiUrl}/tests`, { headers })
        ]);

        const statsData = {
          totalReports: reportsResponse.data.length || 0,
          totalTests: testsResponse.data.length || 0,
          recentReports: reportsResponse.data.slice(0, 5) || [],
          pendingReports: reportsResponse.data.filter(report => report.status === 'pending').length || 0
        };

        setStats(statsData);
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
      onClick: () => navigate('/chemist/medical-reports'),
    },
    {
      icon: <Activity size={20} />,
      label: 'Samples Kanban',
      onClick: () => navigate('/chemist/samples-kanban'),
    },
    {
      icon: <Microscope size={20} />,
      label: 'Test Catalog',
      onClick: () => navigate('/chemist/tests'),
    },
    {
      icon: <Beaker size={20} />,
      label: 'Inventory',
      onClick: () => navigate('/chemist/inventory'),
    },
    {
      icon: <TrendingUp size={20} />,
      label: 'TAT Analytics',
      onClick: () => navigate('/chemist/tat-analytics'),
    },
    {
      icon: <Plus size={20} />,
      label: 'Packages',
      onClick: () => navigate('/chemist/packages-and-offers'),
    },
    {
      icon: <CheckCircle size={20} />,
      label: 'My Profile',
      onClick: () => navigate('/chemist/profile'),
    },
  ];

  if (loading) {
    return <LoadingSpinner message="Loading dashboard stats..." />;
  }
  
  return (
    <>
      <SampleQuickInfoModal show={showScanModal} onHide={() => setShowScanModal(false)} />
      <Container fluid className="py-3 px-2 px-md-4">
        <h2 className="mb-3 text-center text-md-center">
          <FlaskConical size={28} className="me-2" />
          Chemist Dashboard
        </h2>
        
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
                <div className="text-muted small">Total Reports</div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} sm={4}>
            <Card className="text-center h-100 shadow-sm border-0">
              <Card.Body>
                <div className="mb-2 text-warning">
                  <AlertTriangle size={28} />
                </div>
                <h4 className="mb-1">{stats?.pendingReports || 0}</h4>
                <div className="text-muted small">Pending Reports</div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={4}>
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

        <Row>
          <Col md={6} className="mb-3">
            <Card className="shadow-sm border-0">
              <Card.Header className="bg-theme fw-bold">
                Recent Medical Reports
              </Card.Header>
              <Card.Body className="p-0">
                {stats?.recentReports?.length > 0 ? (
                  <ListGroup variant="flush">
                    {stats.recentReports.map((report, index) => (
                      <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>Report #{report.id}</strong>
                          <div className="text-muted small">
                            Patient: {report.patient?.name || 'Unknown'}
                          </div>
                        </div>
                        <Badge bg={report.status === 'completed' ? 'success' : report.status === 'pending' ? 'warning' : 'secondary'}>
                          {report.status || 'pending'}
                        </Badge>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                ) : (
                  <div className="p-3 text-muted text-center">No recent reports</div>
                )}
              </Card.Body>
            </Card>
          </Col>
          <Col md={6}>
            <Card className="shadow-sm border-0">
              <Card.Header className="bg-theme fw-bold">
                Lab Status
              </Card.Header>
              <ListGroup variant="flush">
                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Equipment Status</strong>
                    <div className="text-muted small">All systems operational</div>
                  </div>
                  <CheckCircle size={20} className="text-success" />
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Sample Processing</strong>
                    <div className="text-muted small">Normal queue</div>
                  </div>
                  <Badge bg="info">Normal</Badge>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Quality Control</strong>
                    <div className="text-muted small">All tests passed</div>
                  </div>
                  <CheckCircle size={20} className="text-success" />
                </ListGroup.Item>
              </ListGroup>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default ChemistDashboard;
 