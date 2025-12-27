// src/pages/vendor/orders/Orders.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Info } from "lucide-react";

import { getVendorOrders, assignRiderToOrder } from "../../../api/vendor.orders.api";
import { getVendorRiders } from "../../../api/vendor.riders.api";
import { getVendorStores } from "../../../api/vendor.stores.api";

/**
 * Orders.jsx
 * - Columns: CID | Customer | Store | Drop Location | Rider | Status | Actions
 * - 6 items per page
 * - Inline assign updates only the affected row (no full-page reload)
 * - Loading shows 6 skeleton rows (clean)
 * - Store name used instead of storeId (no storeId leakage)
 */

export default function Orders() {
  const navigate = useNavigate();

  // list + pagination
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const limit = 6;
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // riders for assignment
  const [riders, setRiders] = useState([]);
  const [assigningMap, setAssigningMap] = useState({}); // { [orderId]: boolean }

  // stores map: { [storeId]: { storeId, name, ... } }
  const [storesMap, setStoresMap] = useState({});

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    loadStores();
    loadRiders();
    loadOrders(1);
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------
  // Data loaders
  // ------------------------
  async function loadStores() {
    try {
      const res = await getVendorStores();
      const payload = res?.data?.data ?? res?.data ?? res ?? {};
      const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload?.data?.items) ? payload.data.items : Array.isArray(payload) ? payload : [];
      const map = {};
      items.forEach((s) => {
        if (!s) return;
        const id = s.storeId ?? s.id ?? null;
        if (id) map[id] = s;
      });
      if (!isMountedRef.current) return;
      setStoresMap(map);
    } catch (err) {
      console.error("Failed to load stores", err);
      if (isMountedRef.current) setStoresMap({});
    }
  }

  async function loadRiders() {
    try {
      const res = await getVendorRiders();
      const list = res?.data?.data ?? res?.data ?? [];
      setRiders(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load riders", err);
      setRiders([]);
    }
  }

  async function loadOrders(targetPage = 1) {
    try {
      setLoading(true);
      setError("");

      const res = await getVendorOrders({ page: targetPage, limit });

      // Robust normalization to support different response shapes
      const payload = res?.data?.data ?? res?.data ?? res ?? {};
      const items = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload?.data?.items)
          ? payload.data.items
          : Array.isArray(res?.data?.items)
            ? res.data.items
            : Array.isArray(payload)
              ? payload
              : [];

      const pagination =
        payload?.pagination ??
        res?.data?.pagination ??
        payload?.data?.pagination ??
        {
          page: targetPage,
          limit,
          total: items.length,
          totalPages: Math.max(1, Math.ceil((items.length || 0) / limit)),
          hasNext: false,
          hasPrev: targetPage > 1,
        };

      if (!isMountedRef.current) return;

      setOrders(items);
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

  // ------------------------
  // Helpers
  // ------------------------
  const getDropFullAddress = (o) =>
    (o.notes && typeof o.notes === "string" && o.notes.trim()) ||
    o.drop?.address?.full ||
    (o.drop?.lat && o.drop?.lng ? `${o.drop.lat}, ${o.drop.lng}` : "Customer location");

  const getDropShort = (full) => {
    if (!full) return "—";
    const words = full.trim().split(/\s+/);
    const n = Math.min(2, words.length);
    return words.slice(0, n).join(" ");
  };

  const getStoreName = (o) => {
    // prefer mapping from storesMap using known storeId fields
    const id = o.store?.storeId ?? o.storeId ?? o.pickup?.storeId ?? null;
    if (id && storesMap[id]?.name) return storesMap[id].name;
    // fallback to other possible fields on the order object
    return (
      o.store?.name ??
      o.pickup?.address?.storeName ??
      o.storeName ??
      (id ? id : "Store")
    );
  };

  const riderAvailable = (r) => {
    return r && r.status && r.status.toUpperCase() === "ACTIVE";
  };

  // Determine if order has an assigned rider by checking multiple possible fields
  const getAssignedRiderFromOrder = (order) => {
    // 1) If order contains nested rider object
    const nested =
      order.assignedRider ||
      order.rider ||
      order.assignedRiderObj ||
      order.riderDetails ||
      null;
    if (nested && (nested.riderId ?? nested.rider_id ?? nested.id)) return nested;

    // 2) If only an ID present, try to find details in riders list
    const id = order.assignedRiderId ?? order.riderId ?? order.assignedTo ?? null;
    if (id) {
      return riders.find((r) => r.riderId === id) || { riderId: id, name: null };
    }

    return null;
  };

  const statusClass = (status) => {
    switch (status) {
      case "NEW":
        return "badge bg-dark text-white";
      case "ASSIGNED":
        return "badge bg-primary text-white";
      case "PICKED_UP":
      case "ON_THE_WAY":
        return "badge bg-warning text-dark";
      case "DELIVERED":
        return "badge bg-success text-white";
      case "CANCELLED":
        return "badge bg-danger text-white";
      default:
        return "badge bg-secondary text-white";
    }
  };

  // ------------------------
  // Pagination controls
  // ------------------------
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

  // ------------------------
  // Actions
  // ------------------------
  async function handleAssign(orderId, riderId) {
    if (!riderId) return;
    setAssigningMap((m) => ({ ...m, [orderId]: true }));
    try {
      // call API
      const res = await assignRiderToOrder(orderId, riderId);
      // Update only the affected order in local state — no full page reload
      setOrders((prev) =>
        prev.map((o) => {
          if (o.orderId !== orderId) return o;
          // merge new assignment info. prefer server response if available.
          const assignedObjFromRes =
            res?.data?.data?.assignedRider ??
            res?.data?.assignedRider ??
            null;
          // find rider details locally if possible
          const riderObj = riders.find((r) => r.riderId === riderId) || assignedObjFromRes || { riderId, name: null };
          return {
            ...o,
            assignedRiderId: riderId,
            assignedRider: riderObj,
            status: o.status === "NEW" ? "ASSIGNED" : o.status, // optimistic status update
            updatedAt: new Date().toISOString(),
          };
        })
      );
      // refresh riders list in background (non-blocking) to reflect availability changes
      loadRiders().catch(() => { });
    } catch (err) {
      console.error("Assign failed:", err);
      alert("Failed to assign rider");
    } finally {
      setAssigningMap((m) => ({ ...m, [orderId]: false }));
    }
  }

  // ------------------------
  // Render helpers for clean loading skeleton
  // ------------------------
  const renderSkeletonRows = () => {
    const rows = [];
    for (let i = 0; i < limit; i++) {
      rows.push(
        <tr key={`skeleton-${i}`}>
          <td>
            <div className="placeholder-glow" style={{ width: 120 }}>
              <span className="placeholder col-6" />
            </div>
            <div className="text-muted small placeholder-glow">
              <span className="placeholder col-4" />
            </div>
          </td>

          <td>
            <div className="placeholder-glow" style={{ width: 140 }}>
              <span className="placeholder col-7" />
            </div>
          </td>

          <td>
            <div className="placeholder-glow" style={{ width: 180 }}>
              <span className="placeholder col-8" />
            </div>
            <div className="placeholder-glow text-muted small">
              <span className="placeholder col-4" />
            </div>
          </td>
          <td>
            <div className="placeholder-glow" style={{ width: 160 }}>
              <span className="placeholder col-7" />
            </div>
          </td>
          <td>
            <div className="placeholder-glow" style={{ width: 220 }}>
              <span className="placeholder col-10" />
            </div>
          </td>
          <td>
            <div className="placeholder-glow" style={{ width: 80 }}>
              <span className="placeholder col-5" />
            </div>
          </td>
        </tr>
      );
    }
    return rows;
  };

  // ------------------------
  // Main render
  // ------------------------
  return (
    <div className="container-fluid p-4">
      {/* HEADER */}
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <h4 className="fw-semibold mb-0">Orders</h4>

        <button className="btn btn-dark btn-sm" onClick={() => navigate("/vendor/orders/create")}>
          + New Request
        </button>
      </div>

      {error && <div className="alert alert-danger rounded">{error}</div>}

      <div className="card card-ui">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: "16%" }}>CID</th>
                <th style={{ width: "18%" }}>Customer</th>
                <th style={{ width: "22%" }}>Store</th>
                <th style={{ width: "26%" }}>Drop Location</th>
                <th style={{ width: "20%" }}>Rider</th>
                <th style={{ width: "8%" }}>Status</th>
                <th className="text-end" style={{ width: "8%" }}>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                renderSkeletonRows()
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const fullDrop = getDropFullAddress(o);
                  const shortDrop = getDropShort(fullDrop);
                  const storeName = getStoreName(o);
                  // robust assigned detection
                  const assignedRiderCandidate = getAssignedRiderFromOrder(o);
                  const assignedId = assignedRiderCandidate?.riderId ?? null;
                  const assignedRiderObj =
                    assignedRiderCandidate?.riderId
                      ? (assignedRiderCandidate.riderId && (assignedRiderCandidate.name ? assignedRiderCandidate : riders.find((r) => r.riderId === assignedRiderCandidate.riderId))) || null
                      : null;

                  // shared min width for dropdown and badge so sizes match
                  const controlMinWidth = 220;

                  return (
                    <tr key={o.orderId} role="button" onClick={() => navigate(`/vendor/orders/${o.orderId}`)}>
                      {/* CID */}
                      <td>
                        <div style={{ fontSize: "1rem", fontWeight: 600 }}>{o.clientOrderId || <span className="text-muted">Not specified</span>}</div>
                        <div className="text-muted small">{o.customer?.phone ?? "-"}</div>
                      </td>
                      {/* CUSTOMER */}
                      <td>
                        <div style={{ fontSize: "0.95rem", fontWeight: 600 }}>
                          {o.customer?.name || <span className="text-muted">—</span>}
                        </div>
                        <div className="text-muted small">{o.customer?.phone ?? "-"}</div>
                      </td>


                      {/* STORE */}
                      <td>
                        <div className="fw-semibold" style={{ fontSize: "1rem" }}>
                          {storeName}
                        </div>
                        {/* intentionally NOT showing storeId to avoid leakage */}
                      </td>

                      {/* DROP */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ fontSize: "0.95rem" }}>{shortDrop}</div>
                          <div title={fullDrop} onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                            <Info size={14} />
                          </div>
                        </div>
                      </td>

                      {/* RIDER */}
                      <td onClick={(e) => e.stopPropagation()}>
                        {assignedId ? (
                          // frozen badge when already assigned
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div className="badge bg-light text-primary border" style={{ minWidth: controlMinWidth, display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 12px" }}>
                              {/* NOTE: per request, dots are NOT shown for already assigned riders */}
                              <span style={{ fontWeight: 600 }}>
                                {assignedRiderObj && assignedRiderObj.name ? `${assignedRiderObj.name}${assignedRiderObj.riderId ? ` • ${assignedRiderObj.riderId}` : ""}` : assignedId}
                              </span>
                            </div>
                            {assigningMap[o.orderId] ? <small className="text-muted">Updating…</small> : null}
                          </div>
                        ) : (
                          // unassigned -> show select (dots indicate availability here only)
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <select
                              className="form-select form-select-sm"
                              defaultValue=""
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const val = e.target.value || null;
                                if (!val) return;
                                handleAssign(o.orderId, val);
                              }}
                              style={{ minWidth: controlMinWidth }}
                            >
                              <option value="">{assigningMap[o.orderId] ? "Assigning…" : "Unassigned — assign rider"}</option>
                              {riders.map((r) => {
                                const available = riderAvailable(r);
                                const label = `${available ? "🟢" : "🔴"} ${r.name} • ${r.riderId}`;
                                return (
                                  <option key={r.riderId} value={r.riderId}>
                                    {label}
                                  </option>
                                );
                              })}
                            </select>
                            {assigningMap[o.orderId] ? <small className="text-muted">Assigning…</small> : null}
                          </div>
                        )}
                      </td>

                      {/* STATUS */}
                      <td>
                        <div>{o.status ? <span className={statusClass(o.status)}>{o.status.replaceAll("_", " ")}</span> : <span className="text-muted">—</span>}</div>
                      </td>

                      {/* ACTIONS */}
                      <td className="text-end" onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-sm" title="View Order" onClick={() => navigate(`/vendor/orders/${o.orderId}`)}>
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer pagination */}
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

              {/* Page numbers (up to 5) */}
              {(() => {
                const MAX = 5;
                const pages = [];
                let start = Math.max(1, page - 2);
                let end = Math.min(totalPages, page + 2);
                if (totalPages <= MAX) {
                  start = 1;
                  end = totalPages;
                } else if (page <= 2) {
                  start = 1;
                  end = 5;
                } else if (page >= totalPages - 1) {
                  start = Math.max(1, totalPages - 4);
                  end = totalPages;
                }
                if (start > 1) {
                  pages.push(
                    <li key={"p1"} className="page-item">
                      <button className="page-link" onClick={() => goToPage(1)}>
                        1
                      </button>
                    </li>
                  );
                  if (start > 2) pages.push(<li key="sep1" className="page-item disabled"><span className="page-link">…</span></li>);
                }
                for (let p = start; p <= end; p++) {
                  pages.push(
                    <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
                      <button className="page-link" onClick={() => goToPage(p)}>
                        {p}
                      </button>
                    </li>
                  );
                }
                if (end < totalPages) {
                  if (end < totalPages - 1) pages.push(<li key="sep2" className="page-item disabled"><span className="page-link">…</span></li>);
                  pages.push(
                    <li key={"plast"} className="page-item">
                      <button className="page-link" onClick={() => goToPage(totalPages)}>
                        {totalPages}
                      </button>
                    </li>
                  );
                }
                return pages;
              })()}

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
