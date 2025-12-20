import httpClient from "../utils/httpClient";

/**
 * Get all riders for logged-in vendor
 */
export const getVendorRiders = () =>
  httpClient.get("/api/vendor/riders");

/**
 * Get single rider details
 */
export const getVendorRiderById = (riderId) =>
  httpClient.get(`/api/vendor/riders/${riderId}`);

/**
 * Change rider status (ACTIVE / INACTIVE)
 */
export const changeRiderStatus = (riderId, status) =>
  httpClient.patch(
    `/api/vendor/riders/${riderId}/status`,
    { status }
  );

/**
 * Assign or shift rider to a store
 */
export const assignRiderToStore = (riderId, storeId) =>
  httpClient.patch(
    `/api/vendor/riders/${riderId}/assign-store`,
    { storeId }
  );
