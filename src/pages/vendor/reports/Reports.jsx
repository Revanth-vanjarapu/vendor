import { useEffect, useState } from "react";
import httpClient from "../../../utils/httpClient";
import { getVendorStores } from "../../../api/vendor.stores.api";
import { getVendorRiders } from "../../../api/vendor.riders.api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Vendor Reports – Orders
 * FINAL production version
 */

export default function Reports() {
    const [orders, setOrders] = useState([]);
    const [stores, setStores] = useState([]);
    const [riders, setRiders] = useState([]);
    const [loading, setLoading] = useState(false);

    /* ===============================
    FILTER STATE
    Default status = DELIVERED
    ================================ */
    const [filters, setFilters] = useState({
        storeId: "",
        riderId: "",
        status: "DELIVERED",
        fromDate: "",
        toDate: "",
    });

    /* ===============================
    PAGINATION STATE
    ================================ */
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    /* ===============================
    LOAD STORES & RIDERS
    ================================ */
    useEffect(() => {
        getVendorStores().then((res) => {
            setStores(res?.data?.data?.items || []);
        });

        getVendorRiders().then((res) => {
            setRiders(res?.data?.data || []);
        });
    }, []);

    /* ===============================
    LOAD REPORT
    - Accepts optional pageArg to avoid relying on async setState.
    ================================ */
    async function loadReport(pageArg) {
        const usePage = typeof pageArg === "number" ? pageArg : page;
        setLoading(true);
        try {
            const res = await httpClient.get(
                "/api/vendor/reports/orders",
                {
                    params: {
                        page: usePage,
                        limit: limit,
                        storeId: filters.storeId || undefined,
                        riderId: filters.riderId || undefined,
                        status: filters.status || undefined,
                        fromDate: filters.fromDate || undefined,
                        toDate: filters.toDate || undefined,
                    },
                }
            );

            setOrders(res?.data?.data?.orders || []);
            const pagination = res?.data?.data?.pagination;
            if (pagination) {
                setPage(pagination.page || usePage);
                setLimit(pagination.limit || limit);
                setTotalPages(pagination.totalPages || 1);
                setTotalItems(pagination.total || (res?.data?.data?.orders || []).length);
            } else {
                // fallback defaults
                setTotalPages(1);
                setTotalItems((res?.data?.data?.orders || []).length);
            }
        } catch (err) {
            console.error("Failed to load report", err);
            setOrders([]);
            setTotalPages(1);
            setTotalItems(0);
        } finally {
            setLoading(false);
        }
    }

    /* ===============================
    HELPERS
    ================================ */
    const getStoreName = (storeId) =>
        stores.find((s) => s.storeId === storeId)?.name ||
        storeId;

    const getRiderName = (riderId) =>
        riders.find((r) => r.riderId === riderId)?.name ||
        riderId ||
        "-";

    const getDropAddress = (order) =>
        // Prefer explicit drop.address, then fall back to notes (many orders store address in notes).
        // Do NOT show lat/lng — show '-' when neither is available.
        (order?.drop?.address && order.drop.address.toString().trim() !== "")
            ? order.drop.address
            : (order?.notes && order.notes.toString().trim() !== "")
                ? order.notes
                : "-";

    /* ===============================
    PAGINATION CONTROLS HELPERS
    ================================ */
    const gotoPage = (p) => {
        if (p < 1 || p > totalPages || p === page) return;
        // Immediately request the page
        loadReport(p);
    };

    const handleGenerate = () => {
        // When user generates, reset to page 1 and fetch page 1
        setPage(1);
        loadReport(1);
    };

    const startIndex = (page - 1) * limit;
    const downloadPdfReport = async () => {
        try {
            setLoading(true);

            let allOrders = [];
            let currentPage = 1;
            let totalPagesFromApi = 1;

            while (currentPage <= totalPagesFromApi) {
                const res = await httpClient.get(
                    "/api/vendor/reports/orders",
                    {
                        params: {
                            page: currentPage,
                            limit,
                            storeId: filters.storeId || undefined,
                            riderId: filters.riderId || undefined,
                            status: filters.status || undefined,
                            fromDate: filters.fromDate || undefined,
                            toDate: filters.toDate || undefined,
                        },
                    }
                );

                const data = res?.data?.data;
                allOrders = allOrders.concat(data?.orders || []);
                totalPagesFromApi = data?.pagination?.totalPages || 1;
                currentPage++;
            }

            const doc = new jsPDF("l", "mm", "a4");

            doc.setFontSize(14);
            doc.text("Vendor Orders Report", 14, 12);

            doc.setFontSize(10);
            doc.text(
                `Generated on: ${new Date().toLocaleString("en-GB")}`,
                14,
                18
            );

            autoTable(doc, {
                startY: 22,
                head: [[
                    "#",
                    "Order ID",
                    "Store",
                    "Customer",
                    "Mobile",
                    "Delivery Address",
                    "KM",
                    "Amount",
                    "Status",
                    "Rider",
                    "Date",
                ]],
                body: allOrders.map((o, i) => ([
                    i + 1,
                    o.clientOrderId || "-",
                    getStoreName(o.storeId),
                    o.customer?.name || "-",
                    o.customer?.phone || "-",
                    getDropAddress(o),
                    o.billing?.totalKm ?? "-",
                    o.billing?.totalAmount ?? "-",
                    o.status,
                    getRiderName(o.assignedRiderId),
                    new Date(o.updatedAt).toLocaleDateString("en-GB"),
                ])),
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                },
                headStyles: {
                    fillColor: [33, 37, 41],
                },
                theme: "grid",
            });

            doc.save(`orders-report-${Date.now()}.pdf`);
        } catch (err) {
            console.error("PDF download failed", err);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="container-fluid py-4">
            <h4 className="mb-3">Reports – Orders</h4>



            {/* ===============================
        FILTERS
    ================================ */}
            <div className="card mb-3">
                <div className="card-body row g-3 align-items-end">

                    <div className="col-md-3">
                        <label className="form-label small">Store</label>
                        <select
                            className="form-select"
                            value={filters.storeId}
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    storeId: e.target.value,
                                })
                            }
                        >
                            <option value="">All Stores</option>
                            {stores.map((s) => (
                                <option key={s.storeId} value={s.storeId}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="col-md-3">
                        <label className="form-label small">Rider</label>
                        <select
                            className="form-select"
                            value={filters.riderId}
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    riderId: e.target.value,
                                })
                            }
                        >
                            <option value="">All Riders</option>
                            {riders.map((r) => (
                                <option key={r.riderId} value={r.riderId}>
                                    {r.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="col-md-2">
                        <label className="form-label small">Status</label>
                        <select
                            className="form-select"
                            value={filters.status}
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    status: e.target.value,
                                })
                            }
                        >
                            <option value="DELIVERED">Delivered</option>
                            <option value="ASSIGNED">Assigned</option>
                            <option value="CANCELLED">Cancelled</option>
                            <option value="">All</option>
                        </select>
                    </div>

                    <div className="col-md-2">
                        <label className="form-label small">From</label>
                        <input
                            type="date"
                            className="form-control"
                            value={filters.fromDate}
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    fromDate: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div className="col-md-2">
                        <label className="form-label small">To</label>
                        <input
                            type="date"
                            className="form-control"
                            value={filters.toDate}
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    toDate: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div className="col-md-12 text-end">
                        <button
                            className="btn btn-dark px-4"
                            onClick={handleGenerate}
                        >
                            Generate
                        </button>
                    </div>
                </div>
            </div>

            {/* ===============================
        TABLE
    ================================ */}
            <div className="card">
                <div className="card-body p-0">
                    <table className="table table-bordered table-hover mb-0">
                        <thead className="table-light">
                            <tr>
                                <th>#</th>
                                <th>C-ID</th>
                                <th>Store</th>
                                <th>Customer</th>
                                <th>Mobile</th>
                                <th>Delivery Address</th>
                                <th>KM</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Delivered By</th>
                                <th>Delivery Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((o, i) => (
                                <tr key={o.orderId}>
                                    <td>{startIndex + i + 1}</td>
                                    <td>{o.clientOrderId || "-"}</td>
                                    <td>{getStoreName(o.storeId)}</td>
                                    <td>{o.customer?.name || "-"}</td>
                                    <td>{o.customer?.phone || "-"}</td>
                                    <td style={{ maxWidth: 280 }}>
                                        {getDropAddress(o)}
                                    </td>
                                    <td>{o.billing?.totalKm ?? "-"}</td>
                                    <td>{o.billing?.totalAmount ?? "-"}</td>
                                    <td>
                                        <span
                                            className="badge rounded-pill px-3 py-2"
                                            style={{
                                                backgroundColor:
                                                    o.status === "DELIVERED"
                                                        ? "var(--bs-primary)"
                                                        : o.status === "ASSIGNED"
                                                            ? "var(--bs-success)"
                                                            : o.status === "CANCELLED"
                                                                ? "var(--bs-secondary-color)"
                                                                : "var(--bs-border-color)",
                                            }}
                                        >
                                            {o.status}
                                        </span>
                                    </td>

                                    <td>{getRiderName(o.assignedRiderId)}</td>
                                    <td>
                                        {new Date(o.updatedAt).toLocaleDateString(
                                            "en-GB"
                                        )}
                                    </td>
                                </tr>
                            ))}

                            {!loading && orders.length === 0 && (
                                <tr>
                                    <td
                                        colSpan="11"
                                        className="text-center text-muted py-4"
                                    >
                                        Clink generate to load report
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {loading && (
                        <div className="text-center py-3">
                            Loading…
                        </div>
                    )}
                </div>
            </div>

            {/* ===============================
        PAGINATION UI
    ================================ */}
            <div className="d-flex align-items-center justify-content-between mt-3">
                <div>
                    <small className="text-muted">
                        Showing <strong>{orders.length}</strong> of <strong>{totalItems}</strong> results
                        {totalPages > 1 && <> — page <strong>{page}</strong> of <strong>{totalPages}</strong></>}
                    </small>
                </div>

                {totalPages > 1 && (
                    <nav aria-label="Report pagination">
                        <ul className="pagination mb-0">
                            <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
                                <button className="page-link" onClick={() => gotoPage(page - 1)}>
                                    Previous
                                </button>
                            </li>

                            {/* Render simple numbered pages. For large page counts you can later switch to a compact representation. */}
                            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
                                <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
                                    <button className="page-link" onClick={() => gotoPage(p)}>
                                        {p}
                                    </button>
                                </li>
                            ))}

                            <li className={`page-item ${page === totalPages ? "disabled" : ""}`}>
                                <button className="page-link" onClick={() => gotoPage(page + 1)}>
                                    Next
                                </button>
                            </li>
                        </ul>
                    </nav>
                )}
                <div className="d-flex justify-content-end mt-3">
                    <button
                        className="btn btn-outline-dark"
                        onClick={downloadPdfReport}
                        disabled={loading || orders.length === 0}
                    >
                        Download Report (PDF)
                    </button>
                </div>

            </div>
        </div>

    );
}
