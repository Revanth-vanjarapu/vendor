import httpClient from "../utils/httpClient";

export const loginVendor = (data) => {
  return httpClient.post("/api/auth/login", data);
};
