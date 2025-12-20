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
  assignDriverToOrder,
} from "../../../api/vendor.orders.api";
import { getNearbyDrivers } from "../../../api/vendor.drivers.api";

/* ===============================
   Leaflet marker icon fix
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
  const [drivers, setDrivers] = useState([]);
  const [assignedDriver, setAssignedDriver] =
    useState(null);
  const [route, setRoute] = useState([]);
  const [loading, setLoading] = useState(true);

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

        setDrivers(driversRes.data.data || []);

        if (orderData.assignedDriver) {
          setAssignedDriver(
            orderData.assignedDriver
          );
        }
      } catch (err) {
        console.error(
          "Failed to load order details",
          err
        );
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
    if (
      !order?.store?.lat ||
      !order?.customer?.lat
    )
      return;

    const fetchRoute = async () => {
      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${order.store.lng},${order.store.lat};${order.customer.lng},${order.customer.lat}?overview=full&geometries=geojson`
        );
        const data = await res.json();

        if (data.routes?.length) {
          setRoute(
            data.routes[0].geometry.coordinates.map(
              ([lng, lat]) => [lat, lng]
            )
          );
        }
      } catch (e) {
        console.error("Route fetch failed", e);
      }
    };

    fetchRoute();
  }, [order]);

  /* ===============================
     FIX MAP RESIZE
================================ */
  useEffect(() => {
    if (!mapRef.current) return;
    setTimeout(() => {
      mapRef.current.invalidateSize();
    }, 200);
  }, []);

  /* ===============================
     AUTO ASSIGN
================================ */
  const handleAutoAssign = () => {
    if (!drivers.length) return;
    const nearest = [...drivers].sort(
      (a, b) => a.distance - b.distance
    )[0];
    setAssignedDriver(nearest);
  };

  /* ===============================
     MANUAL ASSIGN
================================ */
  const handleAssign = async () => {
    if (!assignedDriver) return;

    try {
      await assignDriverToOrder(
        orderId,
        assignedDriver.id
      );
      alert("Driver assigned successfully");
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
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-light btn-sm"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
          <h5 className="fw-semibold mb-0">
            Orders / Order #{order.orderId}
          </h5>
        </div>
      </div>

      <span className="badge bg-primary-subtle text-primary mb-3">
        {order.status?.replaceAll("_", " ")}
      </span>

      <div className="row g-4">
        {/* LEFT */}
        <div className="col-lg-8">
          <div className="card mb-4">
            <div className="card-body">
              <MapContainer
                center={[
                  order.store.lat,
                  order.store.lng,
                ]}
                zoom={13}
                style={{ height: 360 }}
                whenCreated={(map) =>
                  (mapRef.current = map)
                }
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                <Marker
                  position={[
                    order.store.lat,
                    order.store.lng,
                  ]}
                />
                <Marker
                  position={[
                    order.customer.lat,
                    order.customer.lng,
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

        {/* RIGHT */}
        <div className="col-lg-4">
          <div className="card mb-3">
            <div className="card-body">
              <h6 className="fw-semibold mb-2">
                Assign Driver
              </h6>

              <button
                className="btn btn-outline-primary btn-sm w-100 mb-3"
                onClick={handleAutoAssign}
              >
                Auto Dispatch
              </button>

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
                className="btn btn-dark btn-sm w-100 mt-2"
                disabled={!assignedDriver}
                onClick={handleAssign}
              >
                Assign Driver
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h6 className="fw-semibold mb-2">
                Locations
              </h6>

              <div className="small mb-2">
                <strong>Store</strong>
                <br />
                {order.store.name}
              </div>

              <div className="small">
                <strong>Customer</strong>
                <br />
                {order.customer.name}
                <br />
                {order.customer.address}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
