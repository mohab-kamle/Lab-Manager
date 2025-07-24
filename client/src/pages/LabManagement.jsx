import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLab } from '../context/LabContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { 
  Palette, Settings, CreditCard, Upload, Eye, EyeOff, 
  Save, RefreshCw, AlertTriangle, CheckCircle, Info 
} from 'lucide-react';
import '../styles/LabManagement.css';

const LabManagement = () => {
  const { 
    labInfo, 
    labSettings, 
    subscriptionStatus, 
    updateLabInfo, 
    updateLabSettings,
    upgradeSubscription,
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
    lab_phone: '',
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
    payment_reminder_days: 7
  });

  const [subscription, setSubscription] = useState({
    duration: 'monthly',
    amount: 29
  });

  const [activeTab, setActiveTab] = useState('branding');

  // Activity log state
  const [activityLog, setActivityLog] = useState({ data: [], page: 1, pageSize: 20, total: 0, loading: false });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [logoPreview, setLogoPreview] = useState('');

  useEffect(() => {
    if (labInfo) {
      setBranding({
        name: labInfo.name || '',
        logo_url: labInfo.logo_url || '',
        lab_name_invoice: labInfo.lab_name_invoice || labInfo.name || '',
        lab_phone: labInfo.lab_phone || '',
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
      await upgradeSubscription(subscription);
      toast.success('Subscription upgraded successfully!');
    } catch (error) {
      toast.error('Failed to upgrade subscription: ' + error.message);
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
    const prices = {
      monthly: 29,
      '3_months': 79,
      '6_months': 149,
      yearly: 249
    };
    return prices[duration] || 29;
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

  // Refetch when tab changes or lab changes
  useEffect(() => {
    if (activeTab === 'activity') {
      fetchActivityLog(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, labInfo?.id]);

  if (labLoading) {
    return (
      <div className="lab-management">
        <div className="container">
          <div className="loading-spinner">
            <RefreshCw size={32} className="spinning" />
            <p>Loading lab information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lab-management">
      <div className="container">
        <h1 className="page-title">Lab Management</h1>
        
        {/* Subscription Status Banner */}
        {subscriptionStatus && (
          <div className={`subscription-banner ${isSubscriptionActive() ? 'active' : 'expired'}`}>
            <div className="subscription-info">
              <h3>
                {isSubscriptionActive() ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                Subscription Status
              </h3>
              <p><strong>Status:</strong> {subscriptionStatus.status || subscriptionStatus.trial_status}</p>
              <p><strong>Duration:</strong> {subscriptionStatus.subscriptionDuration || subscriptionStatus.trialDuration}</p>
              {subscriptionStatus.subscriptionEndDate && (
                <p><strong>End Date:</strong> {new Date(subscriptionStatus.subscriptionEndDate).toLocaleDateString()}</p>
              )}
              {isTrialExpired() && (
                <p className="trial-warning">⚠️ Trial expired. Please upgrade to continue.</p>
              )}
              {!isTrialExpired() && subscriptionStatus.status === 'trial' && (
                <p className="trial-info">🕒 {getTrialDaysRemaining()} days remaining in trial</p>
              )}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'branding' ? 'active' : ''}`}
            onClick={() => setActiveTab('branding')}
          >
            <Palette size={20} />
            Branding
          </button>
          <button 
            className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={20} />
            Settings
          </button>
          <button 
            className={`tab-button ${activeTab === 'subscription' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscription')}
          >
            <CreditCard size={20} />
            Subscription
          </button>
          <button 
            className={`tab-button ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            <Eye size={20} />
            Activity Log
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <div className="tab-panel">
              <h2>Lab Branding</h2>
              <form onSubmit={handleBrandingSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Lab Name *</label>
                    <input
                      type="text"
                      value={branding.name}
                      onChange={(e) => setBranding(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter lab name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Logo</label>
                    <div className="logo-upload-container">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        id="logo-upload"
                        className="logo-upload-input"
                      />
                      <label htmlFor="logo-upload" className="logo-upload-label">
                        <Upload size={20} />
                        Choose Logo
                      </label>
                    </div>
                    {logoPreview && (
                      <div className="logo-preview-container">
                        <img src={logoPreview} alt="Lab Logo" className="logo-preview" />
                        <button 
                          type="button" 
                          className="remove-logo"
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

                  <div className="form-group">
                    <label>Primary Color</label>
                    <div className="color-input-container">
                      <input
                        type="color"
                        value={branding.primary_color}
                        onChange={(e) => setBranding(prev => ({ ...prev, primary_color: e.target.value }))}
                      />
                      <span className="color-preview" style={{ backgroundColor: branding.primary_color }}></span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Secondary Color</label>
                    <div className="color-input-container">
                      <input
                        type="color"
                        value={branding.secondary_color}
                        onChange={(e) => setBranding(prev => ({ ...prev, secondary_color: e.target.value }))}
                      />
                      <span className="color-preview" style={{ backgroundColor: branding.secondary_color }}></span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Accent Color</label>
                    <div className="color-input-container">
                      <input
                        type="color"
                        value={branding.accent_color}
                        onChange={(e) => setBranding(prev => ({ ...prev, accent_color: e.target.value }))}
                      />
                      <span className="color-preview" style={{ backgroundColor: branding.accent_color }}></span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Lab Name (Invoices)</label>
                    <input
                      type="text"
                      value={branding.lab_name_invoice}
                      onChange={(e) => setBranding(prev => ({ ...prev, lab_name_invoice: e.target.value }))}
                      placeholder="Name to appear on invoices"
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={branding.lab_phone}
                      onChange={(e) => setBranding(prev => ({ ...prev, lab_phone: e.target.value }))}
                      placeholder="Lab phone number"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Address</label>
                    <textarea
                      value={branding.lab_address}
                      onChange={(e) => setBranding(prev => ({ ...prev, lab_address: e.target.value }))}
                      placeholder="Lab address"
                      rows="3"
                    />
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={branding.lab_email}
                      onChange={(e) => setBranding(prev => ({ ...prev, lab_email: e.target.value }))}
                      placeholder="Lab email"
                    />
                  </div>

                  <div className="form-group">
                    <label>Website</label>
                    <input
                      type="url"
                      value={branding.lab_website}
                      onChange={(e) => setBranding(prev => ({ ...prev, lab_website: e.target.value }))}
                      placeholder="Lab website"
                    />
                  </div>
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  <Save size={20} />
                  {loading ? 'Updating...' : 'Update Branding'}
                </button>
              </form>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="tab-panel">
              <h2>Lab Settings</h2>
              <form onSubmit={handleSettingsSubmit}>
                <div className="settings-section">
                  <h3>Notification Settings</h3>
                  <div className="form-grid">
                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.email_notifications}
                          onChange={(e) => setSettings(prev => ({ ...prev, email_notifications: e.target.checked }))}
                        />
                        Email Notifications
                      </label>
                    </div>

                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.sms_notifications}
                          onChange={(e) => setSettings(prev => ({ ...prev, sms_notifications: e.target.checked }))}
                        />
                        SMS Notifications
                      </label>
                    </div>

                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.patient_notifications}
                          onChange={(e) => setSettings(prev => ({ ...prev, patient_notifications: e.target.checked }))}
                        />
                        Patient Notifications
                      </label>
                    </div>

                    <div className="form-group checkbox-group">
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

                <div className="settings-section">
                  <h3>Template Settings</h3>
                  <div className="form-grid">
                    <div className="form-group">
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

                    <div className="form-group">
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

                    <div className="form-group">
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

                <div className="settings-section">
                  <h3>System Settings</h3>
                  <div className="form-grid">
                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.auto_backup}
                          onChange={(e) => setSettings(prev => ({ ...prev, auto_backup: e.target.checked }))}
                        />
                        Auto Backup
                      </label>
                    </div>

                    <div className="form-group">
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

                    <div className="form-group">
                      <label>Data Retention (Days)</label>
                      <input
                        type="number"
                        value={settings.data_retention_days}
                        onChange={(e) => setSettings(prev => ({ ...prev, data_retention_days: parseInt(e.target.value) }))}
                        min="30"
                        max="3650"
                      />
                    </div>

                    <div className="form-group">
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

                <div className="settings-section">
                  <h3>Lab Specific Settings</h3>
                  <div className="form-grid">
                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.allow_patient_registration}
                          onChange={(e) => setSettings(prev => ({ ...prev, allow_patient_registration: e.target.checked }))}
                        />
                        Allow Patient Registration
                      </label>
                    </div>

                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.require_doctor_referral}
                          onChange={(e) => setSettings(prev => ({ ...prev, require_doctor_referral: e.target.checked }))}
                        />
                        Require Doctor Referral
                      </label>
                    </div>

                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.auto_generate_reports}
                          onChange={(e) => setSettings(prev => ({ ...prev, auto_generate_reports: e.target.checked }))}
                        />
                        Auto Generate Reports
                      </label>
                    </div>

                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.enable_qr_codes}
                          onChange={(e) => setSettings(prev => ({ ...prev, enable_qr_codes: e.target.checked }))}
                        />
                        Enable QR Codes
                      </label>
                    </div>

                    <div className="form-group checkbox-group">
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

                <div className="settings-section">
                  <h3>Payment Settings</h3>
                  <div className="form-grid">
                    <div className="form-group">
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

                    <div className="form-group">
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

                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.allow_partial_payments}
                          onChange={(e) => setSettings(prev => ({ ...prev, allow_partial_payments: e.target.checked }))}
                        />
                        Allow Partial Payments
                      </label>
                    </div>

                    <div className="form-group">
                      <label>Payment Reminder (Days)</label>
                      <input
                        type="number"
                        value={settings.payment_reminder_days}
                        onChange={(e) => setSettings(prev => ({ ...prev, payment_reminder_days: parseInt(e.target.value) }))}
                        min="1"
                        max="30"
                      />
                    </div>
                  </div>
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  <Save size={20} />
                  {loading ? 'Updating...' : 'Update Settings'}
                </button>
              </form>
            </div>
          )}

          {/* Subscription Tab */}
          {activeTab === 'activity' && (
            <div className="tab-panel">
              <h2>Recent Activity</h2>
              {activityLog.loading ? (
                <p>Loading...</p>
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
            <div className="tab-panel">
              <h2>Subscription Management</h2>
              
              {isTrialExpired() && (
                <div className="alert alert-warning">
                  <AlertTriangle size={20} />
                  <strong>Your trial has expired!</strong> Upgrade to continue using all features.
                </div>
              )}

              <form onSubmit={handleSubscriptionUpgrade}>
                <div className="subscription-plans">
                  <div className="plan-card">
                    <h3>Monthly Plan</h3>
                    <div className="plan-price">$29<span>/month</span></div>
                    <ul>
                      <li>Unlimited patients</li>
                      <li>Unlimited tests</li>
                      <li>All features included</li>
                      <li>Email support</li>
                    </ul>
                    <button 
                      type="button"
                      className={`plan-button ${subscription.duration === 'monthly' ? 'active' : ''}`}
                      onClick={() => handleDurationChange('monthly')}
                    >
                      {subscription.duration === 'monthly' ? 'Selected' : 'Select'}
                    </button>
                  </div>

                  <div className="plan-card featured">
                    <div className="plan-badge">Most Popular</div>
                    <h3>Yearly Plan</h3>
                    <div className="plan-price">$249<span>/year</span></div>
                    <div className="plan-savings">Save $99/year</div>
                    <ul>
                      <li>Unlimited patients</li>
                      <li>Unlimited tests</li>
                      <li>All features included</li>
                      <li>Priority support</li>
                      <li>Advanced analytics</li>
                    </ul>
                    <button 
                      type="button"
                      className={`plan-button ${subscription.duration === 'yearly' ? 'active' : ''}`}
                      onClick={() => handleDurationChange('yearly')}
                    >
                      {subscription.duration === 'yearly' ? 'Selected' : 'Select'}
                    </button>
                  </div>

                  <div className="plan-card">
                    <h3>3 Months Plan</h3>
                    <div className="plan-price">$79<span>/quarter</span></div>
                    <ul>
                      <li>Unlimited patients</li>
                      <li>Unlimited tests</li>
                      <li>All features included</li>
                      <li>Email support</li>
                    </ul>
                    <button 
                      type="button"
                      className={`plan-button ${subscription.duration === '3_months' ? 'active' : ''}`}
                      onClick={() => handleDurationChange('3_months')}
                    >
                      {subscription.duration === '3_months' ? 'Selected' : 'Select'}
                    </button>
                  </div>
                </div>

                <div className="subscription-summary">
                  <h3>Order Summary</h3>
                  <div className="summary-item">
                    <span>Plan:</span>
                    <span>{subscription.duration.charAt(0).toUpperCase() + subscription.duration.slice(1)} Plan</span>
                  </div>
                  <div className="summary-item">
                    <span>Amount:</span>
                    <span>${subscription.amount}</span>
                  </div>
                  <div className="summary-total">
                    <span>Total:</span>
                    <span>${subscription.amount}</span>
                  </div>
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  <CreditCard size={20} />
                  {loading ? 'Processing...' : 'Upgrade Subscription'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LabManagement;
