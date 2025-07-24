import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PrivateRoute from './helpers/PrivateRoute';

// Dashboards
import AdminDashboard from './pages/AdminDashboard';
import ReceptionistDashboard from './pages/ReceptionistDashboard';
import ChemistDashboard from './pages/ChemistDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import PatientDashboard from './pages/PatientDashboard';

// Patient pages
import PatientReports from './pages/PatientReports';
import PatientProfile from './pages/PatientProfile';
import PatientUpdateProfile from './pages/PatientUpdateProfile';

// Admin shared pages
import Categories from './pages/Categories';
import Tests from './pages/Tests';
import SampleType from './pages/SampleType';
import Cultures from './pages/Cultures';
import CultureOptions from './pages/CultureOptions';
import Antibiotics from './pages/Antibiotics';
import Diseases from './pages/Diseases';
import TestGroups from './pages/TestGroups';
import TestGroupCategories from './pages/TestGroupCategories';
import TestGroupComponents from './pages/TestGroupComponents';
import Invoices from './pages/Invoices';
import PaymentMethods from './pages/PaymentMethods';
import Branches from './pages/Branches';
import PackagesAndOffers from './pages/PackagesAndOffers';
import PatientsAdminView from './pages/PatientsAdminView';
import PatientsAnalytics from './pages/PatientsAnalytics';
import KnowUs from './pages/KnowUs';
import MedicalReports from './pages/MedicalReports';
import EmployeeManagement from './pages/EmployeeManagement';
import LabManagement from './pages/LabManagement';

const LabRoutes = () => (
  <Routes>
    {/* Patient routes */}
    <Route
      path="patient/dashboard"
      element={<PrivateRoute element={<PatientDashboard />} allowedRoles={["patient"]} />}
    />
    <Route
      path="patient/dashboard/reports"
      element={<PrivateRoute element={<PatientReports />} allowedRoles={["patient"]} />}
    />
    <Route
      path="patient/dashboard/profile"
      element={<PrivateRoute element={<PatientProfile />} allowedRoles={["patient"]} />}
    />
    <Route
      path="patient/dashboard/profile/update"
      element={<PrivateRoute element={<PatientUpdateProfile />} allowedRoles={["patient"]} />}
    />

    {/* Role dashboards */}
    <Route
      path="admin/dashboard"
      element={<PrivateRoute element={<AdminDashboard />} allowedRoles={["admin"]} />}
    />
    <Route
      path="receptionist/dashboard"
      element={<PrivateRoute element={<ReceptionistDashboard />} allowedRoles={["receptionist"]} />}
    />
    <Route
      path="chemist/dashboard"
      element={<PrivateRoute element={<ChemistDashboard />} allowedRoles={["chemist"]} />}
    />
    <Route
      path="doctor/dashboard"
      element={<PrivateRoute element={<DoctorDashboard />} allowedRoles={["doctor"]} />}
    />
    <Route
      path="employee/dashboard"
      element={<PrivateRoute element={<EmployeeDashboard />} allowedRoles={["employee"]} />}
    />

    {/* Admin & shared routes (relative) */}
    <Route path="admin/dashboard/categories" element={<PrivateRoute element={<Categories />} allowedRoles={["admin", "chemist", "employee"]} />} />
    <Route path="admin/dashboard/tests" element={<PrivateRoute element={<Tests />} allowedRoles={["admin", "chemist", "employee"]} />} />
    <Route path="admin/dashboard/sample-types" element={<PrivateRoute element={<SampleType />} allowedRoles={["admin", "chemist", "employee"]} />} />
    <Route path="admin/dashboard/cultures" element={<PrivateRoute element={<Cultures />} allowedRoles={["admin", "receptionist", "chemist", "doctor", "employee"]} />} />
    <Route path="admin/dashboard/culture-options" element={<PrivateRoute element={<CultureOptions />} allowedRoles={["admin", "chemist", "employee"]} />} />
    <Route path="admin/dashboard/antibiotics" element={<PrivateRoute element={<Antibiotics />} allowedRoles={["admin", "chemist", "employee"]} />} />
    <Route path="admin/dashboard/diseases" element={<PrivateRoute element={<Diseases />} allowedRoles={["admin", "chemist", "employee"]} />} />
    <Route path="admin/dashboard/packages-and-offers" element={<PrivateRoute element={<PackagesAndOffers />} allowedRoles={["admin", "chemist", "employee"]} />} />
    <Route path="admin/dashboard/invoices" element={<PrivateRoute element={<Invoices />} allowedRoles={["admin", "receptionist", "employee"]} />} />
    <Route path="admin/dashboard/payment-methods" element={<PrivateRoute element={<PaymentMethods />} allowedRoles={["admin", "employee"]} />} />
    <Route path="admin/dashboard/patients" element={<PrivateRoute element={<PatientsAdminView />} allowedRoles={["admin", "receptionist"]} />} />
    <Route path="admin/dashboard/know-us" element={<PrivateRoute element={<KnowUs />} allowedRoles={["admin"]} />} />
    <Route path="admin/dashboard/medical-reports" element={<PrivateRoute element={<MedicalReports />} allowedRoles={["admin", "chemist", "receptionist", "doctor", "employee"]} />} />
    <Route path="admin/dashboard/branches" element={<PrivateRoute element={<Branches />} allowedRoles={["admin"]} />} />
    <Route path="admin/dashboard/patients-analytics" element={<PrivateRoute element={<PatientsAnalytics />} allowedRoles={["admin"]} />} />
    <Route path="admin/dashboard/test-groups" element={<PrivateRoute element={<TestGroups />} allowedRoles={["admin", "chemist", "receptionist", "employee"]} />} />
    <Route path="admin/dashboard/test-group-categories" element={<PrivateRoute element={<TestGroupCategories />} allowedRoles={["admin", "chemist", "receptionist"]} />} />
    <Route path="admin/dashboard/test-group-components" element={<PrivateRoute element={<TestGroupComponents />} allowedRoles={["admin", "chemist", "receptionist"]} />} />
    <Route path="admin/dashboard/employees" element={<PrivateRoute element={<EmployeeManagement />} allowedRoles={["admin"]} />} />
    <Route path="admin/lab-management" element={<PrivateRoute element={<LabManagement />} allowedRoles={["admin"]} />} />
  </Routes>
);

export default LabRoutes; 