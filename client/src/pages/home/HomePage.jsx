import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Row,
  Col,
  Button,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, useInView } from "framer-motion";

// Icons
import {
  ArrowRight,
  CheckCircle,
  Users,
  FlaskConical,
  FileText,
  Shield,
  Activity,
  MousePointer2
} from "lucide-react";

// Components
import VersionBadge from "../../components/ui/VersionBadge";
import InfoModal from "../../components/info/InfoModal";
import DemoRequestModal from "../../components/home/DemoRequestModal";
import { resetNavbarTitles, resetNavbarActiveState } from '../../components/layout/MainNavBar';

// Assets & Styles
import heroImage from "../../assets/heroImage_sm.webp";
import "../../styles/HomePage.css";

// Lazy load DotLottieReact
const DotLottieReact = React.lazy(() =>
  import("@lottiefiles/dotlottie-react").then(module => ({ default: module.DotLottieReact }))
);

// Animation Variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 1, ease: "easeOut" } }
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

const LazyLottie = ({ src, style, ...props }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "200px" });

  return (
    <div ref={ref} style={style}>
      {isInView && (
        <React.Suspense fallback={<div style={style} />}>
          <DotLottieReact src={src} style={style} {...props} />
        </React.Suspense>
      )}
    </div>
  );
};

