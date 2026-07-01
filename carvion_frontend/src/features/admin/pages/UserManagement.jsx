import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function UserManagement() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/admin?module=users', { replace: true });
  }, [navigate]);

  return null;
}
