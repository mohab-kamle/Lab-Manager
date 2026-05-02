import React, { useState, useEffect, useMemo } from 'react';
import { Container, Form, Button, Alert, Card, Row, Col, Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, CreditCard, Building, User } from 'lucide-react';
import axios from 'axios';
import styles from '../../styles/Register.module.css';
import InfoModal from '../../components/info/InfoModal';
import PhoneInput from '../../components/ui/PhoneInput';

/* ── Static helpers ─────────────────────────────────────────────────────── */

/** Transforms a raw API plan record into the shape expected by the UI. */
const transformPlan = (plan) => {
  let features = [];
  try {
    let parsed = plan.features;
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed);
    }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      features = Object.entries(parsed)
        .filter(([key, value]) => value && key !== 'discount' && key !== 'savings')
        .map(([key, value]) => {
          if (key === 'max_labs') return value === 'unlimited' ? 'Unlimited labs' : `Up to ${value} labs`;
          if (key === 'max_users') return value === 'unlimited' ? 'Unlimited users' : `Up to ${value} users`;
          if (key === 'max_patients') return value === 'unlimited' ? 'Unlimited patients' : `Up to ${value} patients`;
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
    } else if (Array.isArray(parsed)) {
      features = parsed;
    }
  } catch {
    features = ['All basic features included'];
  }

  return {
    id: plan.id,
    duration_type: plan.duration_type,
    name: plan.name,
    price: parseFloat(plan.price),
    period: plan.duration_type === 'monthly' ? 'month'
      : plan.duration_type === 'yearly' ? 'year'
        : plan.duration_type === '3_months' ? 'quarter'
          : plan.duration_type,
    features,
    popular: plan.is_popular || false,
    savings: plan.duration_type === 'yearly' && plan.price < 300
      ? Math.round((29 * 12) - plan.price)
      : undefined,
  };
};

const FALLBACK_PLANS = [
  {
    id: 'monthly', duration_type: 'monthly', name: 'Monthly Plan', price: 29,
    period: 'month', popular: false,
    features: ['Unlimited patients', 'Unlimited tests', 'All features', 'Email support'],
  },
  {
    id: 'yearly', duration_type: 'yearly', name: 'Yearly Plan', price: 249,
    period: 'year', popular: true, savings: 99,
    features: ['Unlimited patients', 'Unlimited tests', 'All features', 'Priority support', 'Advanced analytics'],
  },
];

const EMPTY_FORM = {
  labName: '', labEmail: '', labPhone: '', labAddress: '', labWebsite: '', region: '',
  adminName: '', adminEmail: '', adminPhone: '', adminUsername: '', adminPassword: '', confirmPassword: '',
  subscriptionPlan: 'monthly', paymentMethod: 'card',
  acceptTerms: false, acceptMarketing: false,
};

/* ── Step meta — drives the indicator UI ─────────────────────────────────── */
const STEPS = [
  { label: 'Lab Info', icon: <Building size={14} /> },
  { label: 'Admin', icon: <User size={14} /> },
  { label: 'Plan', icon: <CreditCard size={14} /> },
];

