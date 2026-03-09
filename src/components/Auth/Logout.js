import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear local storage and session storage
    localStorage.clear();
    sessionStorage.clear();

    // Redirect to the login page
    navigate('/');
  }, [navigate]);

  return null; // No UI is rendered
};

export default Logout;
