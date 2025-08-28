// frontend/src/api/apiClient.js
import axios from "axios";

const API_BASE = "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // important so refresh cookie is sent
});

// module-scoped tokens (set by AuthProvider)
let csrfToken = null;

// simple setters used by the AuthProvider
export function setAccessToken(token) {
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  else delete api.defaults.headers.common["Authorization"];
}

export function setCsrfToken(token) {
  csrfToken = token;
}

// automatic refresh logic on 401
let isRefreshing = false;
let subscribers = [];

function subscribeTokenRefresh(cb) {
  subscribers.push(cb);
}

function onRefreshed(newToken) {
  subscribers.forEach((cb) => cb(newToken));
  subscribers = [];
}

api.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    // If 401 and not retrying yet, attempt refresh
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // queue the request until refresh completes
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers["Authorization"] = "Bearer " + token;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        const headers = csrfToken ? { "X-CSRF-Token": csrfToken } : {};
        // use raw axios to avoid interceptor loop
        const res = await axios.post(`${API_BASE}/auth/refresh`, null, {
          headers,
          withCredentials: true,
        });
        const newAccess = res.data.access_token;
        const newCsrf = res.data.csrf_token;
        setAccessToken(newAccess);
        setCsrfToken(newCsrf);
        onRefreshed(newAccess);
        return api(originalRequest);
      } catch (err) {
        // refresh failed -> force logout in client
        setAccessToken(null);
        setCsrfToken(null);
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
// Request interceptor to add auth header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
export default api;
