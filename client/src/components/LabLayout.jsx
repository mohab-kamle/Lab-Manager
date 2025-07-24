import React from 'react';
import { Outlet } from 'react-router-dom';
import { Container, Alert, Spinner } from 'react-bootstrap';
import { useLab } from '../context/LabContext';
import { useAuth } from '../context/AuthContext';
import MainNavBar from './MainNavBar';
import SecondaryNavBar from './SecondaryNavBar';

const LabLayout = () => {
  const { 
    labInfo, 
    loading, 
    error, 
    isTrialExpired, 
    isInTrial, 
    getTrialDaysLeft,
    primaryColor,
    labName 
  } = useLab();
  const { user } = useAuth();

  // Show loading spinner while fetching lab info
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  // Show error if lab not found or other error
  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Lab</Alert.Heading>
          <p>{error}</p>
          <p>Please check the URL or contact support if the problem persists.</p>
        </Alert>
      </Container>
    );
  }

  // Show error if lab not found
  if (!labInfo) {
    return (
      <Container className="mt-5">
        <Alert variant="warning">
          <Alert.Heading>Lab Not Found</Alert.Heading>
          <p>The lab you're looking for doesn't exist or is not active.</p>
        </Alert>
      </Container>
    );
  }

  return (
    <div className="lab-layout" style={{ '--lab-primary-color': primaryColor }}>
      {/* Trial status warnings */}
      {isInTrial() && (
        <Alert 
          variant={isTrialExpired() ? "danger" : "warning"} 
          className="mb-0 text-center"
          style={{ borderRadius: 0 }}
        >
          {isTrialExpired() ? (
            <>
              <strong>Trial Expired!</strong> Your trial period has ended. Please upgrade to continue using LabManager.
            </>
          ) : (
            <>
              <strong>Trial Account</strong> - {getTrialDaysLeft()} days remaining. 
              Upgrade now to continue using all features after your trial expires.
            </>
          )}
        </Alert>
      )}

      {/* Navbars now rendered globally in App.jsx */}

      {/* Main content */}
      <main className="lab-main-content">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="lab-footer text-center py-1 mt-2 justify-content-center align-items-center d-flex text-white"
      style={{
        background: 'linear-gradient(90deg, rgb(29, 73, 142) 0%, rgb(52, 152, 219) 100%)',
        boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)',
        border: 'none',
      }}>
        <Container>
          <p className="mb-0 text-white">
            © {new Date().getFullYear()} {labName} - Powered by LabManager
          </p>
        </Container>
      </footer>
    </div>
  );
};

export default LabLayout; 