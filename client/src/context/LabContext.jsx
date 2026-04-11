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
      if (!labPath) {
        setError('No lab identifier found. Please log in again or contact support.');
        setLoading(false);
        return;
      }
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
      if (!labInfo || !labInfo.id) {
        const errorMsg = 'Lab information not loaded. Please wait until lab info is available.';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
      await axios.put(
        `${apiUrl}/labs/${labInfo.id}/settings`, 
        { settings: settings },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      // Update local state
      // Assuming settings is an array of { setting_key, setting_value, setting_type }
      // We need to convert it back to an object for the local state
      const newLabSettings = settings.reduce((acc, setting) => {
        let value = setting.setting_value;
        if (setting.setting_type === 'boolean') {
          value = value === 'true';
        } else if (setting.setting_type === 'number') {
          value = Number(value);
        } else if (setting.setting_type === 'json') {
          try {
            value = JSON.parse(value);
          } catch (e) {
            console.error('Error parsing JSON setting value:', e);
          }
        }
        return { ...acc, [setting.setting_key]: value };
      }, {});
      setLabSettings(prev => ({ ...prev, ...newLabSettings }));
      
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
      //missing authorization headers
      if (!labInfo || !labInfo.id) {
        const errorMsg = 'Lab information not loaded. Please wait until lab info is available.';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
      await axios.put(`${apiUrl}/labs/${labInfo.id}`, labData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
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
  //terminate old lab info
  const terminateLabInfo = () => {
    setLabInfo(null);
    setLabSettings({});
    setSubscriptionStatus(null);
    setLoading(false);
    setError(null);
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

  // Refresh lab data after subscription upgrade
  const refreshAfterUpgrade = async () => {
    await fetchLabInfo();
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
    refreshAfterUpgrade,
    isSubscriptionActive,
    isOnTrial,
    refreshLabData,
    terminateLabInfo,
    
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