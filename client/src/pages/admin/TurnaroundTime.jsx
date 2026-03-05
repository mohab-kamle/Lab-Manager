import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Table, Badge, Spinner, Alert } from 'react-bootstrap';
import api from '../../utils/api';
import { format } from 'date-fns';

const TurnaroundTime = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ metrics: {}, delayedReports: [] });
  const [error, setError] = useState(null);

  // Default to last 30 days
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/analytics/tat', { params: dateRange });
      if (res.data.success) {
        setData({
          metrics: res.data.metrics,
          delayedReports: res.data.delayedReports || []
        });
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleDateChange = (e) => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value });
  };

  const handleApplyFilter = (e) => {
    e.preventDefault();
    fetchAnalytics();
  };

  const formatMinutes = (mins) => {
    if (!mins || isNaN(mins)) return '0 min';
    if (mins < 60) return `${Math.round(mins)} min`;
    const hours = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${hours}h ${m}m`;
  };

  return (
    <>
      <div className="container-fluid mt-4">
        <h2 className="mb-4">Turnaround Time (TAT) Analytics</h2>

        {/* Filters */}
        <Card className="mb-4">
          <Card.Body>
            <Form onSubmit={handleApplyFilter} className="d-flex align-items-end gap-3">
              <Form.Group>
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  name="startDate"
                  value={dateRange.startDate}
                  onChange={handleDateChange}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>End Date</Form.Label>
                <Form.Control
                  type="date"
                  name="endDate"
                  value={dateRange.endDate}
                  onChange={handleDateChange}
                />
              </Form.Group>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? <Spinner size="sm" animation="border" /> : 'Apply Filter'}
              </Button>
            </Form>
          </Card.Body>
        </Card>

        {error && <Alert variant="danger">{error}</Alert>}

        {/* Metrics Summary */}
        <Row className="mb-4 g-3">
          <Col md={3}>
            <Card className="h-100 bg-primary text-white text-center">
              <Card.Body>
                <Card.Title>Avg. Total TAT</Card.Title>
                <h3>{formatMinutes(data.metrics.avg_total_tat_minutes)}</h3>
                <small>Registered to Reported</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="h-100 bg-info text-white text-center">
              <Card.Body>
                <Card.Title>Avg. Collection Time</Card.Title>
                <h3>{formatMinutes(data.metrics.avg_collection_time_minutes)}</h3>
                <small>Registered to Collected</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="h-100 bg-warning text-dark text-center">
              <Card.Body>
                <Card.Title>Avg. Processing Time</Card.Title>
                <h3>{formatMinutes(data.metrics.avg_processing_time_minutes)}</h3>
                <small>Received to Reported</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="h-100 bg-success text-white text-center">
              <Card.Body>
                <Card.Title>Completion</Card.Title>
                <h3>{data.metrics.completed_count || 0} / {(data.metrics.completed_count || 0) + (data.metrics.pending_count || 0)}</h3>
                <small>Reports Completed</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Delayed Reports List */}
        <Card>
          <Card.Header className="bg-danger text-white">
            <h5 className="mb-0">Delayed Reports (Pending &gt; 24 hrs)</h5>
          </Card.Header>
          <Card.Body>
            {data.delayedReports.length > 0 ? (
              <Table responsive striped hover>
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Patient Name</th>
                    <th>Registered At</th>
                    <th>Status</th>
                    <th>Delay</th>
                  </tr>
                </thead>
                <tbody>
                  {data.delayedReports.map((report) => {
                    const regDate = new Date(report.registered_at);
                    const now = new Date();
                    const delayHours = Math.floor((now - regDate) / (1000 * 60 * 60));

                    let statusBadge = <Badge bg="secondary">Registered</Badge>;
                    if (report.received_at) statusBadge = <Badge bg="primary">Processing</Badge>;
                    else if (report.collected_at) statusBadge = <Badge bg="info">Collected</Badge>;

                    return (
                      <tr key={report.id}>
                        <td>#{report.id}</td>
                        <td>{report.patient?.name || 'Unknown'}</td>
                        <td>{format(regDate, 'PP pp')}</td>
                        <td>{statusBadge}</td>
                        <td className="text-danger fw-bold">{delayHours} hours</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            ) : (
              <div className="text-center py-4 text-muted">
                {loading ? <Spinner animation="border" /> : 'No delayed reports found.'}
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </>
  );
};

export default TurnaroundTime;
