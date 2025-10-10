import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router';
import { AuthContext } from '../../context/AuthContext';

interface RoleBasedPrivateRouteProps {
  allowedRoles: string[];
}

const RoleBasedPrivateRoute: React.FC<RoleBasedPrivateRouteProps> = ({ allowedRoles }) => {
  const auth = useContext(AuthContext);

  if (!auth || auth.isLoading) {
    return null; // Or a loading spinner
  }

  const { user } = auth;

  if (!user) {
    return <Navigate to="/signin" />;
  }

  const userRole = user.Role.Position;

  return userRole && allowedRoles.includes(userRole) ? <Outlet /> : <Navigate to="/unauthorized" />;
};

export default RoleBasedPrivateRoute;
