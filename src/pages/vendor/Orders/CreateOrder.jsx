import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

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
    dropLocation: "",
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
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        setSingle((p) => ({
          ...p,
          dropLat: lat,
          dropLng: lng,
          dropLocation: `${lat}, ${lng}`, // ✅ auto-update input
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

  function parseLatLng(input) {
    if (!input) return null;

    // remove spaces → split by comma
    const parts = input.replace(/\s+/g, "").split(",");

    if (parts.length !== 2) return null;

    const lat = Number(parts[0]);
    const lng = Number(parts[1]);

    if (isNaN(lat) || isNaN(lng)) return null;

    return { lat, lng };
  }


  /* ===============================
     SUBMIT SINGLE
  ================================ */
  /* ===============================
   SUBMIT SINGLE
================================ */
  const submitSingle = async () => {
    if (!selectedStore) {
      return showToast("danger", "Select store");
    }
    if (!single.notes?.trim()) {
      return showToast("danger", "Address is required");
    }

    const parsedDrop = parseLatLng(single.dropLocation);

    if (!single.customerName || !single.phone) {
      return showToast("danger", "Missing required fields");
    }

    if (!parsedDrop) {
      return showToast("danger", "Invalid drop location");
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
          lat: parsedDrop.lat,
          lng: parsedDrop.lng,
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

      // reset single order form
      setSingle({
        clientOrderId: "",
        customerName: "",
        phone: "",
        pickupLat: selectedStore.lat,
        pickupLng: selectedStore.lng,
        dropLocation: "",
        dropLat: "",
        dropLng: "",
        vehicleType: "BIKE",
        notes: "",
      });

      // reset store selection (optional but clean)
      setStoreId("");

      // success toast
      showToast("success", "Order created successfully");

      // go to orders page after short delay
      setTimeout(() => {
        navigate("/vendor/orders");
      }, 800);

    } catch (err) {
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

      // redirect to orders
      setTimeout(() => {
        navigate("/vendor/orders");
      }, 800);

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
          className={`btn ${mode === "single"
            ? "btn-dark"
            : "btn-outline-secondary"
            }`}
          onClick={() => setMode("single")}
        >
          Single Order
        </button>
        <button
          className={`btn ${mode === "bulk"
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
                  Single Order <span className="text-danger">*</span>
                </h6>

                <select
                  className="form-select mb-2"
                  value={storeId}
                  required
                  onChange={(e) => setStoreId(e.target.value)}
                >
                  <option value="">Select Store *</option>
                  {stores.map((s) => (
                    <option key={s.storeId} value={s.storeId}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <input
                  className="form-control mb-2"
                  placeholder="Client Order ID *"
                  value={single.clientOrderId}
                  required
                  onChange={(e) =>
                    setSingle({
                      ...single,
                      clientOrderId: e.target.value,
                    })
                  }
                />

                <input
                  className="form-control mb-2"
                  placeholder="Customer Name *"
                  value={single.customerName}
                  required
                  onChange={(e) =>
                    setSingle({
                      ...single,
                      customerName: e.target.value,
                    })
                  }
                />

                <input
                  className="form-control mb-2"
                  placeholder="Phone *"
                  value={single.phone}
                  required
                  onChange={(e) =>
                    setSingle({
                      ...single,
                      phone: e.target.value,
                    })
                  }
                />

                <input
                  className="form-control mb-2"
                  placeholder="Drop Location (lat, long) *"
                  value={single.dropLocation}
                  required
                  onChange={(e) => {
                    const value = e.target.value;
                    const parsed = parseLatLng(value);

                    setSingle({
                      ...single,
                      dropLocation: value,
                      dropLat: parsed ? parsed.lat : "",
                      dropLng: parsed ? parsed.lng : "",
                    });
                  }}
                />

                <textarea
                  className="form-control mb-3"
                  placeholder="Address *"
                  value={single.notes}
                  required
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
                  {submitting ? "Creating..." : "Create Order"}
                </button>
              </div>

            </div>
          </div>

          {/* MAP */}
          <div className="col-lg-6">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="input-group mb-2">
                  <input
                    className="form-control"
                    placeholder="Search location"
                    onBlur={(e) => searchLocation(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        searchLocation(e.target.value);
                      }
                    }}
                  />
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={(e) => {
                      const input =
                        e.currentTarget.previousSibling;
                      if (input?.value) {
                        searchLocation(input.value);
                      }
                    }}
                  >
                    🔍
                  </button>
                </div>


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
