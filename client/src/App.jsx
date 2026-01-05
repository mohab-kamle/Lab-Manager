import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LabProvider } from './context/LabContext';
import PrivateRoute from './components/auth/PrivateRoute';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Lab-specific components
import LabLayout from './components/layout/LabLayout';
// import LabRoutes from './LabRoutes'; // Unused
import MainNavBar from './components/layout/MainNavBar';

import './App.css';

// Lazy loaded Pages
const HomePage = lazy(() => import('./pages/home/HomePage'));
const UnifiedLogin = lazy(() => import('./pages/auth/UnifiedLogin'));
const Register = lazy(() => import('./pages/auth/Register'));
const PaymentCallback = lazy(() => import('./pages/payment/PaymentCallback'));
const ChangePassword = lazy(() => import('./pages/auth/ChangePassword'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminProfile = lazy(() => import('./pages/admin/AdminProfile'));
const ChemistDashboard = lazy(() => import('./pages/chemist/ChemistDashboard'));
const DoctorDashboard = lazy(() => import('./pages/doctor/DoctorDashboard'));
const EmployeeDashboard = lazy(() => import('./pages/employee/EmployeeDashboard'));
const PatientDashboard = lazy(() => import('./pages/patient/PatientDashboard'));
const ReceptionistDashboard = lazy(() => import('./pages/receptionist/ReceptionistDashboard'));
const LabManagement = lazy(() => import('./pages/lab/LabManagement'));
const PatientsAdminView = lazy(() => import('./pages/admin/PatientsAdminView'));
const PatientsAnalytics = lazy(() => import('./pages/admin/PatientsAnalytics'));
const PatientProfile = lazy(() => import('./pages/patient/PatientProfile'));
const PatientUpdateProfile = lazy(() => import('./pages/patient/PatientUpdateProfile'));
const PatientReports = lazy(() => import('./pages/reports/PatientReports'));
const MedicalReports = lazy(() => import('./pages/reports/MedicalReports'));
const Invoices = lazy(() => import('./pages/invoices/Invoices'));
const Tests = lazy(() => import('./pages/tests/Tests'));
const TestGroups = lazy(() => import('./pages/tests/TestGroups'));
const TestGroupEditor = lazy(() => import('./pages/tests/TestGroupEditor'));
const TestGroupComponents = lazy(() => import('./pages/tests/TestGroupComponents'));
const TestGroupCategories = lazy(() => import('./pages/tests/TestGroupCategories'));
const Cultures = lazy(() => import('./pages/tests/Cultures'));
const CultureOptions = lazy(() => import('./pages/tests/CultureOptions'));
const Antibiotics = lazy(() => import('./pages/tests/Antibiotics'));
const Categories = lazy(() => import('./pages/tests/Categories'));
const SampleType = lazy(() => import('./pages/tests/SampleType'));
const Diseases = lazy(() => import('./pages/tests/Diseases'));
const Branches = lazy(() => import('./pages/branches/Branches'));
const EmployeeManagement = lazy(() => import('./pages/branches/EmployeeManagement'));
const PaymentMethods = lazy(() => import('./pages/invoices/PaymentMethods'));
const PackagesAndOffers = lazy(() => import('./pages/packages/PackagesAndOffers'));
const KnowUs = lazy(() => import('./pages/info/KnowUs'));
const ErrorPage = lazy(() => import('./components/error/ErrorPage'));

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
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
          <Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
              <LoadingSpinner />
            </div>
          }>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<UnifiedLogin />} />
              <Route path="/register" element={<Register />} />
              <Route path="/change-password" element={<ChangePassword />} />
              <Route path="/payment-callback" element={<PaymentCallback />} />
              <Route path="/know-us" element={<KnowUs />} />

              {/* Lab-specific routes (multi-tenant, all under /:lab/*) */}
              <Route path=":lab/*" element={
                <LabProvider>
                  <LabLayout />
                </LabProvider>
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
                <Route path="invoices" element={<PrivateRoute allowedRoles={['admin', 'receptionist']}><Invoices /></PrivateRoute>} />
                {/* Catch all for lab routes */}
                <Route path="*" element={<ErrorPage />} />
              </Route>

              {/* Catch all */}
              <Route path="*" element={<ErrorPage />} />
            </Routes>
          </Suspense>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
