import React from 'react';
import { Container, Alert, Spinner } from 'react-bootstrap';
import { useLab } from '../context/LabContext';
import { useAuth } from '../context/AuthContext';
import MainNavBar from './MainNavBar';
import SecondaryNavBar from './SecondaryNavBar';

const LabLayout = ({ children }) => {
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

      {/* Main navigation */}
      <MainNavBar 
        labName={labName}
        user={user}
        isTrialExpired={isTrialExpired()}
        isInTrial={isInTrial()}
      />

      {/* Secondary navigation (if user is logged in) */}
      {user && <SecondaryNavBar userRole={user.role} />}

      {/* Main content */}
      <main className="lab-main-content">
        {children}
      </main>

      {/* Footer */}
      <footer className="lab-footer text-center py-3 mt-5">
        <Container>
          <p className="mb-0 text-muted">
            © {new Date().getFullYear()} {labName} - Powered by LabManager
          </p>
        </Container>
      </footer>
    </div>
  );
};

export default LabLayout; 