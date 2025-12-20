import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { getVendorStores } from "../../api/vendor.stores.api";
import { getVendorOrders } from "../../api/vendor.orders.api";

export default function Dashboard() {
  const navigate = useNavigate();

  const [storesCount, setStoresCount] = useState(0);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ===============================
     LOAD DASHBOARD DATA (SAFE)
  ================================ */
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      /* ✅ STORES (WORKING API) */
      const storesRes = await getVendorStores();
      setStoresCount(
        storesRes?.data?.data?.items?.length || 0
      );

      /* ⚠️ ORDERS (API NOT READY YET) */
      try {
        const ordersRes = await getVendorOrders();
        setOrders(
          ordersRes?.data?.data?.items || []
        );
      } catch (err) {
        console.warn(
          "Orders API not ready yet",
          err?.response?.status
        );
        setOrders([]); // SAFE FALLBACK
      }
    } catch (err) {
      console.error("Dashboard load failed", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* ===============================
     DERIVED METRICS
  ================================ */
  const newOrders = orders.filter(
    (o) => o.status === "NEW"
  ).length;

  const inTransitOrders = orders.filter((o) =>
    ["ASSIGNED", "PICKED_UP", "ON_THE_WAY"].includes(o.status)
  ).length;

  const deliveredOrders = orders.filter(
    (o) => o.status === "DELIVERED"
  ).length;

  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.createdAt) -
        new Date(a.createdAt)
    )
    .slice(0, 5);

  /* ===============================
     UI STATES
  ================================ */
  if (loading) {
    return (
      <div className="text-center py-5 text-muted">
        Loading dashboard...
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
    <div>
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-semibold mb-0">Dashboard</h4>

        <button
          className="btn btn-dark btn-sm"
          onClick={() =>
            navigate("/vendor/orders/create")
          }
        >
          + New Request
        </button>
      </div>

      {/* STATS */}
      <div className="row g-3 mb-4">
        <StatCard title="New Requests" value={newOrders} />
        <StatCard title="In Transit" value={inTransitOrders} />
        <StatCard title="Delivered" value={deliveredOrders} />
        <StatCard title="Stores" value={storesCount} />
      </div>

      {/* RECENT ORDERS */}
      <div className="card">
        <div className="card-header bg-white fw-semibold">
          Recent Orders
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Order ID</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.orderId}>
                  <td>#{order.orderId}</td>

                  <td>
                    <span className="badge bg-secondary-subtle text-secondary">
                      {order.status}
                    </span>
                  </td>

                  <td className="text-muted small">
                    {new Date(order.createdAt).toLocaleString()}
                  </td>

                  <td>
                    <button
                      className="btn btn-link btn-sm text-decoration-none"
                      onClick={() =>
                        navigate(
                          `/vendor/orders/${order.orderId}`
                        )
                      }
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}

              {recentOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center text-muted py-4"
                  >
                    No orders yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ===============================
   SMALL STAT CARD
================================ */
function StatCard({ title, value }) {
  return (
    <div className="col-md-3">
      <div className="card h-100">
        <div className="card-body">
          <div className="text-muted small">
            {title}
          </div>
          <h4 className="fw-semibold mb-0">
            {value}
          </h4>
        </div>
      </div>
    </div>
  );
}
