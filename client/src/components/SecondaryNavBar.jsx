import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Navbar, Nav, Container, Button, Dropdown } from "react-bootstrap";
import { Users, FileText, User, FlaskConical, Eye } from "lucide-react";
import useLabPrefix from '../hooks/useLabPrefix';

const SecondaryNavBar = () => {
  const { user } = useAuth();
  const prefix = useLabPrefix();

  return (
    <Navbar 
      expand="lg" 
      sticky="top"
      className="text-white pt-4 mt-5" 
      style={{
        background: 'linear-gradient(90deg, rgb(29, 73, 142) 0%, rgb(52, 152, 219) 100%)',
        border: 'none',
        boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)',
        
      }}
    >
      <Container className="d-flex justify-content-evenly">
        {/* Test Groups Dropdown for admin, chemist, receptionist */}
        {(user?.role === "admin" || user?.role === "chemist" || user?.role === "receptionist") && (
          <Dropdown className="mx-1 mb-1 ">
            <Dropdown.Toggle 
              variant="outline-light" 
              id="dropdown-testgroups"
              style={{
                borderRadius: '20px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                padding: '6px 12px',
                fontSize: '0.85rem',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                whiteSpace: 'nowrap',
                transform: 'translateY(0)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px) scale(1.02)';
                e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0) scale(1)';
                e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }}
            >
              Test Groups
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item as={Link} to={`${prefix}/admin/test-groups`}>
                Test Groups
              </Dropdown.Item>
              <Dropdown.Item as={Link} to={`${prefix}/admin/test-group-categories`}>
                Categories
              </Dropdown.Item>
              <Dropdown.Item as={Link} to={`${prefix}/admin/test-group-components`}>
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
                  variant="outline-light" 
                  id="dropdown-basic"
                  style={{
                    borderRadius: '20px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    padding: '6px 12px',
                    fontSize: '0.85rem',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    whiteSpace: 'nowrap',
                    transform: 'translateY(0)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px) scale(1.02)';
                    e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0) scale(1)';
                    e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                  }}
                >
                  Tests & Cultures
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  {user?.role === "admin" && (
                    <>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/categories`}>
                        categories
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/tests`}>
                        tests
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/sample-types`}>
                        sample types
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/culture-options`}>
                        culture options
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/antibiotics`}>
                        antibiotics
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/packages-offers`}>
                        packages & offers
                      </Dropdown.Item>
                    </>
                  )}
                  {(user?.role === "chemist" || user?.role === "employee") && (
                    <>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/categories`}>
                        categories
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/tests`}>
                        tests
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/sample-types`}>
                        sample types
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/culture-options`}>
                        culture options
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/antibiotics`}>
                        antibiotics
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/packages-offers`}>
                        packages & offers
                      </Dropdown.Item>
                    </>
                  )}
                  <Dropdown.Item as={Link} to={`${prefix}/admin/cultures`}>
                    culture
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to={`${prefix}/admin/diseases`}>
                    diseases
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            )}

            {/* Reception - Admin, Receptionist */}
            {(user?.role === "admin" || user?.role === "receptionist") && (
              <Dropdown className="mx-1 mb-1">
                <Dropdown.Toggle 
                  variant="outline-light" 
                  id="dropdown-basic"
                  style={{
                    borderRadius: '20px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    padding: '6px 12px',
                    fontSize: '0.85rem',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    whiteSpace: 'nowrap',
                    transform: 'translateY(0)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px) scale(1.02)';
                    e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0) scale(1)';
                    e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                  }}
                >
                  Reception
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  {user?.role === "admin" && (
                  <Dropdown.Item as={Link} to={`${prefix}/admin/vault`}>
                    Vault(under construction)
                  </Dropdown.Item>
                  )}
                  <Dropdown.Item as={Link} to={`${prefix}/admin/invoices`}>
                    Invoices
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to={`${prefix}/admin/patients`}>
                    Patients
                  </Dropdown.Item>
                  {user?.role === "admin" && (
                    <>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/patients/analytics`}>
                        Patients Analytics
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to={`${prefix}/admin/know-us`}>
                        Know us
                      </Dropdown.Item>
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
                  style={{
                    borderRadius: '20px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    padding: '6px 12px',
                    fontSize: '0.85rem',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    whiteSpace: 'nowrap',
                    transform: 'translateY(0)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px) scale(1.02)';
                    e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0) scale(1)';
                    e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                  }}
                >
                  Medical Reports
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  <Dropdown.Item as={Link} to={`${prefix}/admin/medical-reports`}>
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
                  style={{
                    borderRadius: '20px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    padding: '6px 12px',
                    fontSize: '0.85rem',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    whiteSpace: 'nowrap',
                    transform: 'translateY(0)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px) scale(1.02)';
                    e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0) scale(1)';
                    e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                  }}
                >
                  <Eye size={16} className="me-1" />
                  View Only
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item as={Link} to={`${prefix}/admin/invoices`}>
                    Invoices
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to={`${prefix}/admin/payment-methods`}>
                    Payment Methods
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to={`${prefix}/admin/test-groups`}>
                    Test Groups
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            )}

            {/* Accounting - Admin only */}
            {user?.role === "admin" && (
              <Dropdown className="mx-1 mb-1">
                <Dropdown.Toggle 
                  variant="outline-light" 
                  id="dropdown-basic"
                  style={{
                    borderRadius: '20px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    padding: '6px 12px',
                    fontSize: '0.85rem',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    whiteSpace: 'nowrap',
                    transform: 'translateY(0)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px) scale(1.02)';
                    e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0) scale(1)';
                    e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                  }}
                >
                  Accounting
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  <Dropdown.Item
                    as={Link}
                    to={`${prefix}/admin/payment-methods`}
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
                  variant="outline-light" 
                  id="dropdown-manage-branches"
                  style={{
                    borderRadius: '20px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    padding: '6px 12px',
                    fontSize: '0.85rem',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    whiteSpace: 'nowrap',
                    transform: 'translateY(0)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px) scale(1.02)';
                    e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0) scale(1)';
                    e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                  }}
                >
                  Manage Branches
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item as={Link} to={`${prefix}/admin/branches`}>
                    Branches
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to={`${prefix}/admin/employees`}>
                    Employee Management
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to={`${prefix}/admin/lab-management`}>
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
              to={`${prefix}/patient/dashboard/profile`}
              className="text-white d-flex flex-column align-items-center mx-2 mb-1"
              style={{
                borderRadius: '15px',
                padding: '8px 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                fontSize: '0.85rem',
                whiteSpace: 'nowrap',
                transform: 'translateY(0)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px) scale(1.02)';
                e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0) scale(1)';
                e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              <User size={20} className="mb-1" /> Profile
            </Nav.Link>
            <Nav.Link
              as={Link}
              to={`${prefix}/patient/dashboard/reports`}
              className="text-white d-flex flex-column align-items-center mx-2 mb-1"
              style={{
                borderRadius: '15px',
                padding: '8px 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                fontSize: '0.85rem',
                whiteSpace: 'nowrap',
                transform: 'translateY(0)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px) scale(1.02)';
                e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0) scale(1)';
                e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              <FlaskConical size={20} className="mb-1" /> Reports
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
