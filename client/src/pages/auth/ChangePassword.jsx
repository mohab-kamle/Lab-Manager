import React, { useState } from "react";
import { Container, Form, Button, Alert, Card, Row, Col } from "react-bootstrap";
import { Shield, Lock, Eye, EyeOff, ArrowRight, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { useLab } from "../../context/LabContext";

/**
 * ChangePassword
 * Integrates with the backend via PUT `/emp/changePassword/:id` using axios,
 * includes strong client-side validations, and redirects admin after success.
 * A shared axios instance exists in `src/utils/api.js` for unified configuration.
 */
const ChangePassword = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { labInfo, fetchLabInfo } = useLab();
  const apiUrl = import.meta.env.VITE_API_URL;

  // Local state for form inputs and UI
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Password strength rules (strong validations)
  const passwordRules = [
    { key: "length", test: (p) => p.length >= 8, label: "At least 8 characters" },
    { key: "upper", test: (p) => /[A-Z]/.test(p), label: "Contains uppercase letter" },
    { key: "lower", test: (p) => /[a-z]/.test(p), label: "Contains lowercase letter" },
    { key: "digit", test: (p) => /\d/.test(p), label: "Contains a number" },
    { key: "special", test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p), label: "Contains a special character" },
  ];

  // Compute strength score for visual feedback
  const strengthScore = passwordRules.reduce((acc, r) => acc + (r.test(newPassword) ? 1 : 0), 0);
  const strengthLabel = ["Very Weak", "Weak", "Fair", "Good", "Strong"][Math.max(0, strengthScore - 1)];
  const strengthVariant = ["danger", "danger", "warning", "info", "success"][Math.max(0, strengthScore - 1)];

  const validateForm = () => {
    if (!oldPassword) return "Current password is required";
    if (!newPassword) return "New password is required";
    if (newPassword === oldPassword) return "New password must be different from current password";
    // Check strength rules
    const failed = passwordRules.filter((r) => !r.test(newPassword));
    if (failed.length) return "New password does not meet strength requirements";
    if (confirmPassword !== newPassword) return "Confirmation does not match new password";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const id = user?.id;
      if (!token || !id) {
        throw new Error("Not authenticated");
      }

      await axios.put(
        `${apiUrl}/emp/changePassword`,
        { oldPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess("Password updated successfully");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");

      let lab = labInfo || user?.lab || null;
      if (!lab && user?.lab_id) {
        try {
          const labResponse = await axios.get(`${apiUrl}/labs/by-id/${user.lab_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          lab = labResponse.data;
          await fetchLabInfo();
        } catch (e) {
          throw new Error("Failed to load lab information");
        }
      }

      if (lab) {
        const prefix = lab.name || lab.subdomain;
        navigate(`/${prefix}/admin/dashboard`);
      } else {
        throw new Error("No lab information available");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex align-items-center"
      style={{
        background: "linear-gradient(135deg, rgb(29, 73, 142) 0%, rgb(52, 152, 219) 100%)",
        padding: "20px 0",
      }}
    >
      <Container>
        <Row className="justify-content-center">
          <Col lg={8} md={10} sm={12}>
            <Card className="border-0 shadow-lg" style={{ borderRadius: "20px", overflow: "hidden" }}>
              <div
                className="text-center py-4"
                style={{
                  background: "linear-gradient(135deg, rgb(29, 73, 142) 0%, rgb(52, 152, 219) 100%)",
                  color: "white",
                }}
              >
                <div className="mb-3">
                  <div
                    className="d-inline-flex align-items-center justify-content-center"
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <Shield size={40} />
                  </div>
                </div>
                <h2 className="mb-2 fw-bold">Change Your Password</h2>
                <p className="mb-0 opacity-75">Keep your account secure with a strong password</p>
              </div>

              <Card.Body className="p-5">

                {error && (
                  <Alert variant="danger" className="mb-4 border-0" style={{ borderRadius: "12px" }}>
                    <div className="d-flex align-items-center">
                      <div className="me-2">⚠️</div>
                      <div>{error}</div>
                    </div>
                  </Alert>
                )}

                {success && (
                  <Alert variant="success" className="mb-4 border-0" style={{ borderRadius: "12px" }}>
                    <div className="d-flex align-items-center">
                      <CheckCircle size={18} className="me-2" />
                      <div>{success}</div>
                    </div>
                  </Alert>
                )}

                {/* Change Password Form */}
                <Form onSubmit={handleSubmit}>
                  {/* Current Password */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold text-dark">
                      <Lock size={18} className="me-2" />
                      Current Password
                    </Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type={showOld ? "text" : "password"}
                        placeholder="Enter your current password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        required
                        className="py-3 px-4 border-0"
                        style={{ backgroundColor: "#f8f9fa", borderRadius: "12px", fontSize: "1.1em", paddingRight: "50px" }}
                      />
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="position-absolute end-0 top-0 h-100 border-0 text-muted"
                        onClick={() => setShowOld(!showOld)}
                        style={{ padding: "0 15px" }}
                        aria-label={showOld ? "Hide current password" : "Show current password"}
                      >
                        {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                      </Button>
                    </div>
                  </Form.Group>

                  {/* New Password */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold text-dark">
                      <Lock size={18} className="me-2" />
                      New Password
                    </Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type={showNew ? "text" : "password"}
                        placeholder="Enter a strong new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="py-3 px-4 border-0"
                        style={{ backgroundColor: "#f8f9fa", borderRadius: "12px", fontSize: "1.1em", paddingRight: "50px" }}
                      />
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="position-absolute end-0 top-0 h-100 border-0 text-muted"
                        onClick={() => setShowNew(!showNew)}
                        style={{ padding: "0 15px" }}
                        aria-label={showNew ? "Hide new password" : "Show new password"}
                      >
                        {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                      </Button>
                    </div>

                    {/* Strength Indicator */}
                    {newPassword && newPassword.length > 0 && (
                      <Alert variant={strengthVariant} className="mt-3 py-2 border-0 " style={{ borderRadius: "8px" }}>
                        <div className="d-flex flex-column align-items-start justify-content-between ">
                          <small className="fw-semibold">Strength : {strengthLabel}</small>
                          <small className="d-flex flex-wrap justify-content-center flex-column">
                            {passwordRules.map((rule) => (
                              <span key={rule.key} className={`me-2 ${rule.test(newPassword) ? "text-success" : "text-muted"}`}>
                                {rule.test(newPassword) ? "✔" : "✖"} {rule.label}
                              </span>
                            ))}
                          </small>
                        </div>
                      </Alert>
                    )}
                  </Form.Group>

                  {/* Confirm Password */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold text-dark">
                      <Lock size={18} className="me-2" />
                      Confirm New Password
                    </Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type={showConfirm ? "text" : "password"}
                        placeholder="Re-enter your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="py-3 px-4 border-0"
                        style={{ backgroundColor: "#f8f9fa", borderRadius: "12px", fontSize: "1.1em", paddingRight: "50px" }}
                      />
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="position-absolute end-0 top-0 h-100 border-0 text-muted"
                        onClick={() => setShowConfirm(!showConfirm)}
                        style={{ padding: "0 15px" }}
                        aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                      >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </Button>
                    </div>
                  </Form.Group>

                  {/* Submit */}
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-100 py-3 fw-semibold border-0"
                    disabled={loading}
                    style={{
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, rgb(29, 73, 142) 0%, rgb(52, 152, 219) 100%)",
                      fontSize: "1.1em",
                      transition: "all 0.3s ease",
                    }}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Shield size={18} className="me-2" />
                        Update Password
                        <ArrowRight size={18} className="ms-2" />
                      </>
                    )}
                  </Button>

                  {/* Back to Login */}
                  <div className="text-center mt-3">
                    <Button variant="link" onClick={() => navigate("/login")} className="text-muted">
                      Back to Login
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default ChangePassword;