import React, { useState, useEffect } from "react";
import { Navbar, Nav, Container, NavbarText, Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Moon, Sun } from "lucide-react";

const MainNavBar = () => {
  const { user, loading, error, refreshUser, logout } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    // Refresh user data on component mount
    if (!user && !loading) {
      refreshUser();
    }
  }, [user, loading, refreshUser]);


  const handleLogout = () => {
    logout();
    setExpanded(false); // Close navbar after logout
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <Navbar 
      expand="lg" 
      sticky="top" 
      data-bs-theme="dark" 
      expanded={expanded}
      style={{
        background: 'linear-gradient(90deg, rgb(29, 73, 142) 0%, rgb(52, 152, 219) 100%)',
        boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)',
        border: 'none'
      }}
    >
      <Container>
        <Navbar.Brand as={Link} to="/" onClick={() => setExpanded(false)}>
          Doctors Lab
        </Navbar.Brand>
        <Navbar.Toggle 
          aria-controls="basic-navbar-nav" 
          onClick={() => setExpanded(expanded ? false : true)} 
        />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {user?.role === "admin" ? (
              <Nav.Link as={Link} to="/admin/dashboard" onClick={() => setExpanded(false)}>
                Admin Dashboard
              </Nav.Link>
            ) : user?.role === "receptionist" ? (
              <Nav.Link as={Link} to="/receptionist/dashboard" onClick={() => setExpanded(false)}>
                Receptionist Dashboard
              </Nav.Link>
            ) : user?.role === "chemist" ? (
              <Nav.Link as={Link} to="/chemist/dashboard" onClick={() => setExpanded(false)}>
                Chemist Dashboard
              </Nav.Link>
            ) : user?.role === "doctor" ? (
              <Nav.Link as={Link} to="/doctor/dashboard" onClick={() => setExpanded(false)}>
                Doctor Dashboard
              </Nav.Link>
            ) : user?.role === "employee" ? (
              <Nav.Link as={Link} to="/employee/dashboard" onClick={() => setExpanded(false)}>
                Employee Dashboard
              </Nav.Link>
            ) : user?.role === "patient" ? (
              <Nav.Link as={Link} to="/patient/dashboard" onClick={() => setExpanded(false)}>
                Patient Dashboard
              </Nav.Link>
            ) : null}
          </Nav>
          <Nav>
            {user ? (
              <>
                <NavbarText className="me-2">
                  Welcome {user.name || 'User'}
                </NavbarText>
                <Nav.Link as={Link} to="/" onClick={handleLogout}>
                  Logout
                </Nav.Link>
              </>
            ) : (
              <Nav.Link as={Link} to="/login" onClick={() => setExpanded(false)}>
                Login
              </Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default MainNavBar;
