import httpClient from "../utils/httpClient";

// GET all stores of vendor
export const getVendorStores = () =>
  httpClient.get("/api/vendor/stores");

// CREATE store
export const createVendorStore = (data) =>
  httpClient.post("/api/vendor/stores", data);

// UPDATE store
export const updateVendorStore = (storeId, data) =>
  httpClient.patch(`/api/vendor/stores/${storeId}`, data);

// CHANGE store status
export const changeStoreStatus = (storeId, status) =>
  httpClient.patch(`/api/vendor/stores/${storeId}/status`, {
    status,
  });

// DELETE store
export const deleteVendorStore = (storeId) =>
  httpClient.delete(`/api/vendor/stores/${storeId}`);
