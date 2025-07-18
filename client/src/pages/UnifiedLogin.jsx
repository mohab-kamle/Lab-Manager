import React, { useState } from "react";
import { Container, Form, Button, Alert, Card, Row, Col, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff, User, Lock, Shield, ArrowRight, HelpCircle } from "lucide-react";
import axios from "axios";

const UnifiedLogin = () => {
  const [userType, setUserType] = useState("employee"); // Default to employee
  const [credentials, setCredentials] = useState({
    username: "",
    password: ""
  });
  const [patientCode, setPatientCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
  console.log(apiUrl);

  const userTypes = [
    {
      value: "admin",
      label: "Administrator",
      description: "Full system access",
      color: "danger",
      icon: "👨‍💼",
      bgColor: "rgba(220, 53, 69, 0.1)"
    },
    {
      value: "receptionist", 
      label: "Receptionist",
      description: "Patient management & invoices",
      color: "primary",
      icon: "👩‍💼",
      bgColor: "rgba(13, 110, 253, 0.1)"
    },
    {
      value: "chemist",
      label: "Chemist",
      description: "Lab work & test results",
      color: "success", 
      icon: "🧪",
      bgColor: "rgba(25, 135, 84, 0.1)"
    },
    {
      value: "doctor",
      label: "Doctor",
      description: "Medical reports & diagnosis",
      color: "info",
      icon: "👨‍⚕️",
      bgColor: "rgba(13, 202, 240, 0.1)"
    },
    {
      value: "employee",
      label: "Employee",
      description: "Basic system access",
      color: "secondary",
      icon: "👤",
      bgColor: "rgba(108, 117, 125, 0.1)"
    },
    {
      value: "patient",
      label: "Patient",
      description: "View reports & profile",
      color: "warning",
      icon: "🏥",
      bgColor: "rgba(255, 193, 7, 0.1)"
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let response;
      
      if (userType === "patient") {
        // Patient login with patient code
        response = await axios.post(`${apiUrl}/patient/login`, {
          patientcode: patientCode
        });
      } else {
        // Employee login with username/password
        response = await axios.post(`${apiUrl}/emp/login`, {
          username: credentials.username,
          password: credentials.password
        });
      }

      const { token, user } = response.data;
      
      // Store token and user info
      localStorage.setItem("token", token);
      
      // Call login function from auth context
      await login(token);

      // Redirect based on role
      const role = user.role || userType;
      switch (role) {
        case "admin":
          navigate("/admin/dashboard");
          break;
        case "receptionist":
          navigate("/receptionist/dashboard");
          break;
        case "chemist":
          navigate("/chemist/dashboard");
          break;
        case "doctor":
          navigate("/doctor/dashboard");
          break;
        case "employee":
          navigate("/employee/dashboard");
          break;
        case "patient":
          navigate("/patient/dashboard");
          break;
        default:
          navigate("/admin/dashboard");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(error.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUserTypeChange = (type) => {
    setUserType(type);
    setError(null);
    setCredentials({ username: "", password: "" });
    setPatientCode("");
  };

  const selectedUserType = userTypes.find(t => t.value === userType);

  return (
    <div className="min-vh-100 d-flex align-items-center" style={{
      background: 'linear-gradient(135deg, rgb(29, 73, 142) 0%, rgb(52, 152, 219) 100%)',
      padding: '20px 0'
    }}>
      <Container>
        <Row className="justify-content-center">
          <Col lg={8} md={10} sm={12}>
            <Card className="border-0 shadow-lg" style={{ borderRadius: '20px', overflow: 'hidden' }}>
              {/* Header */}
              <div className="text-center py-4" style={{
                background: 'linear-gradient(135deg, rgb(29, 73, 142) 0%, rgb(52, 152, 219) 100%)',
                color: 'white'
              }}>
                <div className="mb-3">
                  <div className="d-inline-flex align-items-center justify-content-center" style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <Shield size={40} />
                  </div>
                </div>
                <h2 className="mb-2 fw-bold">Welcome to LabManager</h2>
                <p className="mb-0 opacity-75">Please select your role and sign in</p>
              </div>

              <Card.Body className="p-5">
                {/* User Type Selection */}
                <div className="mb-4">
                  <h6 className="text-muted mb-3 fw-semibold">
                    <User size={18} className="me-2" />
                    Select your role:
                  </h6>
                  <div className="d-flex flex-wrap gap-2">
                    {userTypes.map((type) => (
                      <Button
                        key={type.value}
                        variant={userType === type.value ? type.color : "outline-" + type.color}
                        size="sm"
                        onClick={() => handleUserTypeChange(type.value)}
                        className="d-flex align-items-center gap-2 px-3 py-2 rounded-pill border-0"
                        style={{
                          backgroundColor: userType === type.value ? undefined : type.bgColor,
                          border: userType === type.value ? undefined : `2px solid var(--bs-${type.color})`,
                          transition: 'all 0.3s ease',
                          minWidth: '120px',
                          justifyContent: 'center'
                        }}
                      >
                        <span style={{ fontSize: '1.2em' }}>{type.icon}</span>
                        <span className="fw-medium">{type.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Selected Role Info */}
                <Alert variant="light" className="mb-4 border-0" style={{
                  backgroundColor: selectedUserType?.bgColor,
                  borderLeft: `4px solid var(--bs-${selectedUserType?.color})`
                }}>
                  <div className="d-flex align-items-center">
                    <span style={{ fontSize: '1.5em', marginRight: '12px' }}>{selectedUserType?.icon}</span>
                    <div>
                      <strong className="text-dark">{selectedUserType?.label}</strong>
                      <br />
                      <small className="text-muted">{selectedUserType?.description}</small>
                    </div>
                  </div>
                </Alert>

                {error && (
                  <Alert variant="danger" className="mb-4 border-0" style={{ borderRadius: '12px' }}>
                    <div className="d-flex align-items-center">
                      <div className="me-2">⚠️</div>
                      <div>{error}</div>
                    </div>
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  {userType === "patient" ? (
                    /* Patient Login Form */
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-semibold text-dark">
                        <User size={18} className="me-2" />
                        Patient Code
                      </Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter your patient code"
                        value={patientCode}
                        onChange={(e) => setPatientCode(e.target.value)}
                        required
                        className="py-3 px-4 border-0"
                        style={{
                          backgroundColor: '#f8f9fa',
                          borderRadius: '12px',
                          fontSize: '1.1em'
                        }}
                      />
                      <Form.Text className="text-muted mt-2">
                        <HelpCircle size={14} className="me-1" />
                        Enter the patient code provided by your healthcare provider
                      </Form.Text>
                    </Form.Group>
                  ) : (
                    /* Employee Login Form */
                    <>
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-semibold text-dark">
                          <User size={18} className="me-2" />
                          Username
                        </Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Enter your username"
                          value={credentials.username}
                          onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                          required
                          className="py-3 px-4 border-0"
                          style={{
                            backgroundColor: '#f8f9fa',
                            borderRadius: '12px',
                            fontSize: '1.1em'
                          }}
                        />
                      </Form.Group>

                      <Form.Group className="mb-4">
                        <Form.Label className="fw-semibold text-dark">
                          <Lock size={18} className="me-2" />
                          Password
                        </Form.Label>
                        <div className="position-relative">
                          <Form.Control
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={credentials.password}
                            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                            required
                            className="py-3 px-4 border-0"
                            style={{
                              backgroundColor: '#f8f9fa',
                              borderRadius: '12px',
                              fontSize: '1.1em',
                              paddingRight: '50px'
                            }}
                          />
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="position-absolute end-0 top-0 h-100 border-0 text-muted"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{ padding: '0 15px' }}
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </Button>
                        </div>
                      </Form.Group>
                    </>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-100 py-3 fw-semibold border-0"
                    disabled={loading}
                    style={{
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, rgb(29, 73, 142) 0%, rgb(52, 152, 219) 100%)',
                      fontSize: '1.1em',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Signing in...
                      </>
                    ) : (
                      <>
                        <Shield size={18} className="me-2" />
                        Sign In
                        <ArrowRight size={18} className="ms-2" />
                      </>
                    )}
                  </Button>
                </Form>

                {/* Help Section */}
                <div className="mt-5 pt-4 border-top">
                  <h6 className="text-muted mb-3 fw-semibold">
                    <HelpCircle size={18} className="me-2" />
                    Need Help?
                  </h6>
                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <div className="p-3 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                        <strong className="text-primary">Patients</strong>
                        <p className="mb-0 small text-muted mt-1">
                          Contact your healthcare provider for your patient code
                        </p>
                      </div>
                    </div>
                    <div className="col-md-4 mb-3">
                      <div className="p-3 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                        <strong className="text-success">Employees</strong>
                        <p className="mb-0 small text-muted mt-1">
                          Contact your system administrator for login credentials
                        </p>
                      </div>
                    </div>
                    <div className="col-md-4 mb-3">
                      <div className="p-3 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                        <strong className="text-info">Technical Support</strong>
                        <p className="mb-0 small text-muted mt-1">
                          Contact IT department for assistance
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default UnifiedLogin; 