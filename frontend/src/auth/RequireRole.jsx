// FILE: src/auth/RequireRole.jsx
import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "./AuthProvider";

export default function RequireRole({ roles, children }) {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  // ✅ render wrapped children
  return children;
}
