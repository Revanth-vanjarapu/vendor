import httpClient from "../utils/httpClient";

/**
 * ================================
 * VENDOR ORDERS API (PRODUCTION)
 * ================================
 * Rules enforced:
 * - Vendor can create, view, assign rider, cancel (NEW only)
 * - Vendor CANNOT update order status arbitrarily
 * - Business IDs only (orderId, riderId, storeId)
 */

/* --------------------------------
   GET: All vendor orders
-------------------------------- */
export async function getVendorOrders(params = {}) {
  const res = await httpClient.get("/api/vendor/orders", {
    params,
    headers: { "Cache-Control": "no-cache" },
  });
  return res.data;
}

/* --------------------------------
   GET: Single order by orderId
-------------------------------- */
export async function getVendorOrderById(orderId) {
  const res = await httpClient.get(
    `/api/vendor/orders/${orderId}`
  );
  return res.data;
}

/* --------------------------------
   POST: Create single order
-------------------------------- */
export async function createVendorOrder(payload) {
  /**
   * payload must match backend contract:
   * {
   *  storeId,
   *  pickup: { address, lat, lng },
   *  drop: { address, lat, lng },
   *  customer: { name, phone },
   *  vehicleType,
   *  notes,
   *  source: "VENDOR_WEB"
   * }
   */
  const res = await httpClient.post(
    "/api/vendor/orders",
    payload
  );
  return res.data;
}

/* --------------------------------
   POST: Create bulk orders
-------------------------------- */
export async function createVendorOrdersBulk(payload) {
  /**
   * payload:
   * {
   *   orders: [ ... ]
   * }
   */
  const res = await httpClient.post(
    "/api/vendor/orders/bulk",
    payload
  );
  return res.data;
}

/* --------------------------------
   PATCH: Cancel order (NEW only)
-------------------------------- */
export async function cancelVendorOrder(orderId) {
  const res = await httpClient.patch(
    `/api/vendor/orders/${orderId}/cancel`
  );
  return res.data;
}

/* --------------------------------
   PATCH: Assign rider to order
-------------------------------- */
export async function assignRiderToOrder(orderId, riderId) {
  const res = await httpClient.patch(
    `/api/vendor/orders/${orderId}/assign`,
    {
      riderId,
    }
  );
  return res.data;
}

/* --------------------------------
   GET: Orders by store
-------------------------------- */
export async function getVendorOrdersByStore(storeId) {
  const res = await httpClient.get(
    `/api/vendor/orders/by-store/${storeId}`
  );
  return res.data;
}

/* --------------------------------
   GET: Orders by rider
-------------------------------- */
export async function getVendorOrdersByRider(riderId) {
  const res = await httpClient.get(
    `/api/vendor/orders/by-rider/${riderId}`
  );
  return res.data;
}
