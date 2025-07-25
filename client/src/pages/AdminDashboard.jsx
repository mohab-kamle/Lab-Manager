import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, ListGroup, Spinner, Alert } from 'react-bootstrap';
import { Users, FlaskConical, FileText, Plus, Activity, UserPlus, ClipboardList, BarChart2, DollarSign, CreditCard, TrendingUp, Percent, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useLabPrefix from '../hooks/useLabPrefix';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get(`${apiUrl}/admin/dashboard-stats`, { headers });
        setStats(response.data);
      } catch (err) {
        setError('Failed to load dashboard stats.');
      }
      setLoading(false);
    };
    fetchStats();
  }, [apiUrl]);

  const prefix = useLabPrefix();
  const actions = [
    { 
      icon: <UserPlus size={20} />, 
      label: 'Add Patient', 
      onClick: () => navigate(`/${prefix}/admin/patients`),
      variant: 'outline-primary'
    },
    { 
      icon: <Plus size={20} />, 
      label: 'Add Test', 
      onClick: () => navigate(`/${prefix}/admin/tests`),
      variant: 'outline-success'
    },
    { 
      icon: <ClipboardList size={20} />, 
      label: 'View Reports', 
      onClick: () => navigate(`/${prefix}/admin/medical-reports`),
      variant: 'outline-secondary'
    },
    { 
      icon: <Settings size={20} />, 
      label: 'Lab Management', 
      onClick: () => navigate(`/${prefix}/admin/lab-management`),
      variant: 'outline-info'
    },
    { 
      icon: <Activity size={20} />, 
      label: 'System Health', 
      onClick: () => {
        // For now, show an alert. In the future, this could navigate to a system health page
        alert('System Health feature coming soon! This will show system status, performance metrics, and health indicators.');
      },
      variant: 'outline-danger'
    },
  ];

  return (
    <Container fluid className="py-3 px-2 px-md-4">
      <h2 className="mb-3 text-center text-md-center">Admin Dashboard</h2>
      {loading ? (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 200 }}>
          <Spinner animation="border" variant="primary" />
        </div>
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : stats ? (
        <>
          {/* Quick Stats */}
          <Row className="g-3 mb-3">
            <Col xs={6} sm={3}>
              <Card className="text-center h-100 shadow-sm">
                <Card.Body>
                  <div className="mb-2 text-primary"><Users size={28} /></div>
                  <h4 className="mb-1">{stats.patientCount}</h4>
                  <div className="text-muted small">Patients</div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} sm={3}>
              <Card className="text-center h-100 shadow-sm">
                <Card.Body>
                  <div className="mb-2 text-primary"><FlaskConical size={28} /></div>
                  <h4 className="mb-1">{stats.testCount}</h4>
                  <div className="text-muted small">Tests</div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} sm={3}>
              <Card className="text-center h-100 shadow-sm">
                <Card.Body>
                  <div className="mb-2 text-primary"><FileText size={28} /></div>
                  <h4 className="mb-1">{stats.pendingReports}</h4>
                  <div className="text-muted small">Pending Reports</div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} sm={3}>
              <Card className="text-center h-100 shadow-sm">
                <Card.Body>
                  <div className="mb-2 text-primary"><BarChart2 size={28} /></div>
                  <h4 className="mb-1">${Number(stats.revenue).toLocaleString()}</h4>
                  <div className="text-muted small">Total Revenue</div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          {/* Financial Stats */}
          <Row className="g-3 mb-3">
            <Col xs={6} sm={3}>
              <Card className="text-center h-100 shadow-sm">
                <Card.Body>
                  <div className="mb-2 text-success"><DollarSign size={28} /></div>
                  <h4 className="mb-1">${Number(stats.monthlyRevenue).toLocaleString()}</h4>
                  <div className="text-muted small">Monthly Revenue</div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} sm={3}>
              <Card className="text-center h-100 shadow-sm">
                <Card.Body>
                  <div className="mb-2 text-warning"><CreditCard size={28} /></div>
                  <h4 className="mb-1">${Number(stats.outstandingPayments).toLocaleString()}</h4>
                  <div className="text-muted small">Outstanding</div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} sm={3}>
              <Card className="text-center h-100 shadow-sm">
                <Card.Body>
                  <div className="mb-2 text-info"><TrendingUp size={28} /></div>
                  <h4 className="mb-1">${Number(stats.avgInvoiceValue).toFixed(2)}</h4>
                  <div className="text-muted small">Avg Invoice</div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} sm={3}>
              <Card className="text-center h-100 shadow-sm">
                <Card.Body>
                  <div className="mb-2 text-success"><Percent size={28} /></div>
                  <h4 className="mb-1">{Number(stats.paymentCollectionRate).toFixed(1)}%</h4>
                  <div className="text-muted small">Collection Rate</div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          {/* Action Shortcuts */}
          <Row className="g-3 mb-4">
            {actions.map((action, idx) => (
              <Col xs={6} sm={3} key={idx}>
                <Button variant={action.variant} className="w-100 d-flex flex-column align-items-center py-3" onClick={action.onClick}>
                  {action.icon}
                  <span className="mt-2 small">{action.label}</span>
                </Button>
              </Col>
            ))}
          </Row>
          {/* Recent Activity */}
          <Card className="shadow-sm mb-3">
            <Card.Header className="bg-white fw-bold">Recent Activity</Card.Header>
            <ListGroup variant="flush">
              {stats.recentReports && stats.recentReports.length > 0 && (
                <ListGroup.Item className="fw-bold text-primary">Recent Reports</ListGroup.Item>
              )}
              {stats.recentReports && stats.recentReports.map((report, idx) => (
                <ListGroup.Item key={"report-"+report.id} className="d-flex justify-content-between align-items-center">
                  <span>Report #{report.id} for {report.patient?.name || 'Unknown'} ({new Date(report.date).toLocaleDateString()})</span>
                  <span className="text-muted small ms-2">{report.done ? 'Done' : report.pending ? 'Pending' : 'In Progress'}</span>
                </ListGroup.Item>
              ))}
              {stats.recentPatients && stats.recentPatients.length > 0 && (
                <ListGroup.Item className="fw-bold text-primary">Recent Patients</ListGroup.Item>
              )}
              {stats.recentPatients && stats.recentPatients.map((patient, idx) => (
                <ListGroup.Item key={"patient-"+patient.id} className="d-flex justify-content-between align-items-center">
                  <span>New patient: {patient.name}</span>
                  <span className="text-muted small ms-2">{patient.birth_date ? new Date(patient.birth_date).toLocaleDateString() : ''}</span>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
        </>
      ) : null}
    </Container>
  );
};

export default AdminDashboard;
