import React from 'react';
import './TenantNotFound.css';

const TenantNotFound = ({ error }) => {
  return (
    <div className="tenant-not-found">
      <div className="error-container">
        <div className="error-icon">🏥</div>
        <h1>Lab Not Found</h1>
        <p className="error-message">
          {error || "The laboratory you're looking for doesn't exist or is not accessible."}
        </p>
        <div className="error-actions">
          <p>Please check the URL or contact your administrator.</p>
          <button 
            className="btn-primary"
            onClick={() => window.location.href = 'https://labmanager.com'}
          >
            Go to Main Site
          </button>
        </div>
      </div>
    </div>
  );
};

export default TenantNotFound; 