import React, { useState } from "react";
import VersionBadge from "../../components/ui/VersionBadge";
import {
  Container,
  Row,
  Col,
  Button,
  Modal,
  Form,
  Alert,
  Card,
} from "react-bootstrap";
import PrivacyPolicy from "../../components/info/PrivacyPolicy";
import RefundPolicy from "../../components/info/RefundPolicy";
import AboutUs from "../../components/info/AboutUs";
import TermsAndConditions from "../../components/info/TermsAndConditions";
import {
  Play,
  ArrowRight,
  CheckCircle,
  Users,
  FlaskConical,
  FileText,
  Shield,
  Zap,
  Mail,
  CreditCard,
  ArrowDown,
} from "lucide-react";
import axios from "axios";
import "../../styles/HomePage.css";
import { useNavigate } from "react-router-dom";
import heroImage from "../../assets/heroImage.png";
import { useEffect } from 'react';
import { resetNavbarTitles } from '../../components/layout/SecondaryNavBar';
const HomePage = () => {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoForm, setDemoForm] = useState({
    email: "",
    labName: "",
    contactPerson: "",
    phone: "",
    region: "",
    message: "",
  });
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoSuccess, setDemoSuccess] = useState(false);
  const [demoError, setDemoError] = useState("");

  // Footer modals state
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  const handleDemoRequest = async (e) => {
    e.preventDefault();
    setDemoLoading(true);
    setDemoError("");

    // Basic validation
    if (
      !demoForm.email ||
      !demoForm.labName ||
      !demoForm.contactPerson ||
      !demoForm.phone
    ) {
      setDemoError("Please fill in all required fields");
      setDemoLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(demoForm.email)) {
      setDemoError("Please enter a valid email address");
      setDemoLoading(false);
      return;
    }

    // Phone validation (basic)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(demoForm.phone.replace(/\s/g, ""))) {
      setDemoError("Please enter a valid phone number");
      setDemoLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${apiUrl}/demo/request`, demoForm);
      setDemoSuccess(true);
      setDemoForm({
        email: "",
        labName: "",
        contactPerson: "",
        phone: "",
        region: "",
        message: "",
      });
    } catch (error) {
      setDemoError(
        error.response?.data?.error ||
          "Failed to submit demo request. Please try again."
      );
    } finally {
      setDemoLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setDemoForm({
      ...demoForm,
      [e.target.name]: e.target.value,
    });
  };
  useEffect(() => {
    resetNavbarTitles();
  }, []);
  return (
    <div className="homepage-root">
      {/* Main Navigation handled globally; removed duplicate navbar */}

      {/* Hero Section */}
      <section className="hero-section-home-modern">
        <div className="hero-bg-animated"></div>
        <Container
          fluid
          className="hero-text-column align-items-center min-vh-80"
        >
          <div className="glass-card-hero animate-fade-in">
            <Row>
              <Col
                md={6}
                className="d-flex flex-column align-items-start justify-content-start"
              >
                <h1 className="hero-title-home animate-slide-up">
                  Complete{" "}
                  <span className="gradient-text">Laboratory Management</span>{" "}
                  System
                </h1>
                <div className="hero-subtitle-home mt-1 d-flex flex-row flex-wrap gap-2 animate-slide-up-delay flex-column-md">
                  <div className="d-flex align-items-center">
                    Unify patient care, diagnostics, billing, and reporting in a
                    single, secure, enterprise-grade platform.
                  </div>
                  <div className="d-flex align-items-center">
                    LabManager empowers labs to work faster, smarter, and
                    deliver results with confidence.
                  </div>
                </div>
              </Col>
              <Col
                md={6}
                className="d-flex flex-column align-items-center justify-content-center"
              >
                <img
                  src={heroImage}
                  alt="Lab Management System"
                  className="hero-image animate-float image-fluid"
                />
              </Col>
            </Row>
            <Row>
              <Col md={12} className="align-items-center">
                <div className="hero-buttons d-flex justify-content-center flex-row animate-slide-up-delay-2 m-3">
                  <Button
                    variant="primary"
                    size="lg"
                    className="hero-btn animate-btn"
                    onClick={() => setShowDemoModal(true)}
                  >
                    <Mail size={20} className="me-2" />
                    Request Demo
                  </Button>
                  <Button
                    variant="success"
                    size="lg"
                    className="hero-btn animate-btn"
                    onClick={() => navigate("/register")}
                  >
                    <CreditCard size={20} className="me-2" />
                    Register Now
                  </Button>
                  <Button
                    variant="outline-light"
                    size="lg"
                    className="hero-btn animate-btn"
                    href="#features"
                  >
                    Learn More
                    <ArrowDown size={20} className="ms-2" />
                  </Button>
                </div>
              </Col>
            </Row>
          </div>
        </Container>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <Container>
          <Row className="text-center mb-5">
            <Col>
              <h2 className="display-4 fw-bold mb-3 mt-5">
                Why Choose LabManager?
              </h2>
              <p className="lead text-muted">
                Built for modern laboratories with advanced features
              </p>
            </Col>
          </Row>
          <Row className="g-4">
            <Col md={4} sm={12}>
              <Card className="feature-card h-100 border-0 shadow-sm">
                <Card.Body className="text-center p-4">
                  <div className="mb-3">
                    <Users size={48} className="text-primary" />
                  </div>
                  <h4 className="feature-title">Multi-Tenant Architecture</h4>
                  <p className="text-muted">
                    Each lab gets its own isolated environment with custom
                    branding, settings, and data security.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} sm={12}>
              <Card className="feature-card h-100 border-0 shadow-sm">
                <Card.Body className="text-center p-4">
                  <div className="mb-3">
                    <FlaskConical size={48} className="text-success" />
                  </div>
                  <h4 className="feature-title">Complete Lab Operations</h4>
                  <p className="text-muted">
                    Manage tests, cultures, antibiotics, patient data, and
                    generate professional medical reports.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} sm={12}>
              <Card className="feature-card h-100 border-0 shadow-sm">
                <Card.Body className="text-center p-4">
                  <div className="mb-3">
                    <FileText size={48} className="text-info" />
                  </div>
                  <h4 className="feature-title">Professional Reports</h4>
                  <p className="text-muted">
                    Generate PDF reports with QR codes, barcodes, and digital
                    signatures for complete traceability.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} sm={12}>
              <Card className="feature-card h-100 border-0 shadow-sm">
                <Card.Body className="text-center p-4">
                  <div className="mb-3">
                    <Shield size={48} className="text-warning" />
                  </div>
                  <h4 className="feature-title">Enterprise Security</h4>
                  <p className="text-muted">
                    Role-based access control, data encryption, and secure
                    authentication for your sensitive data.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} sm={12}>
              <Card className="feature-card h-100 border-0 shadow-sm">
                <Card.Body className="text-center p-4">
                  <div className="mb-3">
                    <Zap size={48} className="text-danger" />
                  </div>
                  <h4 className="feature-title">Lightning Fast</h4>
                  <p className="text-muted">
                    Built with modern technologies for optimal performance and
                    responsive user experience.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} sm={12}>
              <Card className="feature-card h-100 border-0 shadow-sm">
                <Card.Body className="text-center p-4">
                  <div className="mb-3">
                    <CheckCircle size={48} className="text-primary" />
                  </div>
                  <h4 className="feature-title">Easy Setup</h4>
                  <p className="text-muted">
                    Get started in minutes with our trial system. No complex
                    installation or configuration required.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="workflow-section">
        <Container>
          <Row className="text-center mb-5">
            <Col>
              <h2 className="display-4 fw-bold mt-5">How It Works</h2>
              <p className="lead text-muted">
                Simple and efficient workflow for your laboratory
              </p>
            </Col>
          </Row>
          <Row className="g-4">
            <Col md={3} sm={12}>
              <Card className="workflow-card h-100 border-0 shadow-sm">
                <Card.Body className="text-center p-4">
                  <div className="mb-3">
                    <div className="workflow-step">1</div>
                  </div>
                  <h4 className="workflow-title">Register & Setup</h4>
                  <p className="text-muted">
                    Create your lab account and customize your settings in
                    minutes.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} sm={12}>
              <Card className="workflow-card h-100 border-0 shadow-sm">
                <Card.Body className="text-center p-4">
                  <div className="mb-3">
                    <div className="workflow-step">2</div>
                  </div>
                  <h4 className="workflow-title">Add Patients</h4>
                  <p className="text-muted">
                    Register patients and manage their information securely.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} sm={12}>
              <Card className="workflow-card h-100 border-0 shadow-sm">
                <Card.Body className="text-center p-4">
                  <div className="mb-3">
                    <div className="workflow-step">3</div>
                  </div>
                  <h4 className="workflow-title">Conduct Tests</h4>
                  <p className="text-muted">
                    Perform tests and record results with our comprehensive test
                    management.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} sm={12}>
              <Card className="workflow-card h-100 border-0 shadow-sm">
                <Card.Body className="text-center p-4">
                  <div className="mb-3">
                    <div className="workflow-step">4</div>
                  </div>
                  <h4 className="workflow-title">Generate Reports</h4>
                  <p className="text-muted">
                    Create professional reports and invoices automatically.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact-section-home">
        <Container>
          <Row className="text-center mb-5">
            <Col>
              <h2 className="display-4 fw-bold mb-3">Ready to Get Started?</h2>
              <p className="lead text-muted">
                Join thousands of laboratories using LabManager
              </p>
            </Col>
          </Row>
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <div className="d-flex flex-column flex-md-row gap-3 justify-content-center">
                <Button
                  variant="primary"
                  size="lg"
                  className="luxury-btn"
                  onClick={() => setShowDemoModal(true)}
                >
                  <Mail size={20} className="me-2" />
                  Request Free Demo
                </Button>
                <Button
                  variant="outline-primary"
                  size="lg"
                  className="luxury-btn"
                  onClick={() => navigate("/register")}
                >
                  <CreditCard size={20} className="me-2" />
                  Start Free Trial
                </Button>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Footer */}
      <footer className="footer-home">
        <Container>
          <Row>
            <Col md={4} sm={12} className="mb-4 mb-md-0">
              <h5>LabManager</h5>
              <p>
                Complete laboratory management solution for modern healthcare
                facilities.
              </p>
            </Col>
            <Col md={4} sm={12} className="mb-4 mb-md-0">
              <h5>Features</h5>
              <ul className="list-unstyled">
                <li>Patient Management</li>
                <li>Test Management</li>
                <li>Report Generation</li>
                <li>Billing & Invoicing</li>
              </ul>
            </Col>
            <Col md={4} sm={12}>
              <h5>Contact</h5>
              <p>
                Get in touch with our support team for any questions or
                assistance.
              </p>
            </Col>
          </Row>
          <hr className="my-4" />
          <div className="text-center">
            <div
              className="footer-policy-links d-flex flex-wrap justify-content-center align-items-center gap-2 mb-2"
              style={{ fontSize: "1rem" }}
            >
              <Button
                variant="link"
                className="footer-link-btn p-0"
                style={{
                  textDecoration: "underline",
                  color: "#0d6efd",
                  fontWeight: 400,
                }}
                onClick={() => setShowTerms(true)}
              >
                Terms & Conditions
              </Button>
              <span className="mx-1">|</span>
              <Button
                variant="link"
                className="footer-link-btn p-0"
                style={{
                  textDecoration: "underline",
                  color: "#0d6efd",
                  fontWeight: 400,
                }}
                onClick={() => setShowPrivacy(true)}
              >
                Privacy Policy
              </Button>
              <span className="mx-1">|</span>
              <Button
                variant="link"
                className="footer-link-btn p-0"
                style={{
                  textDecoration: "underline",
                  color: "#0d6efd",
                  fontWeight: 400,
                }}
                onClick={() => setShowRefund(true)}
              >
                Refund Policy
              </Button>
              <span className="mx-1">|</span>
              <Button
                variant="link"
                className="footer-link-btn p-0"
                style={{
                  textDecoration: "underline",
                  color: "#0d6efd",
                  fontWeight: 400,
                }}
                onClick={() => setShowAbout(true)}
              >
                About Us
              </Button>
            </div>
            <p>
              &copy; {new Date().getFullYear()} LabManager. All rights reserved.
            </p>
            <VersionBadge />
          </div>
        </Container>



        <PrivacyPolicy showPrivacy={showPrivacy} setShowPrivacy={setShowPrivacy} />
        <RefundPolicy showRefund={showRefund} setShowRefund={setShowRefund} />
        <TermsAndConditions showTerms={showTerms} setShowTerms={setShowTerms} />

        <AboutUs showAbout={showAbout} setShowAbout={setShowAbout} />
      </footer>

      {/* Demo Request Modal */}
      <Modal
        show={showDemoModal}
        onHide={() => setShowDemoModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Request Demo Account</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {demoSuccess ? (
            <div className="text-center">
              <CheckCircle size={64} className="text-success mb-3" />
              <h4>Demo Request Submitted!</h4>
              <p className="text-muted">
                We've received your demo request. You'll receive an email within
                24 hours with your trial account credentials and setup
                instructions.
              </p>
              <Button variant="primary" onClick={() => setShowDemoModal(false)}>
                Close
              </Button>
            </div>
          ) : (
            <Form onSubmit={handleDemoRequest}>
              <Alert variant="info" className="mb-3">
                <strong>Free Trial Includes:</strong>
                <ul className="mb-0 mt-2">
                  <li>14-day full access to all features</li>
                  <li>Up to 100 patients and 500 tests</li>
                  <li>Custom branding and settings</li>
                  <li>Professional support during trial</li>
                </ul>
              </Alert>

              {demoError && (
                <Alert
                  variant="danger"
                  onClose={() => setDemoError("")}
                  dismissible
                >
                  {demoError}
                </Alert>
              )}

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email Address *</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={demoForm.email}
                      onChange={handleInputChange}
                      required
                      placeholder="your@email.com"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Lab Name *</Form.Label>
                    <Form.Control
                      type="text"
                      name="labName"
                      value={demoForm.labName}
                      onChange={handleInputChange}
                      required
                      placeholder="Your Lab Name"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Contact Person *</Form.Label>
                    <Form.Control
                      type="text"
                      name="contactPerson"
                      value={demoForm.contactPerson}
                      onChange={handleInputChange}
                      required
                      placeholder="Your Name"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Phone Number *</Form.Label>
                    <Form.Control
                      type="tel"
                      name="phone"
                      value={demoForm.phone}
                      onChange={handleInputChange}
                      required
                      placeholder="+1234567890"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Region/Country</Form.Label>
                <Form.Control
                  type="text"
                  name="region"
                  value={demoForm.region}
                  onChange={handleInputChange}
                  placeholder="Your Region or Country"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Additional Message</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="message"
                  value={demoForm.message}
                  onChange={handleInputChange}
                  placeholder="Tell us about your lab's needs or any specific requirements..."
                />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        {!demoSuccess && (
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDemoModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDemoRequest}
              disabled={demoLoading}
            >
              {demoLoading ? "Submitting..." : "Request Demo"}
            </Button>
          </Modal.Footer>
        )}
      </Modal>
    </div>
  );
};

export default HomePage;
