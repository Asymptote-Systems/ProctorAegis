// LogoutButton.jsx
import React, { useContext } from "react";
import { AuthContext } from "./auth/AuthProvider";
import { useNavigate } from "react-router-dom";

export default function LogoutButton() {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true }); // redirect after logout
  };

  return (
    <button onClick={handleLogout} className="btn btn-danger">
      Logout
    </button>
  );
}
