import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { LabProvider } from './context/LabContext';
import PrivateRoute from './components/auth/PrivateRoute';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PageTransition from './components/layout/PageTransition';
import LoadingSpinner from './components/ui/LoadingSpinner';
import SkipToContent from './components/ui/SkipToContent';

// Pages - Lazy Loaded
const HomePage = React.lazy(() => import('./pages/home/HomePage'));
const UnifiedLogin = React.lazy(() => import('./pages/auth/UnifiedLogin'));
const Register = React.lazy(() => import('./pages/auth/Register'));
const PaymentCallback = React.lazy(() => import('./pages/payment/PaymentCallback'));
const ChangePassword = React.lazy(() => import('./pages/auth/ChangePassword'));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const AdminProfile = React.lazy(() => import('./pages/admin/AdminProfile'));
const ChemistDashboard = React.lazy(() => import('./pages/chemist/ChemistDashboard'));
const DoctorDashboard = React.lazy(() => import('./pages/doctor/DoctorDashboard'));
const EmployeeDashboard = React.lazy(() => import('./pages/employee/EmployeeDashboard'));
const PatientDashboard = React.lazy(() => import('./pages/patient/PatientDashboard'));
const ReceptionistDashboard = React.lazy(() => import('./pages/receptionist/ReceptionistDashboard'));
const LabManagement = React.lazy(() => import('./pages/lab/LabManagement'));
const PatientsAdminView = React.lazy(() => import('./pages/admin/PatientsAdminView'));
const PatientsAnalytics = React.lazy(() => import('./pages/admin/PatientsAnalytics'));
const PatientProfile = React.lazy(() => import('./pages/patient/PatientProfile'));
const PatientUpdateProfile = React.lazy(() => import('./pages/patient/PatientUpdateProfile'));
const PatientReports = React.lazy(() => import('./pages/reports/PatientReports'));
const MedicalReports = React.lazy(() => import('./pages/reports/MedicalReports'));
const Invoices = React.lazy(() => import('./pages/invoices/Invoices'));
const Tests = React.lazy(() => import('./pages/tests/Tests'));
const TestGroups = React.lazy(() => import('./pages/tests/TestGroups'));
const TestGroupEditor = React.lazy(() => import('./pages/tests/TestGroupEditor'));
const TestGroupComponents = React.lazy(() => import('./pages/tests/TestGroupComponents'));
const TestGroupCategories = React.lazy(() => import('./pages/tests/TestGroupCategories'));
const Cultures = React.lazy(() => import('./pages/tests/Cultures'));
const CultureOptions = React.lazy(() => import('./pages/tests/CultureOptions'));
const Antibiotics = React.lazy(() => import('./pages/tests/Antibiotics'));
const Categories = React.lazy(() => import('./pages/tests/Categories'));
const SampleType = React.lazy(() => import('./pages/tests/SampleType'));
const Diseases = React.lazy(() => import('./pages/tests/Diseases'));
const Branches = React.lazy(() => import('./pages/branches/Branches'));
const EmployeeManagement = React.lazy(() => import('./pages/branches/EmployeeManagement'));
const PaymentMethods = React.lazy(() => import('./pages/invoices/PaymentMethods'));
const PackagesAndOffers = React.lazy(() => import('./pages/packages/PackagesAndOffers'));
const KnowUs = React.lazy(() => import('./pages/info/KnowUs'));
const ErrorPage = React.lazy(() => import('./components/error/ErrorPage'));

// Lab-specific components
import LabLayout from './components/layout/LabLayout';
import MainNavBar from './components/layout/MainNavBar';

import './App.css';

