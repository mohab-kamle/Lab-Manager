import React, { useState, useEffect } from "react";
import { Navbar, Nav, Container, NavbarText } from "react-bootstrap";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Moon, Sun } from "lucide-react";
import useLabPrefix from '../../hooks/useLabPrefix';
import { toast } from 'react-toastify';
import labIcon from '../../assets/LabIconWithRoundedWhiteBg.webp';
import { useLab } from "../../context/LabContext";
import VersionBadge from "../ui/VersionBadge";
const MainNavBar = () => {
  const {terminateLabInfo, loading: labLoading} = useLab();
  const { user, loading: authLoading, refreshUser, logout } = useAuth();
  const prefix = useLabPrefix();
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Debug log for MainNavBar rendering
  console.log('MainNavBar Render - prefix:', prefix, 'labLoading:', labLoading, 'user:', user, 'location.pathname:', location.pathname);

  // Handle navigation once the prefix is available
  useEffect(() => {
    console.log('useEffect [prefix, isInitialized, location.pathname, navigate, user] - prefix:', prefix, 'isInitialized:', isInitialized, 'location.pathname:', location.pathname, 'user:', user);
    if (!user) {
      return;
    }
    if (prefix && !isInitialized) {
      setIsInitialized(true);
      
      // If we're on a route with 'null' in it, redirect to the correct route
      if (location.pathname.includes('null/')) {
        const correctedPath = location.pathname.replace('null/', `${prefix}/`);
        console.log('Redirecting to:', correctedPath);
        navigate(correctedPath, { replace: true });
      }
    }
  }, [prefix, isInitialized, location.pathname, navigate, user]);

  useEffect(() => {
    console.log('useEffect [user, authLoading, refreshUser, logout, navigate] - user:', user, 'authLoading:', authLoading);
    // Refresh user data on component mount
    if (!user && !authLoading) {
      refreshUser();
    }
    // if token is not valid, redirect to login and logout (on any action of the user not just mount)
    const token = localStorage.getItem('token');
    if (token) {
      const parseJwt = (t) => {
        try {
          return JSON.parse(atob(t.split('.')[1]));
        } catch (e) {
          return null;
        }
      };
      const payload = parseJwt(token);
      if (!payload || payload.exp < Date.now() / 1000) {
        // First show the toast
        toast.error('Your session has expired. Please login again.', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "colored",
          onClose: () => {
            // Only navigate after the toast is closed
            logout();
            terminateLabInfo();
            window.location.href = '/login';
          }
        });
      }
    }
  }, [user, authLoading, refreshUser, logout, navigate, terminateLabInfo]);


  const handleLogout = () => {
    // Show logout message
    toast.success('You have been logged out successfully.', {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: "colored",
    });
    
    // Then logout and navigate
    logout();
    terminateLabInfo();
    navigate('/login');
    setExpanded(false); // Close navbar after logout
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <Navbar 
      expand="lg" 
      fixed="top" 
      data-bs-theme="white" 
      expanded={expanded}
      style={{
        background: 'white',
        boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)',
        borderBottom: '1px solid var(--border)',
        zIndex: 1050,
      }}
    >
      <Container>
        <Navbar.Brand as={Link} to="/" onClick={() => setExpanded(false)}>
          <img src={labIcon} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
          <span style={{ marginLeft: '10px', marginTop: '15px', fontSize: '20px', fontWeight: 'bold' }}>Lab Manager</span>
          
        </Navbar.Brand>
        <Navbar.Toggle 
          aria-controls="basic-navbar-nav" 
          onClick={() => setExpanded(expanded ? false : true)} 
        />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {!prefix || labLoading ? (
              user && (
                <Nav.Link disabled>Loading...</Nav.Link>
              )
            ) : user?.role === "admin" ? (
              <Nav.Link 
                as={Link} 
                to={prefix ? `${prefix}/admin/dashboard` : "#"} 
                onClick={() => setExpanded(false)}
                disabled={!prefix || labLoading}
              >
                {prefix ? 'Admin Dashboard' : 'Loading...'}
              </Nav.Link>
            ) : user?.role === "receptionist" ? (
              <Nav.Link 
                as={Link} 
                to={prefix ? `${prefix}/receptionist/dashboard` : "#"} 
                onClick={() => setExpanded(false)}
                disabled={!prefix || labLoading}
              >
                {prefix ? 'Receptionist Dashboard' : 'Loading...'}
              </Nav.Link>
            ) : user?.role === "chemist" ? (
              <Nav.Link 
                as={Link} 
                to={prefix ? `${prefix}/chemist/dashboard` : "#"} 
                onClick={() => setExpanded(false)}
                disabled={!prefix || labLoading}
              >
                {prefix ? 'Chemist Dashboard' : 'Loading...'}
              </Nav.Link>
            ) : user?.role === "doctor" ? (
              <Nav.Link 
                as={Link} 
                to={prefix ? `${prefix}/doctor/dashboard` : "#"} 
                onClick={() => setExpanded(false)}
                disabled={!prefix || labLoading}
              >
                {prefix ? 'Doctor Dashboard' : 'Loading...'}
              </Nav.Link>
            ) : user?.role === "employee" ? (
              <Nav.Link 
                as={Link} 
                to={prefix ? `${prefix}/employee/dashboard` : "#"} 
                onClick={() => setExpanded(false)}
                disabled={!prefix || labLoading}
              >
                {prefix ? 'Employee Dashboard' : 'Loading...'}
              </Nav.Link>
            ) : user?.role === "patient" ? (
              <Nav.Link 
                as={Link} 
                to={prefix ? `${prefix}/patient-dashboard` : "#"} 
                onClick={() => setExpanded(false)}
                disabled={!prefix || labLoading}
              >
                {prefix ? 'Patient Dashboard' : 'Loading...'}
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
