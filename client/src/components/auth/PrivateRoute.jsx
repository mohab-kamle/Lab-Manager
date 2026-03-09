import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";


import LoadingSpinner from "../ui/LoadingSpinner";

const PrivateRoute = ({ allowedRoles, children, element }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />; 
  if (!user) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;

  return element || children;
};

export default PrivateRoute;
