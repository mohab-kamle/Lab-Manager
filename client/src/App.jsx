import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getSubdomain } from './utils/subdomain';
import { AuthProvider } from './context/AuthContext';
import { LabProvider } from './context/LabContext';
import { ToastContainer } from 'react-toastify';
import { ToastProvider } from './components/ui/ToastContext';
import 'react-toastify/dist/ReactToastify.css';
import LoadingSpinner from './components/ui/LoadingSpinner';
import PageTransition from './components/layout/PageTransition';

import './App.css';

// Components
import MainNavBar from './components/layout/MainNavBar';
const UnifiedLogin = lazy(() => import('./pages/auth/UnifiedLogin'));
const LabRoutes = lazy(() => import('./LabRoutes'));
const HomePage = lazy(() => import('./pages/home/HomePage'));
const Register = lazy(() => import('./pages/auth/Register'));
const ChangePassword = lazy(() => import('./pages/auth/ChangePassword'));
const PaymentCallback = lazy(() => import('./pages/payment/PaymentCallback'));
import OTPVerify from './pages/auth/OTPVerify';
const KnowUs = lazy(() => import('./pages/info/KnowUs'));

import { useAuth } from './context/AuthContext';

function App() {
  const subdomain = getSubdomain();
  const { user, loading } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('auth_token');
    if (token) {
      localStorage.setItem('token', token);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Force reload to ensure all contexts pick up the new token cleanly
      window.location.reload();
    }
  }, []);

  // Show loading spinner while auth and lab context is initializing
  // This prevents the login screen from flashing for authenticated users
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <ToastProvider>
      <Router>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
        <MainNavBar />
        <Suspense fallback={<LoadingSpinner />}>
          {/* IF NO SUBDOMAIN: Show Public Landing Site */}
          {!subdomain ? (
            <Routes>
              <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
              <Route path="/login" element={user ? <Navigate to={`/${user.role}/dashboard`} replace /> : <PageTransition><UnifiedLogin /></PageTransition>} />
              <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
              <Route path="/change-password" element={<PageTransition><ChangePassword /></PageTransition>} />
              <Route path="/otp-verify" element={<PageTransition><OTPVerify /></PageTransition>} />
              <Route path="/payment-callback" element={<PageTransition><PaymentCallback /></PageTransition>} />
              <Route path="/know-us" element={<PageTransition><KnowUs /></PageTransition>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          ) : (
            <Routes>
              <Route path="/change-password" element={<PageTransition><ChangePassword /></PageTransition>} />
              <Route path="/" element={<Navigate to={user ? `/${user.role}/dashboard` : "/login"} replace />} />
              <Route path="/login" element={user ? <Navigate to={`/${user.role}/dashboard`} replace /> : <PageTransition><UnifiedLogin /></PageTransition>} />
              <Route path="/otp-verify" element={<PageTransition><OTPVerify /></PageTransition>} />
              <Route path="/*" element={<LabRoutes />} />
            </Routes>
          )}
        </Suspense>
      </Router>
    </ToastProvider>
  );
}

export default App;
