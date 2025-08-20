// frontend/src/auth/AuthProvider.jsx
import React, { createContext, useState, useEffect } from "react";
import api, { setAccessToken, setCsrfToken } from "../api/apiClient";

export const AuthContext = createContext({
  user: null,
  login: async () => {},
  logout: async () => {},
});

function getCookie(name) {
  const v = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)");
  return v ? v.pop() : "";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // try to silently refresh on mount (if refresh cookie present)
  useEffect(() => {
    const csrf = getCookie("csrf_token");
    if (!csrf) return;
    setCsrfToken(csrf);
    api
      .post("/auth/refresh", null, { headers: { "X-CSRF-Token": csrf } })
      .then((res) => {
        setAccessToken(res.data.access_token);
        setCsrfToken(res.data.csrf_token);
        setUser(res.data.user);
      })
      .catch(() => {
        setAccessToken(null);
        setCsrfToken(null);
        setUser(null);
      });
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    setAccessToken(res.data.access_token);
    setCsrfToken(res.data.csrf_token);
    setUser(res.data.user);
    // the server sets cookies (refresh and csrf) automatically
    return res.data;
  };

  const logout = async () => {
    try {
      const csrf = getCookie("csrf_token");
      await api.post("/auth/logout", null, { headers: { "X-CSRF-Token": csrf } });
    } catch (e) {
      // ignore
    } finally {
      setAccessToken(null);
      setCsrfToken(null);
      setUser(null);
    }
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}
