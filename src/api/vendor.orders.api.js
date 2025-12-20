import httpClient from "../utils/httpClient";

/* GET all vendor orders */
export const getVendorOrders = (params = {}) =>
    httpClient.get("/api/vendor/orders", { params });

/* GET single order */
export const getVendorOrderById = (orderId) =>
    httpClient.get(`/api/vendor/orders/${orderId}`);

export const assignDriverToOrder = (orderId, driverId) =>
    httpClient.post(
        `/api/vendor/orders/${orderId}/assign-driver`,
        { driverId }
    );