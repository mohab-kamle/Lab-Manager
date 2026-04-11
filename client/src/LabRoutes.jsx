import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/auth/PrivateRoute';

// Dashboards
import AdminDashboard from './pages/admin/AdminDashboard';
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard';
import ChemistDashboard from './pages/chemist/ChemistDashboard';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import PatientDashboard from './pages/patient/PatientDashboard';

// Patient pages
import PatientReports from './pages/reports/PatientReports';
import PatientProfile from './pages/patient/PatientProfile';
import PatientUpdateProfile from './pages/patient/PatientUpdateProfile';

// Admin shared pages
import Categories from './pages/tests/Categories';
import Tests from './pages/tests/Tests';
import SampleType from './pages/tests/SampleType';

import Antibiotics from './pages/tests/Antibiotics';
import Diseases from './pages/tests/Diseases';
import Invoices from './pages/invoices/Invoices';
import PaymentMethods from './pages/invoices/PaymentMethods';
import Branches from './pages/branches/Branches';
import PackagesAndOffers from './pages/packages/PackagesAndOffers';
import PatientsAdminView from './pages/admin/PatientsAdminView';
import PatientsAnalytics from './pages/admin/PatientsAnalytics';
import KnowUs from './pages/info/KnowUs';
import MedicalReports from './pages/reports/MedicalReports';
import EmployeeManagement from './pages/branches/EmployeeManagement';
import LabManagement from './pages/lab/LabManagement';
import AdminProfile from './pages/admin/AdminProfile';
import DoctorProfile from './pages/doctor/DoctorProfile';
import ChemistProfile from './pages/chemist/ChemistProfile';
import EmployeeProfile from './pages/employee/EmployeeProfile';
import ReceptionistProfile from './pages/receptionist/ReceptionistProfile';
import Vault from './pages/admin/Vault';

// Inventory Pages
import InventoryDashboard from "./pages/inventory/InventoryDashboard";
import Suppliers from "./pages/inventory/Suppliers";
import InventoryItems from "./pages/inventory/InventoryItems";
import InventoryBatches from "./pages/inventory/InventoryBatches";

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
      <Route path="/:role/employees" element={<PrivateRoute element={<EmployeeManagement />} allowedRoles={["admin"]} />} />
      {/* Profile routes — each role gets its own profile page backed by the shared StaffProfile component */}
      <Route path="/admin/profile" element={<PrivateRoute element={<AdminProfile />} allowedRoles={["admin"]} />} />
      <Route path="/doctor/profile" element={<PrivateRoute element={<DoctorProfile />} allowedRoles={["doctor"]} />} />
      <Route path="/chemist/profile" element={<PrivateRoute element={<ChemistProfile />} allowedRoles={["chemist"]} />} />
      <Route path="/employee/profile" element={<PrivateRoute element={<EmployeeProfile />} allowedRoles={["employee"]} />} />
      <Route path="/receptionist/profile" element={<PrivateRoute element={<ReceptionistProfile />} allowedRoles={["receptionist"]} />} />
      <Route path="/admin/lab-management" element={<PrivateRoute element={<LabManagement />} allowedRoles={["admin"]} />} />
      <Route path="/:role/vault" element={<PrivateRoute element={<Vault />} allowedRoles={["admin"]} />} />

      {/* Inventory Routes */}
      <Route path="/:role/inventory" element={<PrivateRoute element={<InventoryDashboard />} allowedRoles={["admin", "chemist"]} />} />
      <Route path="/:role/inventory/suppliers" element={<PrivateRoute element={<Suppliers />} allowedRoles={["admin", "chemist"]} />} />
      <Route path="/:role/inventory/items" element={<PrivateRoute element={<InventoryItems />} allowedRoles={["admin", "chemist"]} />} />
      <Route path="/:role/inventory/items/:itemId/batches" element={<PrivateRoute element={<InventoryBatches />} allowedRoles={["admin", "chemist"]} />} />
    </Route>
  </Routes>
);

export default LabRoutes;