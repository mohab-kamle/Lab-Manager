import React, { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/auth/PrivateRoute';

// Dashboards
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ReceptionistDashboard = lazy(() => import('./pages/receptionist/ReceptionistDashboard'));
const ChemistDashboard = lazy(() => import('./pages/chemist/ChemistDashboard'));
const DoctorDashboard = lazy(() => import('./pages/doctor/DoctorDashboard'));
const EmployeeDashboard = lazy(() => import('./pages/employee/EmployeeDashboard'));
const PatientDashboard = lazy(() => import('./pages/patient/PatientDashboard'));

// Patient pages
const PatientReports = lazy(() => import('./pages/reports/PatientReports'));
const PatientProfile = lazy(() => import('./pages/patient/PatientProfile'));
const PatientUpdateProfile = lazy(() => import('./pages/patient/PatientUpdateProfile'));

// Admin shared pages
const Categories = lazy(() => import('./pages/tests/Categories'));
const Tests = lazy(() => import('./pages/tests/Tests'));
const SampleType = lazy(() => import('./pages/tests/SampleType'));
const Cultures = lazy(() => import('./pages/tests/Cultures'));
const CultureOptions = lazy(() => import('./pages/tests/CultureOptions'));
const Antibiotics = lazy(() => import('./pages/tests/Antibiotics'));
const Diseases = lazy(() => import('./pages/tests/Diseases'));
const TestGroups = lazy(() => import('./pages/tests/TestGroups'));
const TestGroupCategories = lazy(() => import('./pages/tests/TestGroupCategories'));
const TestGroupComponents = lazy(() => import('./pages/tests/TestGroupComponents'));
const Invoices = lazy(() => import('./pages/invoices/Invoices'));
const PaymentMethods = lazy(() => import('./pages/invoices/PaymentMethods'));
const Branches = lazy(() => import('./pages/branches/Branches'));
const PackagesAndOffers = lazy(() => import('./pages/packages/PackagesAndOffers'));
const PatientsAdminView = lazy(() => import('./pages/admin/PatientsAdminView'));
const PatientsAnalytics = lazy(() => import('./pages/admin/PatientsAnalytics'));
const KnowUs = lazy(() => import('./pages/info/KnowUs'));
const MedicalReports = lazy(() => import('./pages/reports/MedicalReports'));
const EmployeeManagement = lazy(() => import('./pages/branches/EmployeeManagement'));
const LabManagement = lazy(() => import('./pages/lab/LabManagement'));
const AdminProfile = lazy(() => import('./pages/admin/AdminProfile'));
const Vault = lazy(() => import('./pages/admin/Vault'));
const TurnaroundTime = lazy(() => import('./pages/admin/TurnaroundTime'));

import LabLayout from './components/layout/LabLayout';

const LabRoutes = () => (
  <Routes>
    <Route element={<LabLayout />}>
      {/* Patient routes */}
      <Route
        path="/patient/dashboard"
        element={<PrivateRoute element={<PatientDashboard />} allowedRoles={["patient"]} />}
      />
      <Route
        path="/patient/reports"
        element={<PrivateRoute element={<PatientReports />} allowedRoles={["patient"]} />}
      />
      <Route
        path="/patient/profile"
        element={<PrivateRoute element={<PatientProfile />} allowedRoles={["patient"]} />}
      />
      <Route
        path="/patient/profile/update"
        element={<PrivateRoute element={<PatientUpdateProfile />} allowedRoles={["patient"]} />}
      />

      {/* Role dashboards */}
      <Route
        path="/admin/dashboard"
        element={<PrivateRoute element={<AdminDashboard />} allowedRoles={["admin"]} />}
      />
      <Route
        path="/receptionist/dashboard"
        element={<PrivateRoute element={<ReceptionistDashboard />} allowedRoles={["receptionist"]} />}
      />
      <Route
        path="/chemist/dashboard"
        element={<PrivateRoute element={<ChemistDashboard />} allowedRoles={["chemist"]} />}
      />
      <Route
        path="/doctor/dashboard"
        element={<PrivateRoute element={<DoctorDashboard />} allowedRoles={["doctor"]} />}
      />
      <Route
        path="/employee/dashboard"
        element={<PrivateRoute element={<EmployeeDashboard />} allowedRoles={["employee"]} />}
      />

      {/* Admin & shared routes (relative) */}
      <Route path="/:role/categories" element={<PrivateRoute element={<Categories />} allowedRoles={["admin", "chemist", "employee"]} />} />
      <Route path="/:role/tests" element={<PrivateRoute element={<Tests />} allowedRoles={["admin", "chemist", "employee"]} />} />
      <Route path="/:role/sample-types" element={<PrivateRoute element={<SampleType />} allowedRoles={["admin", "chemist", "employee"]} />} />
      <Route path="/:role/cultures" element={<PrivateRoute element={<Cultures />} allowedRoles={["admin", "receptionist", "chemist", "doctor", "employee"]} />} />
      <Route path="/:role/culture-options" element={<PrivateRoute element={<CultureOptions />} allowedRoles={["admin", "chemist", "employee"]} />} />
      <Route path="/:role/antibiotics" element={<PrivateRoute element={<Antibiotics />} allowedRoles={["admin", "chemist", "employee"]} />} />
      <Route path="/:role/diseases" element={<PrivateRoute element={<Diseases />} allowedRoles={["admin", "chemist", "employee"]} />} />
      <Route path="/:role/packages-and-offers" element={<PrivateRoute element={<PackagesAndOffers />} allowedRoles={["admin", "chemist", "employee"]} />} />
      <Route path="/:role/invoices" element={<PrivateRoute element={<Invoices />} allowedRoles={["admin", "receptionist", "employee"]} />} />
      <Route path="/:role/payment-methods" element={<PrivateRoute element={<PaymentMethods />} allowedRoles={["admin", "employee"]} />} />
      <Route path="/:role/patients" element={<PrivateRoute element={<PatientsAdminView />} allowedRoles={["admin", "receptionist"]} />} />
      <Route path="/:role/know-us" element={<PrivateRoute element={<KnowUs />} allowedRoles={["admin"]} />} />
      <Route path="/:role/medical-reports" element={<PrivateRoute element={<MedicalReports />} allowedRoles={["admin", "chemist", "receptionist", "doctor", "employee"]} />} />
      <Route path="/:role/branches" element={<PrivateRoute element={<Branches />} allowedRoles={["admin"]} />} />
      <Route path="/:role/patients-analytics" element={<PrivateRoute element={<PatientsAnalytics />} allowedRoles={["admin"]} />} />
      <Route path="/:role/test-groups" element={<PrivateRoute element={<TestGroups />} allowedRoles={["admin", "chemist", "receptionist", "employee"]} />} />
      <Route path="/:role/test-group-categories" element={<PrivateRoute element={<TestGroupCategories />} allowedRoles={["admin", "chemist", "receptionist"]} />} />
      <Route path="/:role/test-group-components" element={<PrivateRoute element={<TestGroupComponents />} allowedRoles={["admin", "chemist", "receptionist"]} />} />
      <Route path="/:role/employees" element={<PrivateRoute element={<EmployeeManagement />} allowedRoles={["admin"]} />} />
      <Route path="/:role/profile" element={<PrivateRoute element={<AdminProfile />} allowedRoles={["admin"]} />} />
      <Route path="/admin/lab-management" element={<PrivateRoute element={<LabManagement />} allowedRoles={["admin"]} />} />
      <Route path="/:role/vault" element={<PrivateRoute element={<Vault />} allowedRoles={["admin"]} />} />
      <Route path="/:role/tat-analytics" element={<PrivateRoute element={<TurnaroundTime />} allowedRoles={["admin", "doctor", "chemist"]} />} />
    </Route>
  </Routes>
);

export default LabRoutes;