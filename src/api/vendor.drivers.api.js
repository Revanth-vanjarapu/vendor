import httpClient from "../utils/httpClient";

export const getNearbyDrivers = (orderId) =>
  httpClient.get(
    `/api/vendor/orders/${orderId}/nearby-drivers`
  );
