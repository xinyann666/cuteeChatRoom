// Logout.jsx
import React, { useEffect } from 'react';

export function Logout({ onLogout }) {
  useEffect(() => {
    // Immediately log out on mount
    onLogout();
  }, [onLogout]);

  return (
    <div className="auth-container">
      <p>Logging out...</p>
    </div>
  );
}
