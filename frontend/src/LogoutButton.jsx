// LogoutButton.jsx
import React, { useContext } from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
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
    <Button
      variant="outline"
      size="sm"
      onClick={handleLogout}
      className="flex items-center gap-2"
    >
      <LogOut className="w-4 h-4" />
      Logout
    </Button>
  );
}
