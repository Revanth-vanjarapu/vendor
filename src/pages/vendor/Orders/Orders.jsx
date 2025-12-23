import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, XCircle } from "lucide-react";

import {
  getVendorOrders,
  cancelVendorOrder,
} from "../../../api/vendor.orders.api";

/**
 * Vendor Orders List
 * - Backend is source of truth
 * - Vendor derived from token
 * - Bootstrap-only UI (NO custom CSS)
 */
export default function Orders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");

      const res = await getVendorOrders({
        page: 1,
        limit: 20,
      });

      let ordersData = [];

      if (Array.isArray(res?.data)) {
        ordersData = res.data;
      } else if (
        res?.data?.success === true &&
        Array.isArray(res.data.data)
      ) {
        ordersData = res.data.data;
      } else {
        throw new Error("Invalid orders response");
      }

      setOrders(ordersData);
    } catch (err) {
      console.error("Load orders failed:", err);
      setError("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(orderId) {
    const ok = window.confirm(
      "Cancel this order? This action cannot be undone."
    );
    if (!ok) return;

    try {
      await cancelVendorOrder(orderId);
      await loadOrders();
    } catch {
      alert("Order cannot be cancelled");
    }
  }

  /* ===============================
     Helpers
  ================================ */
  const renderPickup = (o) =>
    o.pickup?.address?.full ||
    (o.pickup?.lat && o.pickup?.lng
      ? `${o.pickup.lat}, ${o.pickup.lng}`
      : "Store Pickup");

  const renderDrop = (o) =>
    o.drop?.address?.full ||
    (o.drop?.lat && o.drop?.lng
      ? `${o.drop.lat}, ${o.drop.lng}`
      : "Customer Location");

  const renderRider = (o) =>
    o.assignedRider?.name ||
    o.assignedRiderName ||
    (o.assignedRiderId ? o.assignedRiderId : "Unassigned");

  const statusClass = (status) => {
    switch (status) {
      case "NEW":
      case "ASSIGNED":
        return "bg-primary";
      case "ON_THE_WAY":
        return "bg-warning text-dark";
      case "DELIVERED":
        return "bg-success";
      case "CANCELLED":
        return "bg-danger";
      default:
        return "bg-secondary";
    }
  };

  return (
    <div className="container-fluid p-4">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <h4 className="fw-semibold mb-0">Orders</h4>
        <button
          className="btn btn-dark btn-sm"
          onClick={() =>
            navigate("/vendor/orders/create")
          }
        >
          + New Request
        </button>
        </div>
      

      {error && (
        <div className="alert alert-danger rounded">
          {error}
        </div>
      )}

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Order</th>
                <th>CID</th>
                <th>Customer</th>
                <th>Pickup</th>
                <th>Drop</th>
                <th>Status</th>
                <th>Rider</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    Loading orders…
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr
                    key={o.orderId}
                    role="button"
                    onClick={() =>
                      navigate(`/vendor/orders/${o.orderId}`)
                    }
                  >
                    <td>
                      <strong>{o.orderId}</strong>
                      <br />
                      <small className="text-muted">
                        {new Date(o.createdAt).toLocaleString()}
                      </small>
                    </td>

                    <td>
                      {o.clientOrderId ? (
                        o.clientOrderId
                      ) : (
                        <span className="text-muted">
                          Not specified
                        </span>
                      )}
                    </td>

                    <td>
                      {o.customer?.name || "-"}
                      <br />
                      <small className="text-muted">
                        {o.customer?.phone || "-"}
                      </small>
                    </td>

                    <td>
                      <small className="text-muted">
                        {renderPickup(o)}
                      </small>
                    </td>

                    <td>
                      <small className="text-muted">
                        {renderDrop(o)}
                      </small>
                    </td>

                    <td>
                      <span
                        className={`badge ${statusClass(
                          o.status
                        )}`}
                      >
                        {o.status}
                      </span>
                    </td>

                    <td>
                      {renderRider(o)}
                    </td>

                    <td
                      className="text-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        title="View Order"
                        onClick={() =>
                          navigate(`/vendor/orders/${o.orderId}`)
                        }
                      >
                        <Eye size={16} />
                      </button>

                      {o.status === "NEW" && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          title="Cancel Order"
                          onClick={() =>
                            handleCancel(o.orderId)
                          }
                        >
                          <XCircle size={16} />
                        </button>
                      )}
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
