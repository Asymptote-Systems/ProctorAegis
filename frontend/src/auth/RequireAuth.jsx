// FILE: src/auth/RequireAuth.jsx
import { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "./AuthProvider";

export default function RequireAuth({ children }) {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  // 🔄 Wait for AuthProvider to finish restoring session
  if (loading) {
    return <div>Loading...</div>; // or your spinner component
  }

  if (!user) {
    // redirect to login and preserve current path
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ✅ render wrapped children
  return children;
}
