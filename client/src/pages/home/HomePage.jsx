import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Row,
  Col,
  Button,
  Modal,
  Form,
  Alert,
} from "react-bootstrap";
import PrivacyPolicy from "../../components/info/PrivacyPolicy";
import RefundPolicy from "../../components/info/RefundPolicy";
import AboutUs from "../../components/info/AboutUs";
import TermsAndConditions from "../../components/info/TermsAndConditions";
import useLabPrefix from '../../hooks/useLabPrefix';
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, useScroll, useTransform, useInView } from "framer-motion";

// Icons
import {
  ArrowRight,
  CheckCircle,
  Users,
  FlaskConical,
  FileText,
  Shield,
  Zap,
  Mail,
  CreditCard,
  Activity,
  BarChart3,
  MousePointer2,
  ChevronRight
} from "lucide-react";

// Components
import VersionBadge from "../../components/ui/VersionBadge";
import PrivacyPolicy from "../../components/info/PrivacyPolicy";
import RefundPolicy from "../../components/info/RefundPolicy";
import AboutUs from "../../components/info/AboutUs";
import TermsAndConditions from "../../components/info/TermsAndConditions";
import { resetNavbarTitles } from '../../components/layout/SecondaryNavBar';

// Assets & Styles
import heroImage from "../../assets/heroImage.webp"; // this is Dashboard Screenshot
import "../../styles/HomePage.css";

