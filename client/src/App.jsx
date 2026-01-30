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

function App() {
  const subdomain = getSubdomain();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('auth_token');
    if (token) {
       localStorage.setItem('token', token);
       // Clean URL
       window.history.replaceState({}, document.title, window.location.pathname);
       // Force context reload if necessary
       window.location.reload(); 
    }
  }, []);

  return (
    <Router>
      <AuthProvider>
        <LabProvider>
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
                 <Route path="/login" element={<PageTransition><UnifiedLogin /></PageTransition>} />
                 <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
                 <Route path="/change-password" element={<PageTransition><ChangePassword /></PageTransition>} />
                 <Route path="/payment-callback" element={<PageTransition><PaymentCallback /></PageTransition>} />
                 <Route path="/know-us" element={<PageTransition><KnowUs /></PageTransition>} />
                 <Route path="*" element={<Navigate to="/" />} />
               </Routes>
             ) : (
               <Routes>
                 <Route path="/" element={<Navigate to="/login" replace />} />
                 <Route path="/login" element={<UnifiedLogin />} />
                 <Route path="/*" element={<LabRoutes />} />
               </Routes>
             )}
           </Suspense>
        </LabProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
