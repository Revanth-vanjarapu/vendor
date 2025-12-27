// AdminOrderView.jsx
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
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

/* Rider icon (optional custom) */
const riderIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      background:#198754;
      width:36px;
      height:36px;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      color:white;
      font-size:18px;
      box-shadow:0 0 8px rgba(0,0,0,0.4);
    ">
      🛵
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});


/* A small helper to fit bounds from parent component */
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !points || points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
    } else {
      try {
        map.fitBounds(points, { padding: [40, 40] });
      } catch (e) {
        // ignore
      }
    }
  }, [map, points]);
  return null;
}

export default function AdminOrderView() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const socket = useSocket(); // DO NOT change socket behavior

  const [order, setOrder] = useState(null);
  const [riders, setRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  const [route, setRoute] = useState([]);
  const [distanceKm, setDistanceKm] = useState(null);
  const [etaMin, setEtaMin] = useState(null);
  const [riderPosition, setRiderPosition] = useState(null);
  const [dropAddress, setDropAddress] = useState(null); // reverse geocode
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [proofViewing, setProofViewing] = useState(null); // url to open in new tab

  /* ===============================
    Load order & riders
  ================================ */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);

        const [orderRes, ridersRes] = await Promise.all([
          getVendorOrderById(orderId),
          getVendorRiders(),
        ]);

        // Normalize order response shape: some APIs return {success:true, data: {...}}
        const ord =
          orderRes?.data?.data ??
          orderRes?.data ??
          (orderRes && typeof orderRes === "object" ? orderRes : null);

        if (!cancelled) setOrder(ord);

        const ridersList =
          Array.isArray(ridersRes?.data) ?
            ridersRes.data :
            Array.isArray(ridersRes?.data?.data) ?
              ridersRes.data.data :
              [];
        if (!cancelled) setRiders(ridersList);
      } catch (err) {
        console.error("load error", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => (cancelled = true);
  }, [orderId]);

  /* ===============================
    OSRM routing (distance + ETA)
  ================================ */
  useEffect(() => {
    if (!order?.pickup || !order?.drop) return;

    let cancelled = false;
    async function fetchRoute() {
      try {
        const pickup = `${order.pickup.lng},${order.pickup.lat}`;
        const drop = `${order.drop.lng},${order.drop.lat}`;
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${pickup};${drop}?overview=full&geometries=geojson`
        );
        const data = await res.json();
        if (cancelled) return;
        if (data?.routes?.length) {
          const r = data.routes[0];
          setRoute(r.geometry.coordinates.map(([lng, lat]) => [lat, lng]));
          setDistanceKm((r.distance / 1000).toFixed(2));
          setEtaMin(Math.round(r.duration / 60));
        } else {
          setRoute([]);
          setDistanceKm(null);
          setEtaMin(null);
        }
      } catch (e) {
        console.warn("OSRM fetch failed", e);
      }
    }

    fetchRoute();
    return () => (cancelled = true);
  }, [order?.pickup, order?.drop]);

  /* ===============================
    Reverse geocode drop to full address (Nominatim)
    Use notes first if present, else try reverse geocode
  ================================ */
  useEffect(() => {
    if (!order) return;

    if (order.notes && typeof order.notes === "string" && order.notes.trim()) {
      setDropAddress(order.notes);
      return;
    }

    if (!order.drop || !order.drop.lat || !order.drop.lng) {
      setDropAddress(null);
      return;
    }

    let cancelled = false;
    async function revGeocode() {
      try {
        const q = `${order.drop.lat},${order.drop.lng}`;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${order.drop.lat}&lon=${order.drop.lng}&addressdetails=1`
        );
        const data = await res.json();
        if (cancelled) return;
        if (data?.display_name) {
          setDropAddress(data.display_name);
        } else {
          setDropAddress(null);
        }
      } catch (e) {
        // ignore
        setDropAddress(null);
      }
    }

    revGeocode();
    return () => (cancelled = true);
  }, [order]);

  /* ===============================
    Live rider tracking via socket
    (We DO NOT modify socket behaviour here - keep as is)
  ================================ */
