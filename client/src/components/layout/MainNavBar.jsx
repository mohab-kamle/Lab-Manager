import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Navbar,
  Nav,
  Container,
  Button,
  Dropdown,
  NavbarText,
} from "react-bootstrap";
import { toast } from "react-toastify";

import {
  Moon,
  Sun,
  DoorClosed,
  DoorOpen,
  House,
  Users,
  FileText,
  User,
  FlaskConical,
  Eye,
  Database,
  DollarSignIcon,
  Settings,
} from "lucide-react";

import labIcon from "../../assets/LabIconWithRoundedWhiteBg.webp";
import useLabPrefix from "../../hooks/useLabPrefix";
import { useAuth } from "../../context/AuthContext";
import { useLab } from "../../context/LabContext";
import VersionBadge from "../ui/VersionBadge";

import "../../styles/MainNavBar.css";

export const defaultTitles = {
  testGroups: "Test Groups",
  tests_C: "Tests & Cultures",
  Rec: "Reception",
  MedicalReports: "Medical Reports",
  Accounting: "Accounting",
  Manage_B: "Manage Branches",
};
let navbarTitlesReset = null;
let navbarActiveReset = null;
/**
 * Resets the navbar titles to their default values.
 * This function is used to reset the navbar titles when the user logs out.
 * It takes no arguments and returns no value.
 * It checks if the navbarTitlesReset function has been set (i.e. if it's not null).
 * If it has, it calls the navbarTitlesReset function with the defaultTitles object as an argument.
 * This resets the navbar titles to their default values.
 */
export const resetNavbarTitles = () => {
  if (navbarTitlesReset) {
    navbarTitlesReset(defaultTitles);
  }
};
/**
 * Resets the navbar active state by removing the active-dropdown-item
 * from local storage and resetting the navbarActiveReset function
 * to null.
 * This function is used to reset the navbar active state when the user logs out.
 * It takes no arguments and returns no value.
 * It checks if the navbarActiveReset function has been set (i.e. if it's not null).
 * If it has, it calls the navbarActiveReset function with null as an argument,
 * which resets the navbar active state.
 * Finally, it removes the active-dropdown-item from local storage.
 */
export const resetNavbarActiveState = () => {
  if (navbarActiveReset) {
    navbarActiveReset(null);
    localStorage.removeItem("active-dropdown-item");
  }
};
/**
 * Main navigation bar component.
 * Handles login/logout, navigation between different user roles
 * and displays a welcome message when the user logs in.
 *
 * @returns {JSX.Element} The main navigation bar component.
 */
