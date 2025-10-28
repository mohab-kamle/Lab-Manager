import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLab } from '../context/LabContext';
import LoadingSpinner from './ui/LoadingSpinner';
import TenantNotFound from './auth/TenantNotFound';
import SubscriptionExpired from './auth/SubscriptionExpired';

const TenantRouter = ({ children }) => {
  const [currentTenant, setCurrentTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tenantError, setTenantError] = useState(null);
  const { user } = useAuth();
  const { labInfo, subscriptionStatus, isTrialExpired, isSubscriptionActive } = useLab();

  useEffect(() => {
    const detectTenant = async () => {
      try {
        const hostname = window.location.hostname;
        const subdomain = hostname.split('.')[0];
        
        // Skip for localhost development
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          setCurrentTenant({ subdomain: 'default', isLocal: true });
          setLoading(false);
          return;
        }

        // Extract tenant from subdomain
        if (subdomain && subdomain !== 'www') {
          setCurrentTenant({ subdomain, isLocal: false });
        } else {
          setTenantError('No tenant subdomain detected');
        }
      } catch (error) {
        setTenantError('Error detecting tenant');
        console.error('Tenant detection error:', error);
      } finally {
        setLoading(false);
      }
    };

    detectTenant();
  }, []);

  // Check subscription status
  const checkSubscriptionAccess = () => {
    if (!labInfo || !subscriptionStatus) return true; // Allow access while loading
    
    // Allow access if subscription is active
    if (isSubscriptionActive()) return true;
    
    // Allow access if on trial and not expired
    if (!isTrialExpired()) return true;
    
    // Block access if trial expired and no active subscription
    return false;
  };

  if (loading) {
    return <LoadingSpinner message="Detecting lab..." />;
  }

  if (tenantError) {
    return <TenantNotFound error={tenantError} />;
  }

  // Check subscription access
  if (!checkSubscriptionAccess()) {
    return <SubscriptionExpired />;
  }

  return (
    <div className={`tenant-${currentTenant?.subdomain || 'default'}`}>
      {children}
    </div>
  );
};

export default TenantRouter;