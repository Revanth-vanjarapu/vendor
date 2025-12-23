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
 * - Empty array is a VALID response
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

      /**
       * Backend may return:
       * 1) { success: true, data: [] }
       * 2) []
       */
      let ordersData = [];

      if (Array.isArray(res?.data)) {
        // Case: direct array
        ordersData = res.data;
      } else if (
        res?.data?.success === true &&
        Array.isArray(res.data.data)
      ) {
        // Case: wrapped response
        ordersData = res.data.data;
      } else {
        console.error("Unexpected orders response:", res?.data);
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

  return (
    <div className="container-fluid p-4">
      {/* Header */}
      <div className="mb-4">
        <h4 className="fw-semibold mb-0">Orders</h4>
        <small className="text-muted">
          Manage and track your delivery orders
        </small>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Order</th>
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
                  <td colSpan="7" className="text-center py-4">
                    Loading orders…
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.orderId}>
                    <td>
                      <strong>{o.orderId}</strong>
                      <br />
                      <small className="text-muted">
                        {new Date(o.createdAt).toLocaleString()}
                      </small>
                    </td>

                    <td>
                      {o.customer?.name || "-"}
                      <br />
                      <small className="text-muted">
                        {o.customer?.phone || "-"}
                      </small>
                    </td>

                    <td>
                      <small>
                        {o.pickup?.address || "Store Pickup"}
                      </small>
                    </td>

                    <td>
                      <small>
                        {o.drop?.address || "Customer Location"}
                      </small>
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          o.status === "NEW"
                            ? "bg-secondary"
                            : o.status === "ASSIGNED"
                            ? "bg-primary"
                            : o.status === "ON_THE_WAY"
                            ? "bg-warning text-dark"
                            : o.status === "DELIVERED"
                            ? "bg-success"
                            : "bg-danger"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>

                    <td>
                      {o.assignedRiderId ? (
                        o.assignedRiderId
                      ) : (
                        <span className="text-muted">Unassigned</span>
                      )}
                    </td>

                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={() =>
                          navigate(`/vendor/orders/${o.orderId}`)
                        }
                      >
                        <Eye size={16} />
                      </button>

                      {o.status === "NEW" && (
                        <button
                          className="btn btn-sm btn-outline-danger"
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
