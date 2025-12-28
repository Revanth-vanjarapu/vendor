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

  const logoUrl =
    vendor?.logoUrl ||
    vendor?.theme?.logoUrl ||
    "/logo.png";

  return (
    <aside className="vh-100 border-end bg-body d-flex flex-column">
      {/* LOGO */}
      <div
        className="border-bottom d-flex align-items-center justify-content-center px-2"
        style={{ height: "80px", background: "#fff" }}
      >
        <img
          src={logoUrl}
          alt="Shippzi"
          style={{
            maxHeight: "60px",
            width: "100%",
            objectFit: "contain",
          }}
          onError={(e) => {
            e.currentTarget.onerror = null; // 🔑 stop loop
            e.currentTarget.src = "/logo.png";
          }}
        />
      </div>

      {/* NAV */}
      <nav className="flex-grow-1 p-3">
        <ul className="nav nav-pills flex-column gap-1">

          <NavItem to="/vendor/dashboard" icon="speedometer2" label="Dashboard" />
          <NavItem to="/vendor/stores" icon="shop" label="Stores" />
          <NavItem to="/vendor/orders" icon="receipt" label="Orders" />

          <NavItem to="/vendor/riders" icon="bicycle" label="Riders" />
          {/* ✅ NEW REPORTS TAB */}
          <NavItem to="/vendor/reports" icon="bar-chart-line" label="Reports" />


        </ul>
      </nav>
    </aside>
  );
}

function NavItem({ to, icon, label }) {
  return (
    <li className="nav-item">
      <NavLink
        to={to}
        className={({ isActive }) =>
          `nav-link d-flex align-items-center gap-2 ${isActive ? "active bg-primary text-white" : "text-body"
          }`
        }
      >
        <i className={`bi bi-${icon}`}></i>
        {label}
      </NavLink>
    </li>
  );
}
