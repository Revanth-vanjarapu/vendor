import httpClient from "../utils/httpClient";

export const fetchVendorDashboard = () => {
  return httpClient.get("/api/vendor/dashboard");
};
