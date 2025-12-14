import React, { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Alert,
  Image
} from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import {
  Calendar,
  Mail,
  User,
  Shield,
  CreditCard,
  Flag,
  MapPin,
  Hash,
  Activity
} from "lucide-react";
import axios from "axios";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { formatDate } from "../../utils/dateFormatter";
import { motion } from "framer-motion";

const AdminProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${apiUrl}/emp/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(response.data);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, apiUrl]);

  if (loading) {
    return <LoadingSpinner message="Loading profile..." />;
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container className="mt-4">
        <Alert variant="warning">Profile not found.</Alert>
      </Container>
    );
  }

  const InfoCard = ({ icon: Icon, label, value, color = "primary", delay = 0 }) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="d-flex align-items-center p-3 border rounded mb-3 bg-white shadow-sm h-100"
    >
      <div className={`bg-${color} bg-opacity-10 p-3 rounded-circle me-3`}>
        <Icon size={24} className={`text-${color}`} />
      </div>
      <div>
        <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '0.75rem' }}>
          {label}
        </small>
        <span className="fw-medium fs-6">{value || "Not provided"}</span>
      </div>
    </motion.div>
  );

  return (
    <Container fluid className="py-4">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-4 text-center"
      >
        <div className="d-inline-block position-relative mb-3">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-light rounded-circle d-flex align-items-center justify-content-center shadow overflow-hidden border border-4 border-white" 
            style={{ width: '120px', height: '120px' }}
          >
             <User size={64} className="text-secondary" />
          </motion.div>
          <span className="position-absolute bottom-0 end-0 p-2 bg-success border border-white rounded-circle">
            <span className="visually-hidden">Online</span>
          </span>
        </div>
        <h2 className="fw-bold mb-1">{profile.name}</h2>
        <Badge bg="primary" className="px-3 py-2 rounded-pill text-uppercase">
          {profile.role || "Admin"}
        </Badge>
      </motion.div>

      <Row className="justify-content-center">
        <Col lg={10}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-white border-bottom py-3">
                <h5 className="mb-0 fw-bold text-primary">
                  <User size={20} className="me-2" />
                  Personal Information
                </h5>
              </Card.Header>
              <Card.Body className="p-4">
                <Row>
                  <Col md={6} className="mb-3">
                    <InfoCard 
                      icon={User} 
                      label="Username" 
                      value={profile.username} 
                      color="primary"
                      delay={0.3}
                    />
                  </Col>
                  <Col md={6} className="mb-3">
                    <InfoCard 
                      icon={Mail} 
                      label="Email Address" 
                      value={profile.email} 
                      color="info"
                      delay={0.4}
                    />
                  </Col>
                  <Col md={6} className="mb-3">
                    <InfoCard 
                      icon={Calendar} 
                      label="Date of Birth" 
                      value={profile.birth_date ? formatDate(profile.birth_date) : null} 
                      color="success"
                      delay={0.5}
                    />
                  </Col>
                  <Col md={6} className="mb-3">
                    <InfoCard 
                      icon={Activity} 
                      label="Gender" 
                      value={
                        profile.gender
                          ? (profile.gender === "Male" || profile.gender === "m")
                            ? "Male"
                            : "Female"
                          : null
                      }
                      color="warning"
                      delay={0.6}
                    />
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white border-bottom py-3">
                <h5 className="mb-0 fw-bold text-primary">
                  <Shield size={20} className="me-2" />
                  Identity & Legal
                </h5>
              </Card.Header>
              <Card.Body className="p-4">
                <Row>
                  <Col md={6} className="mb-3">
                    <InfoCard 
                      icon={CreditCard} 
                      label="National ID" 
                      value={profile.national_id} 
                      color="dark"
                      delay={0.7}
                    />
                  </Col>
                  <Col md={6} className="mb-3">
                    <InfoCard 
                      icon={Flag} 
                      label="Nationality" 
                      value={profile.nationality} 
                      color="danger"
                      delay={0.8}
                    />
                  </Col>
                  <Col md={6} className="mb-3">
                    <InfoCard 
                      icon={Hash} 
                      label="Passport Number" 
                      value={profile.passport_no} 
                      color="secondary"
                      delay={0.9}
                    />
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </motion.div>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminProfile;
