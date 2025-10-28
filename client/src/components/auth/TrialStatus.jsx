import React from 'react';
import { useLab } from '../context/LabContext';
import { toast } from 'react-toastify';

const TrialStatus = () => {
  const { 
    subscriptionStatus, 
    isOnTrial, 
    isTrialExpired, 
    getTrialDaysRemaining, 
    isSubscriptionActive,
    upgradeSubscription 
  } = useLab();

  if (!subscriptionStatus) {
    return null;
  }

  const handleUpgrade = async () => {
    try {
      // This would typically open a payment modal or redirect to payment page
      toast.info('Upgrade functionality will be implemented soon!');
    } catch (error) {
      toast.error('Error processing upgrade request');
    }
  };

  if (isSubscriptionActive()) {
    return (
      <div className="alert alert-success d-flex align-items-center" role="alert">
        <i className="bi bi-check-circle-fill me-2"></i>
        <div>
          <strong>Active Subscription</strong>
          <br />
          <small>
            {subscriptionStatus.subscription?.duration} plan - 
            Expires: {new Date(subscriptionStatus.subscription?.end_date).toLocaleDateString()}
          </small>
        </div>
      </div>
    );
  }

  if (isTrialExpired()) {
    return (
      <div className="alert alert-danger d-flex align-items-center" role="alert">
        <i className="bi bi-exclamation-triangle-fill me-2"></i>
        <div>
          <strong>Trial Expired</strong>
          <br />
          <small>Your free trial has expired. Please upgrade to continue using the service.</small>
          <br />
          <button 
            className="btn btn-primary btn-sm mt-2"
            onClick={handleUpgrade}
          >
            Upgrade Now
          </button>
        </div>
      </div>
    );
  }

  if (isOnTrial()) {
    const daysRemaining = getTrialDaysRemaining();
    const isWarning = daysRemaining <= 3;
    
    return (
      <div className={`alert ${isWarning ? 'alert-warning' : 'alert-info'} d-flex align-items-center`} role="alert">
        <i className={`bi ${isWarning ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill'} me-2`}></i>
        <div>
          <strong>Free Trial</strong>
          <br />
          <small>
            {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining in your free trial
            {isWarning && ' - Upgrade soon to avoid service interruption!'}
          </small>
          <br />
          <button 
            className="btn btn-primary btn-sm mt-2"
            onClick={handleUpgrade}
          >
            Upgrade Now
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default TrialStatus; 