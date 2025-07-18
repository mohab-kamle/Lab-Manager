import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import components
import MainNavBar from "./components/MainNavBar";
import SecondaryNavBar from "./components/SecondaryNavBar";
import ErrorPage from "./components/ErrorPage";
import PrivateRoute from "./helpers/PrivateRoute";
import { useAuth } from "./context/AuthContext";

// Import pages
import HomePage from "./pages/HomePage";
import PatientPage from "./pages/PatientPage";
import AdminPage from "./pages/AdminPage";
import PatientDashboard from "./pages/PatientDashboard";
import PatientReports from "./pages/PatientReports";
import PatientProfile from "./pages/PatientProfile";
import PatientUpdateProfile from "./pages/PatientUpdateProfile";
import AdminDashboard from "./pages/AdminDashboard";
import ReceptionistDashboard from "./pages/ReceptionistDashboard";
import ChemistDashboard from "./pages/ChemistDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import Categories from "./pages/Categories";
import Tests from "./pages/Tests";
import SampleType from "./pages/SampleType";
import Cultures from "./pages/Cultures";
import CultureOptions from "./pages/CultureOptions";
import Antibiotics from "./pages/Antibiotics";
import Invoices from "./pages/Invoices";
import PaymentMethods from "./pages/PaymentMethods";
import Branches from "./pages/Branches";
import PackagesAndOffers from "./pages/PackagesAndOffers";
import PatientsAdminView from "./pages/PatientsAdminView";
import PatientsAnalytics from "./pages/PatientsAnalytics";
import KnowUs from "./pages/KnowUs";
import MedicalReports from "./pages/MedicalReports";
import Diseases from "./pages/Diseases";
import TestGroups from './pages/TestGroups';
import TestGroupCategories from './pages/TestGroupCategories';
import TestGroupComponents from './pages/TestGroupComponents';
import EmployeeManagement from './pages/EmployeeManagement';
import UnifiedLogin from './pages/UnifiedLogin';

// Import axios for API calls
import axios from "axios";

// Add global axios interceptor for token expiration/invalid
axios.interceptors.response.use(
  response => response,
  error => {
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 400) &&
      error.response.data &&
      error.response.data.error &&
      error.response.data.error.toLowerCase().includes("token")
    ) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

