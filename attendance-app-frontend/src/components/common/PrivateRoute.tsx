import React from 'react';
import { Navigate, Outlet } from 'react-router';
import authService from './../../services/authService';

const PrivateRoute: React.FC = () => {
  const currentUser = authService.getCurrentUser();
  return currentUser ? <Outlet /> : <Navigate to="/signin" />;
};

export default PrivateRoute;