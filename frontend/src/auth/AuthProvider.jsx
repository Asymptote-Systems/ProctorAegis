// FILE: src/auth/AuthProvider.jsx
import React, { createContext, useState, useEffect } from "react";
import api, { setAccessToken, setCsrfToken } from "../api/apiClient";

export const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  accessToken: null,
});

function getCookie(name) {
  const v = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)");
  return v ? v.pop() : "";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, _setAccessToken] = useState(null);

  // helper so we always sync state + axios + context
  const syncAccessToken = (token) => {
    _setAccessToken(token);
    setAccessToken(token);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("access_token");
    const storedCsrf = localStorage.getItem("csrf_token");

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      syncAccessToken(storedToken);
      setCsrfToken(storedCsrf || null);
      setLoading(false);
      return;
    }

    // fallback: try refresh with cookie
    const csrf = getCookie("csrf_token");
    if (!csrf) {
      setLoading(false);
      return;
    }

    setCsrfToken(csrf);
    api
      .post("/auth/refresh", null, { headers: { "X-CSRF-Token": csrf } })
      .then((res) => {
        syncAccessToken(res.data.access_token);
        setCsrfToken(res.data.csrf_token);
        setUser(res.data.user);

        localStorage.setItem("access_token", res.data.access_token);
        localStorage.setItem("csrf_token", res.data.csrf_token || "");
        localStorage.setItem("user", JSON.stringify(res.data.user));
      })
      .catch(() => {
        syncAccessToken(null);
        setCsrfToken(null);
        setUser(null);
        localStorage.removeItem("access_token");
        localStorage.removeItem("csrf_token");
        localStorage.removeItem("user");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    syncAccessToken(res.data.access_token);
    setCsrfToken(res.data.csrf_token);
    setUser(res.data.user);

    localStorage.setItem("access_token", res.data.access_token);
    localStorage.setItem("csrf_token", res.data.csrf_token || "");
    localStorage.setItem("user", JSON.stringify(res.data.user));

    return res.data;
  };

  const logout = async () => {
    try {
      const csrf = getCookie("csrf_token");
      await api.post("/auth/logout", null, { headers: { "X-CSRF-Token": csrf } });
    } catch {
      // ignore
    } finally {
      syncAccessToken(null);
      setCsrfToken(null);
      setUser(null);

      localStorage.removeItem("access_token");
      localStorage.removeItem("csrf_token");
      localStorage.removeItem("user");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, accessToken }}>
      {children}
    </AuthContext.Provider>
  );
}
