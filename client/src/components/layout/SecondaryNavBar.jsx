import React from "react";
import { useState, useRef } from "react";
import { useEffect } from 'react';
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Navbar, Nav, Container, Button, Dropdown } from "react-bootstrap";
import { Users, FileText, User, FlaskConical, Eye, Database, DollarSignIcon, Settings } from "lucide-react";
import useLabPrefix from '../../hooks/useLabPrefix';
import '../../styles/layout/SecondaryNavBar.css';

export const defaultTitles = {
  testGroups: "Test Groups",
  tests_C: "Tests & Cultures",
  Rec: "Reception",
  MedicalReports: "Medical Reports",
  Accounting: "Accounting", 
  Manage_B: "Manage Branches"
};
let navbarTitlesReset = null;
export const resetNavbarTitles = () => {
  if (navbarTitlesReset) {
    navbarTitlesReset(defaultTitles);
  }
};

const SecondaryNavBar = () => {
  const { user } = useAuth();
  const prefix = useLabPrefix();
  const [titles, setTitles] = useState(defaultTitles);
  useEffect(() => {
    navbarTitlesReset = setTitles;
    return () => {
      navbarTitlesReset = null;
  };
  }, []);
  const handleNavClick = (e) => {
    const dropdownItem = e.target.closest('[data-dropdown-key]');
    if (dropdownItem) {
      const dropdownKey = dropdownItem.getAttribute('data-dropdown-key');
      const newTitle = dropdownItem.getAttribute('data-title');
      if (dropdownKey && newTitle) {
        setTitles({
          ...defaultTitles,
          [dropdownKey]: newTitle
        });
      }
    }
  };
  return (
    <Navbar 
      expand="lg" 
      sticky="top"
      className="text-white pt-4 mt-5" 
      onClick={handleNavClick} 
      style={{
        background: 'white',
        border: 'none',
        boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)',
      }}
    >
      <Container className="d-flex align-items-center justify-content-center">
        {/* Test Groups Dropdown for admin, chemist, receptionist */}
        {(user?.role === "admin" || user?.role === "chemist" || user?.role === "receptionist") && (
          <Dropdown className="mx-1 mb-1">
            <Dropdown.Toggle 
              id="dropdown-basic"
              className="nav-button"
            >
              <FlaskConical size={18} className="me-1 mb-1" />
              {titles.testGroups}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item as={Link} to={`${prefix}/admin/test-groups`} data-dropdown-key="testGroups"
                data-title="Test Groups">
                Test Groups
              </Dropdown.Item>
              <Dropdown.Item as={Link} to={`${prefix}/admin/test-group-categories`} data-dropdown-key="testGroups"
                data-title="Categories">
                Categories
              </Dropdown.Item>
              <Dropdown.Item as={Link} to={`${prefix}/admin/test-group-components`} data-dropdown-key="testGroups"
                data-title="Components">
                Components
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        )}
        {/* Employee Links - Different access based on role */}
        {(user?.role === "admin" || user?.role === "receptionist" || user?.role === "chemist" || user?.role === "doctor" || user?.role === "employee") && (
          <>
            {/* Tests & Cultures - Admin, Chemist, Employee */}
            {(user?.role === "admin" || user?.role === "chemist" || user?.role === "employee") && (
              <Dropdown className="mx-1 mb-1">
                <Dropdown.Toggle 
                  id="dropdown-basic"
                >
                  <Database size={18} className="me-1 mb-1"/>{titles.tests_C}
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  {user?.role === "admin" && (
                    <>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/categories`} data-dropdown-key="tests_C"
                data-title="categories">
                        categories
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/tests`} data-dropdown-key="tests_C"
                data-title="tests">
                        tests
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/sample-types`} data-dropdown-key="tests_C"
                data-title="sample types">
                        sample types
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/culture-options`} data-dropdown-key="tests_C"
                data-title="culture options">
                        culture options
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/antibiotics`} data-dropdown-key="tests_C"
                data-title="antibiotics">
                        antibiotics
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/packages-offers`} data-dropdown-key="tests_C"
                data-title="packages & offers">
                        packages & offers
                      </Dropdown.Item>
                    </>
                  )}
                  {(user?.role === "chemist" || user?.role === "employee") && (
                    <>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/categories`} 
                      data-dropdown-key="tests_C"
                data-title="categories"
                >
                        categories
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/tests`}
                      data-dropdown-key="tests_C"
                data-title="tests"
                >
                        tests
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/sample-types`}
                      data-dropdown-key="tests_C"
                data-title="sample types"
                >
                        sample types
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/culture-options`}
                      data-dropdown-key="tests_C"
                data-title="culture options"
                >
                        culture options
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/antibiotics`}
                      data-dropdown-key="tests_C"
                data-title="antibiotics"
                >
                        antibiotics
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/packages-offers`}
                      data-dropdown-key="tests_C"
                data-title="packages & offers"
                >
                        packages & offers
                      </Dropdown.Item>
                    </>
                  )}
                  <Dropdown.Item as={Link} to={`${prefix}/admin/cultures`}
                  data-dropdown-key="tests_C"
                data-title="culture"
                >
                    culture
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to={`${prefix}/admin/diseases`}
                  data-dropdown-key="tests_C"
                data-title="diseases"
                >
                    diseases
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            )}

            {/* Reception - Admin, Receptionist */}
            {(user?.role === "admin" || user?.role === "receptionist") && (
              <Dropdown className="mx-1 mb-1">
                <Dropdown.Toggle 
                  id="dropdown-basic"
                >
                  <Users size={18} className="me-1 mb-1"/>{titles.Rec}
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  {user?.role === "admin" && (
                  <Dropdown.Item as={Link} to={`${prefix}/admin/vault`}
                  data-dropdown-key="Rec"
                data-title="Vault(under construction)"
                >
                    Vault(under construction)
                  </Dropdown.Item>
                  )}
                  <Dropdown.Item as={Link} to={`${prefix}/admin/invoices`}
                  data-dropdown-key="Rec"
                data-title="Invoices"
                >
                    Invoices
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to={`${prefix}/admin/patients`}
                  data-dropdown-key="Rec"
                data-title="Patients"
                >
                    Patients
                  </Dropdown.Item>
                  {user?.role === "admin" && (
                    <>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/patients/analytics`}
                      data-dropdown-key="Rec"
                data-title="Patients Analytics"
                >
                        Patients Analytics
                      </Dropdown.Item>
                      {/* <Dropdown.Item as={Link} to={`${prefix}/admin/know-us`}
                      data-dropdown-key="Rec"
                data-title="Know us"
                >
                        Know us
                      </Dropdown.Item> */}
                    </>
                  )}
                </Dropdown.Menu>
              </Dropdown>
            )}

            {/* Medical Reports - Admin, Chemist, Receptionist, Doctor, Employee */}
            {(user?.role === "admin" || user?.role === "chemist" || user?.role === "receptionist" || user?.role === "doctor" || user?.role === "employee") && (
              <Dropdown className="mx-1 mb-1">
                <Dropdown.Toggle 
                  variant="outline-light" 
                  id="dropdown-basic"
                  className="nav-button"
                >
                  <FileText size={18} className="me-1 mb-1"/>{titles.MedicalReports}
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  <Dropdown.Item as={Link} to={`${prefix}/admin/medical-reports`}
                  data-dropdown-key="MedicalReports"
                data-title="All Medical Reports"
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
                  className="nav-button"
                >
                  <Eye size={16} className="me-1" />
                  View Only
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item as={Link} to={`${prefix}/admin/invoices`}
                  >
                    Invoices
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to={`${prefix}/admin/payment-methods`}
                  
                >
                    Payment Methods
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to={`${prefix}/admin/test-groups`}
                  
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
                >
                  <DollarSignIcon size={18} className="me-1 mb-1"/>{titles.Accounting}
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  <Dropdown.Item
                    as={Link}
                    to={`${prefix}/admin/payment-methods`}
                    data-dropdown-key="Accounting"
                  data-title="Payment Methods"
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
                >
                  <Settings size={18} className="me-1 mb-1"/>
                  {titles.Manage_B}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item as={Link} to={`${prefix}/admin/branches`}
                  data-dropdown-key="Manage_B"
                data-title="Branches"
                >
                    Branches
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to={`${prefix}/admin/employees`}
                  data-dropdown-key="Manage_B"
                data-title="Employee Management"
                >
                    Employee Management
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to={`${prefix}/admin/lab-management`}
                  data-dropdown-key="Manage_B"
                data-title="Lab Ops Center"
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
      </Container>
    </Navbar>
  );
};

SecondaryNavBar.propTypes = {
  isMenuOpen: PropTypes.bool,
};

export default SecondaryNavBar;