const MainNavBar = () => {
  const { user, loading: authLoading, refreshUser, logout } = useAuth();
  const { terminateLabInfo, loading: labLoading } = useLab();
  const prefix = useLabPrefix();
  const navigate = useNavigate();
  const location = useLocation();

  const [titles, setTitles] = useState(() => {
    const saved = localStorage.getItem("navbar-titles");
    return saved ? JSON.parse(saved) : defaultTitles;
  });
  const [showWelcome, setShowWelcome] = useState(true);
  // delete it when make sure the other down there is working fine. 
  useEffect(() => {
    if (user) {
      setShowWelcome(true);
      const timer = setTimeout(() => {
        setShowWelcome(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [user]);
  // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  useEffect(() => {
    localStorage.setItem("navbar-titles", JSON.stringify(titles));
  }, [titles]);
  const [activeItem, setActiveItem] = useState(() => {
    // Recover saved dropdown item on mount
    return localStorage.getItem("active-dropdown-item") || null;
  });
  const [expanded, setExpanded] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Keep reference for resetting titles externally
  useEffect(() => {
    navbarTitlesReset = setTitles;
    navbarActiveReset = setActiveItem;
    return () => {
      navbarTitlesReset = null;
      navbarActiveReset = null;
    };
  }, []);

  // Save active dropdown item on change
  useEffect(() => {
    if (activeItem) {
      localStorage.setItem("active-dropdown-item", activeItem);
    }
  }, [activeItem]);

  // Handle prefix-based navigation once
  useEffect(() => {
    if (!user) return;
    if (prefix && !isInitialized) {
      setIsInitialized(true);
      if (location.pathname.includes("null/")) {
        const correctedPath = location.pathname.replace("null/", `${prefix}/`);
        navigate(correctedPath, { replace: true });
      }
    }
  }, [prefix, isInitialized, location.pathname, navigate, user]);

  // Handle user refresh and token expiration
  useEffect(() => {
    if (!user && !authLoading) refreshUser();

    const token = localStorage.getItem("token");
    if (token) {
      const parseJwt = (t) => {
        try {
          return JSON.parse(atob(t.split(".")[1]));
        } catch {
          return null;
        }
      };
      const payload = parseJwt(token);
      if (!payload || payload.exp < Date.now() / 1000) {
        toast.error("Your session has expired. Please login again.", {
          position: "top-right",
          autoClose: 3000,
          theme: "colored",
          onClose: () => {
            logout();
            terminateLabInfo();
            window.location.href = "/login";
          },
        });
      }
    }
  }, [user, authLoading, refreshUser, logout, terminateLabInfo]);

  const handleNavClick = (e) => {
    const dropdownItem = e.target.closest("[data-dropdown-key]");
    if (!dropdownItem) return;

    const dropdownKey = dropdownItem.getAttribute("data-dropdown-key");
    const newTitle = dropdownItem.getAttribute("data-title");
    const itemId = dropdownItem.getAttribute("data-id");

    if (dropdownKey && newTitle)
      setTitles({ ...defaultTitles, [dropdownKey]: newTitle });
    if (itemId) setActiveItem(itemId);

    setExpanded(false);
  };

  const handleLogout = () => {
    toast.success("You have been logged out successfully.", {
      position: "top-right",
      autoClose: 3000,
      theme: "colored",
    });
    logout();
    terminateLabInfo();
    navigate("/login");
    setExpanded(false);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  useEffect(() => {
    if (!user) return;

    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 5000);

    // Hide permanently if user scrolls down
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setShowWelcome(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [user]);

  return (
    <>
      <Navbar
        expand="xl"
        sticky="top"
        fixed="top"
        expanded={expanded}
        collapseOnSelect
        onClick={handleNavClick}
        data-bs-theme="white"
        className="text-white pt-3 px-3 d-flex align-items-center"
        style={{
          background: "white",
          border: "none",
          boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.1)",
          borderBottom: "1px solid var(--border)",
          zIndex: 1050,
        }}
      >
        <Container fluid>
          <Navbar.Brand as={Link} to="/" onClick={() => setExpanded(false)}>
            <img
              src={labIcon}
              alt=""
              style={{ width: "50px", height: "50px", borderRadius: "50%" }}
            />
            <span
              style={{
                marginLeft: "10px",
                marginTop: "15px",
                fontSize: "clamp(16px, 2.5vw, 20px)",
                fontWeight: "bold",
              }}
            >
              Lab Manager
            </span>
          </Navbar.Brand>
          <Navbar.Toggle
            aria-controls="basic-navbar-nav"
            onClick={() => setExpanded(expanded ? false : true)}
          />
          <Navbar.Collapse className="justify-content-end">
            <Nav className="Down-on-main me-auto">
              {/* Dashboard Home Link */}
              {!prefix || labLoading ? (
                user && <Nav.Link disabled>Loading...</Nav.Link>
              ) : user?.role === "admin" ? (
                <Nav.Link
                  as={Link}
                  to={prefix ? `${prefix}/admin/dashboard` : "#"}
                  onClick={() => setExpanded(false)}
                  disabled={!prefix || labLoading}
                  aria-label="Admin Dashboard"
                >
                  <House size={23} aria-hidden="true" />
                  {/* {prefix ? "Admin Dashboard" : "Loading..."} */}
                </Nav.Link>
              ) : user?.role === "receptionist" ? (
                <Nav.Link
                  as={Link}
                  to={prefix ? `${prefix}/receptionist/dashboard` : "#"}
                  onClick={() => setExpanded(false)}
                  disabled={!prefix || labLoading}
                  aria-label="Receptionist Dashboard"
                >
                  <House size={23} aria-hidden="true" />
                  {/* {prefix ? "Receptionist Dashboard" : "Loading..."} */}
                </Nav.Link>
              ) : user?.role === "chemist" ? (
                <Nav.Link
                  as={Link}
                  to={prefix ? `${prefix}/chemist/dashboard` : "#"}
                  onClick={() => setExpanded(false)}
                  disabled={!prefix || labLoading}
                  aria-label="Chemist Dashboard"
                >
                  <House size={23} aria-hidden="true" />
                  {/* {prefix ? 'Chemist Dashboard' : 'Loading...'} */}
                </Nav.Link>
              ) : user?.role === "doctor" ? (
                <Nav.Link
                  as={Link}
                  to={prefix ? `${prefix}/doctor/dashboard` : "#"}
                  onClick={() => setExpanded(false)}
                  disabled={!prefix || labLoading}
                  aria-label="Doctor Dashboard"
                >
                  <House size={23} aria-hidden="true" />
                  {/* {prefix ? 'Doctor Dashboard' : 'Loading...'} */}
                </Nav.Link>
              ) : user?.role === "employee" ? (
                <Nav.Link
                  as={Link}
                  to={prefix ? `${prefix}/employee/dashboard` : "#"}
                  onClick={() => setExpanded(false)}
                  disabled={!prefix || labLoading}
                  aria-label="Employee Dashboard"
                >
                  <House size={23} aria-hidden="true" />
                  {/* {prefix ? 'Employee Dashboard' : 'Loading...'} */}
                </Nav.Link>
              ) : user?.role === "patient" ? (
                <Nav.Link
                  as={Link}
                  to={prefix ? `${prefix}/patient/dashboard` : "#"}
                  onClick={() => setExpanded(false)}
                  disabled={!prefix || labLoading}
                  aria-label="Patient Dashboard"
                >
                  <House size={23} aria-hidden="true" />
                  {/* {prefix ? 'Patient Dashboard' : 'Loading...'} */}
                </Nav.Link>
              ) : null}
              {/* Test Groups Dropdown for admin, chemist, receptionist */}
              {(user?.role === "admin" ||
                user?.role === "chemist" ||
                user?.role === "receptionist") && (
                <Dropdown className="mx-1 mb-1">
                  <Dropdown.Toggle
                    id="dropdown-basic"
                    className={`nav-button ${
                      ["test-groups", "categories", "components"].includes(
                        activeItem
                      )
                        ? "active-dropdown"
                        : ""
                    }`}
                  >
                    <FlaskConical size={18} className="me-1 mb-1" />
                    {titles.testGroups}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item
                      as={Link}
                      to={`${prefix}/${user?.role}/test-groups`}
                      data-dropdown-key="testGroups"
                      data-title="Test Groups"
                      data-id="test-groups"
                      active={activeItem === "test-groups"}
                    >
                      Test Groups
                    </Dropdown.Item>
                    <Dropdown.Item
                      as={Link}
                      to={`${prefix}/${user?.role}/test-group-categories`}
                      data-dropdown-key="testGroups"
                      data-title="Categories"
                      data-id="categories"
                      active={activeItem === "categories"}
                    >
                      Categories
                    </Dropdown.Item>
                    <Dropdown.Item
                      as={Link}
                      to={`${prefix}/${user?.role}/test-group-components`}
                      data-dropdown-key="testGroups"
                      data-title="Components"
                      data-id="components"
                      active={activeItem === "components"}
                    >
                      Components
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              )}
              {/* Employee Links - Different access based on role */}
              {(user?.role === "admin" ||
                user?.role === "receptionist" ||
                user?.role === "chemist" ||
                user?.role === "doctor" ||
                user?.role === "employee") && (
                <>
                  {/* Tests & Cultures - Admin, Chemist, Employee */}
                  {(user?.role === "admin" ||
                    user?.role === "chemist" ||
                    user?.role === "employee") && (
                    <Dropdown className="mx-1 mb-1">
                      <Dropdown.Toggle
                        id="dropdown-basic"
                        className={`nav-button ${
                          [
                            "categories-tests",
                            "tests-tests",
                            "sample-types-tests",
                            "culture-options-tests",
                            "antibiotics-tests",
                            "packages-offers",
                            "culture-tests",
                            "diseases-tests",
                          ].includes(activeItem)
                            ? "active-dropdown"
                            : ""
                        }`}
                      >
                        <Database size={18} className="me-1 mb-1" />
                        {titles.tests_C}
                      </Dropdown.Toggle>

                      <Dropdown.Menu>
                        {user?.role === "admin" && (
                          <>
                            <Dropdown.Item
                              as={Link}
                              to={`${prefix}/${user?.role}/categories`}
                              data-dropdown-key="tests_C"
                              data-title="categories"
                              data-id="categories-tests"
                              active={activeItem === "categories-tests"}
                            >
                              categories
                            </Dropdown.Item>
                            <Dropdown.Item
                              as={Link}
                              to={`${prefix}/${user?.role}/tests`}
                              data-dropdown-key="tests_C"
                              data-title="tests"
                              data-id="tests-tests"
                              active={activeItem === "tests-tests"}
                            >
                              tests
                            </Dropdown.Item>
                            <Dropdown.Item
                              as={Link}
                              to={`${prefix}/${user?.role}/sample-types`}
                              data-dropdown-key="tests_C"
                              data-title="sample types"
                              data-id="sample-types-tests"
                              active={activeItem === "sample-types-tests"}
                            >
                              sample types
                            </Dropdown.Item>
                            <Dropdown.Item
                              as={Link}
                              to={`${prefix}/${user?.role}/culture-options`}
                              data-dropdown-key="tests_C"
                              data-title="culture options"
                              data-id="culture-options-tests"
                              active={activeItem === "culture-options-tests"}
                            >
                              culture options
                            </Dropdown.Item>
                            <Dropdown.Item
                              as={Link}
                              to={`${prefix}/${user?.role}/antibiotics`}
                              data-dropdown-key="tests_C"
                              data-title="antibiotics"
                              data-id="antibiotics-tests"
                              active={activeItem === "antibiotics-tests"}
                            >
                              antibiotics
                            </Dropdown.Item>
                            <Dropdown.Item
                              as={Link}
                              to={`${prefix}/${user?.role}/packages-offers`}
                              data-dropdown-key="tests_C"
                              data-title="packages & offers"
                              data-id="packages-offers" // 👈 Add this
                              active={activeItem === "packages-offers"} // 👈 Add this
                            >
                              packages & offers
                            </Dropdown.Item>
                          </>
                        )}
                        {(user?.role === "chemist" ||
                          user?.role === "employee") && (
                          <>
                            <Dropdown.Item
                              as={Link}
                              to={`${prefix}/${user?.role}/categories`}
                              data-dropdown-key="tests_C"
                              data-title="categories"
                              data-id="categories-tests"
                              active={activeItem === "categories-tests"}
                            >
                              categories
                            </Dropdown.Item>
                            <Dropdown.Item
                              as={Link}
                              to={`${prefix}/${user?.role}/tests`}
                              data-dropdown-key="tests_C"
                              data-title="tests"
                              data-id="tests-tests"
                              active={activeItem === "tests-tests"}
                            >
                              tests
                            </Dropdown.Item>
                            <Dropdown.Item
                              as={Link}
                              to={`${prefix}/${user?.role}/sample-types`}
                              data-dropdown-key="tests_C"
                              data-title="sample types"
                              data-id="sample-types-tests"
                              active={activeItem === "sample-types-tests"}
                            >
                              sample types
                            </Dropdown.Item>
                            <Dropdown.Item
                              as={Link}
                              to={`${prefix}/${user?.role}/culture-options`}
                              data-dropdown-key="tests_C"
                              data-title="culture options"
                              data-id="culture-options-tests"
                              active={activeItem === "culture-options-tests"}
                            >
                              culture options
                            </Dropdown.Item>
                            <Dropdown.Item
                              as={Link}
                              to={`${prefix}/${user?.role}/antibiotics`}
                              data-dropdown-key="tests_C"
                              data-title="antibiotics"
                              data-id="antibiotics-tests"
                              active={activeItem === "antibiotics-tests"}
                            >
                              antibiotics
                            </Dropdown.Item>
                            <Dropdown.Item
                              as={Link}
                              to={`${prefix}/${user?.role}/packages-offers`}
                              data-dropdown-key="tests_C"
                              data-title="packages & offers"
                            >
                              packages & offers
                            </Dropdown.Item>
                          </>
                        )}
                        <Dropdown.Item
                          as={Link}
                          to={`${prefix}/${user?.role}/cultures`}
                          data-dropdown-key="tests_C"
                          data-title="culture"
                          data-id="culture-tests"
                          active={activeItem === "culture-tests"}
                        >
                          culture
                        </Dropdown.Item>
                        <Dropdown.Item
                          as={Link}
                          to={`${prefix}/${user?.role}/diseases`}
                          data-dropdown-key="tests_C"
                          data-title="diseases"
                          data-id="diseases-tests"
                          active={activeItem === "diseases-tests"}
                        >
                          diseases
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  )}

                  {/* Reception - Admin, Receptionist */}
                  {(user?.role === "admin" ||
                    user?.role === "receptionist") && (
                    <Dropdown className="mx-1 mb-1">
                      <Dropdown.Toggle
                        id="dropdown-basic"
                        className={`nav-button ${
                          [
                            "vault",
                            "invoices",
                            "patients",
                            "patients-analytics",
                          ].includes(activeItem)
                            ? "active-dropdown"
                            : ""
                        }`}
                      >
                        <Users size={18} className="me-1 mb-1" />
                        {titles.Rec}
                      </Dropdown.Toggle>

                      <Dropdown.Menu>
                        {user?.role === "admin" && (
                          <Dropdown.Item
                            as={Link}
                            to={`${prefix}/${user?.role}/vault`}
                            data-dropdown-key="Rec"
                            data-title="Vault(under construction)"
                            data-id="vault"
                            active={activeItem === "vault"}
                          >
                            Vault(under construction)
                          </Dropdown.Item>
                        )}
                        <Dropdown.Item
                          as={Link}
                          to={`${prefix}/${user?.role}/invoices`}
                          data-dropdown-key="Rec"
                          data-title="Invoices"
                          data-id="invoices"
                          active={activeItem === "invoices"}
                        >
                          Invoices
                        </Dropdown.Item>
                        <Dropdown.Item
                          as={Link}
                          to={`${prefix}/${user?.role}/patients`}
                          data-dropdown-key="Rec"
                          data-title="Patients"
                          data-id="patients"
                          active={activeItem === "patients"}
                        >
                          Patients
                        </Dropdown.Item>
                        {user?.role === "admin" && (
                          <>
                            <Dropdown.Item
                              as={Link}
                              to={`${prefix}/${user?.role}/patients/analytics`}
                              data-dropdown-key="Rec"
                              data-title="Patients Analytics"
                              data-id="patients-analytics"
                              active={activeItem === "patients-analytics"}
                            >
                              Patients Analytics
                            </Dropdown.Item>
                          </>
                        )}
                      </Dropdown.Menu>
                    </Dropdown>
                  )}

                  {/* Medical Reports - Admin, Chemist, Receptionist, Doctor, Employee */}
                  {(user?.role === "admin" ||
                    user?.role === "chemist" ||
                    user?.role === "receptionist" ||
                    user?.role === "doctor" ||
                    user?.role === "employee") && (
                    <Dropdown className="mx-1 mb-1">
                      <Dropdown.Toggle
                        variant="outline-light"
                        id="dropdown-basic"
                        className={`nav-button ${
                          ["all-medical-reports"].includes(activeItem)
                            ? "active-dropdown"
                            : ""
                        }`}
                      >
                        <FileText size={18} className="me-1 mb-1" />
                        {titles.MedicalReports}
                      </Dropdown.Toggle>

                      <Dropdown.Menu>
                        <Dropdown.Item
                          as={Link}
                          to={`${prefix}/${user?.role}/medical-reports`}
                          data-dropdown-key="MedicalReports"
                          data-title="All Medical Reports"
                          data-id="all-medical-reports"
                          active={activeItem === "all-medical-reports"}
                        >
                          All Medical Reports
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  )}

                  {/* Employee View Only Section */}
                  {user?.role === "employee" && (
                    <Dropdown className="mx-1 mb-1">
                      <Dropdown.Toggle
                        variant="outline-light"
                        id="dropdown-employee-view"
                        className={`nav-button`}
                      >
                        <Eye size={16} className="me-1" />
                        View Only
                      </Dropdown.Toggle>
                      <Dropdown.Menu>
                        <Dropdown.Item
                          as={Link}
                          to={`${prefix}/admin/invoices`}
                        >
                          Invoices
                        </Dropdown.Item>
                        <Dropdown.Item
                          as={Link}
                          to={`${prefix}/${user?.role}/payment-methods`}
                        >
                          Payment Methods
                        </Dropdown.Item>
                        <Dropdown.Item
                          as={Link}
                          to={`${prefix}/${user?.role}/test-groups`}
                        >
                          Test Groups
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  )}

                  {/* Accounting - Admin only */}
                  {user?.role === "admin" && (
                    <Dropdown className="mx-1 mb-1">
                      <Dropdown.Toggle
                        id="dropdown-basic"
                        className={`nav-button ${
                          ["payment-methods"].includes(activeItem)
                            ? "active-dropdown"
                            : ""
                        }`}
                      >
                        <DollarSignIcon size={18} className="me-1 mb-1" />
                        {titles.Accounting}
                      </Dropdown.Toggle>

                      <Dropdown.Menu>
                        <Dropdown.Item
                          as={Link}
                          to={`${prefix}/${user?.role}/payment-methods`}
                          data-dropdown-key="Accounting"
                          data-title="Payment Methods"
                          data-id="payment-methods"
                          active={activeItem === "payment-methods"}
                        >
                          Payment Methods
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  )}

                  {/* Admin-only links */}
                  {user?.role === "admin" && (
                    <Dropdown className="mx-1 mb-1">
                      <Dropdown.Toggle
                        id="dropdown-basic"
                        className={`nav-button ${
                          ["branches", "employees", "lab-management"].includes(
                            activeItem
                          )
                            ? "active-dropdown"
                            : ""
                        }`}
                      >
                        <Settings size={18} className="me-1 mb-1" />
                        {titles.Manage_B}
                      </Dropdown.Toggle>
                      <Dropdown.Menu>
                        <Dropdown.Item
                          as={Link}
                          to={`${prefix}/${user?.role}/branches`}
                          data-dropdown-key="Manage_B"
                          data-title="Branches"
                          data-id="branches"
                          active={activeItem === "branches"}
                        >
                          Branches
                        </Dropdown.Item>
                        <Dropdown.Item
                          as={Link}
                          to={`${prefix}/${user?.role}/employees`}
                          data-dropdown-key="Manage_B"
                          data-title="Employee Management"
                          data-id="employees"
                          active={activeItem === "employees"}
                        >
                          Employee Management
                        </Dropdown.Item>
                        <Dropdown.Item
                          as={Link}
                          to={`${prefix}/${user?.role}/lab-management`}
                          data-dropdown-key="Manage_B"
                          data-title="Lab Ops Center"
                          data-id="lab-management"
                          active={activeItem === "lab-management"}
                        >
                          Lab Ops Center
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  )}
                </>
              )}

              {/* Patient Links */}
              {user?.role === "patient" && (
                <>
                  <Nav.Link
                    as={Link}
                    to={`${prefix}/patient/profile`}
                    className="d-flex flex-column align-items-center mx-2 mb-1 nav-button"
                  >
                    <User size={18} className="mb-1" /> Profile
                  </Nav.Link>
                  <Nav.Link
                    as={Link}
                    to={`${prefix}/patient/reports`}
                    className="d-flex flex-column align-items-center mx-2 mb-1 nav-button"
                  >
                    <FlaskConical size={18} className="mb-1" /> Reports
                  </Nav.Link>
                </>
            )}
            </Nav>
            <Nav className="d-flex align-items-center">
              {/* Logout Link */}
              
              {user ? (
                <>
                  <Nav.Link
                    as={Link}
                    to="/"
                    onClick={handleLogout}
                    className="logout-link"
                    aria-label="Logout"
                  >
                    <DoorClosed className="door-icon door-closed" size={30} aria-hidden="true" />
                    <DoorOpen className="door-icon door-open" size={30} aria-hidden="true" />
                    <span className="ms-2 fw-medium d-none d-lg-inline">Logout</span>
                  </Nav.Link>
                </>
              ) : (
                <Button
                  as={Link}
                  to="/login"
                  variant="primary"
                  onClick={() => setExpanded(false)}
                  className="ms-2 px-4 fw-bold shadow-sm rounded-pill login-btn-glow"
                  style={{
                    border: "none",
                    letterSpacing: "0.5px",
                    transition: "all 0.3s ease"
                  }}
                >
                  Login
                </Button>
              )}
            </Nav>
          </Navbar.Collapse>
              </Container>
      </Navbar>
      {user && (
        <div className={`welcome-label ${showWelcome ? "visible" : "hidden"}`}>
          <span>👋 Welcome back, {user.name || "User"}!</span>
        </div>
      )}
    </>
  );
};

export default MainNavBar;