// Animation Variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const HomePage = () => {
  // --- Existing Logic Preserved ---
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoForm, setDemoForm] = useState({
    email: "", labName: "", contactPerson: "", phone: "", region: "", message: "",
  });
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoSuccess, setDemoSuccess] = useState(false);
  const [demoError, setDemoError] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const prefix = useLabPrefix();

  const apiUrl = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  useEffect(() => {
    resetNavbarTitles();
  }, []);

  // Form Handling
  const handleInputChange = (e) => {
    setDemoForm({ ...demoForm, [e.target.name]: e.target.value });
  };

  const handleDemoRequest = async (e) => {
    e.preventDefault();
    setDemoLoading(true);
    setDemoError("");

    if (!demoForm.email || !demoForm.labName || !demoForm.contactPerson || !demoForm.phone) {
      setDemoError("Please fill in all required fields");
      setDemoLoading(false);
      return;
    }

    try {
      await axios.post(`${apiUrl}/demo/request`, demoForm);
      setDemoSuccess(true);
      setDemoForm({ email: "", labName: "", contactPerson: "", phone: "", region: "", message: "" });
    } catch (error) {
      setDemoError(error.response?.data?.error || "Failed to submit demo request.");
    } finally {
      setDemoLoading(false);
    }
  };

  // --- Scroll Animations ---
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]); // Parallax effect for hero image

  return (
    <div className="homepage-root">
      
      {/* 1. HERO SECTION */}
      <section className="hero-modern position-relative overflow-hidden">
        {/* Animated Background Mesh */}
        <div className="hero-mesh-bg" />
        
        <Container className="position-relative z-index-2 pt-5 pb-5">
          <Row>
                <motion.div variants={fadeInUp} className="badge-modern mb-3 w-auto">
                  <span className="badge-dot"></span> v2.0 is Live
                </motion.div>
          </Row>
          <Row>
            <motion.h1 variants={fadeInUp} className=" fw-bold mb-3 tracking-tight">
                  The Operating System for <span style={{ color: 'var(--primary)' }}>Modern Labs</span>
                </motion.h1>
          </Row>
          <Row className="align-items-center min-vh-65">
            <Col lg={6} className="mb-5 mb-lg-0 gap-4">
              <Row>
               <motion.div 
                initial="hidden" 
                animate="visible" 
                variants={staggerContainer}
              >
                
                <motion.p variants={fadeInUp} className="lead text-muted mb-5 pe-lg-5">
                  Streamline patient care, testing, billing, and reporting. 
                  LabManager turns chaotic workflows into a precise science.
                </motion.p>
                
                <motion.div variants={fadeInUp} className="d-flex gap-2 flex-wrap">
                  <Button 
                    variant="primary" 
                    size="md" 
                    className="btn-pill shadow-lg-primary"
                    onClick={() => setShowDemoModal(true)}
                  >
                    Request Demo 
                  </Button>
                  <Button 
                    variant="outline-primary" 
                    size="md" 
                    className="btn-pill"
                    onClick={() => navigate("/register")}
                  >
                    Register Now <ArrowRight size={18} className="ms-2" />
                  </Button>
                </motion.div>
              </motion.div> 
              </Row>
              
            </Col>

           <Col lg={6} className="position-relative d-flex flex-column align-items-center justify-content-center">
              {/* Floating Dashboard Image */}
              <Row>
                <motion.div 
                className="hero-image-wrapper mb-2"
                initial={{ opacity: 0, scale: 0.8, rotateX: 10 }}
                animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <div className="glass-panel-glow" />
                <motion.img 
                  src={heroImage} 
                  alt="LabManager Dashboard" 
                  className="img-fluid rounded-4 shadow-3d border border-white-translucent"
                  animate={{ y: [0, -15, 0] }} 
                  transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                />
                
                {/* Floating Stats Cards (Decoration) */}
                <motion.div 
                  className="floating-card card-stat-1 d-flex flex-column align-items-center justify-content-center"
                  animate={{ y: [0, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 }}
                >
                  <Activity size={20} className="text-primary mb-2" />
                  <div className="fw-bold">98.5%</div>
                  <div className="text-xs text-muted">Efficiency</div>
                </motion.div>
              </motion.div>
              </Row>
              
              <Row>
                <motion.div 
                variants={fadeInUp} 
                initial="hidden"
                animate="visible"
                className="d-flex gap-4 align-items-center text-xs text-muted justify-content-start position-relative flex-wrap"
                style={{ zIndex: 10 , fontSize: '12px' }}
              >
                <span className="d-flex align-items-center gap-1">
                  <CheckCircle size={12} className="text-success" /> No Credit Card
                </span>
                <span className="d-flex align-items-center gap-1">
                  <CheckCircle size={12} className="text-success" /> 7-Day Trial
                </span>
                <span className="d-flex align-items-center gap-1">
                  <CheckCircle size={12} className="text-success" /> Cancel Anytime
                </span>
              </motion.div>
              </Row>
               
            </Col>
          </Row>
        </Container>
      </section>


      {/* 2. BENTO GRID FEATURES */}
      <section className="py-5 bg-light-subtle" id="features">
        <Container>
          <div className="text-center max-w-700 mx-auto mb-5">
            <h2 className="display-5 fw-bold mb-3">Complete Control Over Your Lab</h2>
            <p className="text-muted lead">Everything you need to manage patients, tests, and billing in one unified system.</p>
          </div>

          <div className="bento-grid">
            {/* Large Card */}
            <motion.div 
              className="bento-card span-2 bg-white"
              whileHover={{ y: -5 }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="p-4 h-100 d-flex flex-column">
                <div className="mb-auto">
                  <div className="icon-box bg-primary-subtle text-primary mb-3">
                    <FlaskConical size={24} />
                  </div>
                  <h3>Complete Operations</h3>
                  <p className="text-muted">Manage cultures, antibiotics, inventory, and patient history from a single command center.</p>
                </div>
                {/* Visual Representation */}
                <div className="bento-mockup bg-light rounded-3 mt-3 border h-150px"></div>
              </div>
            </motion.div>

            {/* Medium Card */}
            <motion.div 
              className="bento-card"
              whileHover={{ scale: 1.02 }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, delay: 0.1 }}
            >
              <div className="p-4">
                <Shield size={32} className="mb-3 text-info" />
                <h4>Enterprise Security</h4>
                <p className="text-muted small">Multi-tenant architecture with isolated environments and encrypted data.</p>
              </div>
            </motion.div>

             {/* Medium Card */}
             <motion.div 
              className="bento-card bg-white"
              whileHover={{ y: -5 }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, delay: 0.2 }}
            >
              <div className="p-4">
                <FileText size={32} className="mb-3 text-warning" />
                <h4>Smart Reports</h4>
                <p className="text-muted small">Auto-generated PDF reports with QR codes and digital signatures.</p>
              </div>
            </motion.div>

            {/* Wide Card */}
            <motion.div 
              className="bento-card span-2 bg-white"
              whileHover={{ y: -5 }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, delay: 0.3 }}
            >
              <div className="p-4 d-flex align-items-center gap-4">
                 <div className="flex-grow-1">
                    <div className="icon-box bg-success-subtle text-success mb-3">
                      <Zap size={24} />
                    </div>
                    <h4>Lightning Fast Performance</h4>
                    <p className="text-muted mb-0">Built on modern tech stacks for instant search and loading.</p>
                 </div>
                 <div className="d-none d-md-block">
                    <div className="d-flex gap-2">
                       <span className="badge bg-light text-dark border">React</span>
                       <span className="badge bg-light text-dark border">Node.js</span>
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        </Container>
      </section>
      {/* 3. WORKFLOW (Connected Steps) */}
      <section className="py-5 bg-white" id="workflow">
        <Container>
          <div className="text-center mb-5 mt-5">
            <h2 className="fw-bold display-6">How LabManager Works</h2>
            <p className="text-muted">A seamless flow from patient entry to final report.</p>
          </div>
          
          <div className="workflow-steps-wrapper">
            {/* The Connecting Line (CSS handles the drawing) */}
            <div className="workflow-line d-none d-lg-block"></div>
            
            <Row>
               {[
                 { title: "Register", icon: Users, desc: "Create secure account" },
                 { title: "Add Patient", icon: MousePointer2, desc: "Quick digital entry" },
                 { title: "Conduct Test", icon: FlaskConical, desc: "Input lab results" },
                 { title: "Report", icon: FileText, desc: "Auto-generate PDF" }
               ].map((step, index) => (
                 <Col lg={3} md={6} key={index} className="mb-4 mb-lg-0">
                    <motion.div 
                      className="workflow-step-card text-center position-relative z-index-2"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.2 }}
                      
                    >
                       <motion.div 
                         className="step-icon-circle shadow-sm bg-white text-primary mx-auto mb-3"
                         whileHover={{ y: -3, borderColor: 'var(--border)' }}
                         style={{ border: '1px solid transparent' }}
                       >
                          <step.icon size={28} />
                       </motion.div>
                       <h5 className="fw-bold">{step.title}</h5>
                       <p className="text-muted small">{step.desc}</p>
                    </motion.div>
                 </Col>
               ))}
            </Row>
          </div>
        </Container>
      </section>

      {/* 4. MODERN CTA */}
      <section className="py-5 bg-light text-center">
        <Container>
           <motion.div 
             className="cta-box bg-primary text-white rounded-5 p-5 position-relative overflow-hidden"
             whileHover={{ scale: 1.01 }}
           >
             <div className="cta-pattern-bg"></div>
             <div className="position-relative z-index-2">
                <h2 className="display-5 fw-bold mb-3">Ready to upgrade your lab?</h2>
                <p className="lead text-white-50 mb-4 max-w-600 mx-auto">
                  Join thousands of laboratories delivering faster results with LabManager.
                </p>
                <div className="d-flex justify-content-center gap-3 flex-wrap">
                   <Button variant="light" size="md" className="text-primary fw-bold" onClick={() => setShowDemoModal(true)}>
                      Request Demo
                   </Button>
                   <Button variant="outline-light" size="md" onClick={() => navigate("/register")}>
                      Register Now
                   </Button>
                </div>
             </div>
           </motion.div>
        </Container>
      </section>

      {/* FOOTER (Dark) */}
      <footer className="footer-logo-feel pt-5 pb-3">
        <Container>
          <Row className="g-4 mb-5">
            <Col md={4}>
              <h5 className="text-white fw-bold mb-3">LabManager</h5>
              <p className="text-white-50 small">
                The complete laboratory management solution for modern healthcare facilities. Secure, fast, and reliable.
              </p>
            </Col>
            <Col md={2}>
              <h6 className="fw-bold mb-3 text-white">Product</h6>
              <ul className="list-unstyled text-white-50 small d-flex flex-column gap-2">
                <li><a href="#features" className="text-reset text-decoration-none hover-white">Features</a></li>
                <li><a href="#workflow" className="text-reset text-decoration-none hover-white">Workflow</a></li>
                <li><a href="#" className="text-reset text-decoration-none hover-white">Pricing</a></li>
              </ul>
            </Col>
            <Col md={2}>
              <h6 className="fw-bold mb-3 text-white">Support</h6>
              <ul className="list-unstyled text-white-50 small d-flex flex-column gap-2">
                <li><a href="#" className="text-reset text-decoration-none hover-white">Help Center</a></li>
                <li><a href="#" className="text-reset text-decoration-none hover-white">Contact Us</a></li>
              </ul>
            </Col>
            <Col md={4}>
               <h6 className="fw-bold mb-3 text-white">Legal</h6>
               <div className="d-flex flex-wrap gap-3 text-white-50 small">
                  <span className="cursor-pointer hover-white" onClick={() => setShowTerms(true)}>Terms</span>
                  <span className="cursor-pointer hover-white" onClick={() => setShowPrivacy(true)}>Privacy</span>
                  <span className="cursor-pointer hover-white" onClick={() => setShowRefund(true)}>Refunds</span>
               </div>
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
               <span className="mx-1">|</span>
              <Button
                variant="link"
                className="footer-link-btn p-0"
                style={{
                  textDecoration: "underline",
                  color: "#0d6efd",
                  fontWeight: 400,
                }}
                  onClick={() => navigate(`/know-us`)} >
                Know Us
              </Button>
            </div>
            <p>
              &copy; {new Date().getFullYear()} LabManager. All rights reserved.
            </p>
            <VersionBadge />
          <div className="border-top border-white-10 pt-3 text-center text-white-50 small">
             <div className="d-flex justify-content-center align-items-center gap-2">
                &copy; {new Date().getFullYear()} LabManager. All rights reserved.
                <VersionBadge />
             </div>
          </div>
        </Container>

        {/* Info Modals */}
        <PrivacyPolicy showPrivacy={showPrivacy} setShowPrivacy={setShowPrivacy} />
        <RefundPolicy showRefund={showRefund} setShowRefund={setShowRefund} />
        <TermsAndConditions showTerms={showTerms} setShowTerms={setShowTerms} />
        <AboutUs showAbout={showAbout} setShowAbout={setShowAbout} />

      </footer>

      {/* Demo Modal (Unchanged Logic) */}
      <Modal show={showDemoModal} onHide={() => setShowDemoModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Request Demo Account</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {demoSuccess ? (
            <div className="text-center py-5">
              <CheckCircle size={64} className="text-success mb-3" />
              <h4>Request Received!</h4>
              <p className="text-muted">Check your email shortly for credentials.</p>
              <Button variant="primary" onClick={() => setShowDemoModal(false)}>Close</Button>
            </div>
          ) : (
             <Form onSubmit={handleDemoRequest}>
               <Alert variant="info" className="mb-4 border-0 bg-primary-subtle text-primary">
                  <strong>Includes:</strong> 7-day full access, 500 tests limit, Support.
               </Alert>
               {demoError && <Alert variant="danger" dismissible onClose={() => setDemoError("")}>{demoError}</Alert>}
               
               <Row>
                 <Col md={6}><Form.Group className="mb-3"><Form.Label>Email</Form.Label><Form.Control type="email" name="email" required value={demoForm.email} onChange={handleInputChange} /></Form.Group></Col>
                 <Col md={6}><Form.Group className="mb-3"><Form.Label>Lab Name</Form.Label><Form.Control type="text" name="labName" required value={demoForm.labName} onChange={handleInputChange} /></Form.Group></Col>
               </Row>
               <Row>
                 <Col md={6}><Form.Group className="mb-3"><Form.Label>Contact Person</Form.Label><Form.Control type="text" name="contactPerson" required value={demoForm.contactPerson} onChange={handleInputChange} /></Form.Group></Col>
                 <Col md={6}><Form.Group className="mb-3"><Form.Label>Phone</Form.Label><Form.Control type="tel" name="phone" required value={demoForm.phone} onChange={handleInputChange} /></Form.Group></Col>
               </Row>
               <Form.Group className="mb-3"><Form.Label>Region</Form.Label><Form.Control type="text" name="region" value={demoForm.region} onChange={handleInputChange} /></Form.Group>
               <Form.Group className="mb-4"><Form.Label>Message</Form.Label><Form.Control as="textarea" rows={3} name="message" value={demoForm.message} onChange={handleInputChange} /></Form.Group>
               
               <div className="d-flex justify-content-end gap-2">
                  <Button variant="secondary" onClick={() => setShowDemoModal(false)}>Cancel</Button>
                  <Button variant="primary" type="submit" disabled={demoLoading}>{demoLoading ? "Sending..." : "Request Demo"}</Button>
               </div>
             </Form>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default HomePage;