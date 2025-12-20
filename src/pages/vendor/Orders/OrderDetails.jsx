import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  getVendorOrderById,
  updateVendorOrder,
  assignDriverToOrder,
} from "../../../api/vendor.orders.api";
import { getNearbyDrivers } from "../../../api/vendor.drivers.api";

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

export default function OrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const mapRef = useRef(null);

  const [order, setOrder] = useState(null);
  const [form, setForm] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [assignedDriver, setAssignedDriver] = useState(null);
  const [route, setRoute] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ===============================
     PERMISSION
================================ */
  const isEditable =
    order?.status === "NEW" ||
    order?.status === "CREATED";

  /* ===============================
     LOAD ORDER + DRIVERS
================================ */
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const [orderRes, driversRes] = await Promise.all([
          getVendorOrderById(orderId),
          getNearbyDrivers(orderId),
        ]);

        const orderData = orderRes.data.data;
        setOrder(orderData);
        setForm(orderData); // editable copy

        setDrivers(driversRes.data.data || []);
        setAssignedDriver(orderData.assignedDriver || null);
      } catch (err) {
        console.error("Failed to load order", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [orderId]);

  /* ===============================
     ROUTE (OSRM)
================================ */
  useEffect(() => {
    if (!order?.pickup || !order?.drop) return;

    const fetchRoute = async () => {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${order.pickup.lng},${order.pickup.lat};${order.drop.lng},${order.drop.lat}?overview=full&geometries=geojson`
      );
      const data = await res.json();

      if (data.routes?.length) {
        setRoute(
          data.routes[0].geometry.coordinates.map(
            ([lng, lat]) => [lat, lng]
          )
        );
      }
    };

    fetchRoute();
  }, [order]);

  /* ===============================
     MAP FIX
================================ */
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => mapRef.current.invalidateSize(), 200);
    }
  }, []);

  /* ===============================
     SAVE ORDER (EDIT MODE)
================================ */
  const handleSave = async () => {
    try {
      await updateVendorOrder(orderId, {
        dropAddress: form.drop.address.full,
        dropLat: form.drop.lat,
        dropLng: form.drop.lng,
        customerName: form.customer.name,
        customerPhone: form.customer.phone,
        notes: form.notes,
      });

      alert("Order updated");
    } catch (err) {
      console.error("Update failed", err);
      alert("Failed to update order");
    }
  };

  /* ===============================
     ASSIGN DRIVER
================================ */
  const handleAssign = async () => {
    if (!assignedDriver) return;

    try {
      await assignDriverToOrder(orderId, assignedDriver.id);
      alert("Driver assigned");
    } catch (err) {
      console.error("Assign failed", err);
      alert("Failed to assign driver");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5 text-muted">
        Loading order details...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-5 text-danger">
        Order not found
      </div>
    );
  }

  return (
    <div>
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex gap-2 align-items-center">
          <button
            className="btn btn-light btn-sm"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
          <h5 className="fw-semibold mb-0">
            Order #{order.orderId}
          </h5>
        </div>

        {!isEditable && (
          <span className="badge bg-secondary">
            View Only
          </span>
        )}
      </div>

      <span className="badge bg-primary-subtle text-primary mb-3">
        {order.status.replaceAll("_", " ")}
      </span>

      <div className="row g-4">
        {/* MAP */}
        <div className="col-lg-8">
          <div className="card">
            <div className="card-body">
              <MapContainer
                center={[order.pickup.lat, order.pickup.lng]}
                zoom={13}
                style={{ height: 360 }}
                whenCreated={(map) =>
                  (mapRef.current = map)
                }
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker
                  position={[
                    order.pickup.lat,
                    order.pickup.lng,
                  ]}
                />
                <Marker
                  position={[
                    order.drop.lat,
                    order.drop.lng,
                  ]}
                />
                {assignedDriver && (
                  <Marker
                    position={[
                      assignedDriver.lat,
                      assignedDriver.lng,
                    ]}
                  />
                )}
                {route.length > 0 && (
                  <Polyline positions={route} />
                )}
              </MapContainer>
            </div>
          </div>
        </div>

        {/* DETAILS */}
        <div className="col-lg-4">
          <div className="card mb-3">
            <div className="card-body">
              <h6 className="fw-semibold mb-2">
                Customer
              </h6>

              <input
                className="form-control mb-2"
                disabled={!isEditable}
                value={form.customer.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    customer: {
                      ...form.customer,
                      name: e.target.value,
                    },
                  })
                }
              />

              <input
                className="form-control mb-2"
                disabled={!isEditable}
                value={form.customer.phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    customer: {
                      ...form.customer,
                      phone: e.target.value,
                    },
                  })
                }
              />

              <textarea
                className="form-control"
                rows={2}
                disabled={!isEditable}
                value={form.notes || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    notes: e.target.value,
                  })
                }
              />

              {isEditable && (
                <button
                  className="btn btn-dark btn-sm w-100 mt-3"
                  onClick={handleSave}
                >
                  Save Changes
                </button>
              )}
            </div>
          </div>

          {isEditable && (
            <div className="card">
              <div className="card-body">
                <h6 className="fw-semibold mb-2">
                  Assign Driver
                </h6>

                {drivers.map((d) => (
                  <div
                    key={d.id}
                    className={`border rounded p-2 mb-2 ${
                      assignedDriver?.id === d.id
                        ? "border-primary"
                        : ""
                    }`}
                    onClick={() =>
                      setAssignedDriver(d)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <div className="fw-semibold">
                      {d.name}
                    </div>
                    <div className="text-muted small">
                      {d.phone}
                    </div>
                  </div>
                ))}

                <button
                  className="btn btn-dark btn-sm w-100"
                  disabled={!assignedDriver}
                  onClick={handleAssign}
                >
                  Assign Driver
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
