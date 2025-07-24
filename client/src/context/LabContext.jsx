import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const LabContext = createContext();

/**
 * Hook to access the current lab context, which contains information about the current lab such as its name, id, and settings.
 * Must be used within a LabProvider.
 * @returns {Object} The lab context object
 * @throws {Error} If used outside of a LabProvider
 */
export const useLab = () => {
  const context = useContext(LabContext);
  if (!context) {
    throw new Error('useLab must be used within a LabProvider');
  }
  return context;
};

export const LabProvider = ({ children }) => {
  const [labInfo, setLabInfo] = useState(null);
  const [labSettings, setLabSettings] = useState({});
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL;

  // Fetch lab information and settings
  const fetchLabInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      //use lab_id from JWT token (for authenticated dashboards)
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          const parseJwt = (t) => {
            try {
              return JSON.parse(atob(t.split('.')[1]));
            } catch (e) {
              return null;
            }
          };
          const payload = parseJwt(storedToken);
          if (payload?.lab_id) {
            var labPath = payload.lab_id; // we will treat as ID
            var fetchById = true;
          }
        }

      let lab;
      if (fetchById) {
        const labResponse = await axios.get(`${apiUrl}/labs/by-id/${labPath}`);
        lab = labResponse.data;
      } else {
        const labResponse = await axios.get(`${apiUrl}/labs/by-path/${labPath}`);
        lab = labResponse.data;
      }

      // Fetch lab settings
      const settingsResponse = await axios.get(`${apiUrl}/labs/${lab.id}/settings`);
      const settings = settingsResponse.data;

      // Convert settings array to object
      const settingsObject = {};
      settings.forEach(setting => {
        let value = setting.setting_value;
        
        // Convert value based on type
        switch (setting.setting_type) {
          case 'boolean':
            value = value === 'true';
            break;
          case 'number':
            value = parseFloat(value);
            break;
          case 'json':
            try {
              value = JSON.parse(value);
            } catch (e) {
              value = value;
            }
            break;
          default:
            value = value;
        }
        
        settingsObject[setting.setting_key] = value;
      });

      setLabInfo(lab);
      setLabSettings(settingsObject);
      setSubscriptionStatus({
        status: lab.subscription_status,
        trialExpiresAt: lab.trial_expires_at,
        isTrialExpired: lab.trial_expires_at ? new Date(lab.trial_expires_at) < new Date() : false,
        subscriptionDuration: lab.subscription_duration,
        subscriptionEndDate: lab.subscription_end_date,
      });

    } catch (err) {
      console.error('Error fetching lab info:', err);
      setError(err.response?.data?.error || 'Failed to load lab information');
    } finally {
      setLoading(false);
    }
  };

  // Update lab settings
  const updateLabSettings = async (settings) => {
    try {
      setError(null);
      
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: typeof value === 'object' ? JSON.stringify(value) : String(value),
        setting_type: typeof value === 'boolean' ? 'boolean' : 
                     typeof value === 'number' ? 'number' : 
                     typeof value === 'object' ? 'json' : 'string'
      }));

      await axios.put(`${apiUrl}/labs/${labInfo.id}/settings`, { settings: settingsArray });
      
      // Update local state
      setLabSettings(prev => ({ ...prev, ...settings }));
      
      return { success: true };
    } catch (err) {
      console.error('Error updating lab settings:', err);
      const errorMsg = err.response?.data?.error || 'Failed to update settings';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Update lab information
  const updateLabInfo = async (labData) => {
    try {
      setError(null);
      
      await axios.put(`${apiUrl}/labs/${labInfo.id}`, labData);
      
      // Update local state
      setLabInfo(prev => ({ ...prev, ...labData }));
      
      return { success: true };
    } catch (err) {
      console.error('Error updating lab info:', err);
      const errorMsg = err.response?.data?.error || 'Failed to update lab information';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Get setting value with fallback
  const getSetting = (key, defaultValue = null) => {
    return labSettings[key] !== undefined ? labSettings[key] : defaultValue;
  };

  // Check if lab is in trial and if trial is expired
  const isTrialExpired = () => {
    if (!subscriptionStatus) return false;
    return subscriptionStatus.isTrialExpired;
  };

  const isInTrial = () => {
    if (!subscriptionStatus) return false;
    return subscriptionStatus.status === 'trial';
  };

  const getTrialDaysLeft = () => {
    if (!subscriptionStatus?.trialExpiresAt) return 0;
    const now = new Date();
    const expiresAt = new Date(subscriptionStatus.trialExpiresAt);
    const diffTime = expiresAt - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  // Determine if subscription is currently active
  const isSubscriptionActive = () => {
    if (!subscriptionStatus) return false;
    return subscriptionStatus.status === 'active';
  };

  // Alias helpers expected by components
  const getTrialDaysRemaining = () => getTrialDaysLeft();
  const isOnTrial = () => isInTrial();

  // Upgrade subscription (stub / basic implementation)
  const upgradeSubscription = async ({ duration, amount }) => {
    if (!labInfo) throw new Error('Lab information not loaded');
    try {
      const response = await axios.post(`${apiUrl}/labs/${labInfo.id}/subscription/upgrade`, { duration, amount });
      // Refresh local state after upgrade
      await fetchLabInfo();
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Error upgrading subscription:', err);
      const errorMsg = err.response?.data?.error || 'Failed to upgrade subscription';
      throw new Error(errorMsg);
    }
  };

  // Refresh lab data
  const refreshLabData = () => {
    fetchLabInfo();
  };

  // Initialize on mount
  useEffect(() => {
    fetchLabInfo();
  }, []);

  const value = {
    // State
    labInfo,
    labSettings,
    subscriptionStatus,
    loading,
    error,
    
    // Functions
    fetchLabInfo,
    updateLabSettings,
    updateLabInfo,
    getSetting,
    isTrialExpired,
    isInTrial,
    getTrialDaysLeft,
    getTrialDaysRemaining,
    upgradeSubscription,
    isSubscriptionActive,
    isOnTrial,
    refreshLabData,
    
    // Computed values
    labId: labInfo?.id,
    labName: labInfo?.name,
    labPath: labInfo?.path,
    isActive: labInfo?.is_active,
    
    // Common settings with defaults
    primaryColor: getSetting('primary_color', '#1d498e'),
    secondaryColor: getSetting('secondary_color', '#6c757d'),
    labLogo: getSetting('lab_logo', ''),
    labAddress: getSetting('lab_address', ''),
    labPhone: getSetting('lab_phone', ''),
    labEmail: getSetting('lab_email', ''),
    labWebsite: getSetting('lab_website', ''),
    reportHeader: getSetting('report_header', labInfo?.name || ''),
    reportFooter: getSetting('report_footer', 'Generated by LabManager'),
    currency: getSetting('currency', 'USD'),
    timezone: getSetting('timezone', 'UTC'),
    dateFormat: getSetting('date_format', 'MM/DD/YYYY'),
    language: getSetting('language', 'en'),
    
    // Feature flags
    enableEmailNotifications: getSetting('enable_email_notifications', true),
    enableSmsNotifications: getSetting('enable_sms_notifications', false),
    autoGenerateReports: getSetting('auto_generate_reports', true),
    requirePatientConsent: getSetting('require_patient_consent', true),
    
    // Limits
    maxPatientsPerMonth: getSetting('max_patients_per_month', 1000),
    maxTestsPerMonth: getSetting('max_tests_per_month', 5000)
  };

  return (
    <LabContext.Provider value={value}>
      {children}
    </LabContext.Provider>
  );
}; 