/* ── Component ──────────────────────────────────────────────────────────── */
const Register = () => {
  const [step, setStep] = useState(() => {
    const savedStep = localStorage.getItem('registrationStep');
    return savedStep ? parseInt(savedStep, 10) : 1;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  // Single state for all info modals — null = closed, a key string = open
  const [activeModal, setActiveModal] = useState(null);

  /* ── Group plans for display ────────────────────────────────────────────── */
  const groupedPlans = useMemo(() => {
    const groups = {
      free_trial: [],
      monthly: [],
      '3_months': [],
      '6_months': [],
      yearly: []
    };
    subscriptionPlans.forEach(plan => {
      const type = plan.duration_type || 'monthly';
      if (groups[type]) {
        groups[type].push(plan);
      } else {
        groups.monthly.push(plan); // fallback
      }
    });
    return [
      { key: 'free_trial', title: 'Free Trial', plans: groups.free_trial },
      { key: 'monthly', title: 'Monthly Plans', plans: groups.monthly },
      { key: '3_months', title: 'Quarterly Plans', plans: groups['3_months'] },
      { key: '6_months', title: 'Semi-Annual Plans', plans: groups['6_months'] },
      { key: 'yearly', title: 'Annual Plans', plans: groups.yearly }
    ].filter(g => g.plans.length > 0);
  }, [subscriptionPlans]);
  const [paymentData, setPaymentData] = useState(null);
  const [registrationData, setRegistrationData] = useState(null);

  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  /* Restore saved form from localStorage to survive payment redirects */
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('registrationFormData');
    return saved ? JSON.parse(saved) : EMPTY_FORM;
  });

  /* Clear stale form data on unmount only when success (handled in PaymentCallback) */
  useEffect(() => () => { /* intentionally empty — see PaymentCallback.jsx */ }, []);

  /* Fetch subscription plans */
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setPlansLoading(true);
        const { data } = await axios.get(`${apiUrl}/subscriptions`);
        const plans = data.map(transformPlan);
        setSubscriptionPlans(plans);
        const defaultPlan = plans.find(p => p.popular) || plans[0];
        if (defaultPlan) setFormData(prev => ({ ...prev, subscriptionPlan: defaultPlan.id }));
      } catch {
        setError('Failed to load subscription plans. Please refresh the page.');
        setSubscriptionPlans(FALLBACK_PLANS);
        setFormData(prev => ({ ...prev, subscriptionPlan: 'monthly' }));
      } finally {
        setPlansLoading(false);
      }
    };
    fetchPlans();
  }, [apiUrl]);

  /* Persist form to localStorage on every change */
  const handleInputChange = (e) => {
    if (!e?.target?.name) return;
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: type === 'checkbox' ? checked : (value || '') };
      localStorage.setItem('registrationFormData', JSON.stringify(next));
      return next;
    });
  };

  /* Phone-specific setter (value comes as a string, not an event) */
  const setPhone = (field) => (val) => {
    setFormData(prev => {
      const next = { ...prev, [field]: val };
      localStorage.setItem('registrationFormData', JSON.stringify(next));
      return next;
    });
  };

  /* Per-step validation */
  const validateStep = (s) => {
    if (s === 1) {
      if (!formData.labName || !formData.labEmail || !formData.labPhone) {
        setError('Please fill in all required lab information fields.'); return false;
      }
      if (!formData.labEmail.includes('@')) {
        setError('Please enter a valid email address.'); return false;
      }
    }
    if (s === 2) {
      if (!formData.adminName || !formData.adminEmail || !formData.adminUsername || !formData.adminPassword) {
        setError('Please fill in all required admin information fields.'); return false;
      }
      if (formData.adminPassword !== formData.confirmPassword) {
        setError('Passwords do not match.'); return false;
      }
      if (formData.adminPassword.length < 8) {
        setError('Password must be at least 8 characters long.'); return false;
      }
    }
    if (s === 3) {
      if (!formData.acceptTerms) {
        setError('You must accept the terms and conditions to continue.'); return false;
      }
      if (plansLoading) {
        setError('Please wait for subscription plans to load.'); return false;
      }
      if (!formData.subscriptionPlan || subscriptionPlans.length === 0) {
        setError('Please select a subscription plan.'); return false;
      }
    }
    setError('');
    return true;
  };

  const nextStep = async () => {
    setError('');
    if (step === 2) {
      // Validate uniqueness of username/email on the server before advancing
      setLoading(true);
      try {
        const { data } = await axios.post(`${apiUrl}/validate-admin-info`, {
          username: formData.adminUsername,
          email: formData.adminEmail,
        });
        if (!data.valid) { setError(data.message); setLoading(false); return; }
      } catch (err) {
        setError(err.response?.data?.error || 'Validation failed. Please try again.');
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    if (validateStep(step)) {
      const next = step + 1;
      setStep(next);
      localStorage.setItem('registrationStep', next);
    }
  };

  const prevStep = () => {
    const prev = step - 1;
    setStep(prev);
    localStorage.setItem('registrationStep', prev);
    setError('');
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        lab: {
          name: formData.labName, email: formData.labEmail,
          phoneNumbers: [{ phone: formData.labPhone, type: 'work', is_primary: true }],
          address: formData.labAddress, website: formData.labWebsite, region: formData.region,
        },
        admin: {
          name: formData.adminName, email: formData.adminEmail,
          phoneNumbers: [{ phone: formData.adminPhone, type: 'personal', is_primary: true }],
          username: formData.adminUsername, password: formData.adminPassword,
        },
        subscription: {
          plan: selectedPlan?.duration_type || formData.subscriptionPlan,
          paymentMethod: formData.paymentMethod,
        },
      };
      setRegistrationData(payload);
      const { data } = await axios.post(`${apiUrl}/register`, payload);
      if (data.success && data.payment?.payment_url) {
        setPaymentData({
          merchant_order_id: data.payment.merchant_order_id,
          payment_intention_id: data.payment.payment_intention_id,
        });
        window.location.href = data.payment.payment_url;
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = subscriptionPlans.find(p => p.id === formData.subscriptionPlan);

  /* ── Success screen ─────────────────────────────────────────────────── */
  if (success) {
    return (
      <div className={styles['register-success']}>
        <Container>
          <Card className={styles['success-card']}>
            <Card.Body className="text-center p-5">
              <CheckCircle size={64} className="text-success mb-3" />
              <h2 style={{ color: 'var(--text-primary)', fontWeight: 800 }} className="mb-3">
                Registration & Payment Successful!
              </h2>
              <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
                Your lab account has been created and payment has been processed. You will receive
                an email with your login credentials and payment receipt shortly.
              </p>
              {selectedPlan && (
                <div className={styles['payment-summary'] + ' mb-4'}>
                  <Card><Card.Body>
                    <h5>Subscription Details</h5>
                    <div className="d-flex justify-content-between"><span>Plan:</span><span>{selectedPlan.name}</span></div>
                    <div className="d-flex justify-content-between"><span>Amount:</span><span>{selectedPlan.price} EGP</span></div>
                    <div className="d-flex justify-content-between"><span>Billing:</span><span>{selectedPlan.period}</span></div>
                  </Card.Body></Card>
                </div>
              )}
              <Button variant="primary" onClick={() => navigate('/login')}>Go to Login</Button>
            </Card.Body>
          </Card>
        </Container>
      </div>
    );
  }

  /* ── Main form ──────────────────────────────────────────────────────── */
  return (
    <div className={styles['register-page']}>
      <Container>
        <Row className="justify-content-center">
          <Col lg={10}>
            <Card className={styles['register-card']}>

              {/* Header — solid primary, always white text */}
              <Card.Header>
                <h2>Register Your Lab</h2>
                <p>Create your lab account and start managing your laboratory operations</p>
              </Card.Header>

              <Card.Body>
                {/* Step indicator */}
                <div className={styles['step-indicators']}>
                  {STEPS.map((s, i) => {
                    const num = i + 1;
                    const isActive = step === num;
                    const isCompleted = step > num;
                    return (
                      <React.Fragment key={num}>
                        <div className={styles['step-dot-wrapper']}>
                          <div className={
                            `${styles['step-dot']} ${isActive ? styles['active'] : ''} ${isCompleted ? styles['completed'] : ''}`
                          }>
                            {isCompleted ? <CheckCircle size={16} /> : num}
                          </div>
                          <span className={`${styles['step-dot-label']} ${isActive ? styles['active'] : ''}`}>
                            {s.label}
                          </span>
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className={`${styles['step-connector']} ${isCompleted ? styles['completed'] : ''}`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                <Form>
                  {/* ── Step 1: Lab Information ── */}
                  {step === 1 && (
                    <div className={styles['step-content']}>
                      <h3 className={styles['step-title']}>
                        <Building size={20} /> Lab Information
                      </h3>
                      <Row className="g-3">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Lab Name <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                              type="text" name="labName" value={formData.labName}
                              onChange={handleInputChange} placeholder="Enter lab name" required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Lab Email <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                              type="email" name="labEmail" value={formData.labEmail}
                              onChange={handleInputChange} placeholder="lab@example.com" required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Lab Phone <span className="text-danger">*</span></Form.Label>
                            <PhoneInput value={formData.labPhone} onChange={setPhone('labPhone')} placeholder="Enter lab phone" />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Region / Country</Form.Label>
                            <Form.Control
                              type="text" name="region" value={formData.region}
                              onChange={handleInputChange} placeholder="Your region or country"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={12}>
                          <Form.Group>
                            <Form.Label>Lab Address</Form.Label>
                            <Form.Control
                              as="textarea" rows={2} name="labAddress" value={formData.labAddress}
                              onChange={handleInputChange} placeholder="Enter lab address"
                              style={{ resize: 'none' }}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={12}>
                          <Form.Group>
                            <Form.Label>Lab Website</Form.Label>
                            <Form.Control
                              type="url" name="labWebsite" value={formData.labWebsite}
                              onChange={handleInputChange} placeholder="https://yourlab.com"
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </div>
                  )}

                  {/* ── Step 2: Admin Account ── */}
                  {step === 2 && (
                    <div className={styles['step-content']}>
                      <h3 className={styles['step-title']}>
                        <User size={20} /> Admin Account
                      </h3>
                      <Row className="g-3">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Admin Name <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                              type="text" name="adminName" value={formData.adminName}
                              onChange={handleInputChange} placeholder="Full name" required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Admin Email <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                              type="email" name="adminEmail" value={formData.adminEmail || ''}
                              onChange={handleInputChange} placeholder="admin@example.com"
                              autoComplete="email" required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Admin Phone</Form.Label>
                            <PhoneInput value={formData.adminPhone} onChange={setPhone('adminPhone')} placeholder="Enter admin phone" />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Username <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                              type="text" name="adminUsername" value={formData.adminUsername || ''}
                              onChange={handleInputChange} placeholder="Choose a username"
                              autoComplete="username" required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Password <span className="text-danger">*</span></Form.Label>
                            <div className={styles['password-input-group']}>
                              <Form.Control
                                type={showPassword ? 'text' : 'password'}
                                name="adminPassword" value={formData.adminPassword || ''}
                                onChange={handleInputChange} placeholder="Min. 8 characters"
                                autoComplete="new-password" required
                              />
                              <OverlayTrigger placement="top" overlay={<Tooltip id="pw-tip">{showPassword ? 'Hide' : 'Show'} password</Tooltip>}>
                                <button type="button" className={styles['password-toggle']}
                                  onClick={() => setShowPassword(v => !v)}
                                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </OverlayTrigger>
                            </div>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Confirm Password <span className="text-danger">*</span></Form.Label>
                            <div className={styles['password-input-group']}>
                              <Form.Control
                                type={showConfirmPassword ? 'text' : 'password'}
                                name="confirmPassword" value={formData.confirmPassword || ''}
                                onChange={handleInputChange} placeholder="Re-enter password"
                                autoComplete="new-password" required
                              />
                              <OverlayTrigger placement="top" overlay={<Tooltip id="cpw-tip">{showConfirmPassword ? 'Hide' : 'Show'} password</Tooltip>}>
                                <button type="button" className={styles['password-toggle']}
                                  onClick={() => setShowConfirmPassword(v => !v)}
                                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                >
                                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </OverlayTrigger>
                            </div>
                          </Form.Group>
                        </Col>
                      </Row>
                    </div>
                  )}

                  {/* ── Step 3: Plan & Terms ── */}
                  {step === 3 && (
                    <div className={styles['step-content']}>
                      <h3 className={styles['step-title']}>
                        <CreditCard size={20} /> Choose Plan &amp; Complete Registration
                      </h3>

                      {/* Subscription plan cards */}
                      <div className={styles['subscription-plans-container']}>
                        {plansLoading ? (
                          <div className="text-center py-4">
                            <Spinner animation="border" size="sm" className="me-2" />
                            <span style={{ color: 'var(--text-secondary)' }}>Loading plans…</span>
                          </div>
                        ) : subscriptionPlans.length === 0 ? (
                          <p style={{ color: 'var(--text-secondary)' }}>No subscription plans available at the moment.</p>
                        ) : (
                          groupedPlans.map(group => (
                            <div key={group.key} className={styles['plan-group']}>
                              <h4 className={styles['group-title']}>{group.title}</h4>
                              <div className={styles['subscription-plans']}>
                                {group.plans.map(plan => (
                                  <div
                                    key={plan.id}
                                    className={`${styles['plan-option']} ${formData.subscriptionPlan === plan.id ? styles['selected'] : ''}`}
                                    onClick={() => setFormData(prev => ({ ...prev, subscriptionPlan: plan.id }))}
                                    role="radio"
                                    aria-checked={formData.subscriptionPlan === plan.id}
                                    tabIndex={0}
                                    onKeyDown={e => e.key === 'Enter' && setFormData(prev => ({ ...prev, subscriptionPlan: plan.id }))}
                                  >
                                    {plan.popular && <div className={styles['popular-badge']}>Most Popular</div>}
                                    <h4>{plan.name}</h4>
                                    <div className={styles['plan-price']}>
                                      {plan.price} EGP <span>/{plan.period}</span>
                                    </div>
                                    {plan.savings && (
                                      <div className={styles['savings']}>Save {plan.savings} EGP/year</div>
                                    )}
                                    <ul>
                                      {plan.features.map((f, i) => <li key={i}>{f}</li>)}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Terms & Privacy checkboxes */}
                      <div className={styles['terms-section']}>
                        <Form.Group className="mb-2">
                          <Form.Check
                            type="checkbox" name="acceptTerms"
                            checked={formData.acceptTerms} onChange={handleInputChange} required
                            label={<>I accept the <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('terms'); }}>Terms and Conditions</a></>}
                          />
                        </Form.Group>
                        <Form.Group>
                          <Form.Check
                            type="checkbox" name="acceptMarketing"
                            checked={formData.acceptMarketing} onChange={handleInputChange}
                            label={<>I agree to receive marketing communications and have read the <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('privacy'); }}>Privacy Policy</a></>}
                          />
                        </Form.Group>
                      </div>

                      {/* Order summary */}
                      <div className={styles['order-summary']}>
                        <h4>Order Summary</h4>
                        <div className={styles['summary-item']}>
                          <span>Plan</span><span>{selectedPlan?.name ?? '—'}</span>
                        </div>
                        <div className={styles['summary-item']}>
                          <span>Billing</span><span>{selectedPlan ? `${selectedPlan.period}ly` : '—'}</span>
                        </div>
                        <div className={styles['summary-total']}>
                          <span>Total</span><span>{selectedPlan ? `${selectedPlan.price} EGP` : '—'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error alert */}
                  {error && (
                    <Alert variant="danger" dismissible onClose={() => setError('')} className="mt-3">
                      {error}
                    </Alert>
                  )}

                  {/* Navigation */}
                  <div className={styles['step-navigation']}>
                    {step > 1 ? (
                      <Button variant="outline-secondary" onClick={prevStep}>← Previous</Button>
                    ) : (
                      <span />
                    )}
                    {step < 3 ? (
                      <Button variant="primary" onClick={nextStep} disabled={loading}>
                        {loading ? <><Spinner animation="border" size="sm" className="me-1" />Validating…</> : 'Next →'}
                      </Button>
                    ) : (
                      <Button variant="primary" type="button" onClick={handleSubmit} disabled={loading || plansLoading}>
                        {loading ? <><Spinner animation="border" size="sm" className="me-1" />Creating Account…</> : 'Create Account'}
                      </Button>
                    )}
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Generic info modal — content driven by activeModal key */}
      <InfoModal
        modalKey={activeModal}
        show={activeModal !== null}
        onHide={() => setActiveModal(null)}
      />
    </div>
  );
};

export default Register;