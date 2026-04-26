import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Button, Badge, Form } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import { motion } from "framer-motion";
import axios from "axios";
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
  ArrowLeft,
  Pencil,
  Receipt,
} from "react-bootstrap-icons";
import { formatDate } from "../../utils/dateFormatter";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { useToast } from "../../components/ui/ToastContext";

// Reuse styles from PatientProfile
import "../../styles/PatientProfile.css";

const InfoBubble = ({ icon: Icon, label, value, delay, isEditing, name, type = "text", onChange, error, options }) => (
  <motion.div
    className="d-flex align-items-center mb-3 w-100"
    initial={{ x: -20, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    transition={{ delay }}
  >
    <div className="info-icon-wrapper me-3 text-primary">
      <Icon size={24} />
    </div>
    <div className="flex-grow-1">
      <div className="text-muted small mb-1">{label}</div>
      {isEditing && onChange ? (
        type === "select" ? (
          <Form.Select size="sm" name={name} value={value || ""} onChange={onChange} isInvalid={!!error}>
            <option value="">Select...</option>
            {options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </Form.Select>
        ) : (
          <Form.Control
            type={type}
            size="sm"
            name={name}
            value={value || ""}
            onChange={onChange}
            isInvalid={!!error}
          />
        )
      ) : (
        <div className="fw-bold text-truncate">{value || "N/A"}</div>
      )}
      {error && <div className="text-danger small mt-1">{error}</div>}
    </div>
  </motion.div>
);

/**
 * PatientProfileAdminView - Detailed view of a patient for administrators.
 * This view allows admins to see all patient details by ID.
 */
const PatientProfileAdminView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchPatientDetails = async () => {
      try {
        const token = localStorage.getItem("token");
        // We'll use the existing /patient endpoint which might need filtering or a specific /patient/:id
        // Looking at server/routes/patient.js, there's a GET /:id but it's not clear if it's public for admins.
        // Actually, the PUT /:id check exists, so GET /:id likely exists too or we use the list and filter.
        // Let's assume GET /patient/:id exists as it's standard.
        const response = await axios.get(`${apiUrl}/patient`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const foundPatient = response.data.find(p => p.id === parseInt(id));
        if (foundPatient) {
          setPatient(foundPatient);
        } else {
          toast.error("Patient not found");
          navigate(-1);
        }
      } catch (error) {
        console.error("Error fetching patient details:", error);
        toast.error("Failed to load patient details");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientDetails();
  }, [id, apiUrl, navigate, toast]);

  if (loading) {
    return <LoadingSpinner message="Loading patient profile..." />;
  }

  if (!patient) return null;

  const handleEditToggle = () => {
    if (!isEditing) {
      let birth_date = "";
      if (patient.birth_date) {
        try {
          birth_date = new Date(patient.birth_date).toISOString().split('T')[0];
        } catch (e) { }
      }
      setFormData({
        name: patient.name || "",
        birth_date: birth_date,
        gender: patient.gender || "",
        nationality: patient.nationality || "",
        primaryPhone: patient.phones?.find(p => p.type === 'primary')?.phone_number || "",
        email: patient.email || "",
        address: patient.address || "",
        national_id: patient.national_id || "",
        passport_no: patient.passport_no || ""
      });
      setFormErrors({});
    }
    setIsEditing(!isEditing);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name?.trim()) errors.name = "Name is required";

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email format";
    }

    if (formData.primaryPhone && !/^\d+$/.test(formData.primaryPhone)) {
      errors.primaryPhone = "Phone must contain only numbers";
    }

    if (formData.national_id && isNaN(formData.national_id)) {
      errors.national_id = "National ID must be numeric";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Please fix validation errors");
      return;
    }

    setSaveLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(`${apiUrl}/patient/${patient.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPatient(response.data);
      setIsEditing(false);
      toast.success("Patient profile updated successfully!");
    } catch (err) {
      console.error("Error updating patient:", err);
      toast.error(err.response?.data?.error || "Failed to update patient");
    } finally {
      setSaveLoading(false);
    }
  };

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
    <div className="cheerful-container py-4">
      <Container>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-4 d-flex align-items-center justify-content-between"
        >
          <Button
            variant="link"
            onClick={() => navigate(-1)}
            className="d-flex align-items-center gap-2 text-decoration-none text-primary p-0"
          >
            <ArrowLeft size={20} />
            <span>Back to Patients</span>
          </Button>
        </motion.div>

        {/* Header Section */}
        <motion.div
          className="text-center cheerful-header mb-5 position-relative"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="position-absolute top-0 end-0">
            {!isEditing ? (
              <Button variant="outline-primary" className="rounded-pill d-flex align-items-center gap-2 shadow-sm" onClick={handleEditToggle}>
                <Pencil size={16} /> Edit Profile
              </Button>
            ) : (
              <div className="d-flex gap-2 shadow-sm rounded-pill bg-theme-surface p-1">
                <Button variant="light" className="rounded-pill" onClick={handleEditToggle} disabled={saveLoading}>
                  Cancel
                </Button>
                <Button variant="primary" className="rounded-pill" onClick={handleSave} disabled={saveLoading}>
                  {saveLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </div>
          {isEditing ? (
            <div className="mx-auto" style={{ maxWidth: '400px' }}>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                size="lg"
                className="text-center fw-bold mb-2 shadow-sm"
                isInvalid={!!formErrors.name}
              />
              {formErrors.name && <Form.Control.Feedback type="invalid" className="d-block">{formErrors.name}</Form.Control.Feedback>}
            </div>
          ) : (
            <h1 className="welcome-text display-5 mb-2">
              {patient.name}
            </h1>
          )}
          <p className="lead text-muted">
            Patient Code: <span className="fw-bold text-primary">#{patient.patientcode}</span>
          </p>
        </motion.div>

        <Row className="justify-content-center">
          <Col lg={10}>
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
                <h5 className="mb-4 fw-bold text-secondary d-flex align-items-center gap-2">
                  <FileEarmarkPerson /> Personal Details
                </h5>
                <InfoBubble
                  icon={Calendar}
                  label="Date of Birth"
                  value={isEditing ? formData.birth_date : formatDate(patient.birth_date)}
                  delay={0.1}
                  isEditing={isEditing}
                  name="birth_date"
                  type="date"
                  onChange={handleChange}
                  error={formErrors.birth_date}
                />
                <InfoBubble
                  icon={GenderAmbiguous}
                  label="Gender"
                  value={isEditing ? formData.gender : patient.gender}
                  delay={0.2}
                  isEditing={isEditing}
                  name="gender"
                  type="select"
                  options={[{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }]}
                  onChange={handleChange}
                  error={formErrors.gender}
                />
                <InfoBubble
                  icon={Globe}
                  label="Nationality"
                  value={isEditing ? formData.nationality : patient.nationality}
                  delay={0.3}
                  isEditing={isEditing}
                  name="nationality"
                  onChange={handleChange}
                  error={formErrors.nationality}
                />
              </motion.div>

              {/* Contact Info Card */}
              <motion.div
                variants={itemVariants}
                className="patient-profile-card p-4"
              >
                <h5 className="mb-4 fw-bold text-secondary d-flex align-items-center gap-2">
                  <Telephone /> Contact Info
                </h5>
                <InfoBubble
                  icon={Telephone}
                  label="Primary Phone"
                  value={isEditing ? formData.primaryPhone : patient.phones?.find(p => p.type === 'primary')?.phone_number}
                  delay={0.4}
                  isEditing={isEditing}
                  name="primaryPhone"
                  onChange={handleChange}
                  error={formErrors.primaryPhone}
                />
                <InfoBubble
                  icon={Envelope}
                  label="Email Address"
                  value={isEditing ? formData.email : patient.email}
                  delay={0.5}
                  isEditing={isEditing}
                  name="email"
                  type="email"
                  onChange={handleChange}
                  error={formErrors.email}
                />
                <InfoBubble
                  icon={House}
                  label="Home Address"
                  value={isEditing ? formData.address : patient.address}
                  delay={0.6}
                  isEditing={isEditing}
                  name="address"
                  onChange={handleChange}
                  error={formErrors.address}
                />
              </motion.div>

              {/* Identification Card */}
              <motion.div
                variants={itemVariants}
                className="patient-profile-card p-4"
              >
                <h5 className="mb-4 fw-bold text-secondary d-flex align-items-center gap-2">
                  <CardHeading /> Identification
                </h5>
                <InfoBubble
                  icon={CardHeading}
                  label="National ID"
                  value={isEditing ? formData.national_id : patient.national_id}
                  delay={0.7}
                  isEditing={isEditing}
                  name="national_id"
                  onChange={handleChange}
                  error={formErrors.national_id}
                />
                <InfoBubble
                  icon={FileMedical}
                  label="Passport Number"
                  value={isEditing ? formData.passport_no : patient.passport_no}
                  delay={0.8}
                  isEditing={isEditing}
                  name="passport_no"
                  onChange={handleChange}
                  error={formErrors.passport_no}
                />
                <div className="mt-4 pt-3 border-top">
                  <div className="text-muted small mb-1">Associated Contract</div>
                  <div className="fw-bold">
                    {patient.contract?.name || "No Contract Linked"}
                  </div>
                </div>
              </motion.div>

              {/* Medical Summary Card */}
              <motion.div
                variants={itemVariants}
                className="patient-profile-card p-4"
              >
                <h5 className="mb-4 fw-bold text-secondary d-flex align-items-center gap-2">
                  <FileMedical /> Medical History
                </h5>
                <div className="mb-3">
                  <div className="text-muted small mb-2">Known Diseases</div>
                  <div className="d-flex flex-wrap gap-2">
                    {patient.diseases_id_diseases?.length > 0 ? (
                      patient.diseases_id_diseases.map((disease, idx) => (
                        <Badge key={idx} bg="info" className="fw-normal">
                          {disease.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted italic">No diseases recorded</span>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-top">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Total Billed:</span>
                    <span className="fw-bold">EGP {parseFloat(patient.total || 0).toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Total Paid:</span>
                    <span className="fw-bold text-success">EGP {parseFloat(patient.paid || 0).toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Outstanding:</span>
                    <span className={`fw-bold ${parseFloat(patient.due || 0) > 0 ? 'text-danger' : 'text-success'}`}>
                      EGP {Math.abs(parseFloat(patient.due || 0)).toFixed(2)}
                      {parseFloat(patient.due || 0) < 0 ? ' (Credit)' : ''}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Transactions Placeholder */}
              <motion.div
                variants={itemVariants}
                className="patient-profile-card p-4 d-flex flex-column align-items-center justify-content-center text-center border-dashed"
                style={{ border: '2px dashed var(--border-default)', background: 'rgba(0,0,0,0.02)' }}
              >
                <div className="mb-3 text-muted opacity-50">
                  <Receipt size={48} />
                </div>
                <h5 className="fw-bold text-muted mb-1">Transactions History</h5>
                <p className="text-muted small mb-0">Upcoming Feature: View full payment and billing history here.</p>
              </motion.div>

            </motion.div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default PatientProfileAdminView;
