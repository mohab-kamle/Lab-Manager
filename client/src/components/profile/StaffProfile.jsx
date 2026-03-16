import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Alert,
  Button,
} from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import {
  Calendar,
  Mail,
  User,
  Shield,
  CreditCard,
  Flag,
  IdCard,
  AtSign,
  Pencil,
  Save,
  X,
  Lock,
  VenusAndMars,
} from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import axios from "axios";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { formatDate } from "../../utils/dateFormatter";
import { motion } from "framer-motion";
import { useToast } from "../../components/ui/ToastContext";
import InfoCard from "./InfoCard";
import DoctorAnimation from "../../assets/Doctor.lottie";

// Import shared profile styles (badge, avatar, animations)
import "../../styles/StaffProfile.css";

/**
 * StaffProfile - Shared profile page for all employee-type roles.
 *
 * Fetches the current user's profile from /emp/{id}, displays personal info
 * and identity/legal fields with inline editing support. Uses Doctor.lottie
 * as the placeholder avatar and renders the role badge dynamically.
 *
 * Used by: AdminProfile, DoctorProfile, ChemistProfile, EmployeeProfile, ReceptionistProfile
 */
const StaffProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Profile data fetched from the API
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Inline editing state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({}); // Form validation errors
  const [saveLoading, setSaveLoading] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL;

  /**
   * Fetch the employee profile on mount or when user/apiUrl changes.
   * Uses the authenticated user's ID to call GET /emp/{id}.
   */
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${apiUrl}/emp/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(response.data);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile data.");
        toast.error("Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, apiUrl]);

  /**
   * Enter edit mode: populate form data from the current profile.
   */
  const handleEdit = () => {
    setFormData({
      username: profile.username || "",
      email: profile.email || "",
      birth_date: profile.birth_date ? profile.birth_date.split("T")[0] : "",
      gender: profile.gender || "",
      national_id: profile.national_id || "",
      nationality: profile.nationality || "",
      passport_no: profile.passport_no || "",
    });
    setErrors({});
    setIsEditing(true);
  };

  /**
   * Cancel editing: reset form data and clear errors.
   */
  const handleCancel = () => {
    setIsEditing(false);
    setFormData({});
    setErrors({});
    setError(null);
  };

  /**
   * Handle form field changes and clear the field's error on input.
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  /**
   * Validate the form fields before saving.
   * Returns true if valid, false otherwise.
   */
  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.username || formData.username.trim() === "") {
      newErrors.username = "Username is required";
    }

    if (formData.national_id && isNaN(formData.national_id)) {
      newErrors.national_id = "National ID must be numeric";
    }

    if (
      formData.email &&
      formData.email.trim() !== "" &&
      !emailRegex.test(formData.email)
    ) {
      newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Save the edited profile by sending a PUT /emp/{id} request.
   * Shows toast notifications for success or failure.
   */
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Please fix validation errors");
      return;
    }

    // Validate email format if provided
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Invalid format (only if provided) -> Block save
    if (
      formData.email &&
      formData.email.trim() !== "" &&
      !emailRegex.test(formData.email)
    ) {
      toast.error("Invalid email format");
      return;
    }

    // Empty email -> Warn and delay save slightly
    if (!formData.email || formData.email.trim() === "") {
      toast.warning("Email is missing. Profile will be saved shortly.");
      await new Promise((resolve) => setTimeout(resolve, 3500));
    }

    setSaveLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");

      const response = await axios.put(`${apiUrl}/emp/${user.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProfile(response.data);
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (err) {
      console.error("Error updating profile:", err);
      const errorMsg = err.response?.data?.error || "Failed to update profile.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSaveLoading(false);
    }
  };

  // --- Render States ---

  if (loading) {
    return <LoadingSpinner message="Loading profile..." />;
  }

  // Full-page error only when profile hasn't loaded at all
  if (error && !profile) {
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

  return (
    <Container fluid className="py-4">
      <Row className="justify-content-center">
        {/* Left Column: Avatar & Role Summary */}
        <Col lg={2} md={12} className="mb-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center sticky-top"
            style={{ top: "2rem", zIndex: 1 }}
          >
            {/* Animated avatar using Doctor.lottie as placeholder */}
            <div className="d-inline-block position-relative mb-3">
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                whileHover={{ scale: 1.05 }}
                className="bg-white rounded-circle d-flex align-items-center justify-content-center shadow overflow-hidden border border-1 border-primary profile-avatar-container"
              >
                <DotLottieReact
                  src={DoctorAnimation}
                  loop={false}
                  autoplay={true}
                  className="profile-animation"
                />
              </motion.div>
            </div>
            <h2 className="fw-bold mb-1">{profile.name}</h2>

            {/* Dynamic role badge — uses role-specific CSS class */}
            <motion.span
              className={`role-badge ${profile.role?.toLowerCase() || "staff"}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <Shield size={14} className="badge-icon" />
              <span>{profile.role || "Staff"}</span>
            </motion.span>

            {/* Change Password button */}
            <Button
              variant="outline-secondary"
              size="sm"
              className="mt-3 d-flex align-items-center gap-2 rounded-pill px-3 mx-auto"
              onClick={() => navigate('/change-password', { state: { type: 'Change' } })}
            >
              <Lock size={14} />
              <span>Change Password</span>
            </Button>
          </motion.div>
        </Col>

        {/* Right Column: Detail Cards */}
        <Col lg={8} md={12}>
          {/* Personal Information Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-center justify-content-md-between align-items-center flex-wrap gap-3 flex-md-nowrap ">
                <h5 className="mb-0 fw-bold text-primary">
                  <User size={20} className="me-2" />
                  Personal Information
                </h5>
                <div>
                  {isEditing ? (
                    <div className="d-flex gap-2">
                      <Button
                        variant="outline-danger"
                        size="sm"
                        className="d-flex align-items-center gap-2 rounded-pill px-3"
                        onClick={handleCancel}
                        disabled={saveLoading}
                      >
                        <X size={14} /> <span>Cancel</span>
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        className="d-flex align-items-center gap-2 rounded-pill px-3"
                        onClick={handleSave}
                        disabled={saveLoading}
                      >
                        {saveLoading ? (
                          <>
                            <span
                              className="spinner-border spinner-border-sm"
                              role="status"
                              aria-hidden="true"
                            ></span>
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save size={14} /> <span>Save</span>
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="d-flex align-items-center gap-2 rounded-pill px-3 shake-on-hover"
                      onClick={handleEdit}
                    >
                      <Pencil size={14} /> <span>Edit</span>
                    </Button>
                  )}
                </div>
              </Card.Header>
              <Card.Body className="p-4">
                <Row>
                  <Col md={6} className="mb-3">
                    <InfoCard
                      icon={AtSign}
                      label="Username"
                      value={isEditing ? formData.username : profile.username}
                      color="info"
                      delay={0.3}
                      isEditing={isEditing}
                      name="username"
                      onChange={handleChange}
                      error={errors.username}
                    />
                  </Col>
                  <Col md={6} className="mb-3">
                    <InfoCard
                      icon={Mail}
                      label="Email Address"
                      value={isEditing ? formData.email : profile.email}
                      color="info"
                      delay={0.4}
                      isEditing={isEditing}
                      name="email"
                      type="email"
                      onChange={handleChange}
                      error={errors.email}
                    />
                  </Col>
                  <Col md={6} className="mb-3">
                    <InfoCard
                      icon={Calendar}
                      label="Date of Birth"
                      value={
                        isEditing
                          ? formData.birth_date
                          : profile.birth_date
                          ? formatDate(profile.birth_date)
                          : null
                      }
                      color="success"
                      delay={0.5}
                      isEditing={isEditing}
                      name="birth_date"
                      type="date"
                      onChange={handleChange}
                      error={errors.birth_date}
                    />
                  </Col>
                  <Col md={6} className="mb-3">
                    <InfoCard
                      icon={VenusAndMars}
                      label="Gender"
                      value={
                        isEditing
                          ? formData.gender
                          : profile.gender
                          ? profile.gender === "Male" || profile.gender === "m"
                            ? "Male"
                            : "Female"
                          : null
                      }
                      color="warning"
                      delay={0.6}
                      isEditing={isEditing}
                      name="gender"
                      type="select"
                      options={[
                        { value: "Male", label: "Male" },
                        { value: "Female", label: "Female" },
                      ]}
                      onChange={handleChange}
                      error={errors.gender}
                    />
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </motion.div>

          {/* Identity & Legal Card */}
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
                      value={
                        isEditing ? formData.national_id : profile.national_id
                      }
                      color="dark"
                      delay={0.7}
                      isEditing={isEditing}
                      name="national_id"
                      onChange={handleChange}
                      error={errors.national_id}
                    />
                  </Col>
                  <Col md={6} className="mb-3">
                    <InfoCard
                      icon={Flag}
                      label="Nationality"
                      value={
                        isEditing ? formData.nationality : profile.nationality
                      }
                      color="danger"
                      delay={0.8}
                      isEditing={isEditing}
                      name="nationality"
                      onChange={handleChange}
                      error={errors.nationality}
                    />
                  </Col>
                  <Col md={6} className="mb-3">
                    <InfoCard
                      icon={IdCard}
                      label="Passport Number"
                      value={
                        isEditing ? formData.passport_no : profile.passport_no
                      }
                      color="secondary"
                      delay={0.9}
                      isEditing={isEditing}
                      name="passport_no"
                      onChange={handleChange}
                      error={errors.passport_no}
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

export default StaffProfile;
