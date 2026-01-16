import React, { useState } from "react";
import { Container, Form, Button, Alert, Card, Row, Col } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Eye, EyeOff, User, Lock, Shield, ArrowRight, HelpCircle } from "lucide-react";
import axios from "axios";
import { useLab } from "../../context/LabContext";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { motion } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
const UnifiedLogin = () => {
  const { fetchLabInfo } = useLab();
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
  const apiUrl = import.meta.env.VITE_API_URL;

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

      const { token, user , isFirstTimeLogin} = response.data;
      
      // Store token and user info
      localStorage.setItem("token", token);
      
      // Call login function from auth context
      await login(token);
      
      // Get lab info - either from the user object or fetch it
      let labInfo = user.lab || null;
      
      if (!labInfo && user.lab_id) {
        try {
          const labResponse = await axios.get(`${apiUrl}/labs/by-id/${user.lab_id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          labInfo = labResponse.data;
          // Update the lab context with the fetched info
          await fetchLabInfo();
        } catch (e) {
          console.error('Failed to fetch lab info:', e);
          throw new Error('Failed to load lab information');
        }
      }
      
      if (!labInfo) {
        throw new Error('No lab information available');
      }
      
      const role = user.role || userType;
      const prefix = labInfo.name || labInfo.subdomain;
      switch (role) {
        case "admin":
          if(isFirstTimeLogin){
            navigate(`/change-password`);
          }else{
            navigate(`/${prefix}/admin/dashboard`);
          }
          break;
        case "receptionist":
          navigate(`/${prefix}/receptionist/dashboard`);
          break;
        case "chemist":
          navigate(`/${prefix}/chemist/dashboard`);
          break;
        case "doctor":
          navigate(`/${prefix}/doctor/dashboard`);
          break;
        case "employee":
          navigate(`/${prefix}/employee/dashboard`);
          break;
        case "patient":
          navigate(`/${prefix}/patient/dashboard`);
          break;
        default:
          navigate(`/${prefix}/admin/dashboard`);
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
      background: 'var(--bg-dark)',
      padding: '20px 0'
    }}>
      <Container>
        <Row className="justify-content-center">
          <Col lg={8} md={10} sm={12}>
            <Card className="shadow-lg" style={{ borderRadius: '20px', overflow: 'hidden' , border: '1px solid var(--border)' }}>
              {/* Header */}
              <div className="text-center pt-4" style={{
                background: 'var(--bg)',
                color: 'var(--text)'
              }}>
                <div className="mb-3">
                  <div className="d-inline-flex align-items-center justify-content-center" style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--bg)',
                    backdropFilter: 'blur(10px)',
                  }}>
                    <DotLottieReact
                      src="/shield.lottie"
                      style={{ width: '100%', height: '100%' }}
                      loop
                      autoplay
                    />
                  </div>
                </div>
                <h2 className="fw-bold">Welcome to LabManager</h2>
                <p className="mb-0 opacity-75">Please select your role and sign in</p>
              </div>

              <Card.Body className="px-5">
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
                        variant={userType === type.value ? "primary" : "outline-primary"}
                        size="sm"
                        onClick={() => handleUserTypeChange(type.value)}
                        aria-pressed={userType === type.value}
                        className="d-flex align-items-center gap-2 px-2 py-2 rounded-pill"
                        style={{
                          transition: 'all 0.3s ease',
                          minWidth: '100px',
                          justifyContent: 'center'
                        }}
                      >
                        <span style={{ fontSize: '1em' }}>{type.icon}</span>
                        <span className="fw-medium">{type.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Selected Role Info */}
                <motion.div
                key={selectedUserType?.label || "default-key"}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                    duration: 1,
                    scale: { type: "smooth", visualDuration: 0.7},
                }}
                >
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
                </motion.div>
                

                {error && (
                  <Alert variant="danger" className="mb-4 border-0" style={{ borderRadius: '12px' }} aria-live="assertive">
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
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            aria-pressed={showPassword}
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
                    variant={loading ? "outline-primary" : "primary"}
                    size="lg"
                    className="w-100 py-3 fw-semibold border-0"
                    disabled={loading}
                    style={{
                      borderRadius: '12px',
                      fontSize: '1.1em',
                      transition: 'all 0.3s ease'
                    }}
                  >{loading ? (
                      <div className="d-flex align-items-center flex-row p-0 justify-content-center">
                        <LoadingSpinner size={50} containerClassName="m-0 d-flex align-items-center justify-content-center" />
                          <span className="ms-2">Signing In...</span>
                        </div>
                    ) : (
                      <>
                        <Shield size={18} className="me-2 mb-1" />
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
                      <div className="p-2 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                        <strong className="text-primary">Patients</strong>
                        <p className="mb-0 small text-muted mt-1">
                          Contact your healthcare provider for your patient code
                        </p>
                      </div>
                    </div>
                    <div className="col-md-4 mb-3">
                      <div className="p-2 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                        <strong className="text-success">Employees</strong>
                        <p className="mb-0 small text-muted mt-1">
                          Contact your system administrator for login credentials
                        </p>
                      </div>
                    </div>
                    <div className="col-md-4 mb-3">
                      <div className="p-2 rounded" style={{ backgroundColor: '#f8f9fa' }}>
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