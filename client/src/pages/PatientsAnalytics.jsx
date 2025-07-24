import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Alert, Spinner } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";

const PatientsAnalytics = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});

  const apiUrl = import.meta.env.VITE_API_URL;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${apiUrl}/patient`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setPatients(response.data);
        calculateStats(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching patients:", error);
        setError("Failed to fetch patients data. Please try again later.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const calculateStats = (patientsData) => {
    const totalPatients = patientsData.length;
    
    // Gender distribution
    const genderStats = patientsData.reduce((acc, patient) => {
      const gender = patient.gender === 'm' ? 'Male' : patient.gender === 'f' ? 'Female' : 'Unknown';
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {});

    // Age distribution
    const ageGroups = patientsData.reduce((acc, patient) => {
      if (patient.birth_date) {
        const age = new Date().getFullYear() - new Date(patient.birth_date).getFullYear();
        let group = '';
        if (age < 18) group = 'Under 18';
        else if (age < 30) group = '18-29';
        else if (age < 50) group = '30-49';
        else if (age < 70) group = '50-69';
        else group = '70+';
        acc[group] = (acc[group] || 0) + 1;
      }
      return acc;
    }, {});

    // Nationality distribution (top 10)
    const nationalityStats = patientsData.reduce((acc, patient) => {
      const nationality = patient.nationality || 'Unknown';
      acc[nationality] = (acc[nationality] || 0) + 1;
      return acc;
    }, {});
    const topNationalities = Object.entries(nationalityStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    // Monthly registration trend (last 12 months)
    const monthlyStats = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      monthlyStats[monthKey] = 0;
    }

    patientsData.forEach(patient => {
      if (patient.birth_date) {
        const patientDate = new Date(patient.birth_date);
        const monthKey = patientDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        if (monthlyStats.hasOwnProperty(monthKey)) {
          monthlyStats[monthKey]++;
        }
      }
    });

    // Disease distribution
    const diseaseStats = {};
    patientsData.forEach(patient => {
      if (patient.diseases_id_diseases) {
        patient.diseases_id_diseases.forEach(disease => {
          diseaseStats[disease.name] = (diseaseStats[disease.name] || 0) + 1;
        });
      }
    });
    const topDiseases = Object.entries(diseaseStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    setStats({
      totalPatients,
      genderStats: Object.entries(genderStats).map(([name, value]) => ({ name, value })),
      ageGroups: Object.entries(ageGroups).map(([name, value]) => ({ name, value })),
      topNationalities,
      monthlyStats: Object.entries(monthlyStats).map(([name, value]) => ({ name, value })),
      topDiseases,
      patientsWithDiseases: patientsData.filter(p => p.diseases_id_diseases && p.diseases_id_diseases.length > 0).length,
      patientsWithoutDiseases: patientsData.filter(p => !p.diseases_id_diseases || p.diseases_id_diseases.length === 0).length
    });
  };

  if (loading) {
    return (
      <Container fluid className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid>
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="patients-analytics-container">
      <h2 className="mb-4">Patients Analytics</h2>
      
      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={3} sm={6} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title className="text-primary">{stats.totalPatients}</Card.Title>
              <Card.Text>Total Patients</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title className="text-success">{stats.patientsWithDiseases}</Card.Title>
              <Card.Text>Patients with Diseases</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title className="text-info">{stats.patientsWithoutDiseases}</Card.Title>
              <Card.Text>Patients without Diseases</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title className="text-warning">
                {stats.totalPatients > 0 ? Math.round((stats.patientsWithDiseases / stats.totalPatients) * 100) : 0}%
              </Card.Title>
              <Card.Text>Disease Prevalence</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row>
        {/* Gender Distribution */}
        <Col lg={6} md={12} className="mb-4">
          <Card>
            <Card.Header>
              <h5>Gender Distribution</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.genderStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.genderStats?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        {/* Age Distribution */}
        <Col lg={6} md={12} className="mb-4">
          <Card>
            <Card.Header>
              <h5>Age Distribution</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.ageGroups}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Top Nationalities */}
        <Col lg={6} md={12} className="mb-4">
          <Card>
            <Card.Header>
              <h5>Top 10 Nationalities</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.topNationalities} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        {/* Top Diseases */}
        <Col lg={6} md={12} className="mb-4">
          <Card>
            <Card.Header>
              <h5>Top 10 Diseases</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.topDiseases} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Monthly Trend */}
      <Row>
        <Col md={12} className="mb-4">
          <Card>
            <Card.Header>
              <h5>Patient Registration Trend (Last 12 Months)</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default PatientsAnalytics; 