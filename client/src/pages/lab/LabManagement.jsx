import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useLab } from '../../context/LabContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/ToastContext';
import {
  Palette, Settings, CreditCard, Upload, Eye, EyeOff,
  Save, RefreshCw, AlertTriangle, CheckCircle, Info, Trash2, Plus , MessageCircle
} from 'lucide-react';
import PhoneInput from '../../components/ui/PhoneInput';
import styles from '../../styles/LabManagement.module.css';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const LabManagement = () => {
  const { toast } = useToast();
  const {
    labInfo,
    labSettings,
    subscriptionStatus,
    updateLabInfo,
    updateLabSettings,
    refreshAfterUpgrade,
    isTrialExpired,
    getTrialDaysRemaining,
    isSubscriptionActive,
    loading: labLoading
  } = useLab();

  const { user } = useAuth();

  const [branding, setBranding] = useState({
    name: '',
    logo_url: '',
    lab_name_invoice: '',
    phoneNumbers: [{ phone: '', type: 'work', is_primary: true }],
    lab_address: '',
    lab_email: '',
    lab_website: '',
    primary_color: labInfo?.primary_color || '#007bff',
    secondary_color: labInfo?.secondary_color || '#6c757d',
    accent_color: labInfo?.accent_color || '#28a745'
  });

  const [settings, setSettings] = useState({
    // Notification Settings
    email_notifications: true,
    sms_notifications: false,
    patient_notifications: true,
    report_notifications: true,

    // Template Settings
    invoice_template: 'default',
    report_template: 'default',
    receipt_template: 'default',

    // System Settings
    auto_backup: true,
    backup_frequency: 'daily',
    data_retention_days: 365,
    session_timeout: 30,

    // Lab Specific Settings
    allow_patient_registration: true,
    require_doctor_referral: false,
    auto_generate_reports: true,
    enable_qr_codes: true,
    enable_barcodes: true,

    // Payment Settings
    currency: 'USD',
    tax_rate: 0,
    allow_partial_payments: true,
    payment_reminder_days: 7,
    patient_due_limit: 0
  });

  const [subscription, setSubscription] = useState({
    duration: 'monthly',
    amount: 0 // Initialize with 0, will be set after fetching prices
  });
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);

  const [activeTab, setActiveTab] = useState('branding');

  // Activity log state
  const [activityLog, setActivityLog] = useState({ data: [], page: 1, pageSize: 20, total: 0, loading: false });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [logoPreview, setLogoPreview] = useState('');

  // WhatsApp states
  const [whatsappStatus, setWhatsappStatus] = useState('disconnected');
  const [whatsappQR, setWhatsappQR] = useState(null);
  const [isWhatsappLoading, setIsWhatsappLoading] = useState(false);
  const qrPollingRef = useRef(null);
  const [messageTemplate, setMessageTemplate] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    if (labInfo) {
      setBranding({
        name: labInfo.name || '',
        logo_url: labInfo.logo_url || '',
        lab_name_invoice: labInfo.lab_name_invoice || labInfo.name || '',
        phoneNumbers: (labInfo.phones && labInfo.phones.length > 0) 
          ? labInfo.phones.map(p => ({ phone: p.phone, type: p.type, is_primary: p.is_primary }))
          : [{ phone: labInfo.lab_phone || '', type: 'work', is_primary: true }],
        lab_address: labInfo.lab_address || '',
        lab_email: labInfo.lab_email || '',
        lab_website: labInfo.lab_website || '',
        primary_color: labInfo.primary_color || '#007bff',
        secondary_color: labInfo.secondary_color || '#6c757d',
        accent_color: labInfo.accent_color || '#28a745'
      });
      setLogoPreview(labInfo.logo_url || '');
    }
  }, [labInfo]);

  useEffect(() => {
    if (labSettings && Array.isArray(labSettings)) {
      const settingsMap = {};
      labSettings.forEach(setting => {
        try {
          if (setting.setting_type === 'json') {
            settingsMap[setting.setting_key] = JSON.parse(setting.setting_value);
          } else if (setting.setting_type === 'boolean') {
            settingsMap[setting.setting_key] = setting.setting_value === 'true';
          } else {
            settingsMap[setting.setting_key] = setting.setting_value;
          }
        } catch (error) {
          console.error('Error parsing setting:', setting, error);
        }
      });

      setSettings(prev => ({
        ...prev,
        ...settingsMap
      }));
    }
  }, [labSettings]);

  const handleBrandingSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateLabInfo(branding);
      toast.success('Lab branding updated successfully!');
    } catch (error) {
      toast.error('Failed to update branding: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert settings to the format expected by the API
      const settingsToUpdate = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: typeof value === 'object' ? JSON.stringify(value) : String(value),
        setting_type: typeof value === 'object' ? 'json' : typeof value === 'boolean' ? 'boolean' : 'string'
      }));

      await updateLabSettings(settingsToUpdate);
      toast.success('Lab settings updated successfully!');
    } catch (error) {
      toast.error('Failed to update settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionUpgrade = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if user is logged in and lab info is available
      if (!user) {
        throw new Error('Please log in to upgrade your subscription');
      }

      if (!labInfo || !labInfo.id) {
        throw new Error('Lab information not available. Please refresh the page and try again.');
      }

      // Get selected subscription plan details
      const selectedPlan = subscriptionPlans.find(plan => plan.duration_type === subscription.duration);
      if (!selectedPlan) {
        throw new Error('Selected subscription plan not found');
      }

      // Prepare payment intention data
      const paymentIntentionData = {
        lab_id: labInfo.id,
        amount: selectedPlan.price,
        currency: 'EGP',
        billing_data: {
          first_name: user?.name?.split(' ')[0] || 'Lab',
          last_name: user?.name?.split(' ').slice(1).join(' ') || 'Admin',
          email: user?.email || labInfo.lab_email || 'admin@lab.com',
          phone_number: user?.phone || labInfo.lab_phone || '+20000000000',
          street: labInfo.lab_address || 'N/A',
          building: 'N/A',
          floor: 'N/A',
          apartment: 'N/A',
          city: 'N/A',
          state: 'N/A',
          country: 'EG',
          postal_code: 'N/A'
        },
        items: [{
          name: selectedPlan.name,
          amount: Math.round(selectedPlan.price * 100),
          description: `Lab subscription upgrade - ${selectedPlan.name}`,
          quantity: 1
        }],
        subscription_plan: selectedPlan.duration_type,
        subscription_duration: selectedPlan.duration_type,
        notification_url: `${window.location.origin}/api/payments/webhook`,
        redirection_url: `${window.location.origin}/payment-callback`
      };

      // Create payment intention using the same endpoint pattern as registration
      const upgradePayload = {
        lab: {
          id: labInfo.id,
          name: labInfo.name || 'Lab',
          email: labInfo.lab_email || user?.email || 'admin@lab.com',
          phone: labInfo.lab_phone || user?.phone || '+20000000000',
          address: labInfo.lab_address || 'N/A'
        },
        admin: {
          name: user?.name || 'Lab Admin',
          email: user?.email || labInfo?.lab_email || 'admin@lab.com',
          phone: user?.phone || labInfo?.lab_phone || '+20000000000'
        },
        subscription: {
          plan: selectedPlan.duration_type,
          paymentMethod: 'card'
        }
      };
      console.log('Upgrade payload:', upgradePayload);
      // Use the upgrade endpoint for existing lab subscription upgrades
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/register/upgrade`, upgradePayload);

      if (response.data.success && response.data.payment.payment_url) {
        // Store payment data for potential reference
        localStorage.setItem('upgradePaymentData', JSON.stringify({
          merchant_order_id: response.data.payment.merchant_order_id,
          payment_intention_id: response.data.payment.payment_intention_id,
          lab_id: labInfo.id,
          plan: selectedPlan.duration_type
        }));

        // Redirect to payment page
        window.location.href = response.data.payment.payment_url;
      } else {
        throw new Error('Failed to create payment intention');
      }
    } catch (error) {
      console.error('Subscription upgrade error:', error);
      toast.error('Failed to initiate payment: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size should be less than 5MB');
        return;
      }

      // Create preview
      const logoUrl = URL.createObjectURL(file);
      setLogoPreview(logoUrl);
      setBranding(prev => ({ ...prev, logo_url: logoUrl }));
    }
  };

  const getSubscriptionPrice = (duration) => {
    const plan = subscriptionPlans.find(p => p.duration_type === duration);
    return plan ? plan.price : 0;
  };

  const handleDurationChange = (duration) => {
    setSubscription(prev => ({
      ...prev,
      duration,
      amount: getSubscriptionPrice(duration)
    }));
  };

  // Fetch activity log
  const fetchActivityLog = async (page = 1) => {
    if (!labInfo) return;
    try {
      setActivityLog(prev => ({ ...prev, loading: true }));
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.get(`${apiUrl}/labs/${labInfo.id}/activity-log`, {
        params: { page, pageSize: activityLog.pageSize },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setActivityLog({
        data: response.data.data,
        page: response.data.page,
        pageSize: response.data.pageSize,
        total: response.data.total,
        loading: false
      });
    } catch (err) {
      console.error('Failed to fetch activity log', err);
      setActivityLog(prev => ({ ...prev, loading: false }));
    }
  };

  // Fetch subscription plans on component mount
  useEffect(() => {
    const fetchSubscriptionPlans = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/subscriptions`);
        setSubscriptionPlans(response.data);
        // Set initial subscription amount based on default duration
        setSubscription(prev => ({
          ...prev,
          amount: getSubscriptionPrice(prev.duration)
        }));
      } catch (error) {
        console.error('Error fetching subscription plans:', error);
        toast.error('Failed to load subscription plans.');
      }
    };
    fetchSubscriptionPlans();
  }, []);

  // Refetch when tab changes or lab changes
  useEffect(() => {
    if (activeTab === 'activity') {
      fetchActivityLog(1);
    }
    if (activeTab === 'whatsapp') {
      fetchWhatsappStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, labInfo?.id]);

  const fetchWhatsappStatus = async () => {
    if (!labInfo?.id) return;
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/whatsapp/status/${labInfo.id}`, { headers });
      setWhatsappStatus(response.data.status || 'disconnected');
      
      if (response.data.status === 'initializing') {
        startQrPolling();
      } else {
        stopQrPolling();
        setWhatsappQR(null);
      }

      // Also fetch the custom message template
      try {
        const templateRes = await axios.get(
          `${import.meta.env.VITE_API_URL}/whatsapp/message-template/${labInfo.id}`,
          { headers }
        );
        setMessageTemplate(templateRes.data.message_template || '');
      } catch (templateErr) {
        // Non-critical — template may not exist yet if WhatsApp was never connected
        console.warn('Could not fetch message template:', templateErr.message);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
    }
  };

  // Save the customized WhatsApp message template
  const handleSaveTemplate = async () => {
    if (!labInfo?.id) return;
    setSavingTemplate(true);
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/whatsapp/message-template/${labInfo.id}`,
        { message_template: messageTemplate },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success('Message template saved successfully!');
    } catch (error) {
      console.error('Error saving message template:', error);
      toast.error(error.response?.data?.error || 'Failed to save message template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const startQrPolling = () => {
    if (qrPollingRef.current) return;
    qrPollingRef.current = setInterval(async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/whatsapp/qr/${labInfo.id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.data.qr) {
          setWhatsappQR(response.data.qr);
        } else {
          // Check status again to see if we connected
          fetchWhatsappStatus();
        }
      } catch (error) {
        console.error('Error polling QR:', error);
      }
    }, 5000);
  };

  const stopQrPolling = () => {
    if (qrPollingRef.current) {
      clearInterval(qrPollingRef.current);
      qrPollingRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (qrPollingRef.current) {
        clearInterval(qrPollingRef.current);
      }
    };
  }, []);

  const handleConnectWhatsapp = async () => {
    if (!labInfo?.id) return;
    try {
      setIsWhatsappLoading(true);
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/whatsapp/connect/${labInfo.id}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setWhatsappStatus(response.data.status || 'initializing');
      if (response.data.status === 'initializing') {
        startQrPolling();
      }
    } catch (error) {
      console.error('Error connecting WhatsApp:', error);
      toast.error('Failed to initiate WhatsApp connection.');
    } finally {
      setIsWhatsappLoading(false);
    }
  };

  const handleDisconnectWhatsapp = async () => {
    if (!labInfo?.id) return;
    try {
      setIsWhatsappLoading(true);
      await axios.post(`${import.meta.env.VITE_API_URL}/whatsapp/disconnect/${labInfo.id}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setWhatsappStatus('disconnected');
      stopQrPolling();
      setWhatsappQR(null);
      toast.success('WhatsApp disconnected successfully.');
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error);
      toast.error('Failed to disconnect WhatsApp.');
    } finally {
      setIsWhatsappLoading(false);
    }
  };

  if (labLoading) {
    return (
      <LoadingSpinner message="Loading lab information..." />
    );
  }

  // Show error if user is not logged in or lab info is not available
  if (!user) {
    return (
      <div className={styles.labManagement}>
        <div className={styles.container}>
          <div className={styles.errorMessage}>
            <AlertTriangle size={24} />
            <h3>Authentication Required</h3>
            <p>Please log in to access lab management features.</p>
            <button onClick={() => window.location.href = '/login'} className={styles.btnPrimary}>
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!labInfo) {
    return (
      <div className={styles.labManagement}>
        <div className={styles.container}>
          <div className={styles.errorMessage}>
            <AlertTriangle size={24} />
            <h3>Lab Information Unavailable</h3>
            <p>Unable to load lab information. Please try refreshing the page.</p>
            <button onClick={() => window.location.reload()} className={styles.btnPrimary}>
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.labManagement}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Lab Management</h1>
        <h4>Settings are under construction (update coming soon)</h4>
        {/* Subscription Status Banner */}
        {subscriptionStatus && (
          <div className={`${styles.subscriptionBanner} ${isSubscriptionActive() ? styles.active : styles.expired}`}>
            <div className={styles.subscriptionInfo}>
              <h3>
                {isSubscriptionActive() ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                Subscription Status
              </h3>
              <p><strong>Status:</strong> {subscriptionStatus.status || subscriptionStatus.trial_status}</p>
              <p><strong>Duration:</strong> {subscriptionStatus.subscriptionDuration || subscriptionStatus.trialDuration}</p>
              {subscriptionStatus.subscriptionEndDate && (
                <p><strong>End Date:</strong> {new Date(subscriptionStatus.subscriptionEndDate).toLocaleDateString('en-GB')}</p>
              )}
              {isTrialExpired() && (
                <p className={styles.trialWarning}>⚠️ Trial expired. Please upgrade to continue.</p>
              )}
              {!isTrialExpired() && subscriptionStatus.status === 'trial' && (
                <p className={styles.trialInfo}>🕒 {getTrialDaysRemaining()} days remaining in trial</p>
              )}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className={styles.tabNavigation}>
          <button
            className={`${styles.tabButton} ${activeTab === 'branding' ? styles.active : ''}`}
            onClick={() => setActiveTab('branding')}
          >
            <Palette size={20} />
            Branding
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'settings' ? styles.active : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={20} />
            Settings
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'subscription' ? styles.active : ''}`}
            onClick={() => setActiveTab('subscription')}
          >
            <CreditCard size={20} />
            Subscription
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'activity' ? styles.active : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            <Eye size={20} />
            Activity Log
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'whatsapp' ? styles.active : ''}`}
            onClick={() => setActiveTab('whatsapp')}
          >
            <MessageCircle size={20} />
            WhatsApp
          </button>
        </div>

        {/* Tab Content */}
        <div className={styles.tabContent}>
          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <div className={styles.tabPanel}>
              <h2>Lab Branding</h2>
              <form onSubmit={handleBrandingSubmit}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Lab Name *</label>
                    <input
                      type="text"
                      value={branding.name}
                      onChange={(e) => setBranding(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter lab name"
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Logo</label>
                    <div className={styles.logoUploadContainer}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        id="logo-upload"
                        className={styles.logoUploadInput}
                      />
                      <label htmlFor="logo-upload" className={styles.logoUploadLabel}>
                        <Upload size={20} />
                        Choose Logo
                      </label>
                    </div>
                    {logoPreview && (
                      <div className={styles.logoPreviewContainer}>
                        <img src={logoPreview} alt="Lab Logo" className={styles.logoPreview} />
                        <button
                          type="button"
                          className={styles.removeLogo}
                          onClick={() => {
                            setLogoPreview('');
                            setBranding(prev => ({ ...prev, logo_url: '' }));
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <label>Primary Color</label>
                    <div className={styles.colorInputContainer}>
                      <input
                        type="color"
                        value={branding.primary_color}
                        onChange={(e) => setBranding(prev => ({ ...prev, primary_color: e.target.value }))}
                      />
                      <span className={styles.colorPreview} style={{ backgroundColor: branding.primary_color }}></span>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Secondary Color</label>
                    <div className={styles.colorInputContainer}>
                      <input
                        type="color"
                        value={branding.secondary_color}
                        onChange={(e) => setBranding(prev => ({ ...prev, secondary_color: e.target.value }))}
                      />
                      <span className={styles.colorPreview} style={{ backgroundColor: branding.secondary_color }}></span>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Accent Color</label>
                    <div className={styles.colorInputContainer}>
                      <input
                        type="color"
                        value={branding.accent_color}
                        onChange={(e) => setBranding(prev => ({ ...prev, accent_color: e.target.value }))}
                      />
                      <span className={styles.colorPreview} style={{ backgroundColor: branding.accent_color }}></span>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Lab Name (Invoices)</label>
                    <input
                      type="text"
                      value={branding.lab_name_invoice}
                      onChange={(e) => setBranding(prev => ({ ...prev, lab_name_invoice: e.target.value }))}
                      placeholder="Name to appear on invoices"
                    />
                  </div>

                  <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label>Phone Numbers</label>
                    <div className="d-flex flex-wrap gap-3">
                      {branding.phoneNumbers.map((phoneEntry, index) => (
                        <div key={index} className="d-flex gap-2 align-items-start mb-2" style={{ minWidth: '300px' }}>
                          <div style={{ flex: 1 }}>
                            <PhoneInput
                              value={phoneEntry.phone}
                              onChange={(val) => {
                                const newPhones = [...branding.phoneNumbers];
                                newPhones[index].phone = val;
                                setBranding(prev => ({ ...prev, phoneNumbers: newPhones }));
                              }}
                              placeholder="Enter phone number"
                            />
                          </div>
                          {branding.phoneNumbers.length > 1 && (
                            <button 
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => {
                                const newPhones = branding.phoneNumbers.filter((_, i) => i !== index);
                                if (phoneEntry.is_primary && newPhones.length > 0) {
                                  newPhones[0].is_primary = true;
                                }
                                setBranding(prev => ({ ...prev, phoneNumbers: newPhones }));
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button 
                      type="button"
                      className="btn btn-outline-primary btn-sm mt-1"
                      onClick={() => {
                        setBranding(prev => ({
                          ...prev,
                          phoneNumbers: [
                            ...prev.phoneNumbers,
                            { phone: "", type: "work", is_primary: false }
                          ]
                        }));
                      }}
                    >
                      <Plus size={14} className="me-1" /> Add Phone
                    </button>
                  </div>

                  <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label>Address</label>
                    <textarea
                      value={branding.lab_address}
                      onChange={(e) => setBranding(prev => ({ ...prev, lab_address: e.target.value }))}
                      placeholder="Lab address"
                      rows="3"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Email</label>
                    <input
                      type="email"
                      value={branding.lab_email}
                      onChange={(e) => setBranding(prev => ({ ...prev, lab_email: e.target.value }))}
                      placeholder="Lab email"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Website</label>
                    <input
                      type="url"
                      value={branding.lab_website}
                      onChange={(e) => setBranding(prev => ({ ...prev, lab_website: e.target.value }))}
                      placeholder="Lab website"
                    />
                  </div>


                </div>

                <button type="submit" className={styles.btnPrimary} disabled={loading}>
                  <Save size={20} />
                  {loading ? 'Updating...' : 'Update Branding'}
                </button>
              </form>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className={styles.tabPanel}>
              <h2>Lab Settings</h2>
              <form onSubmit={handleSettingsSubmit}>
                <div className={styles.settingsSection}>
                  <h3>Notification Settings</h3>
                  <div className={styles.formGrid}>
                    <div className={`${styles.formGroup} ${styles.checkboxGroup}`}>
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.email_notifications}
                          onChange={(e) => setSettings(prev => ({ ...prev, email_notifications: e.target.checked }))}
                        />
                        Email Notifications
                      </label>
                    </div>

                    <div className={`${styles.formGroup} ${styles.checkboxGroup}`}>
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.sms_notifications}
                          onChange={(e) => setSettings(prev => ({ ...prev, sms_notifications: e.target.checked }))}
                        />
                        SMS Notifications
                      </label>
                    </div>

                    <div className={`${styles.formGroup} ${styles.checkboxGroup}`}>
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.patient_notifications}
                          onChange={(e) => setSettings(prev => ({ ...prev, patient_notifications: e.target.checked }))}
                        />
                        Patient Notifications
                      </label>
                    </div>

                    <div className={`${styles.formGroup} ${styles.checkboxGroup}`}>
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.report_notifications}
                          onChange={(e) => setSettings(prev => ({ ...prev, report_notifications: e.target.checked }))}
                        />
                        Report Notifications
                      </label>
                    </div>
                  </div>
                </div>

                <div className={styles.settingsSection}>
                  <h3>Template Settings</h3>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Invoice Template</label>
                      <select
                        value={settings.invoice_template}
                        onChange={(e) => setSettings(prev => ({ ...prev, invoice_template: e.target.value }))}
                      >
                        <option value="default">Default Template</option>
                        <option value="modern">Modern Template</option>
                        <option value="classic">Classic Template</option>
                        <option value="minimal">Minimal Template</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Report Template</label>
                      <select
                        value={settings.report_template}
                        onChange={(e) => setSettings(prev => ({ ...prev, report_template: e.target.value }))}
                      >
                        <option value="default">Default Template</option>
                        <option value="detailed">Detailed Template</option>
                        <option value="simple">Simple Template</option>
                        <option value="professional">Professional Template</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Receipt Template</label>
                      <select
                        value={settings.receipt_template}
                        onChange={(e) => setSettings(prev => ({ ...prev, receipt_template: e.target.value }))}
                      >
                        <option value="default">Default Template</option>
                        <option value="compact">Compact Template</option>
                        <option value="detailed">Detailed Template</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className={styles.settingsSection}>
                  <h3>System Settings</h3>
                  <div className={styles.formGrid}>
                    <div className={`${styles.formGroup} ${styles.checkboxGroup}`}>
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.auto_backup}
                          onChange={(e) => setSettings(prev => ({ ...prev, auto_backup: e.target.checked }))}
                        />
                        Auto Backup
                      </label>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Backup Frequency</label>
                      <select
                        value={settings.backup_frequency}
                        onChange={(e) => setSettings(prev => ({ ...prev, backup_frequency: e.target.value }))}
                        disabled={!settings.auto_backup}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Data Retention (Days)</label>
                      <input
                        type="number"
                        value={settings.data_retention_days}
                        onChange={(e) => setSettings(prev => ({ ...prev, data_retention_days: parseInt(e.target.value) }))}
                        min="30"
                        max="3650"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Session Timeout (Minutes)</label>
                      <input
                        type="number"
                        value={settings.session_timeout}
                        onChange={(e) => setSettings(prev => ({ ...prev, session_timeout: parseInt(e.target.value) }))}
                        min="5"
                        max="480"
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.settingsSection}>
                  <h3>Lab Specific Settings</h3>
                  <div className={styles.formGrid}>
                    <div className={`${styles.formGroup} ${styles.checkboxGroup}`}>
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.allow_patient_registration}
                          onChange={(e) => setSettings(prev => ({ ...prev, allow_patient_registration: e.target.checked }))}
                        />
                        Allow Patient Registration
                      </label>
                    </div>

                    <div className={`${styles.formGroup} ${styles.checkboxGroup}`}>
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.require_doctor_referral}
                          onChange={(e) => setSettings(prev => ({ ...prev, require_doctor_referral: e.target.checked }))}
                        />
                        Require Doctor Referral
                      </label>
                    </div>

                    <div className={`${styles.formGroup} ${styles.checkboxGroup}`}>
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.auto_generate_reports}
                          onChange={(e) => setSettings(prev => ({ ...prev, auto_generate_reports: e.target.checked }))}
                        />
                        Auto Generate Reports
                      </label>
                    </div>

                    <div className={`${styles.formGroup} ${styles.checkboxGroup}`}>
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.enable_qr_codes}
                          onChange={(e) => setSettings(prev => ({ ...prev, enable_qr_codes: e.target.checked }))}
                        />
                        Enable QR Codes
                      </label>
                    </div>

                    <div className={`${styles.formGroup} ${styles.checkboxGroup}`}>
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.enable_barcodes}
                          onChange={(e) => setSettings(prev => ({ ...prev, enable_barcodes: e.target.checked }))}
                        />
                        Enable Barcodes
                      </label>
                    </div>
                  </div>
                </div>

                <div className={styles.settingsSection}>
                  <h3>Payment Settings</h3>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Currency</label>
                      <select
                        value={settings.currency}
                        onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="SAR">SAR (ر.س)</option>
                        <option value="EGP">EGP (ج.م)</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Tax Rate (%)</label>
                      <input
                        type="number"
                        value={settings.tax_rate}
                        onChange={(e) => setSettings(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) }))}
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </div>

                    <div className={`${styles.formGroup} ${styles.checkboxGroup}`}>
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.allow_partial_payments}
                          onChange={(e) => setSettings(prev => ({ ...prev, allow_partial_payments: e.target.checked }))}
                        />
                        Allow Partial Payments
                      </label>
                    </div>

                    <div className={styles.formGroup}>
                      <input
                        type="number"
                        value={settings.payment_reminder_days}
                        onChange={(e) => setSettings(prev => ({ ...prev, payment_reminder_days: parseInt(e.target.value) }))}
                        min="1"
                        max="30"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>
                        Max Due Limit (Patient)
                        <span className="info-tooltip" title="Maximum allowed debt for a patient. Set to 0 to disable limit.">
                          <Info size={14} />
                        </span>
                      </label>
                      <input
                        type="number"
                        value={settings.patient_due_limit}
                        onChange={(e) => setSettings(prev => ({ ...prev, patient_due_limit: parseFloat(e.target.value) || 0 }))}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <button type="submit" className={styles.btnPrimary} disabled={loading}>
                  <Save size={20} />
                  {loading ? 'Updating...' : 'Update Settings'}
                </button>
              </form>
            </div>
          )}

          {/* Activity Log Tab */}
          {activeTab === 'activity' && (
            <div className={styles.tabPanel}>
              <h2>Recent Activity</h2>
              {activityLog.loading ? (
                <LoadingSpinner message="Loading activity log..." />
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-striped table-hover">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>User</th>
                          <th>Role</th>
                          <th>Action</th>
                          <th>Entity</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activityLog.data.length === 0 && (
                          <tr><td colSpan="6" className="text-center">No activity found.</td></tr>
                        )}
                        {activityLog.data.map((log) => (
                          <tr key={log.id}>
                            <td>{new Date(log.created_at).toLocaleString()}</td>
                            <td>{log.user_id}</td>
                            <td>{log.user_role}</td>
                            <td>{log.action}</td>
                            <td>{log.entity_type}</td>
                            <td>{log.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  {activityLog.total > activityLog.pageSize && (
                    <div className="d-flex justify-content-center align-items-center gap-2 mt-2">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        disabled={activityLog.page === 1}
                        onClick={() => fetchActivityLog(activityLog.page - 1)}
                      >Prev</button>
                      <span>
                        Page {activityLog.page} of {Math.ceil(activityLog.total / activityLog.pageSize)}
                      </span>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        disabled={activityLog.page === Math.ceil(activityLog.total / activityLog.pageSize)}
                        onClick={() => fetchActivityLog(activityLog.page + 1)}
                      >Next</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className={styles.tabPanel}>
              <h2>Upgrade Subscription</h2>
              <form onSubmit={handleSubscriptionUpgrade}>
                <div className={styles.formGroup}>
                  <label>Subscription Duration</label>
                  <select
                    value={subscription.duration}
                    onChange={(e) => handleDurationChange(e.target.value)}
                  >
                    {subscriptionPlans.filter(p => p.duration_type !== 'free_trial').map(plan => (
                      <option key={plan.id} value={plan.duration_type}>
                        {plan.name} - ${plan.price}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={`${styles.formGroup} mb-3`}>
                  <label>Amount</label>
                  <input
                    type="text"
                    value={`$${subscription.amount}`}
                    readOnly
                    className="form-control-plaintext"
                  />
                </div>

                <button type="submit" className={styles.btnPrimary} disabled={loading || isSubscriptionActive()}>
                  <CreditCard size={20} />
                  {loading ? 'Processing...' : (isSubscriptionActive() ? 'Already Subscribed' : 'Upgrade Now')}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className={styles.tabPanel}>
              <h2>WhatsApp Integration</h2>
              <p>Connect your lab's WhatsApp number to automatically send medical reports to patients.</p>
              
              <div className="card mt-4 p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div>
                    <h4 className="m-0">Connection Status</h4>
                    <span className={`badge ${whatsappStatus === 'connected' ? 'bg-success' : whatsappStatus === 'initializing' ? 'bg-warning' : 'bg-secondary'} mt-2`}>
                      {whatsappStatus.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    {whatsappStatus === 'disconnected' && (
                      <button 
                        className="btn btn-primary" 
                        onClick={handleConnectWhatsapp}
                        disabled={isWhatsappLoading}
                      >
                        {isWhatsappLoading ? <LoadingSpinner size={20} containerClassName="" /> : 'Connect WhatsApp'}
                      </button>
                    )}
                    {whatsappStatus === 'connected' && (
                      <button 
                        className="btn btn-danger" 
                        onClick={handleDisconnectWhatsapp}
                        disabled={isWhatsappLoading}
                      >
                        {isWhatsappLoading ? <LoadingSpinner size={20} containerClassName="" /> : 'Disconnect'}
                      </button>
                    )}
                  </div>
                </div>

                {whatsappStatus === 'initializing' && whatsappQR && (
                  <div className="text-center mt-4">
                    <h5>Scan this QR Code with your WhatsApp</h5>
                    <p className="text-muted small">Open WhatsApp on your phone &gt; Settings &gt; Linked Devices &gt; Link a Device</p>
                    <img src={whatsappQR} alt="WhatsApp QR Code" style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '10px' }} />
                  </div>
                )}
                {whatsappStatus === 'initializing' && !whatsappQR && (
                  <div className="text-center mt-4">
                    <LoadingSpinner message="Generating QR code..." />
                  </div>
                )}

                {/* Message Template Customization — only show when connected */}
                {whatsappStatus === 'connected' && (
                  <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color, #dee2e6)' }}>
                    <h5 className="mb-2">
                      <MessageCircle size={18} className="me-2" style={{ verticalAlign: 'text-bottom' }} />
                      Customize WhatsApp Message
                    </h5>
                    <p className="text-muted small mb-3">
                      This message is sent as a caption with the PDF report. You can use these placeholders:
                    </p>
                    <div className="d-flex flex-wrap gap-2 mb-3">
                      <span className="badge bg-info text-dark">{'{{lab_name}}'}</span>
                      <span className="badge bg-info text-dark">{'{{patient_name}}'}</span>
                    </div>
                    <textarea
                      className="form-control mb-3"
                      rows={4}
                      value={messageTemplate}
                      onChange={(e) => setMessageTemplate(e.target.value)}
                      placeholder="Hello! Here is your lab report from {{lab_name}}. If you have any questions, please contact us."
                    />
                    <button
                      className="btn btn-primary"
                      onClick={handleSaveTemplate}
                      disabled={savingTemplate}
                    >
                      {savingTemplate ? (
                        <><LoadingSpinner size={18} containerClassName="" /> Saving...</>
                      ) : (
                        <><Save size={16} className="me-1" /> Save Template</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LabManagement;
