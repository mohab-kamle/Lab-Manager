import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LabProvider } from './context/LabContext';
import PrivateRoute from './helpers/PrivateRoute';

// Pages
import HomePage from './pages/HomePage';
import UnifiedLogin from './pages/UnifiedLogin';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import ChemistDashboard from './pages/ChemistDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import PatientDashboard from './pages/PatientDashboard';
import ReceptionistDashboard from './pages/ReceptionistDashboard';
import LabManagement from './pages/LabManagement';
import PatientsAdminView from './pages/PatientsAdminView';
import PatientsAnalytics from './pages/PatientsAnalytics';
import PatientProfile from './pages/PatientProfile';
import PatientUpdateProfile from './pages/PatientUpdateProfile';
import PatientReports from './pages/PatientReports';
import MedicalReports from './pages/MedicalReports';
import Invoices from './pages/Invoices';
import Tests from './pages/Tests';
import TestGroups from './pages/TestGroups';
import TestGroupEditor from './pages/TestGroupEditor';
import TestGroupComponents from './pages/TestGroupComponents';
import TestGroupCategories from './pages/TestGroupCategories';
import Cultures from './pages/Cultures';
import CultureOptions from './pages/CultureOptions';
import Antibiotics from './pages/Antibiotics';
import Categories from './pages/Categories';
import SampleType from './pages/SampleType';
import Diseases from './pages/Diseases';
import Branches from './pages/Branches';
import EmployeeManagement from './pages/EmployeeManagement';
import PaymentMethods from './pages/PaymentMethods';
import PackagesAndOffers from './pages/PackagesAndOffers';
import KnowUs from './pages/KnowUs';
import ErrorPage from './components/ErrorPage';

// Lab-specific components
import LabLayout from './components/LabLayout';
import LabRoutes from './LabRoutes';
import MainNavBar from './components/MainNavBar';
import SecondaryNavBar from './components/SecondaryNavBar';

import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <MainNavBar />
          <SecondaryNavBar />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<UnifiedLogin />} />
            <Route path="/register" element={<Register />} />
            <Route path="/know-us" element={<KnowUs />} />
            
            {/* Lab-specific routes (multi-tenant, all under /:lab/*) */}
            <Route path=":lab/*" element={
              <LabProvider>
                <LabLayout />
              </LabProvider>
            }>
              <Route index element={<Navigate to="dashboard" replace />} />
              {/* Admin routes */}
              <Route path="admin/dashboard" element={<PrivateRoute allowedRoles={['admin']}><AdminDashboard /></PrivateRoute>} />
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
              <Route path="chemist-dashboard" element={<PrivateRoute allowedRoles={['chemist']}><ChemistDashboard /></PrivateRoute>} />
              {/* Doctor routes */}
              <Route path="doctor-dashboard" element={<PrivateRoute allowedRoles={['doctor']}><DoctorDashboard /></PrivateRoute>} />
              {/* Employee routes */}
              <Route path="employee-dashboard" element={<PrivateRoute allowedRoles={['employee']}><EmployeeDashboard /></PrivateRoute>} />
              {/* Patient routes */}
              <Route path="patient-dashboard" element={<PrivateRoute allowedRoles={['patient']}><PatientDashboard /></PrivateRoute>} />
              <Route path="patient/profile" element={<PrivateRoute allowedRoles={['patient']}><PatientProfile /></PrivateRoute>} />
              <Route path="patient/profile/edit" element={<PrivateRoute allowedRoles={['patient']}><PatientUpdateProfile /></PrivateRoute>} />
              <Route path="patient/reports" element={<PrivateRoute allowedRoles={['patient']}><PatientReports /></PrivateRoute>} />
              {/* Receptionist routes */}
              <Route path="receptionist-dashboard" element={<PrivateRoute allowedRoles={['receptionist']}><ReceptionistDashboard /></PrivateRoute>} />
              {/* Shared routes */}
              <Route path="medical-reports" element={<PrivateRoute allowedRoles={['admin', 'doctor', 'chemist', 'employee', 'receptionist']}><MedicalReports /></PrivateRoute>} />
              <Route path="invoices" element={<PrivateRoute allowedRoles={['admin', 'receptionist']}><Invoices /></PrivateRoute>} />
              {/* Catch all for lab routes */}
              <Route path="*" element={<ErrorPage />} />
            </Route>
            
            {/* Catch all */}
            <Route path="*" element={<ErrorPage />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
