import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Alert, Spinner } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
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
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { formatDate } from "../../utils/dateFormatter";

const PatientsAnalytics = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalPatients: 0,
    genderStats: [],
    ageGroups: [],
    topNationalities: [],
    monthlyStats: [],
    topDiseases: [],
    patientsWithDiseases: 0,
    patientsWithoutDiseases: 0
  });

  const apiUrl = import.meta.env.VITE_API_URL;

  const COLORS = ['#4f46e5', '#818cf8', '#c7d2fe', '#e0e7ff'];
  const PRIMARY_COLOR = '#4f46e5';
  const SECONDARY_COLOR = '#10b981';
  const ACCENT_COLOR = '#f59e0b';

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
      let gender;
      switch (patient.gender?.toLowerCase()) {
        case 'm':
        case 'male':
          gender = 'Male';
          break;
        case 'f':
        case 'female':
          gender = 'Female';
          break;
        default:
          gender = 'Unknown';
      }
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
      const monthKey = date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short' });
      monthlyStats[monthKey] = 0;
    }

    patientsData.forEach(patient => {
      // Use createdAt for registration trend
      if (patient.createdAt) {
        const patientDate = new Date(patient.createdAt);
        const monthKey = patientDate.toLocaleDateString('en-GB', { year: 'numeric', month: 'short' });
        if (monthlyStats.hasOwnProperty(monthKey)) {
          monthlyStats[monthKey]++;
        }
      }
    });

    // Disease distribution
    const diseaseStats = {};
    patientsData.forEach(patient => {
      if (patient.diseases_id_diseases && Array.isArray(patient.diseases_id_diseases)) {
        patient.diseases_id_diseases.forEach(disease => {
          if (disease && disease.name) {
             diseaseStats[disease.name] = (diseaseStats[disease.name] || 0) + 1;
          }
        });
      }
    });
    const topDiseases = Object.entries(diseaseStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    setStats({
      totalPatients: totalPatients || 0,
      genderStats: Object.entries(genderStats).map(([name, value]) => ({ name, value })),
      ageGroups: Object.entries(ageGroups).map(([name, value]) => ({ name, value })),
      topNationalities: topNationalities || [],
      monthlyStats: Object.entries(monthlyStats).map(([name, value]) => ({ name, value })),
      topDiseases: topDiseases || [],
      patientsWithDiseases: patientsData.filter(p => p.diseases_id_diseases && p.diseases_id_diseases.length > 0).length,
      patientsWithoutDiseases: patientsData.filter(p => !p.diseases_id_diseases || p.diseases_id_diseases.length === 0).length
    });
  };

  if (loading) {
    return (
      <LoadingSpinner message="Loading patients analytics..." />
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
    <Container fluid className="py-4 bg-theme min-vh-100">
      <div className="d-flex justify-content-between align-items-center mb-4 px-2">
        <h2 className="fw-bold text-theme m-0">Patients Analytics</h2>
        <div className="text-muted small">Real-time demographic overview</div>
      </div>
      
      {/* Summary Cards */}
      <Row className="g-4 mb-5">
        {[
          { title: "Total Patients", value: stats.totalPatients, color: PRIMARY_COLOR, subtitle: "Total registered", icon: "👥" },
          { title: "Chronic Conditions", value: stats.patientsWithDiseases, color: SECONDARY_COLOR, subtitle: `${stats.totalPatients > 0 ? Math.round((stats.patientsWithDiseases / stats.totalPatients) * 100) : 0}% prevalence`, icon: "🏥" },
          { title: "Healthy Status", value: stats.patientsWithoutDiseases, color: "#6366f1", subtitle: "No recorded diseases", icon: "✨" },
          { title: "Data Density", value: stats.totalPatients > 0 ? Math.round((patients.filter(p => p.birth_date).length / stats.totalPatients) * 100) : 0, color: ACCENT_COLOR, subtitle: "Profile completeness", icon: "📊", suffix: "%" }
        ].map((item, idx) => (
          <Col md={3} sm={6} key={idx}>
            <Card className="border-0 shadow-sm h-100 rounded-4 transition-hover">
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="fs-1">{item.icon}</div>
                  <div className="badge rounded-pill bg-theme-surface text-muted fw-normal px-3">Active</div>
                </div>
                <h6 className="text-muted text-uppercase small fw-bold mb-1 tracking-wider">{item.title}</h6>
                <div className="d-flex align-items-baseline gap-1">
                  <h2 className="fw-bold m-0" style={{ color: item.color }}>{item.value}{item.suffix}</h2>
                </div>
                <div className="text-muted small mt-2">{item.subtitle}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Charts Row 1 */}
      <Row className="g-4 mb-4">
        <Col lg={4} md={12}>
          <Card className="border-0 shadow-sm rounded-4 h-100">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-4">Gender Distribution</h5>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.genderStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {stats.genderStats?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8} md={12}>
          <Card className="border-0 shadow-sm rounded-4 h-100">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-4">Registration Trend</h5>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.monthlyStats}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PRIMARY_COLOR} stopOpacity={0.1}/>
                        <stop offset="95%" stopColor={PRIMARY_COLOR} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9ca3af', fontSize: 12 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9ca3af', fontSize: 12 }} 
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke={PRIMARY_COLOR} 
                      strokeWidth={4} 
                      dot={{ r: 6, fill: PRIMARY_COLOR, strokeWidth: 2, stroke: '#fff' }} 
                      activeDot={{ r: 8, strokeWidth: 0 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Charts Row 2 */}
      <Row className="g-4">
        <Col lg={6} md={12}>
          <Card className="border-0 shadow-sm rounded-4 h-100">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-4">Age Demographics</h5>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.ageGroups} barSize={40}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                    />
                    <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{ borderRadius: '12px', border: 'none' }}/>
                    <Bar dataKey="value" fill={PRIMARY_COLOR} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6} md={12}>
          <Card className="border-0 shadow-sm rounded-4 h-100">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-4">Common Conditions</h5>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topDiseases} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 500 }} 
                      width={120}
                    />
                    <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{ borderRadius: '12px', border: 'none' }}/>
                    <Bar dataKey="value" fill="#818cf8" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <style dangerouslySetInnerHTML={{ __html: `
        .transition-hover { transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out; }
        .transition-hover:hover { transform: translateY(-4px); box-shadow: 0 10px 20px rgba(0,0,0,0.08) !important; }
        .tracking-wider { letter-spacing: 0.05em; }
      `}} />
    </Container>
  );
};

export default PatientsAnalytics; 