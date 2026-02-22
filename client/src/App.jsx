import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getSubdomain } from './utils/subdomain';
import { AuthProvider } from './context/AuthContext';
import { LabProvider } from './context/LabContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoadingSpinner from './components/ui/LoadingSpinner';
import PageTransition from './components/layout/PageTransition';

import './App.css';

// Components
import MainNavBar from './components/layout/MainNavBar';
import UnifiedLogin from './pages/auth/UnifiedLogin';
import LabRoutes from './LabRoutes';
import HomePage from './pages/home/HomePage';
import Register from './pages/auth/Register';
import ChangePassword from './pages/auth/ChangePassword';
import PaymentCallback from './pages/payment/PaymentCallback';
import KnowUs from './pages/info/KnowUs';

import { useAuth } from './context/AuthContext';

function App() {
  const subdomain = getSubdomain();
  const { user, loading } = useAuth();
  
  // Show loading spinner while auth and lab context is initializing
  // This prevents the login screen from flashing for authenticated users
  if (loading) {
     return <LoadingSpinner />;
  }

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

  return (
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
                 <Route path="/payment-callback" element={<PageTransition><PaymentCallback /></PageTransition>} />
                 <Route path="/know-us" element={<PageTransition><KnowUs /></PageTransition>} />
                 <Route path="*" element={<Navigate to="/" />} />
               </Routes>
             ) : (
               <Routes>
                 <Route path="/" element={<Navigate to={user ? `/${user.role}/dashboard` : "/login"} replace />} />
                 <Route path="/login" element={user ? <Navigate to={`/${user.role}/dashboard`} replace /> : <UnifiedLogin />} />
                 <Route path="/*" element={<LabRoutes />} />
               </Routes>
             )}
           </Suspense>
    </Router>
  );
}

export default App;
