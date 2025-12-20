import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getVendorOrders } from "../../../api/vendor.orders.api";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const navigate = useNavigate();

  /* ===============================
     LOAD ORDERS (API)
  ================================ */
  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await getVendorOrders();
      setOrders(res.data?.data?.items || []);
    } catch (err) {
      console.error("Failed to load orders", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  /* ===============================
     FILTER (FRONTEND ONLY FOR NOW)
  ================================ */
  const filteredOrders = orders.filter((o) =>
    o.orderId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Page header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-semibold mb-0">All Orders</h4>

        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm">
            Export
          </button>
          <button
            className="btn btn-dark btn-sm"
            onClick={() =>
              navigate("/vendor/orders/create")
            }
          >
            + New Request
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-2 align-items-center">
            <div className="col-md-6">
              <input
                type="text"
                className="form-control"
                placeholder="Search order ID..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />
            </div>

            <div className="col-md-3">
              <select className="form-select" disabled>
                <option>Status: All</option>
              </select>
            </div>

            <div className="col-md-3">
              <select className="form-select" disabled>
                <option>Date: Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Assigned Driver</th>
                <th>Created At</th>
                <th>Distance</th>
                <th>Store Location</th>
                <th>Customer Location</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-4 text-muted"
                  >
                    Loading orders...
                  </td>
                </tr>
              )}

              {!loading &&
                filteredOrders.map((order) => (
                  <tr key={order.orderId}>
                    <td>#{order.orderId}</td>

                    <td>
                      {order.customerName || "—"}
                      <div className="text-muted small">
                        {order.customerArea || ""}
                      </div>
                    </td>

                    <td>
                      <span className="badge bg-secondary-subtle text-secondary">
                        {order.status || "NEW"}
                      </span>
                    </td>

                    <td>
                      {order.driverName || "Unassigned"}
                    </td>

                    <td className="text-muted small">
                      {order.createdAt
                        ? new Date(
                            order.createdAt
                          ).toLocaleString()
                        : "—"}
                    </td>

                    <td>
                      {order.distance
                        ? `${order.distance} KM`
                        : "—"}
                    </td>

                    <td className="text-muted small">
                      {order.storeName || "—"}
                    </td>

                    <td className="text-muted small">
                      {order.customerLocation || "—"}
                    </td>

                    <td>
                      <Link
                        to={`/vendor/orders/${order.orderId}`}
                        className="btn btn-link btn-sm text-decoration-none"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}

              {!loading && filteredOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center text-muted py-4"
                  >
                    No orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card-footer text-muted small">
          Showing {filteredOrders.length} orders
        </div>
      </div>
    </div>
  );
}
