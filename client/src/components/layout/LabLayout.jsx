import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Container, Alert, Spinner } from 'react-bootstrap';
import { useLab } from '../../context/LabContext';
import { useAuth } from '../../context/AuthContext';
import MainNavBar from './MainNavBar';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import FloatingBackToTopButton from '../../components/ui/FloatingBackToTopButton';
import { socket } from '../../utils/socket';
import { toast } from 'react-toastify';

const LabLayout = () => {
  const navigate = useNavigate();
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

  // Socket setup and real-time inventory alerts
  useEffect(() => {
    if (user?.lab_id && (user.role === 'admin' || user.role === 'chemist')) {
      socket.connect();
      socket.emit("join_lab", user.lab_id);

      const handleLowStockAlert = (data) => {
        toast.error(
          <div onClick={() => navigate(`/${user.role}/inventory/items/${data.item_id}/batches`)} style={{ cursor: "pointer" }}>
            <strong>Low Stock Alert: {data.item_name}</strong>
            <br />
            {data.message}
            <br />
            <span className="text-decoration-underline mt-1 d-inline-block">Click to reorder</span>
          </div>,
          { autoClose: false, closeOnClick: true, draggable: true, theme: "colored" }
        );
      };

      socket.on("low_stock_alert", handleLowStockAlert);

      return () => {
        socket.off("low_stock_alert", handleLowStockAlert);
        socket.disconnect();
      };
    }
  }, [user, navigate]);

  // Show loading spinner while fetching lab info
  if (loading) {
    return (
      <LoadingSpinner />
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
    <div className="lab-layout" style={{ '--lab-primary-color': primaryColor, paddingTop: '20px' }}>
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
        background: 'var(--primary)',
        boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)',
        border: 'none',
      }}>
        <Container>
          <p className="mb-0 text-white">
            © {new Date().getFullYear()} {labName} - Powered by LabManager
          </p>
        </Container>
      </footer>
      <FloatingBackToTopButton />
    </div>
  );
};

export default LabLayout; 