useEffect(() => {
  if (!socket) return;

  const onLocationUpdate = (data) => {
    console.log("🟡 VENDOR RECEIVED LOCATION:", data);

    if (typeof data?.lat !== "number" || typeof data?.lng !== "number") return;

    // ✅ DO NOT check orderId for vendor
    // Vendor is already scoped by vendor:{vendorId}

    setRiderPosition([data.lat, data.lng]);
  };

  socket.on("rider:location:update", onLocationUpdate);

  return () => {
    socket.off("rider:location:update", onLocationUpdate);
  };
}, [socket]);


  /* ===============================
    Auto-pan / fit map when data updates
  ================================ */
  useEffect(() => {
    if (!mapRef.current || !order) return;

    const points = [
      [order.pickup.lat, order.pickup.lng],
      [order.drop.lat, order.drop.lng],
    ];
    if (riderPosition) points.push(riderPosition);

    try {
      const map = mapRef.current;
      if (points.length === 1) map.setView(points[0], 14);
      else map.fitBounds(points, { padding: [40, 40] });
    } catch (e) {
      // ignore
    }
  }, [order, riderPosition]);

  /* ===============================
    Assign rider action
  ================================ */
  const handleAssignRider = async () => {
    if (!selectedRider || !order) return;
    try {
      setAssigning(true);
      await assignRiderToOrder(order.orderId, selectedRider.riderId);
      // refresh order
      const res = await getVendorOrderById(orderId);
      const ord = res?.data?.data ?? res?.data ?? res;
      setOrder(ord);
    } catch (e) {
      console.error("assign failed", e);
      alert("Assign failed");
    } finally {
      setAssigning(false);
    }
  };

  /* ===============================
    Cancel order action
  ================================ */
  const handleCancel = async () => {
    if (!order) return;
    if (!window.confirm(`Cancel order ${order.orderId}?`)) return;
    try {
      await cancelVendorOrder(order.orderId);
      const res = await getVendorOrderById(orderId);
      const ord = res?.data?.data ?? res?.data ?? res;
      setOrder(ord);
    } catch (e) {
      console.error("cancel failed", e);
      alert("Cancel failed");
    }
  };

  /* ===============================
    Utility
  ================================ */
  const assignedRider = riders.find((r) => r.riderId === order?.assignedRiderId) ?? null;

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(
      () => {
        // small in-page feedback could be added; keeping simple
      },
      () => { }
    );
  };

  /* ===============================
    Render
  ================================ */
  if (loading) {
    return <div className="text-center py-5">Loading order…</div>;
  }

  if (!order) {
    return <div className="alert alert-danger">Order not found</div>;
  }

  // Make sure we accept order object wrapped with "success/data" or direct
  const {
    orderId: oid,
    clientOrderId,
    vendorId,
    storeId,
    assignedRiderId,
    pickup,
    drop,
    customer,
    vehicleType,
    notes,
    status,
    source,
    proof,
    billing,
    createdAt,
    updatedAt,
  } = order;

  // build google maps direction link (origin + destination)
  const googleMapsLink = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    `${pickup.lat},${pickup.lng}`
  )}&destination=${encodeURIComponent(`${drop.lat},${drop.lng}`)}`;

  return (
    <div className="container-fluid p-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <div className="d-flex align-items-center gap-3">
            <h4 className="mb-0">Order Details</h4>
            <span className="text-muted small">#{oid}</span>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => copyToClipboard(oid)}
            >
              Copy
            </button>
          </div>

          <div className="mt-2 text-muted small">
            CID:{" "}
            <strong>
              {clientOrderId || <span className="text-muted">Not specified</span>}
            </strong>
            &nbsp; • &nbsp; Vendor: {vendorId} • Store: {storeId}
          </div>
        </div>

        <div className="text-end">
          <div>
            <span className="badge bg-dark">{status?.replaceAll("_", " ")}</span>
          </div>
          <div className="mt-2">
            <button className="btn btn-light btn-sm me-2" onClick={() => navigate(-1)}>
              ← Back
            </button>
            {/* show cancel only for non-final statuses */}
            {status !== "DELIVERED" && status !== "CANCELLED" && (
              <button className="btn btn-outline-danger btn-sm" onClick={handleCancel}>
                Cancel Order
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Meta card */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-4">
              <div className="small text-muted">Created</div>
              <div>{new Date(createdAt).toLocaleString()}</div>
            </div>
            <div className="col-md-4">
              <div className="small text-muted">Updated</div>
              <div>{new Date(updatedAt).toLocaleString()}</div>
            </div>
            <div className="col-md-4">
              <div className="small text-muted">Vehicle / Source</div>
              <div>{vehicleType} • {source}</div>
            </div>
          </div>

          <div className="row g-2 mt-3">
            <div className="col-md-6">
              <div className="small text-muted">Distance / ETA</div>
              <div>
                {distanceKm ? `${distanceKm} km • ~${etaMin} mins` : <span className="text-muted">N/A</span>}
              </div>
            </div>

            <div className="col-md-6 text-end">
              <a className="btn btn-sm btn-outline-primary" href={googleMapsLink} target="_blank" rel="noreferrer">
                Open in Google Maps
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* STATUS TIMELINE (simple) */}
      <div className="mb-3">
        <div className="small text-muted mb-2">Status timeline</div>
        <div className="d-flex gap-2">
          {["NEW", "ASSIGNED", "ON_THE_WAY", "DELIVERED"].map((s) => {
            const isDone = ["NEW", "ASSIGNED", "ON_THE_WAY", "DELIVERED"].indexOf(s) <= ["NEW", "ASSIGNED", "ON_THE_WAY", "DELIVERED"].indexOf(status);
            return (
              <span key={s} className={`badge ${isDone ? "bg-success" : "bg-secondary"}`}>
                {s.replaceAll("_", " ")}
              </span>
            );
          })}
        </div>
      </div>

      {/* Main row: Map | Right column */}
      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-body p-0">
              <MapContainer
                whenCreated={(m) => (mapRef.current = m)}
                center={[(pickup.lat + drop.lat) / 2, (pickup.lng + drop.lng) / 2]}
                zoom={13}
                style={{ height: 460 }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                <Marker position={[pickup.lat, pickup.lng]}>
                  <Popup>
                    <div><strong>Pickup</strong></div>
                    <div>Lat: {pickup.lat}</div>
                    <div>Lng: {pickup.lng}</div>
                  </Popup>
                </Marker>

                <Marker position={[drop.lat, drop.lng]}>
                  <Popup>
                    <div><strong>Drop / Delivery</strong></div>
                    <div>{dropAddress || `${drop.lat}, ${drop.lng}`}</div>
                  </Popup>
                </Marker>

                {route && route.length > 0 && <Polyline positions={route} />}

                {riderPosition && <Marker position={riderPosition} icon={riderIcon}>
                  <Popup>Rider live</Popup>
                </Marker>}

                <FitBounds points={[
                  [pickup.lat, pickup.lng],
                  [drop.lat, drop.lng],
                  ...(riderPosition ? [riderPosition] : [])
                ]} />
              </MapContainer>
            </div>
          </div>

          {/* Proof photos */}
          <div className="card mt-3">
            <div className="card-body">
              <h6 className="mb-3">Proof Photos</h6>
              <div className="d-flex gap-3 flex-wrap">
                {proof?.pickupPhoto ? (
                  <div style={{ minWidth: 140 }}>
                    <div className="small text-muted">Pickup</div>
                    <img
                      src={proof.pickupPhoto}
                      alt="pickup"
                      style={{ width: 140, height: 100, objectFit: "cover", cursor: "pointer" }}
                      onClick={() => window.open(proof.pickupPhoto, "_blank")}
                    />
                  </div>
                ) : (
                  <div style={{ minWidth: 140 }}>
                    <div className="small text-muted">Pickup</div>
                    <div className="border d-flex align-items-center justify-content-center" style={{ height: 100, width: 140 }}>
                      <span className="text-muted small">No photo</span>
                    </div>
                  </div>
                )}

                {proof?.deliveryPhoto ? (
                  <div style={{ minWidth: 140 }}>
                    <div className="small text-muted">Delivery</div>
                    <img
                      src={proof.deliveryPhoto}
                      alt="delivery"
                      style={{ width: 140, height: 100, objectFit: "cover", cursor: "pointer" }}
                      onClick={() => window.open(proof.deliveryPhoto, "_blank")}
                    />
                  </div>
                ) : (
                  <div style={{ minWidth: 140 }}>
                    <div className="small text-muted">Delivery</div>
                    <div className="border d-flex align-items-center justify-content-center" style={{ height: 100, width: 140 }}>
                      <span className="text-muted small">No photo</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="col-lg-4">
          {/* Customer */}
          <div className="card mb-3 p-3">
            <h6>Customer</h6>
            <div className="fw-semibold">{customer?.name || "-"}</div>
            <div className="text-muted mb-2">
              <a href={`tel:${customer?.phone}`} className="text-decoration-none">{customer?.phone || "-"}</a>
            </div>

            <div className="small text-muted">Delivery Address</div>
            <div className="mb-2">{dropAddress || <span className="text-muted">Not available</span>}</div>

            <div className="small text-muted">Notes</div>
            <div className="mb-2">{notes || <span className="text-muted">—</span>}</div>
          </div>

          {/* Billing */}
          <div className="card mb-3 p-3">
            <h6>Billing</h6>
            {billing ? (
              <>
                <div><b>Plan:</b> {billing.subscriptionPlan}</div>
                <div><b>Total km:</b> {billing.totalKm ?? 0}</div>
                <div><b>Total amount:</b> ₹{billing.totalAmount ?? 0}</div>
                <div className="small text-muted">Calculated: {new Date(billing.calculatedAt).toLocaleString()}</div>
              </>
            ) : (
              <div className="text-muted">Billing not computed</div>
            )}
          </div>

          {/* Assigned Rider */}
          <div className="card mb-3 p-3">
            <h6>Rider</h6>
            {assignedRider ? (
              <>
                <div className="fw-semibold">{assignedRider.name}</div>
                <div className="text-muted">
                  <a href={`tel:${assignedRider.phone}`} className="text-decoration-none">{assignedRider.phone}</a>
                </div>
                <div className="text-muted small">ID: {assignedRider.riderId}</div>
              </>
            ) : (
              <div className="text-muted">Unassigned</div>
            )}
          </div>

          {/* Assign UI (only when NEW) */}
          {status === "NEW" && (
            <div className="card p-3">
              <h6>Assign Rider</h6>
              {riders.length === 0 && <div className="text-muted small">No riders available</div>}
              {riders.map((r) => (
                <div
                  key={r.riderId}
                  className={`border p-2 mb-2 ${selectedRider?.riderId === r.riderId ? "border-dark" : ""}`}
                  onClick={() => r.status === "ACTIVE" && setSelectedRider(r)}
                  style={{ cursor: r.status === "ACTIVE" ? "pointer" : "not-allowed", opacity: r.status !== "ACTIVE" ? 0.6 : 1 }}
                >
                  <div className="fw-semibold">{r.name}</div>
                  <div className="small text-muted">{r.phone} • {r.riderId}</div>
                </div>
              ))}

              <button className="btn btn-dark w-100" disabled={!selectedRider || assigning} onClick={handleAssignRider}>
                {assigning ? "Assigning…" : "Assign Rider"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// src/pages/vendor/orders/OrderDetails.jsx
// import { useEffect, useState, useRef } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import {
//   MapContainer,
//   TileLayer,
//   Marker,
//   Polyline,
//   Popup,
//   useMap,
// } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";

// import { getVendorOrderById } from "../../../api/vendor.orders.api";
// import { useSocket } from "../../../hooks/useSocket";

// /* ===============================
//    LEAFLET DEFAULT ICON FIX
// ================================ */
// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconUrl:
//     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
//   iconRetinaUrl:
//     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
//   shadowUrl:
//     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
// });

// /* ===============================
//    RIDER ICON (NO IMAGE FILE)
// ================================ */
// const riderIcon = L.divIcon({
//   className: "",
//   html: `
//     <div style="
//       width:36px;
//       height:36px;
//       background:#0d6efd;
//       border-radius:50%;
//       display:flex;
//       align-items:center;
//       justify-content:center;
//       color:white;
//       font-size:18px;
//       box-shadow:0 0 8px rgba(0,0,0,0.4);
//     ">🛵</div>
//   `,
//   iconSize: [36, 36],
//   iconAnchor: [18, 36],
// });

