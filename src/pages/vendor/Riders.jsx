import { useEffect, useState } from "react";
import {
  getVendorRiders,
  getVendorRiderById,
} from "../../api/vendor.riders.api";
import { getVendorStores } from "../../api/vendor.stores.api";
import { RefreshCcw, Eye, X } from "lucide-react";

/* ===============================
   SAFE NORMALIZER
================================ */
const normalizeArray = (v) => (Array.isArray(v) ? v : []);

export default function Riders() {
  const [riders, setRiders] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ===== Modal state ===== */
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedRider, setSelectedRider] = useState(null);

  /* ===============================
     LOAD DATA
  ================================ */
  const loadData = async () => {
    try {
      setLoading(true);
      const [ridersRes, storesRes] = await Promise.all([
        getVendorRiders(),
        getVendorStores(),
      ]);

      setRiders(normalizeArray(ridersRes?.data?.data));
      setStores(normalizeArray(storesRes?.data?.data?.items));
    } catch (err) {
      console.error(err);
      setRiders([]);
      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ===============================
     VIEW MODAL
  ================================ */
  const openViewModal = async (riderId) => {
    try {
      setShowModal(true);
      setModalLoading(true);
      setSelectedRider(null);

      const res = await getVendorRiderById(riderId);
      setSelectedRider(res?.data?.data || null);
    } catch {
      alert("Failed to load rider details");
      setShowModal(false);
    } finally {
      setModalLoading(false);
    }
  };

  /* ===============================
     HELPERS
  ================================ */
  const getStoreName = (storeId) =>
    stores.find((s) => s.storeId === storeId)?.name ||
    storeId;

  /* ===============================
     UI
  ================================ */
  return (
    <div>
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-semibold mb-0">Riders</h4>
        <button
          className="btn btn-light btn-sm d-flex align-items-center gap-2"
          onClick={loadData}
        >
          <RefreshCcw size={16} />
          Refresh
        </button>
      </div>

      {/* TABLE */}
      <div className="card">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Rider</th>
                <th>Contact</th>
                <th>Store</th>
                <th>Status</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="text-center py-4">
                    Loading riders…
                  </td>
                </tr>
              )}

              {!loading &&
                riders.map((r) => (
                  <tr key={r.riderId}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <img
                          src={
                            r.profilePicUrl ||
                            "https://via.placeholder.com/40?text=R"
                          }
                          width="36"
                          height="36"
                          className="rounded-circle"
                          alt={r.name}
                        />
                        <div>
                          <div className="fw-semibold">{r.name}</div>
                          <div className="text-muted small">
                            {r.riderId}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="small">
                      {r.phone}
                      <div className="text-muted small">
                        {r.email || "—"}
                      </div>
                    </td>

                    {/* STORE (TEXT ONLY) */}
                    <td>
                      {r.storeId ? (
                        <span className="fw-medium">
                          {getStoreName(r.storeId)}
                        </span>
                      ) : (
                        <span className="text-muted">
                          Unassigned
                        </span>
                      )}
                    </td>

                    <td>
                      <span
                        className={`badge ${r.status === "ACTIVE"
                            ? "bg-success-subtle text-success"
                            : "bg-secondary-subtle text-secondary"
                          }`}
                      >
                        {r.status}
                      </span>
                    </td>

                    {/* ACTION */}
                    <td className="text-end">
                      <Eye
                        size={18}
                        style={{ cursor: "pointer" }}
                        onClick={() => openViewModal(r.riderId)}
                      />
                    </td>
                  </tr>
                ))}

              {!loading && riders.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    No riders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===============================
         CUSTOM MODAL
      ================================ */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            zIndex: 1050,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 8,
              width: "700px",
              maxWidth: "95%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center border-bottom p-3">
              <h5 className="mb-0">Rider Details</h5>
              <button
                className="btn btn-light btn-sm"
                onClick={() => setShowModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              {modalLoading && (
                <div className="text-center py-4">
                  Loading details…
                </div>
              )}

              {!modalLoading && selectedRider && (
                <div className="row g-3">
                  <div className="col-md-4 text-center">
                    <img
                      src={
                        selectedRider.profilePicUrl ||
                        "https://via.placeholder.com/120?text=R"
                      }
                      width="120"
                      height="120"
                      className="rounded mb-2"
                      alt="profile"
                    />
                    <div className="fw-semibold">
                      {selectedRider.name}
                    </div>
                    <div className="text-muted small">
                      {selectedRider.riderId}
                    </div>
                  </div>

                  <div className="col-md-8">
                    <p><b>Phone:</b> {selectedRider.phone}</p>
                    <p><b>Email:</b> {selectedRider.email || "—"}</p>
                    <p><b>Status:</b> {selectedRider.status}</p>
                    <p><b>Approval:</b> {selectedRider.isApprove}</p>
                    <p>
                      <b>Store:</b>{" "}
                      {selectedRider.storeId
                        ? getStoreName(selectedRider.storeId)
                        : "Unassigned"}
                    </p>
                    <p>
                      <b>Created:</b>{" "}
                      {new Date(
                        selectedRider.createdAt
                      ).toLocaleString()}
                    </p>
                    <p>
                      <b>Updated:</b>{" "}
                      {new Date(
                        selectedRider.updatedAt
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-top p-3 text-end">
              <button
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
