import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  createVendorOrder,
  createVendorOrdersBulk,
} from "../../../api/vendor.orders.api";
import { getVendorStores } from "../../../api/vendor.stores.api";

/* ===============================
   Leaflet icon fix
================================ */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function CreateOrder() {
  const [mode, setMode] = useState("single");
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState("");

  /* ===============================
     Toast
  ================================ */
  const [toast, setToast] = useState(null);
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const [submitting, setSubmitting] = useState(false);

  /* ===============================
     SINGLE ORDER STATE
  ================================ */
  const [single, setSingle] = useState({
    clientOrderId: "",
    customerName: "",
    phone: "",

    pickupLat: "",
    pickupLng: "",

    dropLat: "",
    dropLng: "",

    vehicleType: "BIKE",
    notes: "",
  });

  /* ===============================
     BULK STATE
  ================================ */
  const [bulkText, setBulkText] = useState("");
  const [bulkParsed, setBulkParsed] = useState([]);
  const [bulkErrors, setBulkErrors] = useState([]);

  /* ===============================
     LOAD STORES
  ================================ */
  useEffect(() => {
    (async () => {
      const res = await getVendorStores();
      setStores(res.data.data.items);
    })();
  }, []);

  const store = stores.find((s) => s.storeId === storeId);

  /* ===============================
     STORE → PICKUP LAT/LNG
  ================================ */
  useEffect(() => {
    if (!store) return;
    setSingle((p) => ({
      ...p,
      pickupLat: store.lat,
      pickupLng: store.lng,
    }));
  }, [store]);

  /* ===============================
     SUBMIT SINGLE
  ================================ */
  const submitSingle = async () => {
    if (!store) return showToast("danger", "Select store");
    if (
      !single.customerName ||
      !single.phone ||
      !single.dropLat ||
      !single.dropLng
    ) {
      return showToast("danger", "Missing required fields");
    }

    setSubmitting(true);
    try {
      const payload = {
        clientOrderId: single.clientOrderId || null,
        storeId: store.storeId,

        pickup: {
          lat: Number(single.pickupLat),
          lng: Number(single.pickupLng),
        },
        drop: {
          lat: Number(single.dropLat),
          lng: Number(single.dropLng),
        },
        customer: {
          name: single.customerName,
          phone: single.phone,
        },
        vehicleType: single.vehicleType,
        notes: single.notes,
        source: "VENDOR_WEB",
      };

      await createVendorOrder(payload);
      showToast("success", "Order created successfully");
    } catch {
      showToast("danger", "Order creation failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* ===============================
     PARSE BULK (TAB FORMAT)
  ================================ */
  const parseBulk = () => {
    if (!store) return showToast("danger", "Select store first");

    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const parsed = [];
    const errors = [];

    lines.forEach((line, i) => {
      const cols = line.split(/\t+/);

      if (cols.length < 6) {
        errors.push(`Line ${i + 1}: Invalid format`);
        return;
      }

      const [
        clientOrderId,
        customerName,
        address,
        dropLat,
        dropLng,
        phone,
      ] = cols;

      if (!dropLat || !dropLng) {
        errors.push(`Line ${i + 1}: Lat/Lng required`);
        return;
      }

      parsed.push({
        clientOrderId,
        storeId: store.storeId,
        pickup: { lat: store.lat, lng: store.lng },
        drop: {
          lat: Number(dropLat),
          lng: Number(dropLng),
        },
        customer: {
          name: customerName,
          phone,
        },
        vehicleType: "BIKE",
        notes: address,
        source: "VENDOR_WEB",
      });
    });

    setBulkParsed(parsed);
    setBulkErrors(errors);

    if (!errors.length) {
      showToast("success", `${parsed.length} orders ready`);
    }
  };

  /* ===============================
     SUBMIT BULK
  ================================ */
  const submitBulk = async () => {
    if (!bulkParsed.length) return;

    setSubmitting(true);
    try {
      await createVendorOrdersBulk({ orders: bulkParsed });
      showToast(
        "success",
        `${bulkParsed.length} orders created`
      );
      setBulkParsed([]);
      setBulkText("");
    } catch {
      showToast("danger", "Bulk order failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* ===============================
     UI
  ================================ */
  return (
    <div className="container-fluid p-4">
      {/* Toast */}
      {toast && (
        <div
          className={`toast show position-fixed top-0 end-0 m-3 text-bg-${toast.type}`}
          style={{ zIndex: 9999 }}
        >
          <div className="toast-body">{toast.msg}</div>
        </div>
      )}

      <h4 className="fw-semibold mb-4">Create Orders</h4>

      {/* Store */}
      <select
        className="form-select mb-4"
        value={storeId}
        onChange={(e) => setStoreId(e.target.value)}
      >
        <option value="">Select Store</option>
        {stores.map((s) => (
          <option key={s.storeId} value={s.storeId}>
            {s.name}
          </option>
        ))}
      </select>

      {/* Mode */}
      <div className="btn-group mb-4">
        <button
          className={`btn ${
            mode === "single"
              ? "btn-dark"
              : "btn-outline-secondary"
          }`}
          onClick={() => setMode("single")}
        >
          Single Order
        </button>
        <button
          className={`btn ${
            mode === "bulk"
              ? "btn-dark"
              : "btn-outline-secondary"
          }`}
          onClick={() => setMode("bulk")}
        >
          Bulk Orders
        </button>
      </div>

      {/* ================= SINGLE ================= */}
      {mode === "single" && (
        <div className="row g-4">
          <div className="col-lg-6">
            <div className="card shadow-sm">
              <div className="card-body">
                <h6 className="fw-semibold mb-3">
                  Single Order
                </h6>

                <input
                  className="form-control mb-2"
                  placeholder="Client Order ID"
                  value={single.clientOrderId}
                  onChange={(e) =>
                    setSingle({
                      ...single,
                      clientOrderId: e.target.value,
                    })
                  }
                />

                <input
                  className="form-control mb-2"
                  placeholder="Customer Name"
                  value={single.customerName}
                  onChange={(e) =>
                    setSingle({
                      ...single,
                      customerName: e.target.value,
                    })
                  }
                />

                <input
                  className="form-control mb-2"
                  placeholder="Phone"
                  value={single.phone}
                  onChange={(e) =>
                    setSingle({
                      ...single,
                      phone: e.target.value,
                    })
                  }
                />

                <div className="row g-2 mb-2">
                  <div className="col">
                    <input
                      className="form-control"
                      placeholder="Pickup Lat"
                      value={single.pickupLat}
                      readOnly
                    />
                  </div>
                  <div className="col">
                    <input
                      className="form-control"
                      placeholder="Pickup Lng"
                      value={single.pickupLng}
                      readOnly
                    />
                  </div>
                </div>

                <div className="row g-2 mb-2">
                  <div className="col">
                    <input
                      className="form-control"
                      placeholder="Drop Lat"
                      value={single.dropLat}
                      onChange={(e) =>
                        setSingle({
                          ...single,
                          dropLat: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="col">
                    <input
                      className="form-control"
                      placeholder="Drop Lng"
                      value={single.dropLng}
                      onChange={(e) =>
                        setSingle({
                          ...single,
                          dropLng: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <textarea
                  className="form-control mb-3"
                  placeholder="Notes / Address"
                  value={single.notes}
                  onChange={(e) =>
                    setSingle({
                      ...single,
                      notes: e.target.value,
                    })
                  }
                />

                <button
                  className="btn btn-dark w-100"
                  disabled={submitting}
                  onClick={submitSingle}
                >
                  {submitting
                    ? "Creating..."
                    : "Create Order"}
                </button>
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card shadow-sm">
              <div className="card-body">
                <h6 className="fw-semibold mb-2">
                  Map Preview
                </h6>

                <MapContainer
                  center={[
                    single.dropLat || store?.lat || 17.44,
                    single.dropLng || store?.lng || 78.37,
                  ]}
                  zoom={13}
                  style={{ height: 320 }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {store && (
                    <Marker
                      position={[
                        store.lat,
                        store.lng,
                      ]}
                    />
                  )}
                  {single.dropLat && single.dropLng && (
                    <Marker
                      position={[
                        single.dropLat,
                        single.dropLng,
                      ]}
                    />
                  )}
                </MapContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= BULK ================= */}
      {mode === "bulk" && (
        <div className="card shadow-sm">
          <div className="card-body">
            <h6 className="fw-semibold mb-2">
              Paste Bulk Orders
            </h6>

            <p className="text-muted small">
              clientOrderId ⟶ Name ⟶ Address ⟶ DropLat ⟶ DropLng ⟶ Phone
            </p>

            <textarea
              className="form-control mb-3"
              rows={10}
              placeholder="Paste from Excel / Sheets"
              value={bulkText}
              onChange={(e) =>
                setBulkText(e.target.value)
              }
            />

            <button
              className="btn btn-outline-secondary me-2"
              onClick={parseBulk}
            >
              Parse
            </button>

            {bulkErrors.length > 0 && (
              <div className="alert alert-danger mt-3">
                {bulkErrors.map((e, i) => (
                  <div key={i}>{e}</div>
                ))}
              </div>
            )}

            {bulkParsed.length > 0 && (
              <div className="mt-3 d-flex justify-content-between align-items-center">
                <span className="text-muted">
                  {bulkParsed.length} orders ready
                </span>
                <button
                  className="btn btn-dark"
                  disabled={submitting}
                  onClick={submitBulk}
                >
                  {submitting
                    ? "Creating..."
                    : "Create Orders"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
