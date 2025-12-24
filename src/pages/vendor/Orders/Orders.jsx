// src/pages/vendor/orders/Orders.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, XCircle } from "lucide-react";

import {
  getVendorOrders,
  cancelVendorOrder,
} from "../../../api/vendor.orders.api";

/**
 * Vendor Orders List (pagination: 6 per page, clean/slick pagination UI)
 * - Preserves all existing columns & actions
 * - Row click navigates to order details
 * - Uses backend pagination (safe parsing for common shapes)
 * - No CSS changes here — relies on Bootstrap classes already in your project
 */
export default function Orders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(6); // <- show 6 items per page as requested
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    loadOrders(1);
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Load a specific page (replaces current list)
   */
  async function loadOrders(targetPage = 1) {
    try {
      setLoading(true);
      setError("");

      const res = await getVendorOrders({
        page: targetPage,
        limit,
      });

      // Accept common shapes:
      // - { data: { items: [], pagination: {} } }
      // - { data: { items: [], pagination: {} } } (alternate)
      // - { items: [], pagination: {} }
      // - res?.data?.items
      const payload = res?.data?.data ?? res?.data ?? res ?? {};
      const items =
        payload?.items ??
        payload?.data?.items ??
        res?.data?.items ??
        [];

      const pagination =
        payload?.pagination ??
        res?.data?.pagination ??
        (payload?.data?.pagination ?? null) ??
        {
          page: targetPage,
          limit,
          total: items.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: targetPage > 1,
        };

      if (!isMountedRef.current) return;

      setOrders(items || []);
      setPage(pagination.page ?? targetPage);
      setTotalPages(pagination.totalPages ?? Math.max(1, Math.ceil((pagination.total ?? items.length) / (pagination.limit ?? limit))));
      setTotalItems(pagination.total ?? items.length);
      setHasNext(Boolean(pagination.hasNext || (pagination.page < (pagination.totalPages || 1))));
      setHasPrev(Boolean(pagination.hasPrev || (pagination.page > 1)));
    } catch (err) {
      console.error("Load orders failed:", err);
      setError("Failed to load orders");
      setOrders([]);
      setTotalPages(1);
      setTotalItems(0);
      setHasNext(false);
      setHasPrev(false);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }

  /* ===============================
     CANCEL ORDER
  ================================ */
  async function handleCancel(orderId) {
    const ok = window.confirm(
      "Cancel this order? This action cannot be undone."
    );
    if (!ok) return;

    try {
      await cancelVendorOrder(orderId);
      // reload current page
      loadOrders(page);
    } catch (err) {
      console.error("Cancel failed:", err);
      alert("Order cannot be cancelled");
    }
  }

  /* ===============================
     HELPERS
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
    o.assignedRiderId ? o.assignedRiderId : "Unassigned";

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

  /* ===============================
     Pagination controls helpers (compact range)
  ================================ */
  const goPrev = () => {
    if (page <= 1) return;
    loadOrders(page - 1);
  };

  const goNext = () => {
    if (!hasNext) return;
    loadOrders(page + 1);
  };

  const goToPage = (p) => {
    if (p === page) return;
    loadOrders(p);
  };

  // compute a compact page window (show up to 5 page numbers centered on current)
  const getPageWindow = () => {
    const MAX = 5;
    if (totalPages <= MAX) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, page + 2);
    if (page <= 2) {
      start = 1;
      end = 5;
    } else if (page >= totalPages - 1) {
      start = Math.max(1, totalPages - 4);
      end = totalPages;
    }
    const arr = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  };

  /* ===============================
     UI
  ================================ */
  return (
    <div className="container-fluid p-4">
      {/* HEADER */}
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <h4 className="fw-semibold mb-0">Orders</h4>

        <button
          className="btn btn-dark btn-sm"
          onClick={() => navigate("/vendor/orders/create")}
        >
          + New Request
        </button>
      </div>

      {error && (
        <div className="alert alert-danger rounded">{error}</div>
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
                    onClick={() => navigate(`/vendor/orders/${o.orderId}`)}
                  >
                    <td>
                      <strong>{o.orderId}</strong>
                      <br />
                      <small className="text-muted">
                        {new Date(o.createdAt).toLocaleString()}
                      </small>
                    </td>

                    <td>
                      {o.clientOrderId || (
                        <span className="text-muted">Not specified</span>
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
                      <span className={`badge ${statusClass(o.status)}`}>
                        {o.status}
                      </span>
                    </td>

                    <td>{renderRider(o)}</td>

                    <td
                      className="text-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        title="View Order"
                        onClick={() => navigate(`/vendor/orders/${o.orderId}`)}
                      >
                        <Eye size={16} />
                      </button>

                      {o.status === "NEW" && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          title="Cancel Order"
                          onClick={() => handleCancel(o.orderId)}
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

        {/* Slick Pagination */}
        <div className="card-footer d-flex justify-content-between align-items-center">
          <div>
            <small className="text-muted">
              Showing {orders.length} of {totalItems} orders • Page {page} of {totalPages}
            </small>
          </div>

          <nav aria-label="Orders pagination">
            <ul className="pagination mb-0">
              <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
                <button className="page-link" onClick={goPrev} disabled={page <= 1}>
                  Prev
                </button>
              </li>

              {/* first page & ellipsis */}
              {getPageWindow()[0] > 1 && (
                <>
                  <li className="page-item">
                    <button className="page-link" onClick={() => goToPage(1)}>1</button>
                  </li>
                  {getPageWindow()[0] > 2 && (
                    <li className="page-item disabled"><span className="page-link">…</span></li>
                  )}
                </>
              )}

              {/* page numbers window */}
              {getPageWindow().map((p) => (
                <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
                  <button className="page-link" onClick={() => goToPage(p)}>
                    {p}
                  </button>
                </li>
              ))}

              {/* last page & ellipsis */}
              {getPageWindow().slice(-1)[0] < totalPages && (
                <>
                  {getPageWindow().slice(-1)[0] < totalPages - 1 && (
                    <li className="page-item disabled"><span className="page-link">…</span></li>
                  )}
                  <li className="page-item">
                    <button className="page-link" onClick={() => goToPage(totalPages)}>{totalPages}</button>
                  </li>
                </>
              )}

              <li className={`page-item ${!hasNext ? "disabled" : ""}`}>
                <button className="page-link" onClick={goNext} disabled={!hasNext}>
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}