function AppContent() {
  const location = useLocation();

  return (
    <div className="App">
      <SkipToContent />
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
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* Public routes */}
            <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
            <Route path="/login" element={<PageTransition><UnifiedLogin /></PageTransition>} />
            <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
            <Route path="/change-password" element={<PageTransition><ChangePassword /></PageTransition>} />
            <Route path="/payment-callback" element={<PageTransition><PaymentCallback /></PageTransition>} />
            <Route path="/know-us" element={<PageTransition><KnowUs /></PageTransition>} />

            {/* Lab-specific routes (multi-tenant, all under /:lab/*) */}
            <Route path=":lab/*" element={
              <PageTransition>
                <LabProvider>
                  <LabLayout />
                </LabProvider>
              </PageTransition>
            }>
              <Route index element={<Navigate to="dashboard" replace />} />
              {/* Account routes (accessible to all authenticated roles) */}
              <Route
                path="account/change-password"
                element={
                  <PrivateRoute allowedRoles={["admin", "receptionist", "chemist", "doctor", "employee", "patient"]}>
                    <ChangePassword />
                  </PrivateRoute>
                }
              />
              {/* Admin routes */}
              <Route path="admin/dashboard" element={<PrivateRoute allowedRoles={['admin']}><AdminDashboard /></PrivateRoute>} />
              <Route path="admin/dashboard/profile" element={<PrivateRoute allowedRoles={['admin']}><AdminProfile /></PrivateRoute>} />
              <Route path="admin/lab-management" element={<PrivateRoute allowedRoles={['admin']}><LabManagement /></PrivateRoute>} />
              <Route path="admin/patients" element={<PrivateRoute allowedRoles={['admin']}><PatientsAdminView /></PrivateRoute>} />
              <Route path="admin/patients/analytics" element={<PrivateRoute allowedRoles={['admin']}><PatientsAnalytics /></PrivateRoute>} />
              <Route path="admin/know-us" element={<PrivateRoute allowedRoles={['admin']}><KnowUs /></PrivateRoute>} />
              <Route path="admin/tests" element={<PrivateRoute allowedRoles={['admin']}><Tests /></PrivateRoute>} />
              <Route path="admin/test-groups" element={<PrivateRoute allowedRoles={['admin']}><TestGroups /></PrivateRoute>} />
              <Route path="admin/test-groups/:id/edit" element={<PrivateRoute allowedRoles={['admin']}><TestGroupEditor /></PrivateRoute>} />
              <Route path="admin/test-groups/:id/components" element={<PrivateRoute allowedRoles={['admin']}><TestGroupComponents /></PrivateRoute>} />
              <Route path="admin/test-group-categories" element={<PrivateRoute allowedRoles={['admin']}><TestGroupCategories /></PrivateRoute>} />
              <Route path="admin/test-group-components" element={<PrivateRoute allowedRoles={['admin']}><TestGroupComponents /></PrivateRoute>} />
              <Route path="admin/cultures" element={<PrivateRoute allowedRoles={['admin']}><Cultures /></PrivateRoute>} />
              <Route path="admin/culture-options" element={<PrivateRoute allowedRoles={['admin']}><CultureOptions /></PrivateRoute>} />
              <Route path="admin/antibiotics" element={<PrivateRoute allowedRoles={['admin']}><Antibiotics /></PrivateRoute>} />
              <Route path="admin/categories" element={<PrivateRoute allowedRoles={['admin']}><Categories /></PrivateRoute>} />
              <Route path="admin/sample-types" element={<PrivateRoute allowedRoles={['admin']}><SampleType /></PrivateRoute>} />
              <Route path="admin/diseases" element={<PrivateRoute allowedRoles={['admin']}><Diseases /></PrivateRoute>} />
              <Route path="admin/branches" element={<PrivateRoute allowedRoles={['admin']}><Branches /></PrivateRoute>} />
              <Route path="admin/employees" element={<PrivateRoute allowedRoles={['admin']}><EmployeeManagement /></PrivateRoute>} />
              <Route path="admin/payment-methods" element={<PrivateRoute allowedRoles={['admin']}><PaymentMethods /></PrivateRoute>} />
              <Route path="admin/packages-offers" element={<PrivateRoute allowedRoles={['admin']}><PackagesAndOffers /></PrivateRoute>} />
              <Route path="admin/medical-reports" element={<PrivateRoute allowedRoles={['admin']}><MedicalReports /></PrivateRoute>} />
              <Route path="admin/invoices" element={<PrivateRoute allowedRoles={['admin']}><Invoices /></PrivateRoute>} />
              {/* Chemist routes */}
              <Route path="chemist/dashboard" element={<PrivateRoute allowedRoles={['chemist']}><ChemistDashboard /></PrivateRoute>} />
              <Route path="chemist/test-groups" element={<PrivateRoute allowedRoles={['chemist']}><TestGroups /></PrivateRoute>} />
              <Route path="chemist/test-groups/:id/edit" element={<PrivateRoute allowedRoles={['chemist']}><TestGroupEditor /></PrivateRoute>} />
              <Route path="chemist/test-groups/:id/components" element={<PrivateRoute allowedRoles={['chemist']}><TestGroupComponents /></PrivateRoute>} />
              <Route path="chemist/test-group-categories" element={<PrivateRoute allowedRoles={['chemist']}><TestGroupCategories /></PrivateRoute>} />
              <Route path="chemist/test-group-components" element={<PrivateRoute allowedRoles={['chemist']}><TestGroupComponents /></PrivateRoute>} />
              <Route path="chemist/categories" element={<PrivateRoute allowedRoles={['chemist']}><Categories /></PrivateRoute>} />
              <Route path="chemist/tests" element={<PrivateRoute allowedRoles={['chemist']}><Tests /></PrivateRoute>} />
              <Route path="chemist/sample-types" element={<PrivateRoute allowedRoles={['chemist']}><SampleType /></PrivateRoute>} />
              <Route path="chemist/culture-options" element={<PrivateRoute allowedRoles={['chemist']}><CultureOptions /></PrivateRoute>} />
              <Route path="chemist/antibiotics" element={<PrivateRoute allowedRoles={['chemist']}><Antibiotics /></PrivateRoute>} />
              <Route path="chemist/packages-offers" element={<PrivateRoute allowedRoles={['chemist']}><PackagesAndOffers /></PrivateRoute>} />
              <Route path="chemist/cultures" element={<PrivateRoute allowedRoles={['chemist']}><Cultures /></PrivateRoute>} />
              <Route path="chemist/diseases" element={<PrivateRoute allowedRoles={['chemist']}><Diseases /></PrivateRoute>} />
              <Route path="chemist/medical-reports" element={<PrivateRoute allowedRoles={['chemist']}><MedicalReports /></PrivateRoute>} />
              {/* Doctor routes */}
              <Route path="doctor/dashboard" element={<PrivateRoute allowedRoles={['doctor']}><DoctorDashboard /></PrivateRoute>} />
              <Route path="doctor/medical-reports" element={<PrivateRoute allowedRoles={['doctor']}><MedicalReports /></PrivateRoute>} />
              {/* Employee routes */}
              <Route path="employee/dashboard" element={<PrivateRoute allowedRoles={['employee']}><EmployeeDashboard /></PrivateRoute>} />
              <Route path="employee/categories" element={<PrivateRoute allowedRoles={['employee']}><Categories /></PrivateRoute>} />
              <Route path="employee/tests" element={<PrivateRoute allowedRoles={['employee']}><Tests /></PrivateRoute>} />
              <Route path="employee/sample-types" element={<PrivateRoute allowedRoles={['employee']}><SampleType /></PrivateRoute>} />
              <Route path="employee/culture-options" element={<PrivateRoute allowedRoles={['employee']}><CultureOptions /></PrivateRoute>} />
              <Route path="employee/antibiotics" element={<PrivateRoute allowedRoles={['employee']}><Antibiotics /></PrivateRoute>} />
              <Route path="employee/packages-offers" element={<PrivateRoute allowedRoles={['employee']}><PackagesAndOffers /></PrivateRoute>} />
              <Route path="employee/cultures" element={<PrivateRoute allowedRoles={['employee']}><Cultures /></PrivateRoute>} />
              <Route path="employee/diseases" element={<PrivateRoute allowedRoles={['employee']}><Diseases /></PrivateRoute>} />
              <Route path="employee/medical-reports" element={<PrivateRoute allowedRoles={['employee']}><MedicalReports /></PrivateRoute>} />
              {/* Patient routes */}
              <Route path="patient/dashboard" element={<PrivateRoute allowedRoles={['patient']}><PatientDashboard /></PrivateRoute>} />
              <Route path="patient/profile" element={<PrivateRoute allowedRoles={['patient']}><PatientProfile /></PrivateRoute>} />
              <Route path="patient/profile/update" element={<PrivateRoute allowedRoles={['patient']}><PatientUpdateProfile /></PrivateRoute>} />
              <Route path="patient/reports" element={<PrivateRoute allowedRoles={['patient']}><PatientReports /></PrivateRoute>} />
              {/* Receptionist routes */}
              <Route path="receptionist/test-groups" element={<PrivateRoute allowedRoles={['receptionist']}><TestGroups /></PrivateRoute>} />
              <Route path="receptionist/test-groups/:id/edit" element={<PrivateRoute allowedRoles={['receptionist']}><TestGroupEditor /></PrivateRoute>} />
              <Route path="receptionist/test-groups/:id/components" element={<PrivateRoute allowedRoles={['receptionist']}><TestGroupComponents /></PrivateRoute>} />
              <Route path="receptionist/test-group-categories" element={<PrivateRoute allowedRoles={['receptionist']}><TestGroupCategories /></PrivateRoute>} />
              <Route path="receptionist/test-group-components" element={<PrivateRoute allowedRoles={['receptionist']}><TestGroupComponents /></PrivateRoute>} />
              <Route path="receptionist/dashboard" element={<PrivateRoute allowedRoles={['receptionist']}><ReceptionistDashboard /></PrivateRoute>} />
              <Route path="receptionist/invoices" element={<PrivateRoute allowedRoles={['receptionist']}><Invoices /></PrivateRoute>} />
              <Route path="receptionist/patients" element={<PrivateRoute allowedRoles={['receptionist']}><PatientsAdminView /></PrivateRoute>} />
              {/* <Route path="admin/patients/analytics" element={<PrivateRoute allowedRoles={['admin']}><PatientsAnalytics /></PrivateRoute>} /> */}
              <Route path="receptionist/medical-reports" element={<PrivateRoute allowedRoles={['receptionist']}><MedicalReports /></PrivateRoute>} />
              {/* Shared routes */}
              <Route path="medical-reports" element={<PrivateRoute allowedRoles={['admin', 'doctor', 'chemist', 'employee', 'receptionist']}><MedicalReports /></PrivateRoute>} />
              <Route path="invoices" element={<PrivateRoute allowedRoles={['admin', 'receptionist', 'employee']}><Invoices /></PrivateRoute>} />
              {/* Catch all for lab routes */}
              <Route path="*" element={<ErrorPage />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<PageTransition><ErrorPage /></PageTransition>} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
