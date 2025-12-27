import { useEffect, useState, useRef } from "react";
import {
  getVendorStores,
  createVendorStore,
  updateVendorStore,
  deleteVendorStore,
} from "../../api/vendor.stores.api";
import {
  Pencil,
  // Trash2,
  Plus,
  MapPin,
} from "lucide-react";

import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ===============================
   LEAFLET ICON FIX
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

/* ===============================
   MAP PICKER
================================ */
function LocationPicker({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng);
    },
  });
  return null;
}

/* ===============================
   HELPERS
================================ */
const formatAddress = (address) => {
  if (!address) return "—";
  const words = address.split(" ");
  return words.length <= 3
    ? address
    : words.slice(0, 3).join(" ") + "…";
};

export default function Stores() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingStore, setEditingStore] = useState(null);

  const [form, setForm] = useState({
    name: "",
    address: "",
    lat: 17.4474,
    lng: 78.3762,
  });

  const [mapSearch, setMapSearch] = useState("");
  const mapRef = useRef(null);

  /* ===============================
     LOAD STORES
     - Sorted by store name (A–Z)
  ================================ */
  const loadStores = async () => {
    try {
      setLoading(true);
      const res = await getVendorStores();
      const items = res?.data?.data?.items || [];

      const sorted = [...items].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          sensitivity: "base",
        })
      );

      setStores(sorted);
    } catch (e) {
      console.error("Failed to load stores", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, []);

  /* ===============================
     OPEN CREATE / EDIT
  ================================ */
  const openCreate = () => {
    setEditingStore(null);
    setForm({
      name: "",
      address: "",
      lat: 17.4474,
      lng: 78.3762,
    });
    setShowForm(true);
  };

  const openEdit = (store) => {
    setEditingStore(store);
    setForm({
      name: store.name,
      address: store.address || "",
      lat: store.lat,
      lng: store.lng,
    });
    setShowForm(true);
  };

  /* ===============================
     MAP HANDLERS
  ================================ */
  const handlePick = (loc) => {
    setForm((p) => ({
      ...p,
      lat: loc.lat,
      lng: loc.lng,
    }));
  };

  const searchOnMap = async () => {
    if (!mapSearch.trim()) return;

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        mapSearch
      )}`
    );
    const data = await res.json();

    if (data.length) {
      setForm((p) => ({
        ...p,
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      }));
    }
  };

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([form.lat, form.lng]);
    }
  }, [form.lat, form.lng]);

  /* ===============================
     SUBMIT
  ================================ */
  const handleSubmit = async () => {
    if (!form.name.trim()) {
      alert("Store name required");
      return;
    }

    try {
      if (editingStore) {
        await updateVendorStore(editingStore.storeId, form);
      } else {
        await createVendorStore(form);
      }

      setShowForm(false);
      loadStores();
    } catch (e) {
      console.error("Save failed", e);
      alert("Failed to save store");
    }
  };

  /* ===============================
     UI
  ================================ */
  return (
    <div>
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-semibold mb-0">Stores</h4>

        <button
          className="btn btn-dark btn-sm d-flex align-items-center gap-1"
          onClick={openCreate}
        >
          <Plus size={16} />
          Create Store
        </button>
      </div>

      {/* TABLE */}
      <div className="card card-ui">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Store Name</th>
                <th>Address</th>
                <th>Coordinates</th>
                <th>Status</th>
                <th>Created</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    Loading stores…
                  </td>
                </tr>
              )}

              {!loading &&
                stores.map((s) => (
                  <tr key={s.storeId}>
                    <td className="fw-medium">{s.name}</td>

                    <td
                      title={s.address || ""}
                      className="text-muted small"
                    >
                      {formatAddress(s.address)}
                    </td>

                    <td className="text-muted small">
                      <MapPin size={12} className="me-1" />
                      {s.lat}, {s.lng}
                    </td>

                    <td>
                      <span
                        className={`badge ${s.status === "ACTIVE"
                            ? "bg-success-subtle text-success"
                            : s.status === "INACTIVE"
                              ? "bg-danger-subtle text-danger"
                              : "bg-secondary-subtle text-secondary"
                          }`}
                      > 
                        {s.status}
                      </span>
                    </td>


                    <td className="text-muted small">
                      {s.createdAt
                        ? new Date(s.createdAt).toLocaleDateString()
                        : "—"}
                    </td>

                    <td className="text-end">
                      <button
                        className="btn btn-link btn-sm text-muted"
                        onClick={() => openEdit(s)}
                      >
                        <Pencil size={16} />
                      </button>

                      {/* <button
                          className="btn btn-link btn-sm text-danger"
                          onClick={() =>
                            window.confirm("Delete store?") &&
                            deleteVendorStore(s.storeId).then(loadStores)
                          }
                        >
                          <Trash2 size={16} />
                        </button> */}
                    </td>
                  </tr>
                ))}

              {!loading && stores.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    No stores found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL (UNCHANGED FUNCTIONALITY) */}
      {showForm && (
        <div className="modal d-block bg-dark bg-opacity-50">
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">
                  {editingStore ? "Edit Store" : "Create Store"}
                </h6>
                <button
                  className="btn-close"
                  onClick={() => setShowForm(false)}
                />
              </div>

              <div className="modal-body">
                <input
                  className="form-control mb-2"
                  placeholder="Store name"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />

                <textarea
                  className="form-control mb-2"
                  placeholder="Store address"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />

                <div className="input-group mb-2">
                  <input
                    className="form-control"
                    placeholder="Search location"
                    value={mapSearch}
                    onChange={(e) => setMapSearch(e.target.value)}
                  />
                  <button
                    className="btn btn-outline-secondary"
                    onClick={searchOnMap}
                  >
                    Locate
                  </button>
                </div>

                <div className="row g-2 mb-2">
                  <div className="col">
                    <input
                      className="form-control"
                      value={form.lat}
                      onChange={(e) =>
                        setForm({ ...form, lat: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="col">
                    <input
                      className="form-control"
                      value={form.lng}
                      onChange={(e) =>
                        setForm({ ...form, lng: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>

                <MapContainer
                  center={[form.lat, form.lng]}
                  zoom={14}
                  style={{ height: 280 }}
                  whenCreated={(map) => (mapRef.current = map)}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[form.lat, form.lng]} />
                  <LocationPicker onPick={handlePick} />
                </MapContainer>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-light"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button className="btn btn-dark" onClick={handleSubmit}>
                  Save Store
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
