import axios from "axios";
import { showError } from "../utils/toast";

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
});

console.log(
  "✅ VITE API BASE URL:",
  import.meta.env.VITE_API_BASE_URL
);

/* =========================
   REQUEST: attach token
========================= */
httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* =========================
   RESPONSE: handle 401
========================= */
httpClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url || "";
    const message =
      err.response?.data?.message ||
      err.message ||
      "Request failed";

    // 🔴 Skip auth endpoints (login handles its own errors)
    if (!url.includes("/auth")) {
      showError(message);
    }

    // 🔐 Auto logout on token expiry
    if (status === 401 && !url.includes("/auth")) {
      localStorage.clear();
      window.location.href = "/login";
    }

    return Promise.reject(err);
  }
);

export default httpClient;
