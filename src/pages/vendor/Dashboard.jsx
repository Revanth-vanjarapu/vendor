// src/pages/vendor/Dashboard.jsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { getVendorStores } from "../../api/vendor.stores.api";
import { getVendorOrders } from "../../api/vendor.orders.api";
import { useSocket } from "../../hooks/useSocket";

export default function Dashboard() {
  const navigate = useNavigate();
  const socket = useSocket();

  const [storesCount, setStoresCount] = useState(0);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ===============================
     SAFE PARSE: normalize vendor orders response shape
  ================================ */
  const parseOrdersResponse = (res) => {
    // Handle various shapes we've seen:
    // 1) res.data.data.items (paginated)
    // 2) res.data.data (array)
    // 3) res.data (array)
    // 4) res (array)
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
  ================================ */
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Stores count
      const storesRes = await getVendorStores();
      const storesItems =
        storesRes?.data?.data?.items ?? storesRes?.data?.data ?? storesRes?.data ?? [];
      setStoresCount(Array.isArray(storesItems) ? storesItems.length : 0);

      // Orders (we ask server for first page; we'll also accept non-paginated)
      const ordersRes = await getVendorOrders({ page: 1, limit: 50 });
      const parsed = parseOrdersResponse(ordersRes);
      
      // normalize createdAt types and sort
      const normalized = parsed.map((o) => ({
        ...o,
        createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : null,
      }));
      setOrders(normalized);
    } catch (err) {
      console.error("Dashboard load failed", err);
      setError("Failed to load dashboard");
      setOrders([]);
      setStoresCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* ===============================
     REALTIME UPDATES (SOCKET)
     - event name: vendor:order_updated (kept from your code)
  ================================ */
  useEffect(() => {
    if (!socket) return;

    const onOrderUpdate = (order) => {
      // console log for debugging
      console.log("📡 Dashboard realtime:", order);

      setOrders((prev) => {
        // if order already exists, replace it; otherwise prepend
        const exists = prev.find((o) => o.orderId === order.orderId);
        if (exists) {
          return prev.map((o) => (o.orderId === order.orderId ? { ...o, ...order } : o));
        }
        return [order, ...prev];
      });
    };

    socket.on("vendor:order_updated", onOrderUpdate);

    return () => {
      socket.off("vendor:order_updated", onOrderUpdate);
    };
  }, [socket]);

  /* ===============================
     DERIVED METRICS
  ================================ */
  const newOrders = orders.filter((o) => o.status === "NEW").length;

  const inTransit = orders.filter((o) =>
    ["ASSIGNED", "PICKED_UP", "ON_THE_WAY"].includes(o.status)
  ).length;

  const delivered = orders.filter((o) => o.status === "DELIVERED").length;

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5);

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
      <div className="d-flex justify-content-between align-items-center mb-4">
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
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-md-3">
          <div className="card p-3">
            <div className="small text-muted">New Orders</div>
            <div className="h3 mb-0">{newOrders}</div>
          </div>
        </div>

        <div className="col-sm-6 col-md-3">
          <div className="card p-3">
            <div className="small text-muted">In Transit</div>
            <div className="h3 mb-0">{inTransit}</div>
          </div>
        </div>

        <div className="col-sm-6 col-md-3">
          <div className="card p-3">
            <div className="small text-muted">Delivered</div>
            <div className="h3 mb-0">{delivered}</div>
          </div>
        </div>

        <div className="col-sm-6 col-md-3">
          <div className="card p-3">
            <div className="small text-muted">Stores</div>
            <div className="h3 mb-0">{storesCount}</div>
          </div>
        </div>
      </div>

      {/* RECENT ORDERS */}
      <div className="card">
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
                <th>Order</th>
                <th>Status</th>
                <th>Created</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>

            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4">
                    No orders yet
                  </td>
                </tr>
              ) : (
                recentOrders.map((o) => (
                  <tr key={o.orderId} role="button" onClick={() => navigate(`/vendor/orders/${o.orderId}`)}>
                    <td>
                      <strong>#{o.orderId}</strong>
                      <br />
                      <small className="text-muted">
                        {o.customer?.name ? `${o.customer?.name}` : "—"}
                      </small>
                    </td>

                    <td>
                      <span className={`badge ${getStatusClass(o.status)}`}>
                        {o.status?.replaceAll("_", " ") || "—"}
                      </span>
                    </td>

                    <td className="text-muted small">
                      {o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}
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
   Keep same mapping you use across app
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