function App() {
  const { user } = useAuth();
  
  return (
    <Router>
      <MainNavBar />
      {user && <SecondaryNavBar />}
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
        theme="light"
      />
      <div className="main-content">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<ErrorPage />} />
          <Route path="/login" element={<UnifiedLogin />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/patient" element={<PatientPage />} />

          {/* Patient Routes */}
          <Route
            path="/patient/dashboard"
            element={
              <PrivateRoute
                element={<PatientDashboard />}
                allowedRoles={["patient"]}
              />
            }
          />
          <Route
            path="/patient/dashboard/reports"
            element={
              <PrivateRoute
                element={<PatientReports />}
                allowedRoles={["patient"]}
              />
            }
          />
          <Route
            path="/patient/dashboard/profile"
            element={
              <PrivateRoute
                element={<PatientProfile />}
                allowedRoles={["patient"]}
              />
            }
          />
          <Route
            path="/patient/dashboard/profile/update"
            element={
              <PrivateRoute
                element={<PatientUpdateProfile />}
                allowedRoles={["patient"]}
              />
            }
          />

          {/* Role-Specific Dashboard Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <PrivateRoute
                element={<AdminDashboard />}
                allowedRoles={["admin"]}
              />
            }
          />
          <Route
            path="/receptionist/dashboard"
            element={
              <PrivateRoute
                element={<ReceptionistDashboard />}
                allowedRoles={["receptionist"]}
              />
            }
          />
          <Route
            path="/chemist/dashboard"
            element={
              <PrivateRoute
                element={<ChemistDashboard />}
                allowedRoles={["chemist"]}
              />
            }
          />
          <Route
            path="/doctor/dashboard"
            element={
              <PrivateRoute
                element={<DoctorDashboard />}
                allowedRoles={["doctor"]}
              />
            }
          />
          <Route
            path="/employee/dashboard"
            element={
              <PrivateRoute
                element={<EmployeeDashboard />}
                allowedRoles={["employee"]}
              />
            }
          />

          {/* Shared Admin Routes */}
          <Route
            path="/admin/dashboard/categories"
            element={
              <PrivateRoute element={<Categories />} allowedRoles={["admin", "chemist", "employee"]} />
            }
          />
          <Route
            path="/admin/dashboard/tests"
            element={
              <PrivateRoute element={<Tests />} allowedRoles={["admin", "chemist", "employee"]} />
            }
          />
          <Route
            path="/admin/dashboard/sample-types"
            element={
              <PrivateRoute element={<SampleType />} allowedRoles={["admin", "chemist", "employee"]} />
            }
          />
          <Route
            path="/admin/dashboard/cultures"
            element={
              <PrivateRoute element={<Cultures />} allowedRoles={["admin", "receptionist", "chemist", "doctor", "employee"]} />
            }
          />
          <Route
            path="/admin/dashboard/culture-options"
            element={
              <PrivateRoute
                element={<CultureOptions />}
                allowedRoles={["admin", "chemist", "employee"]}
              />
            }
          />
          <Route
            path="/admin/dashboard/antibiotics"
            element={
              <PrivateRoute element={<Antibiotics />} allowedRoles={["admin", "chemist", "employee"]} />
            }
          />
          <Route
            path="/admin/dashboard/diseases"
            element={
              <PrivateRoute element={<Diseases />} allowedRoles={["admin", "chemist", "employee"]} />
            }
          />
          <Route
            path="/admin/dashboard/packages-and-offers"
            element={
              <PrivateRoute
                element={<PackagesAndOffers />}
                allowedRoles={["admin", "chemist", "employee"]}
              />
            }
          />
          <Route
            path="/admin/dashboard/invoices"
            element={
              <PrivateRoute element={<Invoices />} allowedRoles={["admin", "receptionist", "employee"]} />
            }
          />
          <Route
            path="/admin/dashboard/payment-methods"
            element={
              <PrivateRoute
                element={<PaymentMethods />}
                allowedRoles={["admin", "employee"]}
              />
            }
          />
          <Route
            path="/admin/dashboard/patients"
            element={
              <PrivateRoute element={<PatientsAdminView />} allowedRoles={["admin", "receptionist"]} />
            }
          />
          <Route
            path="/admin/dashboard/know-us"
            element={
              <PrivateRoute
                element={<KnowUs />}
                allowedRoles={["admin"]}
              />
            }
          />
          <Route
            path="/admin/dashboard/medical-reports"
            element={
              <PrivateRoute
                element={<MedicalReports />}
                allowedRoles={["admin", "chemist", "receptionist", "doctor", "employee"]}
              />
            }
          />
          <Route
            path="/admin/dashboard/branches"
            element={
              <PrivateRoute element={<Branches />} allowedRoles={["admin"]} />
            }
          />
          <Route
            path="/admin/dashboard/patients-analytics"
            element={
              <PrivateRoute element={<PatientsAnalytics />} allowedRoles={["admin"]} />
            }
          />
          <Route
            path="/admin/dashboard/test-groups"
            element={
              <PrivateRoute
                element={<TestGroups />}
                allowedRoles={["admin", "chemist", "receptionist", "employee"]}
              />
            }
          />
          <Route
            path="/admin/dashboard/test-group-categories"
            element={
              <PrivateRoute
                element={<TestGroupCategories />}
                allowedRoles={["admin", "chemist", "receptionist"]}
              />
            }
          />
          <Route
            path="/admin/dashboard/test-group-components"
            element={
              <PrivateRoute
                element={<TestGroupComponents />}
                allowedRoles={["admin", "chemist", "receptionist"]}
              />
            }
          />
          <Route
            path="/admin/dashboard/employees"
            element={
              <PrivateRoute
                element={<EmployeeManagement />}
                allowedRoles={["admin"]}
              />
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
