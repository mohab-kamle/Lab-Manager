import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { motion } from 'framer-motion';
import {
  Award,
  Users,
  Heart,
  Shield,
  Zap,
  Phone,
  Clock,
  FlaskConical,
  Microscope,
  Stethoscope,
  TrendingUp,
} from 'lucide-react';
import '../../styles/KnowUs.css';
import FloatingBackToTopButton from '../../components/ui/FloatingBackToTopButton';

/* ── Animation variants ─────────────────────────────────────────────────── */
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

/* ── Static data ────────────────────────────────────────────────────────── */

/*
 * Icons are rendered WITHOUT an inline color prop — the CSS `.stat-icon`,
 * `.value-icon`, `.service-icon`, and `.contact-icon` classes set
 * `color: var(--color-primary)` so every icon automatically adapts to the
 * theme without hardcoding colors in JSX.
 */
const stats = [
  { number: '2025', label: 'Year Launched',    icon: <Award size={28} /> },
  { number: '100+', label: 'Labs Registered',  icon: <FlaskConical size={28} /> },
  { number: '10+',  label: 'Team Members',     icon: <Stethoscope size={28} /> },
  { number: '100%', label: 'Cloud Based',      icon: <TrendingUp size={28} /> },
];

const values = [
  {
    icon: <Heart size={32} />,
    title: 'Patient Care First',
    description: 'Every decision we make is centered around providing the best care for our patients.',
  },
  {
    icon: <Shield size={32} />,
    title: 'Quality Assurance',
    description: 'Rigorous quality control processes ensure accurate and reliable test results.',
  },
  {
    icon: <Zap size={32} />,
    title: 'Innovation',
    description: 'Continuously adopting the latest medical technologies and methodologies.',
  },
  {
    icon: <Users size={32} />,
    title: 'Expert Team',
    description: 'Highly qualified medical professionals dedicated to excellence.',
  },
];

const services = [
  {
    icon: <Microscope size={28} />,
    title: 'Clinical Chemistry',
    description: 'Comprehensive blood chemistry analysis for accurate diagnosis.',
  },
  {
    icon: <FlaskConical size={28} />,
    title: 'Microbiology',
    description: 'Advanced microbial testing and culture analysis.',
  },
  {
    icon: <Stethoscope size={28} />,
    title: 'Hematology',
    description: 'Complete blood count and blood disorder testing.',
  },
  {
    icon: <TrendingUp size={28} />,
    title: 'Immunology',
    description: 'Specialized immune system and allergy testing.',
  },
];

