import { useEffect, useState } from "react";
import {
  getVendorRiders,
  assignRiderToStore,
  changeRiderStatus,
} from "../../api/vendor.riders.api";
import { getVendorStores } from "../../api/vendor.stores.api";
import {
  RefreshCcw,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

export default function Riders() {
  const [riders, setRiders] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

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

      setRiders(ridersRes.data?.data?.items || []);
      setStores(storesRes.data?.data?.items || []);
    } catch (err) {
      console.error("Failed to load riders", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ===============================
     ACTIONS
  ================================ */
  const handleStoreChange = async (riderId, storeId) => {
    try {
      await assignRiderToStore(riderId, storeId);
      loadData();
    } catch {
      alert("Failed to assign rider to store");
    }
  };

  const toggleStatus = async (rider) => {
    try {
      const newStatus =
        rider.status === "ACTIVE"
          ? "INACTIVE"
          : "ACTIVE";

      await changeRiderStatus(
        rider.riderId,
        newStatus
      );

      loadData();
    } catch {
      alert("Failed to change rider status");
    }
  };

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
                <th></th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="text-center py-4">
                    Loading riders...
                  </td>
                </tr>
              )}

              {!loading &&
                riders.map((r) => (
                  <tr key={r.riderId}>
                    {/* Rider */}
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <img
                          src={r.profilePicUrl}
                          alt={r.name}
                          className="rounded-circle"
                          width="36"
                          height="36"
                        />
                        <div>
                          <div className="fw-semibold">
                            {r.name}
                          </div>
                          <div className="text-muted small">
                            {r.riderId}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="small">
                      {r.phone}
                      <div className="text-muted small">
                        {r.email}
                      </div>
                    </td>

                    {/* Store */}
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={r.storeId || ""}
                        onChange={(e) =>
                          handleStoreChange(
                            r.riderId,
                            e.target.value
                          )
                        }
                      >
                        <option value="">
                          Unassigned
                        </option>
                        {stores.map((s) => (
                          <option
                            key={s.storeId}
                            value={s.storeId}
                          >
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Status */}
                    <td>
                      <span
                        className={`badge ${
                          r.status === "ACTIVE"
                            ? "bg-success-subtle text-success"
                            : "bg-secondary-subtle text-secondary"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>

                    {/* Toggle */}
                    <td>
                      <button
                        className="btn btn-link p-0"
                        onClick={() =>
                          toggleStatus(r)
                        }
                        title="Toggle Status"
                      >
                        {r.status === "ACTIVE" ? (
                          <ToggleRight size={22} />
                        ) : (
                          <ToggleLeft size={22} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}

              {!loading && riders.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center text-muted py-4"
                  >
                    No riders found
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
