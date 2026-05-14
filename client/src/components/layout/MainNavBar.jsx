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
import { useToast } from "../ui/ToastContext";

import ThemeToggle from "../ui/ThemeToggle";

import {
  DoorClosed,
  DoorOpen,
  House,
  Users,
  FileText,
  User,
  Eye,
  Database,
  DollarSignIcon,
  Settings,
  ChevronDown,
  Boxes,
  Bell,
  Receipt,
} from "lucide-react";

import api from "../../utils/api";

import labIcon from "../../assets/BlueLogoIconWithWhiteRoundBg.webp";
import labIconDark from "../../assets/WhiteLogoWithTransparentRoundBg.webp";
import { getSubdomain } from "../../utils/subdomain";
import { useAuth } from "../../context/AuthContext";
import { useLab } from "../../context/LabContext";
import { useTheme } from "../../context/ThemeContext";
import VersionBadge from "../ui/VersionBadge";

import { formatDateTime } from "../../utils/dateFormatter";
import "../../styles/MainNavBar.css";

export const defaultTitles = {
  tests_C: "Tests Catalog",
  Rec: "Reception",
  MedicalReports: "Medical Reports",
  Accounting: "Accounting",
  Manage_B: "Manage Branches",
  Inventory: "Inventory",
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
  const { toast } = useToast();
  const { user, loading: authLoading, refreshUser, logout } = useAuth();
  const { terminateLabInfo, loading: labLoading, labInfo } = useLab();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const logoutTimerRef = useRef(null);

  const [titles, setTitles] = useState(() => {
    const saved = localStorage.getItem("navbar-titles");
    return saved ? JSON.parse(saved) : defaultTitles;
  });
  const [showWelcome, setShowWelcome] = useState(true);
  // Logic merged into the useEffect below (line 200+)
  useEffect(() => {
    localStorage.setItem("navbar-titles", JSON.stringify(titles));
  }, [titles]);
  const [activeItem, setActiveItem] = useState(() => {
    // Recover saved dropdown item on mount
    return localStorage.getItem("active-dropdown-item") || null;
  });
  const [expanded, setExpanded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // --- Notification Bell State ---
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  // Fetch all notifications (only for admin/chemist)
  const fetchNotifications = async () => {
    try {
      // Fetch all statuses so read notifications remain visible
      const res = await api.get("/inventory/notifications?status=ALL");
      setNotifications(res.data);
    } catch (error) {
      // Silently fail — notifications are non-critical
      console.error("Error fetching notifications:", error);
    }
  };

  // Compute unread count for the badge (only unread notifications)
  const unreadCount = notifications.filter(n => n.status === 'UNREAD').length;

  // Fetch on mount and listen for real-time updates from LabLayout
  useEffect(() => {
    if (user?.lab_id && (user.role === 'admin' || user.role === 'chemist')) {
      fetchNotifications();

      const handleNotificationUpdate = () => fetchNotifications();
      window.addEventListener('inventory-notification-update', handleNotificationUpdate);
      return () => window.removeEventListener('inventory-notification-update', handleNotificationUpdate);
    }
  }, [user]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark a single notification as read (keep it in the list, just update status)
  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.put(`/inventory/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, status: 'READ' } : n)
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all notifications as read (keep them in the list with READ status)
  const handleMarkAllRead = async () => {
    try {
      await api.put("/inventory/notifications/read-all");
      setNotifications(prev =>
        prev.map(n => ({ ...n, status: 'READ' }))
      );
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  // Get alert type styling
  const getAlertStyle = (alertType) => {
    switch (alertType) {
      case 'LOW_STOCK': return { color: '#dc3545', icon: '📉', label: 'Low Stock' };
      case 'EXPIRING_SOON': return { color: '#ffc107', icon: '⏰', label: 'Expiring Soon' };
      case 'EXPIRED': return { color: '#dc3545', icon: '❌', label: 'Expired' };
      default: return { color: '#6c757d', icon: 'ℹ️', label: 'Alert' };
    }
  };

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

  // Sync active item and dropdown title with current route dynamically.
  // This ensures the navbar correctly highlights when navigating via URL
  // (e.g., clicking a Kanban card) rather than clicking a navbar dropdown item.
  useEffect(() => {
    const path = location.pathname;
    if (path.includes("/samples-kanban")) {
      setActiveItem("samples-kanban");
      setTitles(prev => ({ ...prev, MedicalReports: "Samples Kanban" }));
    } else if (path.includes("/medical-reports")) {
      setActiveItem("all-medical-reports");
      setTitles(prev => ({ ...prev, MedicalReports: "All Medical Reports" }));
    } else if (path.includes("/inventory/items")) {
      setActiveItem("inventory-items");
      setTitles(prev => ({ ...prev, Inventory: "Catalog & Stock" }));
    } else if (path.includes("/inventory/suppliers")) {
      setActiveItem("inventory-suppliers");
      setTitles(prev => ({ ...prev, Inventory: "Suppliers" }));
    } else if (path.includes("/inventory")) {
      setActiveItem("inventory-dashboard");
      setTitles(prev => ({ ...prev, Inventory: "Inventory" }));
    } else if (path.includes("/dashboard")) {
      setActiveItem(null);
      setTitles(defaultTitles);
    }
  }, [location.pathname]);

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
        if (logoutTimerRef.current) return;

        toast.error("Your session has expired. Please login again.", { duration: 3000 });
        logoutTimerRef.current = setTimeout(() => {
          logout();
          terminateLabInfo();
          window.location.href = "/login";
        }, 3000);
      }
    }

    return () => {
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
    };
  }, [user, authLoading, refreshUser, logout, terminateLabInfo]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.chevron-menu-wrapper')) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleNavClick = (e) => {
    if (!e.target.closest('.chevron-menu-wrapper')) {
      setIsProfileOpen(false);
    }

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
    toast.success("You have been logged out successfully.");
    logout();
    terminateLabInfo();
    navigate("/login");
    setExpanded(false);
  };


  useEffect(() => {
    if (!user) return;

    // Trigger welcome message
    setShowWelcome(true);

    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 5000);

    // Use IntersectionObserver instead of scroll listener to toggle welcome label
    // This watches a sentinel element at the top of the page (usually in Layout or HomePage)
    const observer = new IntersectionObserver(
      ([entry]) => {
        // If sentinel is not intersecting, it means we've scrolled down
        if (!entry.isIntersecting) {
          setShowWelcome(false);
        }
      },
      { threshold: 0 }
    );

    const sentinel = document.getElementById('scroll-sentinel');
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      clearTimeout(timer);
      if (sentinel) observer.unobserve(sentinel);
      observer.disconnect();
    };
  }, [user]);

  return (
    <>
      <Navbar
        expand="xl"
        sticky="top"
        expanded={expanded}
        collapseOnSelect
        onClick={handleNavClick}
        className="pt-2 px-3 d-flex align-items-center"
        style={{
          background: "transparent",
          color: "var(--text)",
          border: "none",
          boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.1)",
          borderBottom: "1px solid var(--border)",
          zIndex: 1050,
          WebkitBackdropFilter: "blur(12px)",
          backdropFilter: "blur(12px)",
          willChange: "transform, backdrop-filter", // Hardware acceleration
        }}
      >
        <Container fluid>
          <Navbar.Brand
            as={getSubdomain() ? "a" : Link}
            to={getSubdomain() ? undefined : "/"}
            href={getSubdomain() ? `${window.location.protocol}//${window.location.host.replace(getSubdomain() + '.', '')}` : undefined}
            onClick={() => setExpanded(false)}
          >
            <img
              src={theme === 'dark' ? labIconDark : labIcon}
              alt=""
              style={{ width: "50px", height: "50px", borderRadius: "50%" }}
            />
            <span
              style={{
                marginLeft: "10px",
                marginTop: "15px",
                fontSize: "clamp(16px, 2.5vw, 20px)",
                fontWeight: "bold",
                color: "var(--text)",
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
              {!labInfo || labLoading ? (
                user && <Nav.Link disabled>Loading...</Nav.Link>
              ) : user?.role === "admin" ? (
                <Nav.Link
                  as={Link}
                  to={`/admin/dashboard`}
                  onClick={() => setExpanded(false)}
                  disabled={!labInfo || labLoading}
                  aria-label="Admin Dashboard"
                >
                  <House size={23} aria-hidden="true" />
                  {/* {prefix ? "Admin Dashboard" : "Loading..."} */}
                </Nav.Link>
              ) : user?.role === "receptionist" ? (
                <Nav.Link
                  as={Link}
                  to={`/receptionist/dashboard`}
                  onClick={() => setExpanded(false)}
                  disabled={!labInfo || labLoading}
                  aria-label="Receptionist Dashboard"
                >
                  <House size={23} aria-hidden="true" />
                  {/* {prefix ? "Receptionist Dashboard" : "Loading..."} */}
                </Nav.Link>
              ) : user?.role === "chemist" ? (
                <Nav.Link
                  as={Link}
                  to={`/chemist/dashboard`}
                  onClick={() => setExpanded(false)}
                  disabled={!labInfo || labLoading}
                  aria-label="Chemist Dashboard"
                >
                  <House size={23} aria-hidden="true" />
                  {/* {prefix ? 'Chemist Dashboard' : 'Loading...'} */}
                </Nav.Link>
              ) : user?.role === "doctor" ? (
                <Nav.Link
                  as={Link}
                  to={`/doctor/dashboard`}
                  onClick={() => setExpanded(false)}
                  disabled={!labInfo || labLoading}
                  aria-label="Doctor Dashboard"
                >
                  <House size={23} aria-hidden="true" />
                  {/* {prefix ? 'Doctor Dashboard' : 'Loading...'} */}
                </Nav.Link>
              ) : user?.role === "employee" ? (
                <Nav.Link
                  as={Link}
                  to={`/employee/dashboard`}
                  onClick={() => setExpanded(false)}
                  disabled={!labInfo || labLoading}
                  aria-label="Employee Dashboard"
                >
                  <House size={23} aria-hidden="true" />
                  {/* {prefix ? 'Employee Dashboard' : 'Loading...'} */}
                </Nav.Link>
              ) : user?.role === "patient" ? (
                <Nav.Link
                  as={Link}
                  to={`/patient/dashboard`}
                  onClick={() => setExpanded(false)}
                  disabled={!labInfo || labLoading}
                  aria-label="Patient Dashboard"
                >
                  <House size={23} aria-hidden="true" />
                  {/* {prefix ? 'Patient Dashboard' : 'Loading...'} */}
                </Nav.Link>
              ) : null}

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
                            className={`nav-button ${[
                              "categories-tests",
                              "tests-tests",
                              "sample-types-tests",
                              "packages-offers",

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
                                  to={`/${user?.role}/categories`}
                                  data-dropdown-key="tests_C"
                                  data-title="categories"
                                  data-id="categories-tests"
                                  active={activeItem === "categories-tests"}
                                >
                                  categories
                                </Dropdown.Item>
                                <Dropdown.Item
                                  as={Link}
                                  to={`/${user?.role}/tests`}
                                  data-dropdown-key="tests_C"
                                  data-title="tests"
                                  data-id="tests-tests"
                                  active={activeItem === "tests-tests"}
                                >
                                  tests
                                </Dropdown.Item>
                                <Dropdown.Item
                                  as={Link}
                                  to={`/${user?.role}/sample-types`}
                                  data-dropdown-key="tests_C"
                                  data-title="sample types"
                                  data-id="sample-types-tests"
                                  active={activeItem === "sample-types-tests"}
                                >
                                  sample types
                                </Dropdown.Item>
                                <Dropdown.Item
                                  as={Link}
                                  to={`/${user?.role}/packages-and-offers`}
                                  data-dropdown-key="tests_C"
                                  data-title="packages & offers"
                                  data-id="packages-offers" // 👈 Add this
                                  active={activeItem === "packages-offers"} // 👈 Add this
                                >
                                  packages & offers
                                </Dropdown.Item>
                                <Dropdown.Item
                                  as={Link}
                                  to={`/${user?.role}/antibiotics`}
                                  data-dropdown-key="tests_C"
                                  data-title="antibiotics"
                                  data-id="antibiotics-tests"
                                  active={activeItem === "antibiotics-tests"}
                                >
                                  antibiotics
                                </Dropdown.Item>
                              </>
                            )}
                            {(user?.role === "chemist" ||
                              user?.role === "employee") && (
                                <>
                                  <Dropdown.Item
                                    as={Link}
                                    to={`/${user?.role}/categories`}
                                    data-dropdown-key="tests_C"
                                    data-title="categories"
                                    data-id="categories-tests"
                                    active={activeItem === "categories-tests"}
                                  >
                                    categories
                                  </Dropdown.Item>
                                  <Dropdown.Item
                                    as={Link}
                                    to={`/${user?.role}/tests`}
                                    data-dropdown-key="tests_C"
                                    data-title="tests"
                                    data-id="tests-tests"
                                    active={activeItem === "tests-tests"}
                                  >
                                    tests
                                  </Dropdown.Item>
                                  <Dropdown.Item
                                    as={Link}
                                    to={`/${user?.role}/sample-types`}
                                    data-dropdown-key="tests_C"
                                    data-title="sample types"
                                    data-id="sample-types-tests"
                                    active={activeItem === "sample-types-tests"}
                                  >
                                    sample types
                                  </Dropdown.Item>
                                  <Dropdown.Item
                                    as={Link}
                                    to={`/${user?.role}/packages-and-offers`}
                                    data-dropdown-key="tests_C"
                                    data-title="packages & offers"
                                  >
                                    packages & offers
                                  </Dropdown.Item>
                                  <Dropdown.Item
                                    as={Link}
                                    to={`/${user?.role}/antibiotics`}
                                    data-dropdown-key="tests_C"
                                    data-title="antibiotics"
                                    data-id="antibiotics-tests"
                                    active={activeItem === "antibiotics-tests"}
                                  >
                                    antibiotics
                                  </Dropdown.Item>
                                </>
                              )}

                            <Dropdown.Item
                              as={Link}
                              to={`/${user?.role}/diseases`}
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
                            className={`nav-button ${[
                              "vault",
                              "transactions-vault",
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
                                to={`/admin/transactions`}
                                data-dropdown-key="Rec"
                                data-title="Transactions Vault"
                                data-id="transactions-vault"
                                active={activeItem === "transactions-vault"}
                              >
                                Transactions Vault
                              </Dropdown.Item>
                            )}
                            <Dropdown.Item
                              as={Link}
                              to={`/${user?.role}/invoices`}
                              data-dropdown-key="Rec"
                              data-title="Invoices"
                              data-id="invoices"
                              active={activeItem === "invoices"}
                            >
                              Invoices
                            </Dropdown.Item>
                            <Dropdown.Item
                              as={Link}
                              to={`/${user?.role}/patients`}
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
                                  to={`/${user?.role}/patients-analytics`}
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
                            className={`nav-button ${["all-medical-reports", "samples-kanban"].includes(activeItem)
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
                              to={`/${user?.role}/medical-reports`}
                              data-dropdown-key="MedicalReports"
                              data-title="All Medical Reports"
                              data-id="all-medical-reports"
                              active={activeItem === "all-medical-reports"}
                            >
                              All Medical Reports
                            </Dropdown.Item>
                            <Dropdown.Item
                              as={Link}
                              to={`/${user?.role}/samples-kanban`}
                              data-dropdown-key="MedicalReports"
                              data-title="Samples Kanban"
                              data-id="samples-kanban"
                              active={activeItem === "samples-kanban"}
                            >
                              Samples Kanban
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
                            to={`/admin/invoices`}
                          >
                            Invoices
                          </Dropdown.Item>
                          <Dropdown.Item
                            as={Link}
                            to={`/${user?.role}/payment-methods`}
                          >
                            Payment Methods
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
                            to={`/admin/invoices`}
                          >
                            Invoices
                          </Dropdown.Item>
                          <Dropdown.Item
                            as={Link}
                            to={`/${user?.role}/payment-methods`}
                          >
                            Payment Methods
                          </Dropdown.Item>
                          <Dropdown.Item
                            as={Link}
                            to={`/${user?.role}/test-groups`}
                          >
                            Test Groups
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    )}


                    {/* Inventory & Stock - Admin, Chemist */}
                    {(user?.role === "admin" || user?.role === "chemist") && (
                      <Dropdown className="mx-1 mb-1">
                        <Dropdown.Toggle
                          id="dropdown-basic"
                          className={`nav-button ${["inventory-dashboard", "inventory-suppliers", "inventory-items"].includes(activeItem)
                            ? "active-dropdown"
                            : ""
                            }`}
                        >
                          <Boxes size={18} className="me-1 mb-1" />
                          {titles.Inventory}
                        </Dropdown.Toggle>

                        <Dropdown.Menu>
                          <Dropdown.Item
                            as={Link}
                            to={`/${user?.role}/inventory`}
                            data-dropdown-key="Inventory"
                            data-title="Inventory"
                            data-id="inventory-dashboard"
                            active={activeItem === "inventory-dashboard"}
                          >
                            Dashboard
                          </Dropdown.Item>
                          <Dropdown.Item
                            as={Link}
                            to={`/${user?.role}/inventory/items`}
                            data-dropdown-key="Inventory"
                            data-title="Catalog & Stock"
                            data-id="inventory-items"
                            active={activeItem === "inventory-items"}
                          >
                            Catalog & Stock
                          </Dropdown.Item>
                          <Dropdown.Item
                            as={Link}
                            to={`/${user?.role}/inventory/suppliers`}
                            data-dropdown-key="Inventory"
                            data-title="Suppliers"
                            data-id="inventory-suppliers"
                            active={activeItem === "inventory-suppliers"}
                          >
                            Suppliers
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    )}

                    {/* Outsourced Labs — Chemist & Employee (Admin sees it in Manage Branches dropdown below) */}
                    {(user?.role === "chemist" || user?.role === "employee") && (
                      <Nav.Link
                        as={Link}
                        to={`/${user?.role}/outsourced-labs`}
                        className="d-flex flex-column align-items-center mx-2 mb-1 nav-button"
                        data-id="outsourced-labs"
                        onClick={() => setExpanded(false)}
                      >
                        Outsourced Labs
                      </Nav.Link>
                    )}

                    {/* Admin-only links */}
                    {user?.role === "admin" && (
                      <Dropdown className="mx-1 mb-1">
                        <Dropdown.Toggle
                          id="dropdown-basic"
                          className={`nav-button ${["branches", "employees", "lab-management", "outsourced-labs", "payment-methods", "manager-keys"].includes(
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
                            to={`/${user?.role}/branches`}
                            data-dropdown-key="Manage_B"
                            data-title="Branches"
                            data-id="branches"
                            active={activeItem === "branches"}
                          >
                            Branches
                          </Dropdown.Item>
                          <Dropdown.Item
                            as={Link}
                            to={`/${user?.role}/employees`}
                            data-dropdown-key="Manage_B"
                            data-title="Employee Management"
                            data-id="employees"
                            active={activeItem === "employees"}
                          >
                            Employee Management
                          </Dropdown.Item>
                          <Dropdown.Item
                            as={Link}
                            to={`/${user?.role}/lab-management`}
                            data-dropdown-key="Manage_B"
                            data-title="Lab Ops Center"
                            data-id="lab-management"
                            active={activeItem === "lab-management"}
                          >
                            Lab Ops Center
                          </Dropdown.Item>
                          <Dropdown.Item
                            as={Link}
                            to={`/admin/manager-keys`}
                            data-dropdown-key="Manage_B"
                            data-title="Manager Key Management"
                            data-id="manager-keys"
                            active={activeItem === "manager-keys"}
                          >
                            Manager Key Management
                          </Dropdown.Item>
                          <Dropdown.Item
                            as={Link}
                            to={`/${user?.role}/payment-methods`}
                            data-dropdown-key="Manage_B"
                            data-title="Payment Methods"
                            data-id="payment-methods"
                            active={activeItem === "payment-methods"}
                          >
                            Payment Methods
                          </Dropdown.Item>
                          <Dropdown.Item
                            as={Link}
                            to={`/${user?.role}/outsourced-labs`}
                            data-dropdown-key="Manage_B"
                            data-title="Outsourced Labs"
                            data-id="outsourced-labs"
                            active={activeItem === "outsourced-labs"}
                          >
                            Outsourced Labs
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
                    to={`/patient/profile`}
                    className="d-flex flex-column align-items-center mx-2 mb-1 nav-button"
                  >
                    <User size={18} className="mb-1" /> Profile
                  </Nav.Link>
                  <Nav.Link
                    as={Link}
                    to={`/patient/reports`}
                    className="d-flex flex-column align-items-center mx-2 mb-1 nav-button"
                  >
                    <FileText size={18} className="mb-1" /> Reports
                  </Nav.Link>
                  <Nav.Link
                    as={Link}
                    to={`/patient/invoices`}
                    className="d-flex flex-column align-items-center mx-2 mb-1 nav-button"
                  >
                    <Receipt size={18} className="mb-1" /> Invoices
                  </Nav.Link>
                  <Nav.Link
                    as={Link}
                    to={`/patient/transactions`}
                    className="d-flex flex-column align-items-center mx-2 mb-1 nav-button"
                  >
                    <DollarSignIcon size={18} className="mb-1" /> Financial History
                  </Nav.Link>
                </>
              )}
            </Nav>
            <Nav className="d-flex align-items-center">
              <div className="mx-3 d-flex align-items-center">
                <ThemeToggle />
              </div>

              {/* Logout Link */}
              <Nav className="d-flex align-items-center">
                {/* Notification Bell — visible only for admin/chemist */}
                {user && (user.role === 'admin' || user.role === 'chemist') && (
                  <div className="notification-bell-container" ref={notificationRef}>
                    <button
                      className="notification-bell-btn"
                      onClick={() => setShowNotifications(!showNotifications)}
                      title="Inventory Notifications"
                    >
                      <Bell size={22} />
                      {unreadCount > 0 && (
                        <span className="notification-badge">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </button>

                    {showNotifications && (
                      <div className="notification-dropdown">
                        <div className="notification-dropdown-header">
                          <span className="notification-dropdown-title">Notifications</span>
                          {unreadCount > 0 && (
                            <button
                              className="notification-mark-all-btn"
                              onClick={handleMarkAllRead}
                            >
                              Mark all read
                            </button>
                          )}
                        </div>
                        <div className="notification-dropdown-body">
                          {notifications.length === 0 ? (
                            <div className="notification-empty">
                              <Bell size={32} strokeWidth={1} />
                              <p>No new notifications</p>
                            </div>
                          ) : (
                            notifications.map(notification => {
                              const style = getAlertStyle(notification.alert_type);
                              return (
                                <div
                                  key={notification.id}
                                  className={`notification-item ${notification.status === 'READ' ? 'notification-item-read' : ''}`}
                                  onClick={() => notification.status === 'UNREAD' ? handleMarkAsRead(notification.id) : null}
                                >
                                  <div className="notification-item-icon" style={{ color: style.color }}>
                                    {style.icon}
                                  </div>
                                  <div className="notification-item-content">
                                    <span className="notification-item-label" style={{ color: style.color }}>
                                      {style.label}
                                    </span>
                                    <p className="notification-item-message">{notification.message}</p>
                                    <span className="notification-item-time">
                                      {formatDateTime(notification.createdAt)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Chevron Dropdown (Profile + Logout) */}
                {user ? (
                  <div className="chevron-menu-wrapper">
                    <button
                      className="chevron-toggle-btn"
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                    >
                      <ChevronDown
                        size={24}
                        className={`chevron-arrow ${isProfileOpen ? 'rotated' : ''}`}
                      />
                    </button>

                    <div className={`chevron-dropdown ${isProfileOpen ? 'open' : ''}`}>
                      {user?.role !== 'patient' && (
                        <Nav.Link
                          as={Link}
                          to={`/${user?.role}/profile`}
                          onClick={() => {
                            setIsProfileOpen(false);
                            setExpanded(false);
                          }}
                          className="chevron-dropdown-item"
                        >
                          <User size={18} className="me-1" />
                          <span>Profile</span>
                        </Nav.Link>
                      )}
                      <Nav.Link
                        as={Link}
                        to="/"
                        onClick={(e) => {
                          setIsProfileOpen(false);
                          handleLogout(e);
                        }}
                        className="chevron-dropdown-item logout-link"
                      >
                        <DoorClosed className="door-icon door-closed" size={22} />
                        <DoorOpen className="door-icon door-open" size={22} />
                        <span>Logout</span>
                      </Nav.Link>
                    </div>
                  </div>
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
                      transition: "all 0.3s ease",
                    }}
                  >
                    Login
                  </Button>
                )}
              </Nav>
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