import { NavLink } from "react-router-dom";
import { useMemo } from "react";

export default function Sidebar() {
  /* ===============================
     LOAD VENDOR FROM STORAGE
  ================================ */
  const vendor = useMemo(() => {
    try {
      const stored = localStorage.getItem("shippzi_vendor");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  /* ===============================
     RESOLVE LOGO (PRIORITY)
     1. vendor.logoUrl
     2. vendor.theme.logoUrl
     3. default shippzi logo
  ================================ */
  const logoUrl =
    vendor?.logoUrl ||
    vendor?.theme?.logoUrl ||
    "/logo.png";

  return (
    <aside className="vh-100 border-end bg-body d-flex flex-column">
      {/* ===============================
          LOGO
      ================================ */}
      <div
        className="border-bottom d-flex align-items-center justify-content-center px-2"
        style={{
          height: "80px",
          background: "#fff",
        }}
      >
        <img
          src={logoUrl}
          alt={vendor?.name || "Shippzi"}
          style={{
            maxHeight: "60px",
            maxWidth: "100%",
            width: "100%",
            objectFit: "contain",
          }}
          onError={(e) => {
            e.currentTarget.src = "/logo.png";
          }}
        />
      </div>
      {/* ===============================
          NAVIGATION
      ================================ */}
      <nav className="flex-grow-1 p-3">
        <ul className="nav nav-pills flex-column gap-1">

          <li className="nav-item">
            <NavLink
              to="/vendor/dashboard"
              className={({ isActive }) =>
                `nav-link d-flex align-items-center gap-2 ${isActive
                  ? "active bg-primary text-white"
                  : "text-body"
                }`
              }
            >
              <i className="bi bi-speedometer2"></i>
              Dashboard
            </NavLink>
          </li>

          <li className="nav-item">
            <NavLink
              to="/vendor/stores"
              className={({ isActive }) =>
                `nav-link d-flex align-items-center gap-2 ${isActive
                  ? "active bg-primary text-white"
                  : "text-body"
                }`
              }
            >
              <i className="bi bi-shop"></i>
              Stores
            </NavLink>
          </li>

          <li className="nav-item">
            <NavLink
              to="/vendor/orders"
              className={({ isActive }) =>
                `nav-link d-flex align-items-center gap-2 ${isActive
                  ? "active bg-primary text-white"
                  : "text-body"
                }`
              }
            >
              <i className="bi bi-receipt"></i>
              Orders
            </NavLink>
          </li>

          <li className="nav-item">
            <NavLink
              to="/vendor/riders"
              className={({ isActive }) =>
                `nav-link d-flex align-items-center gap-2 ${isActive
                  ? "active bg-primary text-white"
                  : "text-body"
                }`
              }
            >
              <i className="bi bi-bicycle"></i>
              Riders
            </NavLink>
          </li>

        </ul>
      </nav>
    </aside>
  );
}
