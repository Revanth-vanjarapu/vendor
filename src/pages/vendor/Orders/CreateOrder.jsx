import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from "react-leaflet";
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
     SINGLE ORDER STATE (UNCHANGED)
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

  const selectedStore = stores.find(
    (s) => s.storeId === storeId
  );

  /* ===============================
     STORE → PICKUP LAT/LNG
  ================================ */
  useEffect(() => {
    if (!selectedStore) return;
    setSingle((p) => ({
      ...p,
      pickupLat: selectedStore.lat,
      pickupLng: selectedStore.lng,
    }));
  }, [selectedStore]);

  /* ===============================
     MAP CLICK HANDLER
  ================================ */
  function MapClickHandler() {
    useMapEvents({
      click(e) {
        setSingle((p) => ({
          ...p,
          dropLat: e.latlng.lat,
          dropLng: e.latlng.lng,
        }));
      },
    });
    return null;
  }

  /* ===============================
     SEARCH LOCATION
  ================================ */
  const searchLocation = async (q) => {
    if (!q) return;

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${q}`
    );
    const data = await res.json();

    if (data.length) {
      setSingle((p) => ({
        ...p,
        dropLat: Number(data[0].lat),
        dropLng: Number(data[0].lon),
      }));
    }
  };

  /* ===============================
     SUBMIT SINGLE
  ================================ */
  const submitSingle = async () => {
    if (!selectedStore)
      return showToast("danger", "Select store");

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
        storeId: selectedStore.storeId,
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
     PARSE BULK (UNCHANGED LOGIC)
  ================================ */
  const parseBulk = () => {
    if (!stores.length)
      return showToast("danger", "Stores not loaded");

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

      const storeName = cols[0];
      const clientOrderId = cols[1];
      const address = cols[2];
      const latLng = cols[3];
      const customerName = cols[4];
      const phone = cols[5];

      const store = stores.find(
        (s) =>
          s.name.toLowerCase().trim() ===
          storeName.toLowerCase().trim()
      );

      if (!store) {
        errors.push(
          `Line ${i + 1}: Store "${storeName}" not found`
        );
        return;
      }

      const [lat, lng] = (latLng || "").split(",");

      if (!lat || !lng) {
        errors.push(
          `Line ${i + 1}: Invalid Lat,Lng`
        );
        return;
      }

      parsed.push({
        clientOrderId: clientOrderId || null,
        storeId: store.storeId,
        pickup: { lat: store.lat, lng: store.lng },
        drop: {
          lat: Number(lat),
          lng: Number(lng),
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
      showToast(
        "success",
        `${parsed.length} orders ready`
      );
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
      {toast && (
        <div
          className={`toast show position-fixed top-0 end-0 m-3 text-bg-${toast.type}`}
          style={{ zIndex: 9999 }}
        >
          <div className="toast-body">{toast.msg}</div>
        </div>
      )}

      <h4 className="fw-semibold mb-4">Create Orders</h4>

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

                <select
                  className="form-select mb-2"
                  value={storeId}
                  onChange={(e) =>
                    setStoreId(e.target.value)
                  }
                >
                  <option value="">Select Store</option>
                  {stores.map((s) => (
                    <option
                      key={s.storeId}
                      value={s.storeId}
                    >
                      {s.name}
                    </option>
                  ))}
                </select>

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

          {/* MAP */}
          <div className="col-lg-6">
            <div className="card shadow-sm">
              <div className="card-body">
                <input
                  className="form-control mb-2"
                  placeholder="Search location"
                  onBlur={(e) =>
                    searchLocation(e.target.value)
                  }
                />

                <MapContainer
                  center={[
                    single.dropLat ||
                      selectedStore?.lat ||
                      17.44,
                    single.dropLng ||
                      selectedStore?.lng ||
                      78.37,
                  ]}
                  zoom={13}
                  style={{ height: 350 }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapClickHandler />
                  {selectedStore && (
                    <Marker
                      position={[
                        selectedStore.lat,
                        selectedStore.lng,
                      ]}
                    />
                  )}
                  {single.dropLat &&
                    single.dropLng && (
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
              Store Name ⟶ Order Id ⟶ Address ⟶ Lat,Lng ⟶
              Customer Name ⟶ Phone ⟶ Status (optional)
            </p>

            <textarea
              className="form-control mb-3"
              rows={10}
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