// /* ===============================
//    AUTO FIT MAP
// ================================ */
// function FitBounds({ points }) {
//   const map = useMap();

//   useEffect(() => {
//     if (!map || points.length === 0) return;
//     if (points.length === 1) map.setView(points[0], 14);
//     else map.fitBounds(points, { padding: [40, 40] });
//   }, [map, points]);

//   return null;
// }

// export default function OrderDetails() {
//   const { orderId } = useParams();
//   const navigate = useNavigate();
//   const socket = useSocket();
//   const mapRef = useRef(null);

//   const [order, setOrder] = useState(null);
//   const [route, setRoute] = useState([]);
//   const [distanceKm, setDistanceKm] = useState(null);
//   const [etaMin, setEtaMin] = useState(null);
//   const [riderPosition, setRiderPosition] = useState(null);
//   const [loading, setLoading] = useState(true);

//   /* ===============================
//      LOAD ORDER
//   ================================ */
//   useEffect(() => {
//     async function load() {
//       try {
//         const res = await getVendorOrderById(orderId);
//         const ord = res?.data?.data ?? res?.data ?? res;
//         setOrder(ord);
//       } catch (e) {
//         console.error("Order load failed", e);
//       } finally {
//         setLoading(false);
//       }
//     }
//     load();
//   }, [orderId]);

