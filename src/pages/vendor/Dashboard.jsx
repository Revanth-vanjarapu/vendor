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
     INITIAL LOAD (REST)
  ================================ */
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const storesRes = await getVendorStores();
      setStoresCount(storesRes?.data?.data?.items?.length || 0);

      try {
        const ordersRes = await getVendorOrders();
        setOrders(ordersRes?.data?.data?.items || []);
      } catch {
        setOrders([]);
      }
    } catch (err) {
      console.error("Dashboard load failed", err);
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* ===============================
     REALTIME UPDATES (SOCKET)
  ================================ */
  useEffect(() => {
    if (!socket) return;

    const onOrderUpdate = (order) => {
      console.log("📡 Dashboard realtime:", order);

      setOrders((prev) => {
        const exists = prev.find(
          (o) => o.orderId === order.orderId
        );

        if (exists) {
          return prev.map((o) =>
            o.orderId === order.orderId ? order : o
          );
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
  const newOrders = orders.filter(o => o.status === "NEW").length;

  const inTransit = orders.filter(o =>
    ["ASSIGNED", "PICKED_UP", "ON_THE_WAY"].includes(o.status)
  ).length;

  const delivered = orders.filter(o => o.status === "DELIVERED").length;

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
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
     UI
  ================================ */
  return (
    <div className="dashboard">
      {/* HEADER */}
      <div className="dashboard-header">
        <h4 className="fw-semibold mb-0">Dashboard</h4>

        <button
          className="btn btn-dark btn-sm"
          onClick={() => navigate("/vendor/orders/create")}
        >
          + New Request
        </button>
      </div>

      {/* STATS */}
      <div className="dashboard-stats">
        <StatCard label="New Orders" value={newOrders} />
        <StatCard label="In Transit" value={inTransit} />
        <StatCard label="Delivered" value={delivered} />
        <StatCard label="Stores" value={storesCount} />
      </div>

      {/* RECENT ORDERS */}
      <div className="card dashboard-card">
        <div className="card-header bg-white fw-semibold">
          Recent Orders
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Order</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
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
                  <tr key={o.orderId}>
                    <td>#{o.orderId}</td>

                    <td>
                      <span className="badge bg-dark-subtle text-dark">
                        {o.status.replaceAll("_", " ")}
                      </span>
                    </td>

                    <td className="text-muted small">
                      {new Date(o.createdAt).toLocaleString()}
                    </td>

                    <td>
                      <button
                        className="btn btn-link btn-sm text-decoration-none"
                        onClick={() =>
                          navigate(`/vendor/orders/${o.orderId}`)
                        }
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
   STAT CARD
================================ */
function StatCard({ label, value }) {
  return (
    <div className="dashboard-stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
