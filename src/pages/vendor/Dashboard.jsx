// src/pages/vendor/Dashboard.jsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { getVendorStores } from "../../api/vendor.stores.api";
import { getVendorOrders } from "../../api/vendor.orders.api";
import { useSocket } from "../../hooks/useSocket";
import "../../index.css"; // load your page card styles (you uploaded this)

export default function Dashboard() {
  const navigate = useNavigate();
  const socket = useSocket();

  const [storesCount, setStoresCount] = useState(0);
  const [storesMap, setStoresMap] = useState({}); // map storeId -> store object
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ===============================
     SAFE PARSE: normalize vendor orders response shape
  ================================ */
  const parseOrdersResponse = (res) => {
    try {
      if (!res) return [];
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.data?.data)) return res.data.data;
      if (Array.isArray(res?.data?.data?.items)) return res.data.data.items;
      if (Array.isArray(res?.data?.items)) return res.data.items;
      return [];
    } catch {
      return [];
    }
  };

  /* ===============================
     INITIAL LOAD
     - fetch stores & orders in parallel
     - build a stores map to display store name in orders table
     - Option B: compute counts locally (backend summary API would be better)
  ================================ */
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [storesRes, ordersRes] = await Promise.all([
        getVendorStores(),
        getVendorOrders({ page: 1, limit: 100 }),
      ]);

      // Normalize store items (support different shapes)
      const storesItems =
        storesRes?.data?.data?.items ??
        storesRes?.data?.data ??
        storesRes?.data ??
        [];

      const storesArray = Array.isArray(storesItems) ? storesItems : [];
      // Build map keyed by storeId (fallback to _id)
      const map = {};
      storesArray.forEach((s) => {
        const key = s.storeId ?? s._id ?? s.id ?? null;
        if (key) map[key] = s;
      });
      setStoresMap(map);
      setStoresCount(storesArray.length);

      // Parse orders
      const parsed = parseOrdersResponse(ordersRes);

      // Normalize createdAt and sort newest first
      const normalized = parsed
        .map((o) => ({
          ...o,
          createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : null,
        }))
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      setOrders(normalized);
    } catch (err) {
      console.error("Dashboard load failed", err);
      setError("Failed to load dashboard");
      setOrders([]);
      setStoresCount(0);
      setStoresMap({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* ===============================
     REALTIME UPDATES (SOCKET)
     - merge/replace orders on update
  ================================ */
  useEffect(() => {
    if (!socket) return;

    const onOrderUpdate = (order) => {
      console.log("📡 Dashboard realtime:", order);

      setOrders((prev) => {
        const exists = prev.find((o) => o.orderId === order.orderId);
        if (exists) {
          return prev.map((o) =>
            o.orderId === order.orderId
              ? { ...o, ...order, createdAt: o.createdAt ?? order.createdAt }
              : o
          );
        }
        // new order -> prepend (normalize createdAt)
        const normalized = { ...order, createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : null };
        return [normalized, ...prev];
      });
    };

    socket.on("vendor:order_updated", onOrderUpdate);

    return () => {
      socket.off("vendor:order_updated", onOrderUpdate);
    };
  }, [socket]);

  /* ===============================
     DERIVED METRICS & recent orders
  ================================ */
  const newOrders = orders.filter((o) => o.status === "NEW").length;

  const inTransit = orders.filter((o) =>
    ["ASSIGNED", "PICKED_UP", "ON_THE_WAY"].includes(o.status)
  ).length;

  const delivered = orders.filter((o) => o.status === "DELIVERED").length;

  const recentOrders = [...orders].slice(0, 5); // already sorted

  /* ===============================
     HELPERS: get store name and status timestamps
  ================================ */
  function getStoreName(order) {
    if (!order) return "-";
    const storeKeyCandidates = [order.storeId, order.storeMongoId, order.store?._id];
    for (const k of storeKeyCandidates) {
      if (k && storesMap[k]) return storesMap[k].name || storesMap[k].storeName || storesMap[k].title || k;
    }
    // fallback: show storeId if present
    return order.storeId ?? order.storeMongoId ?? "Unknown store";
  }

  function findStatusInHistory(order, status) {
    if (!order) return null;
    // common patterns:
    // - order.statusHistory = [{status: "ASSIGNED", at: "..."}]
    // - order.statusHistory = [{status: "ASSIGNED", time: "..."}]
    const hist = order.statusHistory || order.status_log || order.statusLogs || null;
    if (Array.isArray(hist)) {
      const entry = hist.find((h) => {
        return (h.status && h.status === status) || (h.name && h.name === status);
      });
      if (entry) {
        return entry.at ?? entry.time ?? entry.timestamp ?? entry.createdAt ?? null;
      }
    }
    return null;
  }

  function getStatusTime(order, targetStatus) {
    if (!order) return null;

    // 1) explicit history
    const histTime = findStatusInHistory(order, targetStatus);
    if (histTime) return histTime;

    // 2) explicit fields
    if (targetStatus === "PICKED_UP") {
      if (order.pickedAt) return order.pickedAt;
      if (order.timestamps?.pickedUp) return order.timestamps.pickedUp;
      if (order.timestamps?.picked_up) return order.timestamps.picked_up;
      // heuristic: if order progressed past PICKED_UP, use updatedAt (best-effort)
      if (["PICKED_UP", "ON_THE_WAY", "DELIVERED"].includes(order.status)) {
        return order.pickedAt ?? order.updatedAt ?? null;
      }
      return null;
    }

    if (targetStatus === "DELIVERED") {
      if (order.deliveredAt) return order.deliveredAt;
      if (order.timestamps?.delivered) return order.timestamps.delivered;
      if (order.proof?.deliveryTime) return order.proof.deliveryTime;
      // heuristic
      if (order.status === "DELIVERED") return order.updatedAt ?? order.createdAt ?? null;
      return null;
    }

    if (targetStatus === "CREATED") {
      return order.createdAt ?? null;
    }

    return null;
  }

  function formatTime(ts) {
    if (!ts) return "—";
    try {
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) return ts; // return raw if not ISO
      return d.toLocaleString();
    } catch {
      return ts;
    }
  }

  /* ===============================
     UI STATES
  ================================ */
  if (loading) {
    return (
      <div className="text-center py-5 text-muted">
        Loading dashboard…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-5 text-danger">
        {error}
      </div>
    );
  }

  /* ===============================
     RENDER
  ================================ */
  return (
    <div className="dashboard container-fluid p-4">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4 card-ui">
        <div>
          <h4 className="fw-semibold mb-0">Dashboard</h4>
          <small className="text-muted">Overview of vendor operations</small>
        </div>

        <div>
          <button
            className="btn btn-dark btn-sm"
            onClick={() => navigate("/vendor/orders/create")}
          >
            + New Request
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="row g-3 mb-4  ">
        <div className="col-sm-6 col-md-3">
          <div className="card-ui card p-3">
            <div className="small text-muted">New Orders</div>
            <div className="h3 mb-0">{newOrders}</div>
          </div>
        </div>

        <div className="col-sm-6 col-md-3">
          <div className="card card-ui p-3">
            <div className="small text-muted">In Transit</div>
            <div className="h3 mb-0">{inTransit}</div>
          </div>
        </div>

        <div className="col-sm-6 col-md-3">
          <div className="card card-ui p-3">
            <div className="small text-muted">Delivered</div>
            <div className="h3 mb-0">{delivered}</div>
          </div>
        </div>

        <div className="col-sm-6 col-md-3">
          <div className="card card-ui p-3">
            <div className="small text-muted">Stores</div>
            <div className="h3 mb-0">{storesCount}</div>
          </div>
        </div>
      </div>

      {/* RECENT ORDERS (first 5) */}
      <div className="card card-ui">
        <div className="card-header bg-white fw-semibold d-flex justify-content-between align-items-center">
          <div>Recent Orders</div>
          <div>
            <button className="btn btn-sm btn-outline-secondary me-2" onClick={loadDashboard}>
              Refresh
            </button>
            <button className="btn btn-sm btn-outline-primary" onClick={() => navigate("/vendor/orders")}>
              View all
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>CID</th>
                <th>Store</th>
                <th>Customer</th>
                <th>Created</th>
                <th>Picked up</th>
                <th>Delivered</th>
                <th>Status</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>


            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-4">
                    No orders yet
                  </td>
                </tr>
              ) : (
                recentOrders.map((o) => (
                  <tr key={o.orderId} role="button" onClick={() => navigate(`/vendor/orders/${o.orderId}`)}>
                    <td>
                      <div className="fw-semibold">{o.clientOrderId || <span className="text-muted">Not specified</span>}</div>
                    </td>

                    <td>
                      <div className="fw-semibold">{getStoreName(o)}</div>
                      <div className="text-muted small">{o.storeId || ""}</div>
                    </td>

                    <td>
                      <div className="fw-semibold">{o.customer?.name || "—"}</div>
                      <div className="text-muted small">{o.customer?.phone || ""}</div>
                    </td>



                    <td className="text-muted small">{formatTime(getStatusTime(o, "CREATED"))}</td>

                    {/* Picked up */}
                    <td className="text-muted small">
                      {o.status === "PICKED_UP" ||
                        o.status === "ON_THE_WAY" ||
                        o.status === "DELIVERED"
                        ? formatTime(o.updatedAt)
                        : "—"}
                    </td>

                    {/* Delivered */}
                    <td className="text-muted small">
                      {o.status === "DELIVERED"
                        ? formatTime(o.updatedAt)
                        : "—"}
                    </td>


                    <td>
                      <span className={`badge ${getStatusClass(o.status)}`}>
                        {o.status?.replaceAll("_", " ") || "—"}
                      </span>
                    </td>

                    <td className="text-end" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-link btn-sm text-decoration-none"
                        onClick={() => navigate(`/vendor/orders/${o.orderId}`)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ===============================
   Helper: status -> badge class
================================ */
function getStatusClass(status) {
  switch (status) {
    case "NEW":
    case "ASSIGNED":
      return "bg-primary text-white";
    case "ON_THE_WAY":
    case "PICKED_UP":
      return "bg-warning text-dark";
    case "DELIVERED":
      return "bg-success text-white";
    case "CANCELLED":
      return "bg-danger text-white";
    default:
      return "bg-secondary text-white";
  }
}