//   /* ===============================
//      ROUTE (OSRM)
//   ================================ */
//   useEffect(() => {
//     if (!order?.pickup || !order?.drop) return;

//     async function fetchRoute() {
//       const pickup = `${order.pickup.lng},${order.pickup.lat}`;
//       const drop = `${order.drop.lng},${order.drop.lat}`;

//       const res = await fetch(
//         `https://router.project-osrm.org/route/v1/driving/${pickup};${drop}?overview=full&geometries=geojson`
//       );
//       const data = await res.json();

//       if (data?.routes?.length) {
//         const r = data.routes[0];
//         setRoute(r.geometry.coordinates.map(([lng, lat]) => [lat, lng]));
//         setDistanceKm((r.distance / 1000).toFixed(2));
//         setEtaMin(Math.round(r.duration / 60));
//       }
//     }

//     fetchRoute();
//   }, [order]);

//   /* ===============================
//      LIVE RIDER TRACKING (VENDOR)
//   ================================ */
//   useEffect(() => {
//     if (!socket) return;

//     const onLocationUpdate = (data) => {
//       console.log("🟡 VENDOR RECEIVED LOCATION:", data);

//       if (typeof data?.lat !== "number" || typeof data?.lng !== "number") return;

//       setRiderPosition([data.lat, data.lng]);
//     };

