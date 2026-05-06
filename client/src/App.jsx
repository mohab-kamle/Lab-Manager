import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getSubdomain } from './utils/subdomain';
import { ToastProvider } from './components/ui/ToastContext';

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
const ToastTestPage = lazy(() => import('./pages/test/ToastTestPage'));

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

        <div id="scroll-sentinel" style={{ position: 'absolute', top: 0, height: '1px', width: '1px', pointerEvents: 'none' }}></div>
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
              <Route path="/toast-test" element={<PageTransition><ToastTestPage /></PageTransition>} />
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
