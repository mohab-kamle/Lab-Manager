import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Container, Alert, Spinner } from 'react-bootstrap';
import { useLab } from '../../context/LabContext';
import { useAuth } from '../../context/AuthContext';
import MainNavBar from './MainNavBar';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import FloatingBackToTopButton from '../../components/ui/FloatingBackToTopButton';
import { socket } from '../../utils/socket';
import { useToast } from '../ui/ToastContext';

const LabLayout = () => {
  const { toast } = useToast();
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

      // Helper: dispatch a custom event so the navbar bell can refresh its count
      const notifyBell = () => {
        window.dispatchEvent(new CustomEvent('inventory-notification-update'));
      };

      // --- LOW STOCK ---
      const handleLowStockAlert = (data) => {
        toast.error(
          <div onClick={() => navigate(`/${user.role}/inventory/items/${data.item_id}/batches`)} style={{ cursor: "pointer" }}>
            <strong>Low Stock Alert: {data.item_name}</strong>
            <br />
            {data.message}
            <br />
            <span className="text-decoration-underline mt-1 d-inline-block">Click to view</span>
          </div>,
          { duration: 0, clickToClose: true, showCloseBtn: true }
        );
        notifyBell();
      };

      // --- EXPIRING SOON ---
      const handleExpiringSoonAlert = (data) => {
        toast.warning(
          <div onClick={() => navigate(`/${user.role}/inventory/items/${data.item_id}/batches`)} style={{ cursor: "pointer" }}>
            <strong>Expiring Soon: {data.item_name}</strong>
            <br />
            {data.message}
            <br />
            <span className="text-decoration-underline mt-1 d-inline-block">Click to view</span>
          </div>,
          { duration: 10000, clickToClose: true, showCloseBtn: true }
        );
        notifyBell();
      };

      // --- EXPIRED ---
      const handleExpiredAlert = (data) => {
        toast.error(
          <div onClick={() => navigate(`/${user.role}/inventory/items/${data.item_id}/batches`)} style={{ cursor: "pointer" }}>
            <strong>Expired: {data.item_name}</strong>
            <br />
            {data.message}
            <br />
            <span className="text-decoration-underline mt-1 d-inline-block">Click to view</span>
          </div>,
          { duration: 0, clickToClose: true, showCloseBtn: true }
        );
        notifyBell();
      };

      socket.on("low_stock_alert", handleLowStockAlert);
      socket.on("expiring_soon_alert", handleExpiringSoonAlert);
      socket.on("expired_alert", handleExpiredAlert);

      return () => {
        socket.off("low_stock_alert", handleLowStockAlert);
        socket.off("expiring_soon_alert", handleExpiringSoonAlert);
        socket.off("expired_alert", handleExpiredAlert);
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