const HomePage = () => {
  // Controls open/close of the demo request modal
  const [showDemoModal, setShowDemoModal] = useState(false);
  // Single state for all info modals — null means closed, a string key opens that modal
  const [activeModal, setActiveModal] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    resetNavbarTitles();
    resetNavbarActiveState();
  }, []);

  // --- Scroll Animations ---
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);


  return (
    <div className="homepage-root">
      {/* Background glowing spots */}
      <div className="hero-mesh-bg" />

      {/* 1. HERO SECTION */}
      <section className="position-relative overflow-hidden w-100 z-index-2">
        <Container className="position-relative pt-5 pb-5 mt-4">
          <Row>
            <motion.div variants={fadeInUp} className="badge-modern mb-4 w-auto mx-auto mx-lg-0">
              <span className="badge-dot"></span> v2.0 is Live
            </motion.div>
          </Row>
          <Row>
            <motion.h1 variants={fadeInUp} className="fw-bolder mb-4 tracking-tight hero-title text-center text-lg-start">
              The Operating System <br className="d-none d-lg-block" /> for <span className="text-gradient">Modern Labs</span>
            </motion.h1>
          </Row>
          <Row className="align-items-center min-vh-65">
            <Col lg={6} className="mb-5 mb-lg-0 text-center text-lg-start">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
              >
                <motion.p variants={fadeInUp} className="lead text-muted-homepage fw-medium mb-5 pe-lg-5">
                  Streamline patient care, testing, billing, and reporting.
                  LabManager turns chaotic workflows into a precise science.
                </motion.p>

                <motion.div variants={fadeInUp} className="d-flex gap-3 justify-content-center justify-content-lg-start flex-wrap">
                  <Button
                    className="btn-primary-glow"
                    size="lg"
                    onClick={() => setShowDemoModal(true)}
                  >
                    Request Demo
                  </Button>
                  <Button
                    className="btn-glass"
                    size="lg"
                    onClick={() => navigate("/register")}
                  >
                    Register Now <ArrowRight size={18} className="ms-2" />
                  </Button>
                </motion.div>
              </motion.div>
            </Col>

            <Col lg={6} className="position-relative d-flex flex-column align-items-center justify-content-center">
              {/* Floating Dashboard Image */}
              <Row>
                <motion.div
                  className="hero-image-wrapper mb-2"
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  <div className="hero-image-glow" />
                  <motion.img
                    src={heroImage}
                    alt="LabManager Dashboard"
                    className="img-fluid rounded-4 shadow-3d glass-image-border"
                    loading="eager"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                  />

                  {/* Floating Stats Cards */}
                  <motion.div
                    className="floating-card card-stat-1 d-flex flex-column align-items-center justify-content-center glass-card-mini"
                    animate={{ y: [0, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 }}
                  >
                    <Activity size={20} className="text-primary mb-2" />
                    <div className="fw-bold" style={{ color: "var(--text)" }}>98.5%</div>
                    <div className="text-xs text-muted-homepage">Efficiency</div>
                  </motion.div>
                </motion.div>
              </Row>

              <Row>
                <motion.div
                  variants={fadeInUp}
                  initial="hidden"
                  animate="visible"
                  className="d-flex gap-4 align-items-center text-xs text-muted-homepage justify-content-center position-relative flex-wrap mt-3 font-monospace"
                  style={{ zIndex: 10, fontSize: '12px' }}
                >
                  <span className="d-flex align-items-center gap-1">
                    <CheckCircle size={14} className="text-success" /> No Credit Card
                  </span>
                  <span className="d-flex align-items-center gap-1">
                    <CheckCircle size={14} className="text-success" /> 7-Day Trial
                  </span>
                  <span className="d-flex align-items-center gap-1">
                    <CheckCircle size={14} className="text-success" /> Cancel Anytime
                  </span>
                </motion.div>
              </Row>
            </Col>
          </Row>
        </Container>
      </section>

      {/* 2. BENTO GRID FEATURES */}
      <section className="py-5 position-relative z-index-2" id="features">
        <Container>
          <div className="text-center max-w-700 mx-auto mb-5">
            <h2 className="display-5 fw-bold mb-3" style={{ color: "var(--text)" }}>Complete Control Over Your Lab</h2>
            <p className="text-muted-homepage lead">Everything you need to manage patients, tests, and billing in one unified system.</p>
          </div>

          <div className="bento-grid">
            {/* Large Card */}
            <motion.div
              className="glass-card span-2"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="p-5 h-100 d-flex flex-column position-relative">
                <div className="mb-auto position-relative z-index-2">
                  <div className="icon-box-glass mb-4">
                    <LazyLottie
                      src="/Gears Lottie Animation.lottie"
                      autoplay
                      loop
                      style={{ width: '80px', height: '80px' }}
                    />
                  </div>
                  <h3 className="fw-bold" style={{ color: "var(--text)" }}>Complete Operations</h3>
                  <p className="text-muted-homepage fs-5">Manage cultures, antibiotics, inventory, and patient history from a single intuitive command center.</p>
                </div>
              </div>
            </motion.div>

            {/* Medium Card */}
            <motion.div
              className="glass-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, delay: 0.1 }}
            >
              <div className="p-5">
                <Shield size={36} className="mb-4 text-primary" />
                <h4 className="fw-bold" style={{ color: "var(--text)" }}>Enterprise Security</h4>
                <p className="text-muted-homepage">Multi-tenant architecture with isolated environments and encrypted health data.</p>
              </div>
            </motion.div>

            {/* Medium Card */}
            <motion.div
              className="glass-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, delay: 0.2 }}
            >
              <div className="p-5">
                <FileText size={36} className="mb-4 text-primary" />
                <h4 className="fw-bold" style={{ color: "var(--text)" }}>Smart Reports</h4>
                <p className="text-muted-homepage">Auto-generated rich PDF reports with integrated QR codes and digital signatures.</p>
              </div>
            </motion.div>

            {/* Wide Card */}
            <motion.div
              className="glass-card span-2"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, delay: 0.3 }}
            >
              <div className="p-5 d-flex align-items-center gap-4">
                <div className="flex-grow-1">
                  <div className="icon-box-glass border-0 bg-transparent mb-3 p-0">
                    <LazyLottie
                      src="/Electricity charging.lottie"
                      autoplay
                      loop
                      style={{ width: '60px', height: '50px' }}
                    />
                  </div>
                  <h4 className="fw-bold" style={{ color: "var(--text)" }}>Lightning Fast Performance</h4>
                  <p className="text-muted-homepage mb-0">Built on modern tech stacks for instant search, filtering, and seamless loading.</p>
                </div>
                <div className="d-none d-md-block opacity-75">
                  <div className="d-flex gap-2">
                    <span className="badge glass-badge text-primary px-3 py-2 border-0">React</span>
                    <span className="badge glass-badge text-primary px-3 py-2 border-0">Node.js</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </Container>
      </section>

      {/* 3. WORKFLOW (Connected Steps) */}
      <section className="py-5 position-relative z-index-2" id="workflow">
        <Container>
          <div className="text-center mb-5 mt-2">
            <h2 className="fw-bold display-6" style={{ color: "var(--text)" }}>How LabManager Works</h2>
            <p className="text-muted-homepage">A seamless flow from patient entry to final report.</p>
          </div>

          <div className="workflow-steps-wrapper position-relative">
            {/* The Connecting Line (CSS handles the drawing) */}
            <div className="workflow-line d-none d-lg-block"></div>

            <Row className="position-relative z-index-2">
              {[
                { title: "Register", icon: Users, desc: "Create secure account" },
                { title: "Add Patient", icon: MousePointer2, desc: "Quick digital entry" },
                { title: "Conduct Test", icon: FlaskConical, desc: "Input lab results" },
                { title: "Report", icon: FileText, desc: "Auto-generate PDF" }
              ].map((step, index) => (
                <Col lg={3} md={6} key={index} className="mb-4 mb-lg-0 text-center">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.2 }}
                  >
                    <div className="step-icon-circle mx-auto mb-3">
                      <step.icon size={28} className="text-primary" />
                    </div>
                    <h5 className="fw-bold mb-2" style={{ color: "var(--text)" }}>{step.title}</h5>
                    <p className="text-muted-homepage small px-3">{step.desc}</p>
                  </motion.div>
                </Col>
              ))}
            </Row>
          </div>
        </Container>
      </section>

      {/* 4. MODERN CTA */}
      <section className="py-5 text-center position-relative z-index-2 mb-5">
        <Container>
          <motion.div
            className="cta-glass-card rounded-5 p-5 position-relative overflow-hidden shadow-lg"
            whileHover={{ scale: 1.01 }}
          >
            <div className="cta-pattern-bg"></div>
            <div className="position-relative z-index-2 py-4">
              <h2 className="display-4 fw-bolder mb-3" style={{ color: "var(--text)" }}>Ready to upgrade your lab?</h2>
              <p className="lead text-muted-homepage mb-5 max-w-600 mx-auto">
                Join thousands of laboratories delivering faster results with LabManager's unified operating system.
              </p>
              <div className="d-flex justify-content-center gap-3 flex-wrap">
                <Button className="btn-primary-glow" size="lg" onClick={() => setShowDemoModal(true)}>
                  Request Demo
                </Button>
                <Button className="btn-glass" size="lg" onClick={() => navigate("/register")}>
                  Register Now
                </Button>
              </div>
            </div>
          </motion.div>
        </Container>
      </section>

      {/* FOOTER */}
      <footer className="footer-modern pt-5 pb-4 position-relative z-index-2 border-top mt-auto" style={{ borderColor: 'var(--border-muted)' }}>
        <Container>
          <Row className="g-4 mb-4">
            <Col md={4} className="pe-xl-5">
              <h5 className="fw-bolder mb-3" style={{ color: "var(--text)" }}>LabManager</h5>
              <p className="text-muted-homepage small lh-lg">
                The complete laboratory management solution for modern healthcare facilities. Secure, fast, and remarkably intuitive.
              </p>
            </Col>
            <Col md={2} xs={6}>
              <h6 className="fw-bold mb-3" style={{ color: "var(--text)" }}>Product</h6>
              <ul className="list-unstyled text-muted-homepage small d-flex flex-column gap-2">
                <li><a href="#features" className="text-reset text-decoration-none hover-primary">Features</a></li>
                <li><a href="#workflow" className="text-reset text-decoration-none hover-primary">Workflow</a></li>
                <li><a href="#" className="text-reset text-decoration-none hover-primary">Pricing</a></li>
              </ul>
            </Col>
            <Col md={2} xs={6}>
              <h6 className="fw-bold mb-3" style={{ color: "var(--text)" }}>Support</h6>
              <ul className="list-unstyled text-muted-homepage small d-flex flex-column gap-2">
                <li><a href="#" className="text-reset text-decoration-none hover-primary">Help Center</a></li>
                <li><a href="#" className="text-reset text-decoration-none hover-primary">Contact Us</a></li>
              </ul>
            </Col>
            <Col md={4}>
              <h6 className="fw-bold mb-3" style={{ color: "var(--text)" }}>Legal</h6>
              <div className="d-flex gap-3 small">
                <Button variant="link" className="p-0 text-decoration-none text-muted-homepage hover-primary" onClick={() => setActiveModal('terms')}>Terms</Button>
                <Button variant="link" className="p-0 text-decoration-none text-muted-homepage hover-primary" onClick={() => setActiveModal('privacy')}>Privacy</Button>
                <Button variant="link" className="p-0 text-decoration-none text-muted-homepage hover-primary" onClick={() => setActiveModal('refund')}>Refunds</Button>
              </div>
            </Col>
          </Row>

          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center pt-4 border-top" style={{ borderColor: "var(--border-muted)" }}>
            <div className="text-muted-homepage small mb-3 mb-md-0 d-flex align-items-center gap-2">
              &copy; {new Date().getFullYear()} LabManager. <span className="d-none d-sm-inline">All rights reserved.</span>
              <VersionBadge />
            </div>
            <div className="d-flex gap-3 small">
              <Button variant="link" className="p-0 text-decoration-none text-muted-homepage hover-primary" onClick={() => setActiveModal('about')}>
                About Us
              </Button>
              <Button variant="link" className="p-0 text-decoration-none text-muted-homepage hover-primary" onClick={() => navigate(`/know-us`)}>
                Know Us
              </Button>
            </div>
          </div>
        </Container>

        {/* Single generic info modal — content is driven by activeModal key */}
        <InfoModal
          modalKey={activeModal}
          show={activeModal !== null}
          onHide={() => setActiveModal(null)}
        />

      </footer>

      {/* Demo request modal — all state and logic self-contained */}
      <DemoRequestModal
        show={showDemoModal}
        onHide={() => setShowDemoModal(false)}
      />
    </div>
  );
};

export default HomePage;