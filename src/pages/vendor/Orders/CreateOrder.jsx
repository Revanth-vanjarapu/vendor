import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getVendorStores } from "../../../api/vendor.stores.api";

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
   MAP CLICK PICKER
================================ */
function LocationPicker({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng);
    },
  });
  return null;
}

export default function CreateOrder() {
  /* ===============================
     COMMON STATE
  ================================ */
  const [mode, setMode] = useState("single"); // single | bulk
  const [stores, setStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(true);
  /* ===============================
   ADDRESS → GEO (MANUAL ADDRESS)
================================ */
const locateFromAddress = async () => {
  const query = `${form.address1} ${form.address2} ${form.city} ${form.pincode}`;

  if (!query.trim()) {
    alert("Please enter address details first");
    return;
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}`
    );

    const data = await res.json();

    if (data.length > 0) {
      setForm((prev) => ({
        ...prev,
        lat: Number(data[0].lat),
        lng: Number(data[0].lon),
      }));
    } else {
      alert("Address not found on map");
    }
  } catch (err) {
    console.error("Address lookup failed", err);
    alert("Failed to locate address");
  }
};


  /* ===============================
     SINGLE ORDER STATE
  ================================ */
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    pincode: "",
    lat: 17.4474,
    lng: 78.3762,
    storeId: "",
    notes: "",
  });

  const [mapSearch, setMapSearch] = useState("");
  const [route, setRoute] = useState([]);
  const mapRef = useRef(null);

  /* ===============================
     BULK ORDER STATE
  ================================ */
  const [bulkText, setBulkText] = useState("");
  const [bulkOrders, setBulkOrders] = useState([]);
  const [bulkErrors, setBulkErrors] = useState([]);

  /* ===============================
     LOAD STORES
  ================================ */
  useEffect(() => {
    const loadStores = async () => {
      try {
        const res = await getVendorStores();
        setStores(res.data?.data?.items || []);
      } catch (err) {
        console.error("Failed to load stores", err);
      } finally {
        setLoadingStores(false);
      }
    };
    loadStores();
  }, []);

  const selectedStore = stores.find(
    (s) => s.storeId === form.storeId
  );

  /* ===============================
     MAP SEARCH
  ================================ */
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
        lat: Number(data[0].lat),
        lng: Number(data[0].lon),
      }));
    }
  };

  /* ===============================
     MAP CLICK
  ================================ */
  const handlePick = (loc) => {
    setForm((p) => ({
      ...p,
      lat: loc.lat,
      lng: loc.lng,
    }));
  };

  /* ===============================
     ROUTE PREVIEW
  ================================ */
  useEffect(() => {
    if (!selectedStore) return;
    const fetchRoute = async () => {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${selectedStore.lng},${selectedStore.lat};${form.lng},${form.lat}?overview=full&geometries=geojson`
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
  }, [selectedStore, form.lat, form.lng]);

  /* ===============================
     FIX MAP RENDER
  ================================ */
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 200);
    }
  }, [mode]);

  /* ===============================
     BULK PARSER (EXCEL COPY-PASTE)
     Expected columns (TAB separated):
     Store Name | OrderId | Address | Lat | Lng | Customer Name | Phone
  ================================ */
  const parseBulkOrders = () => {
    const rows = bulkText.trim().split("\n");
    const parsed = [];
    const errors = [];

    rows.forEach((row, index) => {
      const cols = row.split("\t");
      if (cols.length < 7) {
        errors.push(`Row ${index + 1}: Invalid columns`);
        return;
      }

      const [
        storeName,
        clientOrderId,
        address,
        lat,
        lng,
        customerName,
        phone,
      ] = cols;

      const store = stores.find(
        (s) =>
          s.name.trim().toLowerCase() ===
          storeName.trim().toLowerCase()
      );

      if (!store) {
        errors.push(
          `Row ${index + 1}: Store not found (${storeName})`
        );
        return;
      }

      if (isNaN(lat) || isNaN(lng)) {
        errors.push(
          `Row ${index + 1}: Invalid latitude/longitude`
        );
        return;
      }

      parsed.push({
        storeId: store.storeId,
        clientOrderId,
        customerName,
        phone,
        address,
        lat: Number(lat),
        lng: Number(lng),
      });
    });

    setBulkOrders(parsed);
    setBulkErrors(errors);
  };

  /* ===============================
     SUBMIT HANDLERS
  ================================ */
  const submitSingle = () => {
    const payload = { ...form };
    console.log("SINGLE ORDER PAYLOAD:", payload);
    alert("Single order API not connected yet");
  };

  const submitBulk = () => {
    console.log("BULK ORDER PAYLOAD:", bulkOrders);
    alert(`${bulkOrders.length} bulk orders ready`);
  };

  /* ===============================
     UI
  ================================ */
  return (
    <div>
      <h4 className="fw-semibold mb-3">Create Delivery Request</h4>

      {/* MODE SWITCH */}
      <div className="btn-group mb-4">
        <button
          className={`btn btn-sm ${
            mode === "single" ? "btn-dark" : "btn-outline-secondary"
          }`}
          onClick={() => setMode("single")}
        >
          Single Order
        </button>
        <button
          className={`btn btn-sm ${
            mode === "bulk" ? "btn-dark" : "btn-outline-secondary"
          }`}
          onClick={() => setMode("bulk")}
        >
          Bulk Orders
        </button>
      </div>

      {/* ================= BULK ================= */}
      {mode === "bulk" && (
        <div className="card">
          <div className="card-body">
            <textarea
              className="form-control mb-3"
              rows={8}
              placeholder="Paste rows directly from Excel"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />

            <button
              className="btn btn-outline-secondary btn-sm mb-3"
              onClick={parseBulkOrders}
            >
              Parse Orders
            </button>

            {bulkErrors.length > 0 && (
              <div className="alert alert-danger small">
                {bulkErrors.map((e, i) => (
                  <div key={i}>{e}</div>
                ))}
              </div>
            )}

            {bulkOrders.length > 0 && (
              <>
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Store</th>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>Lat</th>
                      <th>Lng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkOrders.map((o, i) => (
                      <tr key={i}>
                        <td>{o.storeId}</td>
                        <td>{o.customerName}</td>
                        <td>{o.phone}</td>
                        <td>{o.lat}</td>
                        <td>{o.lng}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <button
                  className="btn btn-dark"
                  onClick={submitBulk}
                >
                  Create Bulk Orders
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ================= SINGLE ================= */}
      {mode === "single" && (
        <div>
      <div className="mb-4">
        <h4 className="fw-semibold mb-1">
          Create Delivery Request
        </h4>
        <p className="text-muted small mb-0">
          Manual address for records, map location for routing & ETA
        </p>
      </div>

      <div className="row g-4">
        {/* LEFT */}
        <div className="col-lg-7">
          <div className="card">
            <div className="card-body">
              <h6 className="fw-semibold mb-3">
                Customer Information
              </h6>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <input
                    className="form-control"
                    placeholder="Customer Name"
                    value={form.customerName}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        customerName: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="col-md-6">
                  <input
                    className="form-control"
                    placeholder="Phone"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <h6 className="fw-semibold mb-2">
                Delivery Address (Manual)
              </h6>

              <input
                className="form-control mb-2"
                placeholder="House / Street"
                value={form.addressLine1}
                onChange={(e) =>
                  setForm({
                    ...form,
                    addressLine1: e.target.value,
                  })
                }
              />

              <input
                className="form-control mb-2"
                placeholder="Area / Locality"
                value={form.addressLine2}
                onChange={(e) =>
                  setForm({
                    ...form,
                    addressLine2: e.target.value,
                  })
                }
              />

              <div className="row g-2 mb-3">
                <div className="col">
                  <input
                    className="form-control"
                    placeholder="City"
                    value={form.city}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        city: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="col">
                  <input
                    className="form-control"
                    placeholder="Pincode"
                    value={form.pincode}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        pincode: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <button
                className="btn btn-outline-secondary btn-sm mb-3"
                onClick={locateFromAddress}
              >
                Locate Address on Map
              </button>

              <div className="row g-2 mb-3">
                <div className="col">
                  <input
                    className="form-control"
                    value={form.lat}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        lat: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="col">
                  <input
                    className="form-control"
                    value={form.lng}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        lng: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <select
                className="form-select mb-3"
                value={form.storeId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    storeId: e.target.value,
                  })
                }
                disabled={loadingStores}
              >
                <option value="">Select Store</option>
                {stores.map((s) => (
                  <option key={s.storeId} value={s.storeId}>
                    {s.name}
                  </option>
                ))}
              </select>

              <textarea
                className="form-control mb-3"
                placeholder="Delivery notes"
                rows={2}
                value={form.notes}
                onChange={(e) =>
                  setForm({
                    ...form,
                    notes: e.target.value,
                  })
                }
              />

              <div className="d-flex justify-content-end gap-2">
                <button className="btn btn-light">
                  Cancel
                </button>
                <button
                  className="btn btn-dark"
                  onClick={submitSingle}
                >
                  Create Request
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="col-lg-5">
          <div className="card mb-3">
            <div className="card-body">
              <h6 className="fw-semibold mb-2">
                Destination & Route
              </h6>

              {/* MAP SEARCH */}
              <div className="input-group mb-2">
                <input
                  className="form-control"
                  placeholder="Search destination (landmark / area)"
                  value={mapSearch}
                  onChange={(e) =>
                    setMapSearch(e.target.value)
                  }
                />
                <button
                  className="btn btn-outline-secondary"
                  onClick={searchOnMap}
                >
                  Locate
                </button>
              </div>

              <MapContainer
                center={[form.lat, form.lng]}
                zoom={14}
                style={{ height: 300 }}
                whenCreated={(map) =>
                  (mapRef.current = map)
                }
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {selectedStore && (
                  <Marker
                    position={[
                      selectedStore.lat,
                      selectedStore.lng,
                    ]}
                  />
                )}

                <Marker position={[form.lat, form.lng]} />

                {route.length > 0 && (
                  <Polyline positions={route} />
                )}

                <LocationPicker onPick={handlePick} />
              </MapContainer>

              <div className="text-muted small mt-2">
                Search, click on map, or edit coordinates to set destination
              </div>
            </div>
          </div>

          <div className="card bg-light">
            <div className="card-body">
              <h6 className="fw-semibold mb-1">
                Automated Assignment
              </h6>
              <p className="text-muted small mb-0">
                Riders will be auto-selected based on distance and availability.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
      )}
    </div>
  );
}








// import { useEffect, useState, useRef } from "react";
// import {
//   MapContainer,
//   TileLayer,
//   Marker,
//   Polyline,
//   useMapEvents,
// } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";

// import { getVendorStores } from "../../../api/vendor.stores.api";

// /* ===============================
//    Leaflet marker icon fix
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
//    Map click picker
// ================================ */
// function LocationPicker({ onPick }) {
//   useMapEvents({
//     click(e) {
//       onPick(e.latlng);
//     },
//   });
//   return null;
// }

// export default function CreateOrder() {
//   /* ===============================
//      STATE
//   ================================ */
//   const [stores, setStores] = useState([]);
//   const [loadingStores, setLoadingStores] = useState(true);

//   const [mapSearch, setMapSearch] = useState("");

//   const [form, setForm] = useState({
//     customerName: "",
//     phone: "",

//     addressLine1: "",
//     addressLine2: "",
//     city: "",
//     pincode: "",

//     lat: 17.4474,
//     lng: 78.3762,

//     storeId: "",
//     notes: "",
//   });

//   const [route, setRoute] = useState([]);
//   const mapRef = useRef(null);

//   /* ===============================
//      LOAD STORES (REAL API)
//   ================================ */
//   useEffect(() => {
//     const loadStores = async () => {
//       try {
//         const res = await getVendorStores();
//         setStores(res.data.data.items);
//       } catch (err) {
//         console.error("Failed to load stores", err);
//       } finally {
//         setLoadingStores(false);
//       }
//     };

//     loadStores();
//   }, []);

//   const selectedStore = stores.find(
//     (s) => s.storeId === form.storeId
//   );

//   /* ===============================
//      MANUAL ADDRESS → GEO (OPTIONAL)
//   ================================ */
//   const locateFromAddress = async () => {
//     const query = `${form.addressLine1} ${form.addressLine2} ${form.city} ${form.pincode}`;
//     if (!query.trim()) return;

//     try {
//       const res = await fetch(
//         `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
//           query
//         )}`
//       );
//       const data = await res.json();

//       if (data.length > 0) {
//         setForm((prev) => ({
//           ...prev,
//           lat: parseFloat(data[0].lat),
//           lng: parseFloat(data[0].lon),
//         }));
//       }
//     } catch (err) {
//       console.error("Address lookup failed", err);
//     }
//   };

//   /* ===============================
//      MAP SEARCH (FREE TEXT)
//   ================================ */
//   const searchOnMap = async () => {
//     if (!mapSearch.trim()) return;

//     try {
//       const res = await fetch(
//         `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
//           mapSearch
//         )}`
//       );
//       const data = await res.json();

//       if (data.length > 0) {
//         setForm((prev) => ({
//           ...prev,
//           lat: parseFloat(data[0].lat),
//           lng: parseFloat(data[0].lon),
//         }));
//       }
//     } catch (err) {
//       console.error("Map search failed", err);
//     }
//   };

//   /* ===============================
//      MAP CLICK
//   ================================ */
//   const handlePick = (loc) => {
//     setForm((prev) => ({
//       ...prev,
//       lat: loc.lat,
//       lng: loc.lng,
//     }));
//   };

//   /* ===============================
//      ROUTE (OSRM – REAL ROADS)
//   ================================ */
//   useEffect(() => {
//     if (!selectedStore) return;

//     const fetchRoute = async () => {
//       try {
//         const res = await fetch(
//           `https://router.project-osrm.org/route/v1/driving/${selectedStore.lng},${selectedStore.lat};${form.lng},${form.lat}?overview=full&geometries=geojson`
//         );
//         const data = await res.json();

//         if (data.routes?.length) {
//           setRoute(
//             data.routes[0].geometry.coordinates.map(
//               ([lng, lat]) => [lat, lng]
//             )
//           );
//         }
//       } catch (err) {
//         console.error("Route fetch failed", err);
//       }
//     };

//     fetchRoute();
//   }, [selectedStore, form.lat, form.lng]);

//   /* ===============================
//      FIX MAP ON REFRESH
//   ================================ */
//   useEffect(() => {
//     if (!mapRef.current) return;
//     setTimeout(() => {
//       mapRef.current.invalidateSize();
//     }, 200);
//   }, []);

//   /* ===============================
//      SUBMIT (PLACEHOLDER)
//   ================================ */
//   const handleSubmit = () => {
//     const payload = {
//       storeId: form.storeId,
//       customerName: form.customerName,
//       phone: form.phone,

//       address: {
//         line1: form.addressLine1,
//         line2: form.addressLine2,
//         city: form.city,
//         pincode: form.pincode,
//       },

//       lat: form.lat,
//       lng: form.lng,
//       notes: form.notes,
//     };

//     console.log("CREATE ORDER PAYLOAD (API later):", payload);
//     alert("Create Order API not integrated yet");
//   };

//   /* ===============================
//      UI
//   ================================ */
//   return (
//     <div>
//       <div className="mb-4">
//         <h4 className="fw-semibold mb-1">
//           Create Delivery Request
//         </h4>
//         <p className="text-muted small mb-0">
//           Manual address for records, map location for routing & ETA
//         </p>
//       </div>

//       <div className="row g-4">
//         {/* LEFT */}
//         <div className="col-lg-7">
//           <div className="card">
//             <div className="card-body">
//               <h6 className="fw-semibold mb-3">
//                 Customer Information
//               </h6>

//               <div className="row g-3 mb-3">
//                 <div className="col-md-6">
//                   <input
//                     className="form-control"
//                     placeholder="Customer Name"
//                     value={form.customerName}
//                     onChange={(e) =>
//                       setForm({
//                         ...form,
//                         customerName: e.target.value,
//                       })
//                     }
//                   />
//                 </div>
//                 <div className="col-md-6">
//                   <input
//                     className="form-control"
//                     placeholder="Phone"
//                     value={form.phone}
//                     onChange={(e) =>
//                       setForm({
//                         ...form,
//                         phone: e.target.value,
//                       })
//                     }
//                   />
//                 </div>
//               </div>

//               <h6 className="fw-semibold mb-2">
//                 Delivery Address (Manual)
//               </h6>

//               <input
//                 className="form-control mb-2"
//                 placeholder="House / Street"
//                 value={form.addressLine1}
//                 onChange={(e) =>
//                   setForm({
//                     ...form,
//                     addressLine1: e.target.value,
//                   })
//                 }
//               />

//               <input
//                 className="form-control mb-2"
//                 placeholder="Area / Locality"
//                 value={form.addressLine2}
//                 onChange={(e) =>
//                   setForm({
//                     ...form,
//                     addressLine2: e.target.value,
//                   })
//                 }
//               />

//               <div className="row g-2 mb-3">
//                 <div className="col">
//                   <input
//                     className="form-control"
//                     placeholder="City"
//                     value={form.city}
//                     onChange={(e) =>
//                       setForm({
//                         ...form,
//                         city: e.target.value,
//                       })
//                     }
//                   />
//                 </div>
//                 <div className="col">
//                   <input
//                     className="form-control"
//                     placeholder="Pincode"
//                     value={form.pincode}
//                     onChange={(e) =>
//                       setForm({
//                         ...form,
//                         pincode: e.target.value,
//                       })
//                     }
//                   />
//                 </div>
//               </div>

//               <button
//                 className="btn btn-outline-secondary btn-sm mb-3"
//                 onClick={locateFromAddress}
//               >
//                 Locate Address on Map
//               </button>

//               <div className="row g-2 mb-3">
//                 <div className="col">
//                   <input
//                     className="form-control"
//                     value={form.lat}
//                     onChange={(e) =>
//                       setForm({
//                         ...form,
//                         lat: Number(e.target.value),
//                       })
//                     }
//                   />
//                 </div>
//                 <div className="col">
//                   <input
//                     className="form-control"
//                     value={form.lng}
//                     onChange={(e) =>
//                       setForm({
//                         ...form,
//                         lng: Number(e.target.value),
//                       })
//                     }
//                   />
//                 </div>
//               </div>

//               <select
//                 className="form-select mb-3"
//                 value={form.storeId}
//                 onChange={(e) =>
//                   setForm({
//                     ...form,
//                     storeId: e.target.value,
//                   })
//                 }
//                 disabled={loadingStores}
//               >
//                 <option value="">Select Store</option>
//                 {stores.map((s) => (
//                   <option key={s.storeId} value={s.storeId}>
//                     {s.name}
//                   </option>
//                 ))}
//               </select>

//               <textarea
//                 className="form-control mb-3"
//                 placeholder="Delivery notes"
//                 rows={2}
//                 value={form.notes}
//                 onChange={(e) =>
//                   setForm({
//                     ...form,
//                     notes: e.target.value,
//                   })
//                 }
//               />

//               <div className="d-flex justify-content-end gap-2">
//                 <button className="btn btn-light">
//                   Cancel
//                 </button>
//                 <button
//                   className="btn btn-dark"
//                   onClick={handleSubmit}
//                 >
//                   Create Request
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* RIGHT */}
//         <div className="col-lg-5">
//           <div className="card mb-3">
//             <div className="card-body">
//               <h6 className="fw-semibold mb-2">
//                 Destination & Route
//               </h6>

//               {/* MAP SEARCH */}
//               <div className="input-group mb-2">
//                 <input
//                   className="form-control"
//                   placeholder="Search destination (landmark / area)"
//                   value={mapSearch}
//                   onChange={(e) =>
//                     setMapSearch(e.target.value)
//                   }
//                 />
//                 <button
//                   className="btn btn-outline-secondary"
//                   onClick={searchOnMap}
//                 >
//                   Locate
//                 </button>
//               </div>

//               <MapContainer
//                 center={[form.lat, form.lng]}
//                 zoom={14}
//                 style={{ height: 300 }}
//                 whenCreated={(map) =>
//                   (mapRef.current = map)
//                 }
//               >
//                 <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

//                 {selectedStore && (
//                   <Marker
//                     position={[
//                       selectedStore.lat,
//                       selectedStore.lng,
//                     ]}
//                   />
//                 )}

//                 <Marker position={[form.lat, form.lng]} />

//                 {route.length > 0 && (
//                   <Polyline positions={route} />
//                 )}

//                 <LocationPicker onPick={handlePick} />
//               </MapContainer>

//               <div className="text-muted small mt-2">
//                 Search, click on map, or edit coordinates to set destination
//               </div>
//             </div>
//           </div>

//           <div className="card bg-light">
//             <div className="card-body">
//               <h6 className="fw-semibold mb-1">
//                 Automated Assignment
//               </h6>
//               <p className="text-muted small mb-0">
//                 Riders will be auto-selected based on distance and availability.
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
