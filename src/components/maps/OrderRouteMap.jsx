import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";

/* Fix default marker issue */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function OrderRouteMap({
  storeLocation,
  customerLocation,
  riders,
}) {
  const route = [storeLocation, customerLocation];

  return (
    <MapContainer
      center={storeLocation}
      zoom={14}
      className="rounded"
      style={{ height: 350, width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Store */}
      <Marker position={storeLocation} />

      {/* Customer */}
      <Marker position={customerLocation} />

      {/* Riders */}
      {riders.map((r) => (
        <Marker key={r.id} position={r.location} />
      ))}

      {/* Route */}
      <Polyline positions={route} />
    </MapContainer>
  );
}