/* ── Component ──────────────────────────────────────────────────────────── */
const KnowUs = () => (
  <div className="know-us-container">

    {/* ── Hero ── */}
    <section className="hero-section">
      <Container>
        <Row className="justify-content-center text-center">
          <Col lg={8}>
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              style={{ position: 'relative', zIndex: 10 }}
            >
              <motion.div variants={fadeInUp} className="badge-modern mb-4 mx-auto" style={{ width: 'fit-content' }}>
                <span className="badge-dot" /> Established 2025
              </motion.div>

              <motion.h1 variants={fadeInUp} className="hero-title mb-4">
                Leading Medical Laboratory{' '}
                <span className="text-primary">Excellence</span>
              </motion.h1>

              <motion.p variants={fadeInUp} className="hero-subtitle mx-auto">
                We are at the forefront of medical diagnostics — providing accurate, reliable,
                and timely laboratory services to healthcare providers and patients across the region.
              </motion.p>

              <motion.div variants={fadeInUp} className="hero-buttons">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => document.getElementById('servicesSection')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Our Services
                </button>
                <button
                  className="btn btn-outline-primary btn-lg"
                  onClick={() => document.getElementById('getInTouch')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Contact Us
                </button>
              </motion.div>
            </motion.div>
          </Col>
        </Row>
      </Container>
    </section>

    {/* ── Stats ── */}
    <section className="stats-section py-5">
      <Container>
        <Row className="g-4 justify-content-center">
          {stats.map((stat, i) => (
            <Col key={i} lg={3} md={6} xs={6}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="stat-card text-center h-100">
                  <Card.Body className="p-4">
                    <div className="stat-icon mb-3">{stat.icon}</div>
                    <div className="stat-number mb-1">{stat.number}</div>
                    <div className="stat-label">{stat.label}</div>
                  </Card.Body>
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>
      </Container>
    </section>

    {/* ── About ── */}
    <section className="about-section py-5">
      <Container>
        <Row className="align-items-center g-5">
          <Col lg={6}>
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="section-title mb-4">
                About <span className="text-primary">LabManager</span>
              </h2>
              <p className="section-text mb-4">
                LabManager is dedicated to providing reliable and efficient laboratory management
                solutions for healthcare providers and patients. Our focus is on delivering accurate
                results, innovative technology, and excellent service.
              </p>
              <p className="section-text mb-4">
                We utilize modern tools and a passionate team to help labs operate smoothly and
                deliver quality diagnostics every day.
              </p>
              <div className="about-features">
                <div className="feature-item">
                  <Users size={18} className="text-primary me-2" />
                  <span>Professional Team</span>
                </div>
              </div>
            </motion.div>
          </Col>

          <Col lg={6}>
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              viewport={{ once: true }}
            >
              <Card className="about-card">
                <Card.Body className="p-4">
                  <h4 className="card-title mb-3">Our Mission</h4>
                  <p className="card-text mb-4">
                    To provide the highest quality laboratory services that contribute to better
                    health outcomes through accurate diagnostics, innovative technology, and
                    exceptional patient care.
                  </p>
                  <h4 className="card-title mb-3">Our Vision</h4>
                  <p className="card-text mb-0">
                    To be the leading medical laboratory in the region, recognized for excellence
                    in diagnostics, innovation in healthcare technology, and commitment to improving
                    community health.
                  </p>
                </Card.Body>
              </Card>
            </motion.div>
          </Col>
        </Row>
      </Container>
    </section>

    {/* ── Values ── */}
    <section className="values-section py-5">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-5"
        >
          <h2 className="section-title">
            Our <span className="text-primary">Core Values</span>
          </h2>
          <p className="section-subtitle">The principles that guide everything we do</p>
        </motion.div>

        <Row className="g-4">
          {values.map((value, i) => (
            <Col key={i} lg={3} md={6}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="h-100"
              >
                <Card className="value-card text-center h-100">
                  <Card.Body className="p-4">
                    <div className="value-icon mb-3">{value.icon}</div>
                    <h4 className="value-title mb-2">{value.title}</h4>
                    <p className="value-description mb-0">{value.description}</p>
                  </Card.Body>
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>
      </Container>
    </section>

    {/* ── Services ── */}
    <section className="services-section py-5" id="servicesSection">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-5"
        >
          <h2 className="section-title">
            Our <span className="text-primary">Services</span>
          </h2>
          <p className="section-subtitle">Comprehensive laboratory testing solutions</p>
        </motion.div>

        <Row className="g-4">
          {services.map((service, i) => (
            <Col key={i} lg={3} md={6}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="h-100"
              >
                <Card className="service-card text-center h-100">
                  <Card.Body className="p-4">
                    <div className="service-icon mb-3">{service.icon}</div>
                    <h4 className="service-title mb-2">{service.title}</h4>
                    <p className="service-description mb-0">{service.description}</p>
                  </Card.Body>
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>
      </Container>
    </section>

    {/* ── Contact ── */}
    <section className="contact-section py-5">
      <Container>
        <Row className="justify-content-center text-center mb-5">
          <Col lg={6}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="section-title mb-3">
                Get in <span className="text-primary">Touch</span>
              </h2>
              <p className="section-subtitle mb-0">
                Ready to experience the difference? Contact us today.
              </p>
            </motion.div>
          </Col>
        </Row>

        <Row className="justify-content-center g-4" id="getInTouch">
          <Col md={4} className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <div className="contact-icon mb-3"><Phone size={24} /></div>
              <h5>Call Us</h5>
              <p className="mb-0">
                Main: (555) 123-4567<br />
                Emergency: (555) 987-6543<br />
                Fax: (555) 123-4568
              </p>
            </motion.div>
          </Col>

          <Col md={4} className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="contact-icon mb-3"><Clock size={24} /></div>
              <h5>Hours</h5>
              <p className="mb-0">
                Mon–Fri: 7:00 AM – 8:00 PM<br />
                Saturday: 8:00 AM – 6:00 PM<br />
                Sunday: 9:00 AM – 4:00 PM
              </p>
            </motion.div>
          </Col>
        </Row>
      </Container>
    </section>

    <FloatingBackToTopButton />
  </div>
);

export default KnowUs;
