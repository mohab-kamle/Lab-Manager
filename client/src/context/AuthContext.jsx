import axios from "axios";
import React, { createContext, useState, useContext, useEffect } from "react";

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const apiUrl = import.meta.env.VITE_API_URL;

  const fetchUserData = async (token) => {
    try {
      const response = await axios.get(`${apiUrl}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data) {
        const userData = response.data;
        setUser(userData);
        // Store user data in localStorage for persistence
        localStorage.setItem('userData', JSON.stringify(userData));
        return userData;
      }
      throw new Error('No user data received');
    } catch (error) {
      console.error("Authentication failed:", error);
      if (error.response?.status === 400) {
        logout();
        setError("Invalid credentials");
        return null;
      }
      setUser(null);
      setError(error.message);
      return null;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token");
      const storedUserData = localStorage.getItem("userData");
      
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Always fetch fresh data from server first
        const freshUserData = await fetchUserData(token);
        
        // If server fetch fails, try to use stored data
        if (!freshUserData && storedUserData) {
          const parsedUserData = JSON.parse(storedUserData);
          setUser(parsedUserData);
        }
      } catch (error) {
        console.error("Error during initialization:", error);
        setError(error.message);
        logout();
        // If there's stored data, use it as fallback
        if (storedUserData) {
          try {
            const parsedUserData = JSON.parse(storedUserData);
            setUser(parsedUserData);
          } catch (parseError) {
            console.error("Error parsing stored user data:", parseError);
            localStorage.removeItem("userData");
          }
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const updateUser = (userData) => {
    setUser(prevUser => {
      const updatedUser = { ...prevUser, ...userData };
      // Update localStorage when user data changes
      localStorage.setItem('userData', JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userData");
    setUser(null);
    setError(null);
  };

  const login = async (token) => {
    try {
      const userData = await fetchUserData(token);
      return userData;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    error,
    logout,
    login,
    setUser: updateUser,
    refreshUser: async () => {
      const token = localStorage.getItem("token");
      if (token) {
        return await fetchUserData(token);
      }
      return null;
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
