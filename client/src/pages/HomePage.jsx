import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { motion } from 'framer-motion';
import {
  BarChart2, User, FileText, Lock, Barcode, ArrowRight
} from 'lucide-react';
import heroImage from '../assets/heroImage.png';
import './HomePage.css';

const features = [
  {
    icon: <BarChart2 size={32} className="feature-icon" />, title: 'Smart Admin Dashboard',
    desc: 'Real-time analytics, revenue, and payment tracking for efficient management.'
  },
  {
    icon: <User size={32} className="feature-icon" />, title: 'Patient Portal',
    desc: 'Patients can view, download, and track their medical reports securely.'
  },
  {
    icon: <Barcode size={32} className="feature-icon" />, title: 'Barcode & QR Integration',
    desc: 'Seamless barcode/QR for samples, reports, and patient login.'
  },
  {
    icon: <FileText size={32} className="feature-icon" />, title: 'Automated Invoicing',
    desc: 'Generate, send, and manage invoices and payments automatically.'
  },
  {
    icon: <FileText size={32} className="feature-icon" />, title: 'Medical Report Generation',
    desc: 'Professional PDF reports, multi-format, and multi-page support.'
  },
  {
    icon: <Lock size={32} className="feature-icon" />, title: 'Role-based Access',
    desc: 'Secure, permissioned access for Admin, Patient, Chemist, and Receptionist.'
  },
];

const workflowSteps = [
  {
    icon: <User size={28} />, title: 'Patient',
    steps: [
      'Register or login with patient code',
      'Book tests and view results online',
      'Download reports and invoices',
      'Get notified when results are ready',
    ]
  },
  {
    icon: <BarChart2 size={28} />, title: 'Admin',
    steps: [
      'Monitor dashboard and analytics',
      'Manage patients, tests, and staff',
      'Approve results and generate reports',
      'Oversee payments and branches',
    ]
  },
  {
    icon: <Lock size={28} />, title: 'Chemist & Receptionist',
    steps: [
      'Coming soon: Dedicated workflows for chemists and receptionists.'
    ]
  }
];

const heroVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
};

const sectionVariants = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7 } }
};

const dividerSVG = (
  <svg className="section-divider" viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
    <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill="#f8f9fa"/>
  </svg>
);

const dividerSVGAlt = (
  <svg className="section-divider" viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
    <path d="M0,30 C360,0 1080,60 1440,30 L1440,60 L0,60 Z" fill="#eaf0f7"/>
  </svg>
);

const HomePage = () => {
  console.log(import.meta.env.VITE_API_URL); // Debug: Print API URL
  return (
    <div className="homepage-root">
      {/* Modern Hero Section */}
      <motion.section className="hero-section-home-modern" initial="hidden" animate="visible" variants={heroVariants}>
        <Container fluid>
          <Row className="align-items-center min-vh-100 flex-column-reverse flex-lg-row">
            <Col lg={6} className="d-flex flex-column justify-content-center align-items-center text-lg-start text-center mb-5 mb-lg-0">
              <motion.div
                variants={heroVariants}
                initial="hidden"
                animate="visible"
                className="hero-text-block hero-text-block-large"
              >
                <h1 className="hero-title-home hero-title-home-large mb-4">
                  <span className="gradient-text">Revolutionize</span> Your Lab Experience
                </h1>
                <motion.p
                  className="hero-subtitle-home hero-subtitle-home-large mb-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 1 }}
                >
                  All-in-one platform for labs, patients, and admins. Fast, secure, and always available.
                </motion.p>
                <Button
                  variant="primary"
                  size="lg"
                  className="cta-btn"
                  onClick={() => {
                    const contactSection = document.getElementById('contactSection');
                    if (contactSection) contactSection.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Contact Us <ArrowRight size={20} className="ms-2" />
                </Button>
              </motion.div>
            </Col>
            <Col lg={6} className="d-flex justify-content-center align-items-center position-relative mb-5 mb-lg-0">
              <motion.div
                className="glass-card-hero glass-card-hero-large p-1 d-flex flex-column align-items-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <img src={heroImage} alt="Doctors at Lab" className="hero-image-home-modern hero-image-home-modern-large" />
              </motion.div>
              <div className="hero-bg-animated" />
            </Col>
          </Row>
        </Container>
      </motion.section>
      {dividerSVG}
      {/* Features Section */}
      <motion.section className="features-section py-5" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={sectionVariants}>
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-5"
          >
            <h2 className="section-title">
              System <span className="text-primary">Features</span>
            </h2>
            <p className="section-subtitle">
              Everything you need to run a modern laboratory
            </p>
          </motion.div>
          <Row>
            {features.map((feature, idx) => (
              <Col key={idx} lg={4} md={6} className="mb-4">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: idx * 0.05 }}
                  viewport={{ once: true }}
                >
                  <Card className="feature-card h-100 text-center">
                    <Card.Body>
                      <div className="mb-3">{feature.icon}</div>
                      <h5 className="feature-title mb-2">{feature.title}</h5>
                      <p className="feature-desc mb-0">{feature.desc}</p>
                    </Card.Body>
                  </Card>
                </motion.div>
              </Col>
            ))}
          </Row>
        </Container>
      </motion.section>
      {dividerSVGAlt}
      {/* Workflow Section */}
      <motion.section className="workflow-section py-5 bg-light" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={sectionVariants}>
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-5"
          >
            <h2 className="section-title">
              How It <span className="text-primary">Works</span>
            </h2>
            <p className="section-subtitle">
              Simple, intuitive workflows for every user
            </p>
          </motion.div>
          <Row>
            {workflowSteps.map((role, idx) => (
              <Col key={idx} lg={4} md={6} className="mb-4">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: idx * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="workflow-card h-100 text-center">
                    <Card.Body>
                      <div className="mb-3">{role.icon}</div>
                      <h5 className="workflow-title mb-3">{role.title}</h5>
                      <ul className="workflow-list">
                        {role.steps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ul>
                    </Card.Body>
                  </Card>
                </motion.div>
              </Col>
            ))}
          </Row>
        </Container>
      </motion.section>
      {dividerSVG}
      {/* Contact Section */}
      <motion.section className="contact-section-home py-5" id="contactSection" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={sectionVariants}>
        <Container>
          <Row className="justify-content-center">
            <Col lg={8} className="text-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="section-title mb-4">
                  Get in <span className="text-primary">Touch</span>
                </h2>
                <p className="section-subtitle mb-5">
                  Ready to experience the future of lab management? Contact us today.
                </p>
                <div className="contact-info-home">
                  <p><strong>Email:</strong> <a href="mailto:contact@labmanager.com">contact@labmanager.com</a></p>
                  <p><strong>Phone:</strong> <a href="tel:+1234567890">+123 456 7890</a></p>
                  <p><strong>Address:</strong> 123 Lab Street, Science City, SC 12345</p>
                </div>
              </motion.div>
            </Col>
          </Row>
        </Container>
      </motion.section>
      {/* Footer */}
      <footer className="footer-home">
        <p>&copy; {new Date().getFullYear()} LabManager. All rights reserved. &mdash; <a href="mailto:contact@labmanager.com">Contact</a></p>
      </footer>
    </div>
  );
};

export default HomePage;