//     socket.on("rider:location:update", onLocationUpdate);

//     return () => {
//       socket.off("rider:location:update", onLocationUpdate);
//     };
//   }, [socket]);

//   if (loading) return <div className="p-4">Loading…</div>;
//   if (!order) return <div className="alert alert-danger">Order not found</div>;

//   const { pickup, drop, customer, status, riderId } = order;

//   return (
//     <div className="container-fluid p-3">
//       <div className="d-flex justify-content-between mb-3">
//         <h4>Order #{order.orderId}</h4>
//         <button className="btn btn-light" onClick={() => navigate(-1)}>
//           ← Back
//         </button>
//       </div>

//       <div className="card mb-3 p-3">
//         <div>Status: <b>{status}</b></div>
//         <div>Customer: {customer?.name}</div>
//         <div>Phone: {customer?.phone}</div>
//         <div>Distance: {distanceKm ?? "—"} km</div>
//         <div>ETA: {etaMin ?? "—"} mins</div>
//       </div>

//       <div className="card">
//         <div className="card-body p-0">
//           <MapContainer
//             whenCreated={(m) => (mapRef.current = m)}
//             center={[
//               (pickup.lat + drop.lat) / 2,
//               (pickup.lng + drop.lng) / 2,
//             ]}
//             zoom={13}
//             style={{ height: 450 }}
//           >
//             <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

//             <Marker position={[pickup.lat, pickup.lng]}>
//               <Popup>Pickup</Popup>
//             </Marker>

//             <Marker position={[drop.lat, drop.lng]}>
//               <Popup>Drop</Popup>
//             </Marker>

//             {route.length > 0 && <Polyline positions={route} />}

//             {riderPosition && (
//               <Marker position={riderPosition} icon={riderIcon}>
//                 <Popup>Rider live</Popup>
//               </Marker>
//             )}

//             <FitBounds
//               points={[
//                 [pickup.lat, pickup.lng],
//                 [drop.lat, drop.lng],
//                 ...(riderPosition ? [riderPosition] : []),
//               ]}
//             />
//           </MapContainer>
//         </div>
//       </div>
//     </div>
//   );
// }
