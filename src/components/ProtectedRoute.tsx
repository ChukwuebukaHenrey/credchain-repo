import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allow?: Role | Role[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allow }) => {
  const { isAuthenticated, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-purple"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login but save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allow) {
    const allowedRoles = Array.isArray(allow) ? allow : [allow];
    if (role && !allowedRoles.includes(role)) {
      // Role not allowed, send back to their respective dashboard
      const homeMap: Record<Role, string> = {
        candidate: '/dashboard',
        issuer: '/issuer',
        verifier: '/verifier',
      };
      return <Navigate to={homeMap[role]} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
