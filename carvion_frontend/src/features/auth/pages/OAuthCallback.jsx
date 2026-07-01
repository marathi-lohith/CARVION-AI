import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../../../components/common/Loader.jsx';
import { ROUTES } from '../../../config/constants.js';

export default function OAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // If standard popup Google callback is active, redirect users attempting direct access back to login
    const timer = setTimeout(() => {
      navigate(ROUTES.LOGIN, { replace: true });
    }, 1000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return <Loader fullScreen={true} />;
}
