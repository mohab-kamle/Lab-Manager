import React, { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/auth/PrivateRoute';

// Dashboards
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ReceptionistDashboard = lazy(() => import('./pages/receptionist/ReceptionistDashboard'));
const ChemistDashboard = lazy(() => import('./pages/chemist/ChemistDashboard'));
const EmployeeDashboard = lazy(() => import('./pages/employee/EmployeeDashboard'));
const PatientDashboard = lazy(() => import('./pages/patient/PatientDashboard'));

// Patient pages
const PatientReports = lazy(() => import('./pages/reports/PatientReports'));
const PatientProfile = lazy(() => import('./pages/patient/PatientProfile'));
const PatientUpdateProfile = lazy(() => import('./pages/patient/PatientUpdateProfile'));
const PatientInvoices = lazy(() => import('./pages/patient/PatientInvoices'));
const PatientTransactions = lazy(() => import('./pages/patient/PatientTransactions'));

// Admin & Shared pages
const Categories = lazy(() => import('./pages/tests/Categories'));
const Tests = lazy(() => import('./pages/tests/Tests'));
const SampleType = lazy(() => import('./pages/tests/SampleType'));
const Antibiotics = lazy(() => import('./pages/tests/Antibiotics'));
const Diseases = lazy(() => import('./pages/tests/Diseases'));
const Invoices = lazy(() => import('./pages/invoices/Invoices'));
const PaymentMethods = lazy(() => import('./pages/invoices/PaymentMethods'));
const Branches = lazy(() => import('./pages/branches/Branches'));
const OutsourcedLabs = lazy(() => import('./pages/branches/OutsourcedLabs'));
const PackagesAndOffers = lazy(() => import('./pages/packages/PackagesAndOffers'));
const PatientsAdminView = lazy(() => import('./pages/admin/PatientsAdminView'));
const PatientsAnalytics = lazy(() => import('./pages/admin/PatientsAnalytics'));
const KnowUs = lazy(() => import('./pages/info/KnowUs'));
const MedicalReports = lazy(() => import('./pages/reports/MedicalReports'));
const EmployeeManagement = lazy(() => import('./pages/branches/EmployeeManagement'));
const LabManagement = lazy(() => import('./pages/lab/LabManagement'));
const Vault = lazy(() => import('./pages/admin/Vault'));
const TransactionsVault = lazy(() => import('./pages/admin/TransactionsVault'));
const TurnaroundTime = lazy(() => import('./pages/admin/TurnaroundTime'));
const PatientProfileAdminView = lazy(() => import('./pages/admin/PatientProfileAdminView'));
const ManagerKeyManagement = lazy(() => import('./pages/admin/ManagerKeyManagement'));
const ToastTestPage = lazy(() => import('./pages/test/ToastTestPage'));


// Profile pages
const AdminProfile = lazy(() => import('./pages/admin/AdminProfile'));
const DoctorProfile = lazy(() => import('./pages/doctor/DoctorProfile'));
const ChemistProfile = lazy(() => import('./pages/chemist/ChemistProfile'));
const EmployeeProfile = lazy(() => import('./pages/employee/EmployeeProfile'));
const ReceptionistProfile = lazy(() => import('./pages/receptionist/ReceptionistProfile'));

// Inventory Pages
const InventoryDashboard = lazy(() => import("./pages/inventory/InventoryDashboard"));
const Suppliers = lazy(() => import("./pages/inventory/Suppliers"));
const InventoryItems = lazy(() => import("./pages/inventory/InventoryItems"));
const InventoryBatches = lazy(() => import("./pages/inventory/InventoryBatches"));

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
      <Route
        path="/patient/invoices"
        element={<PrivateRoute element={<PatientInvoices />} allowedRoles={["patient"]} />}
      />
      <Route
        path="/patient/transactions"
        element={<PrivateRoute element={<PatientTransactions />} allowedRoles={["patient"]} />}
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
        path="/employee/dashboard"
        element={<PrivateRoute element={<EmployeeDashboard />} allowedRoles={["employee"]} />}
      />

      {/* Admin & shared routes (relative) */}
      <Route path="/:role/categories" element={<PrivateRoute element={<Categories />} allowedRoles={["admin", "chemist", "employee"]} />} />
      <Route path="/:role/tests" element={<PrivateRoute element={<Tests />} allowedRoles={["admin", "chemist", "employee"]} />} />
      <Route path="/:role/sample-types" element={<PrivateRoute element={<SampleType />} allowedRoles={["admin", "chemist", "employee"]} />} />
      <Route path="/:role/antibiotics" element={<PrivateRoute element={<Antibiotics />} allowedRoles={["admin", "chemist", "employee"]} />} />
      <Route path="/:role/diseases" element={<PrivateRoute element={<Diseases />} allowedRoles={["admin", "chemist", "employee"]} />} />
      <Route path="/:role/packages-and-offers" element={<PrivateRoute element={<PackagesAndOffers />} allowedRoles={["admin", "chemist", "employee"]} />} />
      <Route path="/:role/invoices" element={<PrivateRoute element={<Invoices />} allowedRoles={["admin", "receptionist", "employee"]} />} />
      <Route path="/:role/payment-methods" element={<PrivateRoute element={<PaymentMethods />} allowedRoles={["admin", "employee"]} />} />
      <Route path="/:role/patients" element={<PrivateRoute element={<PatientsAdminView />} allowedRoles={["admin", "receptionist", "doctor"]} />} />
      <Route path="/:role/patients/:id" element={<PrivateRoute element={<PatientProfileAdminView />} allowedRoles={["admin", "receptionist", "doctor"]} />} />

      <Route path="/:role/know-us" element={<PrivateRoute element={<KnowUs />} allowedRoles={["admin"]} />} />
      <Route path="/:role/medical-reports" element={<PrivateRoute element={<MedicalReports />} allowedRoles={["admin", "chemist", "receptionist", "doctor", "employee"]} />} />
      <Route path="/:role/branches" element={<PrivateRoute element={<Branches />} allowedRoles={["admin"]} />} />
      <Route path="/:role/outsourced-labs" element={<PrivateRoute element={<OutsourcedLabs />} allowedRoles={["admin", "employee", "chemist"]} />} />
      <Route path="/:role/patients-analytics" element={<PrivateRoute element={<PatientsAnalytics />} allowedRoles={["admin"]} />} />
      <Route path="/:role/employees" element={<PrivateRoute element={<EmployeeManagement />} allowedRoles={["admin"]} />} />

      {/* Profile routes */}
      <Route path="/admin/profile" element={<PrivateRoute element={<AdminProfile />} allowedRoles={["admin"]} />} />
      <Route path="/doctor/profile" element={<PrivateRoute element={<DoctorProfile />} allowedRoles={["doctor"]} />} />
      <Route path="/chemist/profile" element={<PrivateRoute element={<ChemistProfile />} allowedRoles={["chemist"]} />} />
      <Route path="/employee/profile" element={<PrivateRoute element={<EmployeeProfile />} allowedRoles={["employee"]} />} />
      <Route path="/receptionist/profile" element={<PrivateRoute element={<ReceptionistProfile />} allowedRoles={["receptionist"]} />} />

      {/* Management routes */}
      <Route path="/admin/lab-management" element={<PrivateRoute element={<LabManagement />} allowedRoles={["admin"]} />} />
      <Route path="/admin/manager-keys" element={<PrivateRoute element={<ManagerKeyManagement />} allowedRoles={["admin"]} />} />
      <Route path="/:role/vault" element={<PrivateRoute element={<Vault />} allowedRoles={["admin"]} />} />
      <Route path="/admin/transactions" element={<PrivateRoute element={<TransactionsVault />} allowedRoles={["admin"]} />} />
      <Route path="/:role/tat-analytics" element={<PrivateRoute element={<TurnaroundTime />} allowedRoles={["admin", "doctor", "chemist"]} />} />

      {/* Inventory Routes */}
      <Route path="/:role/inventory" element={<PrivateRoute element={<InventoryDashboard />} allowedRoles={["admin", "chemist"]} />} />
      <Route path="/:role/inventory/suppliers" element={<PrivateRoute element={<Suppliers />} allowedRoles={["admin", "chemist"]} />} />
      <Route path="/:role/inventory/items" element={<PrivateRoute element={<InventoryItems />} allowedRoles={["admin", "chemist"]} />} />
      <Route path="/:role/inventory/items/:itemId/batches" element={<PrivateRoute element={<InventoryBatches />} allowedRoles={["admin", "chemist"]} />} />
      
      {/* Test & Debug routes */}
      <Route path="/toast-test" element={<ToastTestPage />} />
    </Route>
  </Routes>
);

export default LabRoutes;
