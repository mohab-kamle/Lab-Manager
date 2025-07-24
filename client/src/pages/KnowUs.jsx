import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { 
  Award, 
  Users, 
  Target, 
  Heart, 
  Shield, 
  Zap, 
  MapPin, 
  Phone, 
  Mail, 
  Clock,
  FlaskConical,
  Microscope,
  Stethoscope,
  TrendingUp,
  ArrowUp
} from 'lucide-react';
import LabIcon from '../assets/LabIcon.png';
import '../styles/KnowUs.css';

const KnowUs = () => {
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            setShowScrollTop(scrollTop > 300);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    const fadeInUp = {
        initial: { opacity: 0, y: 60 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6 }
    };

    const staggerContainer = {
        animate: {
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const values = [
        {
            icon: <Heart size={40} />,
            title: "Patient Care First",
            description: "Every decision we make is centered around providing the best care for our patients."
        },
        {
            icon: <Shield size={40} />,
            title: "Quality Assurance",
            description: "Rigorous quality control processes ensure accurate and reliable test results."
        },
        {
            icon: <Zap size={40} />,
            title: "Innovation",
            description: "Continuously adopting the latest medical technologies and methodologies."
        },
        {
            icon: <Users size={40} />,
            title: "Expert Team",
            description: "Highly qualified medical professionals dedicated to excellence."
        }
    ];

    const stats = [
        { number: "2025", label: "Year Launched", icon: <Award size={24} /> },
        { number: "100+", label: "Labs Registered", icon: <FlaskConical size={24} /> },
        { number: "10+", label: "Team Members", icon: <Stethoscope size={24} /> },
        { number: "100%", label: "Cloud Based", icon: <TrendingUp size={24} /> }
    ];

    const services = [
        {
            icon: <Microscope size={32} />,
            title: "Clinical Chemistry",
            description: "Comprehensive blood chemistry analysis for accurate diagnosis."
        },
        {
            icon: <FlaskConical size={32} />,
            title: "Microbiology",
            description: "Advanced microbial testing and culture analysis."
        },
        {
            icon: <Stethoscope size={32} />,
            title: "Hematology",
            description: "Complete blood count and blood disorder testing."
        },
        {
            icon: <TrendingUp size={32} />,
            title: "Immunology",
            description: "Specialized immune system and allergy testing."
        }
    ];

    return (
        <div className="know-us-container">
            {/* Hero Section */}
            <section className="hero-section">
                <Container fluid>
                    <Row className="align-items-center min-vh-100">
                        <Col lg={6} className="text-center text-lg-start">
                            <motion.div
                                initial={{ opacity: 0, x: -50 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8 }}
                                style={{ position: 'relative', zIndex: 10 }}
                            >
                                <Badge bg="primary" className="mb-3 px-3 py-2">
                                    Established 2025
                                </Badge>
                                <h1 className="hero-title mb-4">
                                    Leading Medical Laboratory
                                    <span className="text-primary"> Excellence</span>
                                </h1>
                                <p className="hero-subtitle mb-4">
                                    we want to be at the forefront of medical diagnostics, 
                                    providing accurate, reliable, and timely laboratory services to healthcare 
                                    providers and patients across the region.
                                </p>
                                <div className="hero-buttons">
                                    <button className="btn btn-primary btn-lg me-3 mb-2" onClick={() => {
                                        const servicesSection = document.getElementById('servicesSection');
                                        if (servicesSection) {
                                            servicesSection.scrollIntoView({ behavior: 'smooth' });
                                        }
                                    }}>
                                        Our Services
                                    </button>
                                    <button className="btn btn-outline-primary btn-lg mb-2" onClick={() => {
                                        const getInTouch = document.getElementById('getInTouch');
                                        if (getInTouch) {
                                            getInTouch.scrollIntoView({ behavior: 'smooth' });
                                        }
                                    }}>
                                        Contact Us
                                    </button>
                                </div>
                            </motion.div>
                        </Col>
                        <Col lg={6} className="text-center">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                            >
                                <img 
                                    src={LabIcon} 
                                    alt="Laboratory Icon" 
                                    className="hero-image"
                                />
                            </motion.div>
                        </Col>
                    </Row>
                </Container>
            </section>

            {/* Stats Section */}
            <section className="stats-section py-5">
                <Container>
                    <Row>
                        {stats.map((stat, index) => (
                            <Col key={index} lg={3} md={6} className="mb-4">
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    viewport={{ once: true }}
                                >
                                    <Card className="stat-card text-center h-100">
                                        <Card.Body>
                                            <div className="stat-icon mb-3">
                                                {stat.icon}
                                            </div>
                                            <h3 className="stat-number mb-2">{stat.number}</h3>
                                            <p className="stat-label mb-0">{stat.label}</p>
                                        </Card.Body>
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                </Container>
            </section>

            {/* About Section */}
            <section className="about-section py-5">
                <Container>
                    <Row className="align-items-center">
                        <Col lg={6} className="mb-4 mb-lg-0">
                            <motion.div
                                initial={{ opacity: 0, x: -50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8 }}
                                viewport={{ once: true }}
                            >
                                <h2 className="section-title mb-4">
                                    About <span className="text-primary">LabManager</span>
                                </h2>
                                <p className="section-text mb-4">
                                    LabManager is dedicated to providing reliable and efficient laboratory management solutions for healthcare providers and patients. Our focus is on delivering accurate results, innovative technology, and excellent service.
                                </p>
                                <p className="section-text mb-4">
                                    We utilize modern tools and a passionate team to help labs operate smoothly and deliver quality diagnostics every day.
                                </p>
                                <div className="about-features">
                                    <div className="feature-item">
                                        <Users size={20} className="text-primary me-2" />
                                        <span>Professional Team</span>
                                    </div>
                                </div>
                            </motion.div>
                        </Col>
                        <Col lg={6}>
                            <motion.div
                                initial={{ opacity: 0, x: 50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                viewport={{ once: true }}
                            >
                                <Card className="about-card">
                                    <Card.Body className="p-4">
                                        <h4 className="card-title mb-3">Our Mission</h4>
                                        <p className="card-text mb-4">
                                            To provide the highest quality laboratory services that 
                                            contribute to better health outcomes through accurate 
                                            diagnostics, innovative technology, and exceptional 
                                            patient care.
                                        </p>
                                        <h4 className="card-title mb-3">Our Vision</h4>
                                        <p className="card-text">
                                            To be the leading medical laboratory in the region, 
                                            recognized for excellence in diagnostics, innovation 
                                            in healthcare technology, and commitment to improving 
                                            community health.
                                        </p>
                                    </Card.Body>
                                </Card>
                            </motion.div>
                        </Col>
                    </Row>
                </Container>
            </section>

            {/* Values Section */}
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
                        <p className="section-subtitle">
                            The principles that guide everything we do
                        </p>
                    </motion.div>
                    
                    <Row>
                        {values.map((value, index) => (
                            <Col key={index} lg={3} md={6} className="mb-4">
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    viewport={{ once: true }}
                                >
                                    <Card className="value-card text-center h-100">
                                        <Card.Body className="p-4">
                                            <div className="value-icon mb-3">
                                                {value.icon}
                                            </div>
                                            <h4 className="value-title mb-3">{value.title}</h4>
                                            <p className="value-description mb-0">{value.description}</p>
                                        </Card.Body>
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                </Container>
            </section>

            {/* Services Section */}
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
                        <p className="section-subtitle">
                            Comprehensive laboratory testing solutions
                        </p>
                    </motion.div>
                    
                    <Row>
                        {services.map((service, index) => (
                            <Col key={index} lg={3} md={6} className="mb-4">
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    viewport={{ once: true }}
                                >
                                    <Card className="service-card text-center h-100">
                                        <Card.Body className="p-4">
                                            <div className="service-icon mb-3">
                                                {service.icon}
                                            </div>
                                            <h4 className="service-title mb-3">{service.title}</h4>
                                            <p className="service-description mb-0">{service.description}</p>
                                        </Card.Body>
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                </Container>
            </section>

            {/* Contact Section */}
            <section className="contact-section py-5">
                <Container>
                    <Row>
                        <Col lg={8} className="mx-auto text-center">
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
                                    Ready to experience the difference? Contact us today.
                                </p>
                            </motion.div>
                        </Col>
                    </Row>
                    
                    <Row className="justify-content-center" id='getInTouch'>
                        <Col lg={8}>
                            <Row>
                                <Col md={6} className="mb-4">
                                    <motion.div
                                        initial={{ opacity: 0, y: 30 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.6, delay: 0.2 }}
                                        viewport={{ once: true }}
                                        className="text-center"
                                    >
                                        <div className="contact-icon mb-3">
                                            <Phone size={32} />
                                        </div>
                                        <h5>Call Us</h5>
                                        <p className="mb-0">
                                            Main: (555) 123-4567<br />
                                            Emergency: (555) 987-6543<br />
                                            Fax: (555) 123-4568
                                        </p>
                                    </motion.div>
                                </Col>
                                <Col md={6} className="mb-4">
                                    <motion.div
                                        initial={{ opacity: 0, y: 30 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.6, delay: 0.3 }}
                                        viewport={{ once: true }}
                                        className="text-center"
                                    >
                                        <div className="contact-icon mb-3">
                                            <Clock size={32} />
                                        </div>
                                        <h5>Hours</h5>
                                        <p className="mb-0">
                                            Mon-Fri: 7:00 AM - 8:00 PM<br />
                                            Saturday: 8:00 AM - 6:00 PM<br />
                                            Sunday: 9:00 AM - 4:00 PM
                                        </p>
                                    </motion.div>
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                </Container>
            </section>

            {/* Floating Back to Top Button */}
            <motion.button
                className="scroll-to-top-btn"
                onClick={scrollToTop}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                    opacity: showScrollTop ? 1 : 0, 
                    scale: showScrollTop ? 1 : 0 
                }}
                transition={{ duration: 0.3 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
            >
                <ArrowUp size={24} />
            </motion.button>
        </div>
    );
}

export default KnowUs;
