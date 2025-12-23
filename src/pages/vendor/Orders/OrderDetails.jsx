import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  getVendorOrderById,
  assignRiderToOrder,
  cancelVendorOrder,
} from "../../../api/vendor.orders.api";
import { getVendorRiders } from "../../../api/vendor.riders.api";
import { useSocket } from "../../../hooks/useSocket";

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
   RIDER ICON
================================ */
const riderIcon = new L.Icon({
  iconUrl: "/rider-marker.png",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

export default function OrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const socket = useSocket();

  const [order, setOrder] = useState(null);
  const [riders, setRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  const [route, setRoute] = useState([]);
  const [riderPosition, setRiderPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  /* ===============================
     LOAD ORDER + RIDERS
================================ */
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const [orderRes, ridersRes] = await Promise.all([
          getVendorOrderById(orderId),
          getVendorRiders(),
        ]);

        // Order (safe)
        setOrder(orderRes?.data || null);

        // Riders (VERY IMPORTANT FIX)
        const ridersList = Array.isArray(ridersRes?.data)
          ? ridersRes.data
          : Array.isArray(ridersRes?.data?.data)
          ? ridersRes.data.data
          : [];

        setRiders(ridersList);
      } catch (err) {
        console.error("Failed to load order details", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [orderId]);

  /* ===============================
     OSRM ROUTE
================================ */
  useEffect(() => {
    if (!order?.pickup || !order?.drop) return;

    async function fetchRoute() {
      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${order.pickup.lng},${order.pickup.lat};${order.drop.lng},${order.drop.lat}?overview=full&geometries=geojson`
        );
        const data = await res.json();

        if (data?.routes?.length) {
          setRoute(
            data.routes[0].geometry.coordinates.map(
              ([lng, lat]) => [lat, lng]
            )
          );
        }
      } catch (err) {
        console.error("OSRM error", err);
      }
    }

    fetchRoute();
  }, [order]);

  /* ===============================
     LIVE RIDER TRACKING (SOCKET)
================================ */
/* ===============================
   LIVE RIDER TRACKING (SOCKET)
================================ */
useEffect(() => {
  if (!socket || !order?.assignedRiderId) return;

  const onLocationUpdate = (data) => {
    console.log("📍 SOCKET DATA RECEIVED:", data);

    // REQUIRED VALIDATION
    if (
      typeof data?.lat !== "number" ||
      typeof data?.lng !== "number"
    ) {
      console.warn("❌ Invalid location payload", data);
      return;
    }

    // OPTIONAL ORDER CHECK (DO NOT BLOCK UI)
    if (data?.orderId && data.orderId !== order.orderId) {
      console.warn("⚠️ Different order update ignored");
      return;
    }

    console.log("✅ Rider position updated", data.lat, data.lng);
    setRiderPosition([data.lat, data.lng]);
  };

  // 🔥 FIX: correct backend event name
  socket.on("rider:location", onLocationUpdate);

  return () => {
    socket.off("rider:location", onLocationUpdate);
  };
}, [socket, order?.assignedRiderId, order?.orderId]);

  /* ===============================
     MAP FIX
================================ */
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => mapRef.current.invalidateSize(), 300);
    }
  }, []);
/* ===============================
   AUTO PAN MAP TO RIDER
================================ */
useEffect(() => {
  if (mapRef.current && riderPosition) {
    mapRef.current.setView(riderPosition, 15, {
      animate: true,
    });
  }
}, [riderPosition]);

  /* ===============================
     ASSIGN RIDER
================================ */
  const handleAssignRider = async () => {
    if (!selectedRider) return;

    try {
      setAssigning(true);
      await assignRiderToOrder(order.orderId, selectedRider.riderId);
      const refreshed = await getVendorOrderById(orderId);
      setOrder(refreshed.data);
    } catch (err) {
      console.error("Assign rider failed", err);
    } finally {
      setAssigning(false);
    }
  };

  /* ===============================
     CANCEL ORDER
================================ */
  const handleCancel = async () => {
    if (!window.confirm("Cancel this order?")) return;

    try {
      await cancelVendorOrder(order.orderId);
      const refreshed = await getVendorOrderById(orderId);
      setOrder(refreshed.data);
    } catch (err) {
      console.error("Cancel failed", err);
    }
  };

  /* ===============================
     RENDER
================================ */
  if (loading) {
    return <div className="text-center py-5">Loading…</div>;
  }

  if (!order) {
    return (
      <div className="text-center py-5 text-danger">
        Order not found
      </div>
    );
  }

  const showLiveTracking =
    order.status === "ASSIGNED" ||
    order.status === "ON_THE_WAY";

  return (
    <div>
      <div className="d-flex justify-content-between mb-3">
        <button
          className="btn btn-light btn-sm"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
        <span className="badge bg-dark">
          {order.status.replaceAll("_", " ")}
        </span>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <MapContainer
            center={[order.pickup.lat, order.pickup.lng]}
            zoom={13}
            style={{ height: 420 }}
            whenCreated={(map) => (mapRef.current = map)}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            <Marker position={[order.pickup.lat, order.pickup.lng]}>
              <Popup>Pickup</Popup>
            </Marker>

            <Marker position={[order.drop.lat, order.drop.lng]}>
              <Popup>Drop</Popup>
            </Marker>

            {route.length > 0 && <Polyline positions={route} />}

            {showLiveTracking && riderPosition && (
              <Marker position={riderPosition} icon={riderIcon}>
                <Popup>Rider is here</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        <div className="col-lg-4">
          <div className="card p-3">
            <h6>Customer</h6>
            <div>{order.customer?.name}</div>
            <div className="text-muted">
              {order.customer?.phone}
            </div>
          </div>

          {order.status === "NEW" && (
            <>
              <div className="card p-3 mt-3">
                <h6>Assign Rider</h6>

                {riders.length === 0 && (
                  <div className="text-muted small">
                    No riders available
                  </div>
                )}

                {riders.map((r) => (
                  <div
                    key={r.riderId}
                    className={`border p-2 mb-2 ${
                      selectedRider?.riderId === r.riderId
                        ? "border-dark"
                        : ""
                    }`}
                    onClick={() => setSelectedRider(r)}
                    style={{ cursor: "pointer" }}
                  >
                    {r.name} – {r.phone}
                  </div>
                ))}

                <button
                  className="btn btn-dark btn-sm w-100"
                  disabled={!selectedRider || assigning}
                  onClick={handleAssignRider}
                >
                  Assign Rider
                </button>
              </div>

              <button
                className="btn btn-outline-danger btn-sm w-100 mt-2"
                onClick={handleCancel}
              >
                Cancel Order
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
