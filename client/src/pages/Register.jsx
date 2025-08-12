import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Alert, Card, Row, Col, ProgressBar, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, CreditCard, Building, User, Mail, Phone, MapPin, X } from 'lucide-react';
import axios from 'axios';
import '../styles/Register.css';
import TermsAndConditions from '../components/TermsAndConditions';
import PrivacyPolicy from '../components/PrivacyPolicy';

const Register = () => {
    const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  
  // Clear saved form data when component unmounts (after successful registration)
  // Modified to clear only if payment is successful, which is handled by the PaymentCallback component
  useEffect(() => {
    return () => {
      // The actual clearing of localStorage for successful registration will happen in PaymentCallback.jsx
      // This useEffect is primarily for handling component unmount, but the success state here
      // refers to the registration process initiating payment, not payment completion.
      // Therefore, no action is needed here for successful payment.
    };
  }, []);

  // Payment states
  const [paymentData, setPaymentData] = useState(null);
  const [registrationData, setRegistrationData] = useState(null);
  
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  const [formData, setFormData] = useState(() => {
    // Load saved form data from localStorage if available
    const savedFormData = localStorage.getItem('registrationFormData');
    return savedFormData ? JSON.parse(savedFormData) : {
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
    };
  });

  // Fetch subscription plans from API
  useEffect(() => {
    const fetchSubscriptionPlans = async () => {
      try {
        setPlansLoading(true);
        const response = await axios.get(`${apiUrl}/subscriptions`);
        
        // Transform API data to match component structure
        const transformedPlans = response.data.map(plan => {
          // Parse features from JSON string or use default array
          let features = [];
          try {
            if (plan.features && typeof plan.features === 'string') {
              const parsedFeatures = JSON.parse(plan.features);
              // Convert object to array of feature descriptions
              if (typeof parsedFeatures === 'object' && !Array.isArray(parsedFeatures)) {
                features = Object.entries(parsedFeatures)
                  .filter(([key, value]) => value && key !== 'discount' && key !== 'savings')
                  .map(([key, value]) => {
                    if (key === 'max_labs' && value === 'unlimited') return 'Unlimited labs';
                    if (key === 'max_users' && value === 'unlimited') return 'Unlimited users';
                    if (key === 'max_patients' && value === 'unlimited') return 'Unlimited patients';
                    if (key === 'max_labs') return `Up to ${value} labs`;
                    if (key === 'max_users') return `Up to ${value} users`;
                    if (key === 'max_patients') return `Up to ${value} patients`;
                    if (key === 'support') return value;
                    if (key === 'reports') return `${value} reports`;
                    if (key === 'storage') return `${value} storage`;
                    if (key === 'backup') return `${value} backup`;
                    if (key === 'integrations') return value;
                    if (key === 'customization') return value;
                    if (key === 'training') return value;
                    if (key === 'account_manager') return `${value} account manager`;
                    return `${key}: ${value}`;
                  });
              } else if (Array.isArray(parsedFeatures)) {
                features = parsedFeatures;
              }
            } else if (Array.isArray(plan.features)) {
              features = plan.features;
            }
          } catch (e) {
            console.warn('Failed to parse features for plan:', plan.name, e);
            features = ['All basic features included'];
          }
          
          return {
            id: plan.id, // Use the unique database ID instead of duration_type
            duration_type: plan.duration_type, // Keep duration_type for other logic
            name: plan.name,
            price: parseFloat(plan.price),
            period: plan.duration_type === 'monthly' ? 'month' : 
                    plan.duration_type === 'yearly' ? 'year' : 
                    plan.duration_type === '3_months' ? 'quarter' : plan.duration_type,
            features: features,
            popular: plan.is_popular || false,
            savings: plan.duration_type === 'yearly' && plan.price < 300 ? 
                     Math.round((29 * 12) - plan.price) : undefined
          };
        });
        
        setSubscriptionPlans(transformedPlans);
        
        // Set default subscription plan to the first one or popular one
        const defaultPlan = transformedPlans.find(plan => plan.popular) || transformedPlans[0];
        if (defaultPlan) {
          setFormData(prev => ({ ...prev, subscriptionPlan: defaultPlan.id }));
        }
      } catch (error) {
        console.error('Failed to fetch subscription plans:', error);
        setError('Failed to load subscription plans. Please refresh the page.');
        
        // Fallback to default plans if API fails
        const fallbackPlans = [
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
          }
        ];
        setSubscriptionPlans(fallbackPlans);
        setFormData(prev => ({ ...prev, subscriptionPlan: 'monthly' }));
      } finally {
        setPlansLoading(false);
      }
    };
    
    fetchSubscriptionPlans();
  }, [apiUrl]);

  const handleInputChange = (e) => {
    // Add null checks to prevent autofill errors
    if (!e || !e.target) return;
    
    const { name, value, type, checked } = e.target;
    
    // Ensure name exists before updating state
    if (!name) return;
    
    setFormData(prev => {
      const newFormData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : (value || '')
      };
      // Save form data to localStorage on each change
      localStorage.setItem('registrationFormData', JSON.stringify(newFormData));
      return newFormData;
    });
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
        if (plansLoading) {
          setError('Please wait for subscription plans to load.');
          return false;
        }
        if (!formData.subscriptionPlan || subscriptionPlans.length === 0) {
          setError('Please select a subscription plan.');
          return false;
        }
        break;
    }
    setError('');
    return true;
  };

  const nextStep = async () => {
    setError(''); // Clear previous errors
    if (step === 2) {
      // Special validation for step 2 to check for existing username/email
      setLoading(true);
      try {
        const response = await axios.post(`${apiUrl}/validate-admin-info`, {
          username: formData.adminUsername,
          email: formData.adminEmail
        });
        if (!response.data.valid) {
          setError(response.data.message);
          setLoading(false);
          return;
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Validation failed. Please try again.');
        setLoading(false);
        return;
      }
      setLoading(false);
    }

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
      // Prepare registration data
      const registrationPayload = {
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
          plan: selectedPlan?.duration_type || formData.subscriptionPlan,
          paymentMethod: formData.paymentMethod
        }
      };

      // Store registration data for later use
      setRegistrationData(registrationPayload);

      // Call registration endpoint (this creates payment intention only)
      const response = await axios.post(`${apiUrl}/register`, registrationPayload);
      console.log('Registration response:', response.data);
      if (response.data.success && response.data.payment.payment_url) {
        // Store payment data for potential cancellation
        setPaymentData({
          merchant_order_id: response.data.payment.merchant_order_id,
          payment_intention_id: response.data.payment.payment_intention_id
        });
        console.log('Payment URL:', response.data.payment.payment_url);
        // Redirect to payment page
        window.location.href = response.data.payment.payment_url;
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle payment completion
  // Payment functions removed - now using redirection approach

  const selectedPlan = subscriptionPlans.find(plan => plan.id === formData.subscriptionPlan);

  if (success) {
    return (
      <div className="register-success">
        <Container>
          <Card className="success-card">
            <Card.Body className="text-center">
              <CheckCircle size={64} className="text-success mb-3" />
              <h2>Registration & Payment Successful!</h2>
              <p className="lead">
                Your lab account has been created and payment has been processed successfully. 
                You will receive an email with your login credentials and payment receipt shortly.
              </p>
              {selectedPlan && (
                <div className="payment-summary mt-3 mb-4">
                  <Card className="bg-light">
                    <Card.Body>
                      <h5>Subscription Details</h5>
                      <div className="d-flex justify-content-between">
                        <span>Plan:</span>
                        <span>{selectedPlan.name}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Amount Paid:</span>
                        <span>{selectedPlan.price} EGP</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Billing Cycle:</span>
                        <span>{selectedPlan.period}</span>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              )}
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
                <p className="text-white-50">Create your lab account and start managing your laboratory operations</p>
              </Card.Header>
              
              <Card.Body>
                {/* Progress Bar */}
                <ProgressBar 
                  now={(step / 3) * 100} 
                  className="mb-4"
                  variant="primary"
                />

                <Form>
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
                              value={formData.adminEmail || ''}
                              onChange={handleInputChange}
                              placeholder="admin@example.com"
                              autoComplete="email"
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
                              value={formData.adminUsername || ''}
                              onChange={handleInputChange}
                              placeholder="Choose username"
                              autoComplete="username"
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
                                value={formData.adminPassword || ''}
                                onChange={handleInputChange}
                                placeholder="Enter password"
                                autoComplete="new-password"
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
                                value={formData.confirmPassword || ''}
                                onChange={handleInputChange}
                                placeholder="Confirm password"
                                autoComplete="new-password"
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
                        {plansLoading ? (
                          <div className="text-center py-4">
                            <Spinner animation="border" role="status">
                              <span className="visually-hidden">Loading subscription plans...</span>
                            </Spinner>
                            <p className="mt-2">Loading subscription plans...</p>
                          </div>
                        ) : subscriptionPlans.length === 0 ? (
                          <div className="text-center py-4">
                            <p>No subscription plans available at the moment.</p>
                          </div>
                        ) : (
                          subscriptionPlans.map(plan => (
                            <div 
                              key={plan.id} 
                              className={`plan-option ${formData.subscriptionPlan === plan.id ? 'selected' : ''}`}
                              onClick={() => setFormData(prev => ({ ...prev, subscriptionPlan: plan.id }))}
                            >
                              {plan.popular && <div className="popular-badge">Most Popular</div>}
                              <h4>{plan.name}</h4>
                              <div className="plan-price">
                                {plan.price} EGP <span>/{plan.period}</span>
                              </div>
                              {plan.savings && (
                                <div className="savings">Save {plan.savings} EGP/year</div>
                              )}
                            <ul>
                              {plan.features.map((feature, index) => (
                                <li key={index}>{feature}</li>
                              ))}
                            </ul>
                          </div>
                        ))
                        )}
                      </div>
                      
                      <div className="terms-section">
                        <Form.Group className="mb-3">
                          <Form.Check
                            type="checkbox"
                            name="acceptTerms"
                            checked={formData.acceptTerms}
                            onChange={handleInputChange}
                            required
                            label={
                              <>
                                I accept the <a href="#" onClick={() => setShowTerms(true)}>Terms and Conditions</a>
                              </>
                            }
                          />
                        </Form.Group>
                        
                        <Form.Group className="mb-3">
                          <Form.Check
                            type="checkbox"
                            name="acceptMarketing"
                            checked={formData.acceptMarketing}
                            onChange={handleInputChange}
                            label={
                              <>
                                I agree to receive marketing communications and have read the <a href="#" onClick={() => setShowPrivacy(true)}>Privacy Policy</a>
                              </>
                            }
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
                          <span>{selectedPlan?.price} EGP/{selectedPlan?.period}</span>
                        </div>
                        <div className="summary-total">
                          <span>Total:</span>
                          <span>{selectedPlan?.price} EGP</span>
                        </div>
                      </div>
                    </div>
                  )}
                {error && (
                  <Alert variant="danger" onClose={() => setError('')} dismissible>
                    {error}
                  </Alert>
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
                        type="button" 
                        onClick={handleSubmit}
                        disabled={loading || plansLoading}
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

      <TermsAndConditions showTerms={showTerms} setShowTerms={setShowTerms} />
      <PrivacyPolicy showPrivacy={showPrivacy} setShowPrivacy={setShowPrivacy} />
    </div>
  );
};

export default Register;