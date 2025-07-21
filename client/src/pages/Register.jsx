import React, { useState } from 'react';
import { Container, Form, Button, Alert, Card, Row, Col, ProgressBar } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, CreditCard, Building, User, Mail, Phone, MapPin } from 'lucide-react';
import axios from 'axios';
import './Register.css';

const Register = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  const [formData, setFormData] = useState({
    // Lab Information
    labName: '',
    labEmail: '',
    labPhone: '',
    labAddress: '',
    labWebsite: '',
    region: '',
    
    // Admin Information
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminUsername: '',
    adminPassword: '',
    confirmPassword: '',
    
    // Subscription
    subscriptionPlan: 'monthly',
    paymentMethod: 'card',
    
    // Terms
    acceptTerms: false,
    acceptMarketing: false
  });

  const subscriptionPlans = [
    {
      id: 'monthly',
      name: 'Monthly Plan',
      price: 29,
      period: 'month',
      features: ['Unlimited patients', 'Unlimited tests', 'All features', 'Email support'],
      popular: false
    },
    {
      id: 'yearly',
      name: 'Yearly Plan',
      price: 249,
      period: 'year',
      features: ['Unlimited patients', 'Unlimited tests', 'All features', 'Priority support', 'Advanced analytics'],
      popular: true,
      savings: 99
    },
    {
      id: '3_months',
      name: '3 Months Plan',
      price: 79,
      period: 'quarter',
      features: ['Unlimited patients', 'Unlimited tests', 'All features', 'Email support'],
      popular: false
    }
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateStep = (currentStep) => {
    switch (currentStep) {
      case 1:
        if (!formData.labName || !formData.labEmail || !formData.labPhone) {
          setError('Please fill in all required lab information fields.');
          return false;
        }
        if (!formData.labEmail.includes('@')) {
          setError('Please enter a valid email address.');
          return false;
        }
        break;
      case 2:
        if (!formData.adminName || !formData.adminEmail || !formData.adminUsername || !formData.adminPassword) {
          setError('Please fill in all required admin information fields.');
          return false;
        }
        if (formData.adminPassword !== formData.confirmPassword) {
          setError('Passwords do not match.');
          return false;
        }
        if (formData.adminPassword.length < 8) {
          setError('Password must be at least 8 characters long.');
          return false;
        }
        break;
      case 3:
        if (!formData.acceptTerms) {
          setError('You must accept the terms and conditions to continue.');
          return false;
        }
        break;
    }
    setError('');
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${apiUrl}/register`, {
        lab: {
          name: formData.labName,
          email: formData.labEmail,
          phone: formData.labPhone,
          address: formData.labAddress,
          website: formData.labWebsite,
          region: formData.region
        },
        admin: {
          name: formData.adminName,
          email: formData.adminEmail,
          phone: formData.adminPhone,
          username: formData.adminUsername,
          password: formData.adminPassword
        },
        subscription: {
          plan: formData.subscriptionPlan,
          paymentMethod: formData.paymentMethod
        }
      });

      setSuccess(true);
      // In a real implementation, you would redirect to payment gateway
      // For now, we'll just show success message
    } catch (error) {
      setError(error.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = subscriptionPlans.find(plan => plan.id === formData.subscriptionPlan);

  if (success) {
    return (
      <div className="register-success">
        <Container>
          <Card className="success-card">
            <Card.Body className="text-center">
              <CheckCircle size={64} className="text-success mb-3" />
              <h2>Registration Successful!</h2>
              <p className="lead">
                Your lab account has been created successfully. You will receive an email with your login credentials shortly.
              </p>
              <div className="mt-4">
                <Button variant="primary" onClick={() => navigate('/login')}>
                  Go to Login
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="register-page">
      <Container>
        <Row className="justify-content-center">
          <Col lg={8}>
            <Card className="register-card">
              <Card.Header className="text-center">
                <h2>Register Your Lab</h2>
                <p className="text-muted">Create your lab account and start managing your laboratory operations</p>
              </Card.Header>
              
              <Card.Body>
                {/* Progress Bar */}
                <ProgressBar 
                  now={(step / 3) * 100} 
                  className="mb-4"
                  variant="primary"
                />
                
                {error && (
                  <Alert variant="danger" onClose={() => setError('')} dismissible>
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  {/* Step 1: Lab Information */}
                  {step === 1 && (
                    <div className="step-content">
                      <h3 className="step-title">
                        <Building size={24} />
                        Lab Information
                      </h3>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Lab Name *</Form.Label>
                            <Form.Control
                              type="text"
                              name="labName"
                              value={formData.labName}
                              onChange={handleInputChange}
                              placeholder="Enter lab name"
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Lab Email *</Form.Label>
                            <Form.Control
                              type="email"
                              name="labEmail"
                              value={formData.labEmail}
                              onChange={handleInputChange}
                              placeholder="lab@example.com"
                              required
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Lab Phone *</Form.Label>
                            <Form.Control
                              type="tel"
                              name="labPhone"
                              value={formData.labPhone}
                              onChange={handleInputChange}
                              placeholder="+1234567890"
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Region/Country</Form.Label>
                            <Form.Control
                              type="text"
                              name="region"
                              value={formData.region}
                              onChange={handleInputChange}
                              placeholder="Your region or country"
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Lab Address</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          name="labAddress"
                          value={formData.labAddress}
                          onChange={handleInputChange}
                          placeholder="Enter lab address"
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Lab Website</Form.Label>
                        <Form.Control
                          type="url"
                          name="labWebsite"
                          value={formData.labWebsite}
                          onChange={handleInputChange}
                          placeholder="https://yourlab.com"
                        />
                      </Form.Group>
                    </div>
                  )}

                  {/* Step 2: Admin Information */}
                  {step === 2 && (
                    <div className="step-content">
                      <h3 className="step-title">
                        <User size={24} />
                        Admin Account
                      </h3>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Admin Name *</Form.Label>
                            <Form.Control
                              type="text"
                              name="adminName"
                              value={formData.adminName}
                              onChange={handleInputChange}
                              placeholder="Enter admin name"
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Admin Email *</Form.Label>
                            <Form.Control
                              type="email"
                              name="adminEmail"
                              value={formData.adminEmail}
                              onChange={handleInputChange}
                              placeholder="admin@example.com"
                              required
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Admin Phone</Form.Label>
                            <Form.Control
                              type="tel"
                              name="adminPhone"
                              value={formData.adminPhone}
                              onChange={handleInputChange}
                              placeholder="+1234567890"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Username *</Form.Label>
                            <Form.Control
                              type="text"
                              name="adminUsername"
                              value={formData.adminUsername}
                              onChange={handleInputChange}
                              placeholder="Choose username"
                              required
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Password *</Form.Label>
                            <div className="password-input-group">
                              <Form.Control
                                type={showPassword ? "text" : "password"}
                                name="adminPassword"
                                value={formData.adminPassword}
                                onChange={handleInputChange}
                                placeholder="Enter password"
                                required
                              />
                              <Button
                                variant="outline-secondary"
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="password-toggle"
                              >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </Button>
                            </div>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Confirm Password *</Form.Label>
                            <div className="password-input-group">
                              <Form.Control
                                type={showConfirmPassword ? "text" : "password"}
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                placeholder="Confirm password"
                                required
                              />
                              <Button
                                variant="outline-secondary"
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="password-toggle"
                              >
                                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </Button>
                            </div>
                          </Form.Group>
                        </Col>
                      </Row>
                    </div>
                  )}

                  {/* Step 3: Subscription & Terms */}
                  {step === 3 && (
                    <div className="step-content">
                      <h3 className="step-title">
                        <CreditCard size={24} />
                        Choose Plan & Complete Registration
                      </h3>
                      
                      <div className="subscription-plans">
                        {subscriptionPlans.map(plan => (
                          <div 
                            key={plan.id} 
                            className={`plan-option ${formData.subscriptionPlan === plan.id ? 'selected' : ''}`}
                            onClick={() => setFormData(prev => ({ ...prev, subscriptionPlan: plan.id }))}
                          >
                            {plan.popular && <div className="popular-badge">Most Popular</div>}
                            <h4>{plan.name}</h4>
                            <div className="plan-price">
                              ${plan.price}<span>/{plan.period}</span>
                            </div>
                            {plan.savings && (
                              <div className="savings">Save ${plan.savings}/year</div>
                            )}
                            <ul>
                              {plan.features.map((feature, index) => (
                                <li key={index}>{feature}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                      
                      <div className="terms-section">
                        <Form.Group className="mb-3">
                          <Form.Check
                            type="checkbox"
                            name="acceptTerms"
                            checked={formData.acceptTerms}
                            onChange={handleInputChange}
                            label="I agree to the Terms and Conditions and Privacy Policy"
                            required
                          />
                        </Form.Group>
                        
                        <Form.Group className="mb-3">
                          <Form.Check
                            type="checkbox"
                            name="acceptMarketing"
                            checked={formData.acceptMarketing}
                            onChange={handleInputChange}
                            label="I would like to receive marketing communications"
                          />
                        </Form.Group>
                      </div>
                      
                      <div className="order-summary">
                        <h4>Order Summary</h4>
                        <div className="summary-item">
                          <span>Plan:</span>
                          <span>{selectedPlan?.name}</span>
                        </div>
                        <div className="summary-item">
                          <span>Amount:</span>
                          <span>${selectedPlan?.price}/{selectedPlan?.period}</span>
                        </div>
                        <div className="summary-total">
                          <span>Total:</span>
                          <span>${selectedPlan?.price}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="step-navigation">
                    {step > 1 && (
                      <Button variant="outline-secondary" onClick={prevStep}>
                        Previous
                      </Button>
                    )}
                    
                    {step < 3 ? (
                      <Button variant="primary" onClick={nextStep}>
                        Next
                      </Button>
                    ) : (
                      <Button 
                        variant="primary" 
                        type="submit" 
                        disabled={loading}
                        className="ms-auto"
                      >
                        {loading ? 'Creating Account...' : 'Create Account'}
                      </Button>
                    )}
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

export default Register; 