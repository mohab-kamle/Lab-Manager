import React from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import { motion } from "framer-motion";
import Lottie from "lottie-react";
import {
  Calendar,
  GenderAmbiguous,
  Telephone,
  Envelope,
  House,
  FileMedical,
  Globe,
  FileEarmarkPerson,
  CardHeading,
  PencilSquare,
} from "react-bootstrap-icons";
import { Link } from "react-router-dom";
import { formatDate } from "../../utils/dateFormatter";
import useLabPrefix from "../../hooks/useLabPrefix";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

// Try to import animation if missing. Assuming it's in assets/animations/
// Using a simple fallback if the file isn't imported correctly.
// A common path might be "../../assets/animations/lab-logo.json".
// We will conditionally use a fallback if not found.
import labLogoAnimation from "../../assets/LabLogoLoading.json";

const InfoBubble = ({ icon: Icon, label, value, delay }) => (
  <motion.div
    className="d-flex align-items-center mb-3"
    initial={{ x: -20, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    transition={{ delay }}
  >
    <div className="info-icon-wrapper me-3 text-primary">
      <Icon size={24} />
    </div>
    <div>
      <div className="text-muted small">{label}</div>
      <div className="fw-bold">{value || "N/A"}</div>
    </div>
  </motion.div>
);
const PatientProfile = () => {
  const { user } = useAuth();
  const prefix = useLabPrefix();

  if (!user) {
    return <LoadingSpinner message="Getting things ready..." />;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  return (
    <div className="cheerful-container py-5">
      <Container>
        {/* Header Section */}
        <motion.div
          className="text-center cheerful-header"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, type: "spring" }}
        >
          <div className="profile-avatar-container">
            {/* Increased size via CSS, ensuring lottie fills it appropriately */}
            <Lottie
              animationData={labLogoAnimation}
              loop={true}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
          <h1 className="welcome-text display-4">
            Hello, {user.name.split(" ")[0]}!
          </h1>
          <p className="lead text-muted">
            Here's a look at your personal dashboard.
          </p>
        </motion.div>

        <Row className="justify-content-center">
          <Col lg={10}>
            {/* Action Bar */}
            <motion.div
              className="d-flex justify-content-center gap-3 mb-5 w-100"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {/* CSS flex:1 will make these equal width given the d-flex container */}
              <Button
                as={Link}
                to={`/patient/reports`}
                className="cheerful-btn cheerful-btn-primary d-flex align-items-center gap-2"
              >
                <FileMedical size={20} />
                My Reports
              </Button>
              <Button
                as={Link}
                to={`/patient/profile/update`}
                className="cheerful-btn cheerful-btn-outline d-flex align-items-center gap-2"
              >
                <PencilSquare size={20} />
                Update Profile
              </Button>
            </motion.div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="profile-grid"
            >
              {/* Personal Info Card */}
              <motion.div
                variants={itemVariants}
                className="patient-profile-card p-4"
              >
                <h5 className="mb-4 fw-bold text-secondary">
                  Personal Details
                </h5>
                <InfoBubble
                  icon={Calendar}
                  label="Date of Birth"
                  value={formatDate(user.birth_date)}
                  delay={0.1}
                />
                <InfoBubble
                  icon={GenderAmbiguous}
                  label="Gender"
                  value={
                    user.gender === "Male" || user.gender === "m"
                      ? "Male"
                      : "Female"
                  }
                  delay={0.2}
                />
                <InfoBubble
                  icon={Globe}
                  label="Nationality"
                  value={user.nationality}
                  delay={0.3}
                />
              </motion.div>

              {/* Contact Info Card */}
              <motion.div
                variants={itemVariants}
                className="patient-profile-card p-4"
              >
                <h5 className="mb-4 fw-bold text-secondary">Contact Info</h5>
                <InfoBubble
                  icon={Telephone}
                  label="Mobile Number"
                  value={user.phones?.[0]?.phone_number}
                  delay={0.4}
                />
                <InfoBubble
                  icon={Envelope}
                  label="Email Address"
                  value={user.email}
                  delay={0.5}
                />
                <InfoBubble
                  icon={House}
                  label="Home Address"
                  value={user.address}
                  delay={0.6}
                />
              </motion.div>

              {/* Official IDs Card */}
              <motion.div
                variants={itemVariants}
                className="patient-profile-card p-4"
              >
                <h5 className="mb-4 fw-bold text-secondary">
                  Official Documents
                </h5>
                <InfoBubble
                  icon={CardHeading}
                  label="National ID"
                  value={user.national_id}
                  delay={0.7}
                />
                <InfoBubble
                  icon={FileEarmarkPerson}
                  label="Passport Number"
                  value={user.passport_no}
                  delay={0.8}
                />
                <InfoBubble
                  icon={FileMedical}
                  label="Patient Code"
                  value={user.patientcode}
                  delay={0.9}
                />
              </motion.div>
            </motion.div>
          </Col>
        </Row>
      </Container>
    </div>

  );
};

export default PatientProfile;
