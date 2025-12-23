import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import httpClient from "../../../utils/httpClient";

/* ===============================
   Leaflet marker fix
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

  const [order, setOrder] = useState(null);
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const [toast, setToast] = useState(null);
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  /* ===============================
     LOAD DATA
  ================================ */
  useEffect(() => {
    loadData();
  }, [orderId]);

  async function loadData() {
    try {
      setLoading(true);

      const [orderRes, ridersRes] = await Promise.all([
        httpClient.get(`/api/vendor/orders/${orderId}`),
        httpClient.get(`/api/vendor/riders`),
      ]);

      setOrder(orderRes.data.data);
      setRiders(ridersRes.data.data || []);
    } catch (err) {
      console.error(err);
      showToast("danger", "Failed to load order details");
    } finally {
      setLoading(false);
    }
  }

  /* ===============================
     ASSIGN RIDER
  ================================ */
  async function assignRider(riderId) {
    setAssigning(true);
    try {
      await httpClient.patch(
        `/api/vendor/orders/${order.orderId}/assign`,
        { riderId }
      );
      showToast("success", "Rider assigned");
      loadData();
    } catch {
      showToast("danger", "Rider assignment failed");
    } finally {
      setAssigning(false);
    }
  }

  /* ===============================
     CANCEL ORDER
  ================================ */
  async function cancelOrder() {
    if (!window.confirm("Cancel this order?")) return;
    try {
      await httpClient.patch(
        `/api/vendor/orders/${order.orderId}/cancel`
      );
      showToast("success", "Order cancelled");
      loadData();
    } catch {
      showToast("danger", "Cannot cancel order");
    }
  }

  /* ===============================
     LOADING STATE
  ================================ */
  if (loading) {
    return (
      <div className="p-5 text-center">
        <div className="spinner-border" />
        <div className="mt-2">Loading order…</div>
      </div>
    );
  }

  if (!order) return null;

  const route = [
    [order.pickup.lat, order.pickup.lng],
    [order.drop.lat, order.drop.lng],
  ];

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

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button
            className="btn btn-sm btn-outline-secondary mb-2"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
          <h4 className="fw-bold mb-0">
            Order #{order.orderId}
          </h4>
          <span className="badge bg-info mt-1">
            {order.status}
          </span>
        </div>

        <div className="d-flex gap-2">
          {order.status === "NEW" && (
            <button
              className="btn btn-outline-danger"
              onClick={cancelOrder}
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>

      <div className="row g-4">
        {/* ================= MAP ================= */}
        <div className="col-xl-8">
          <div className="card shadow-sm">
            <div className="card-body">
              <h6 className="fw-semibold mb-3">
                Route & Location
              </h6>

              <MapContainer
                center={[
                  order.pickup.lat,
                  order.pickup.lng,
                ]}
                zoom={13}
                style={{ height: 450 }}
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

                <Polyline
                  positions={route}
                  pathOptions={{ color: "#0d6efd" }}
                />
              </MapContainer>
            </div>
          </div>

          {/* Order Summary */}
          <div className="card shadow-sm mt-3">
            <div className="card-body">
              <h6 className="fw-semibold mb-3">
                Order Details
              </h6>

              <div className="row">
                <div className="col-md-6">
                  <div className="text-muted small">
                    Customer
                  </div>
                  <div className="fw-semibold">
                    {order.customer?.name}
                  </div>
                  <div>{order.customer?.phone}</div>
                </div>

                <div className="col-md-6">
                  <div className="text-muted small">
                    Notes
                  </div>
                  <div>{order.notes || "-"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT PANEL ================= */}
        <div className="col-xl-4">
          {/* Assigned Rider */}
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <h6 className="fw-semibold mb-2">
                Assigned Rider
              </h6>

              {order.assignedRiderId ? (
                <div className="fw-semibold">
                  {order.assignedRiderId}
                </div>
              ) : (
                <span className="text-muted">
                  Not assigned
                </span>
              )}
            </div>
          </div>

          {/* Assign Rider */}
          <div className="card shadow-sm">
            <div className="card-body">
              <h6 className="fw-semibold mb-2">
                Available Riders
              </h6>

              {riders.map((r) => (
                <div
                  key={r.riderId}
                  className="d-flex justify-content-between align-items-center border rounded p-2 mb-2"
                >
                  <div>
                    <div className="fw-semibold">
                      {r.name}
                    </div>
                    <small className="text-muted">
                      {r.phone}
                    </small>
                  </div>

                  <button
                    className="btn btn-sm btn-dark"
                    disabled={assigning}
                    onClick={() =>
                      assignRider(r.riderId)
                    }
                  >
                    Assign
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
