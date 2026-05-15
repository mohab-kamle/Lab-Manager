import React from 'react';
import { useLab } from '../context/LabContext';
import { formatDate } from '../../utils/dateFormatter';
import './SubscriptionExpired.css';

const SubscriptionExpired = () => {
  const { labInfo, subscriptionStatus, upgradeSubscription } = useLab();

  const handleUpgrade = async () => {
    try {
      // Redirect to upgrade page or handle upgrade flow
      window.location.href = '/upgrade-subscription';
    } catch (error) {
      console.error('Error handling upgrade:', error);
    }
  };

  return (
    <div className="subscription-expired">
      <div className="expired-container">
        <div className="expired-icon">⏰</div>
        <h1>Subscription Expired</h1>
        <p className="expired-message">
          Your trial period has ended. To continue using {labInfo?.name || 'the lab management system'}, 
          please upgrade your subscription.
        </p>
        
        {subscriptionStatus && (
          <div className="subscription-details">
            <p><strong>Current Status:</strong> {subscriptionStatus.subscription?.status}</p>
            {subscriptionStatus.subscription?.end_date && (
              <p><strong>Expired:</strong> {formatDate(subscriptionStatus.subscription.end_date)}</p>
            )}
          </div>
        )}
        
        <div className="expired-actions">
          <button className="btn-upgrade" onClick={handleUpgrade}>
            Upgrade Subscription
          </button>
          <button 
            className="btn-contact"
            onClick={() => window.location.href = 'mailto:support@labmanager.com'}
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionExpired; 