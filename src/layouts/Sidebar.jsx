import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="vh-100 border-end bg-body d-flex flex-column">
      {/* Logo */}
      <div className="p-4 border-bottom text-center">
        <img
          src="/logo.png"
          alt="Shippzi"
          className="img-fluid"
          style={{ maxHeight: "48px" }}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-grow-1 p-3">
        <ul className="nav nav-pills flex-column gap-1">
          <li className="nav-item">
            <NavLink
              to="/vendor/dashboard"
              className={({ isActive }) =>
                `nav-link d-flex align-items-center gap-2 ${
                  isActive
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
                `nav-link d-flex align-items-center gap-2 ${
                  isActive
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
                `nav-link d-flex align-items-center gap-2 ${
                  isActive
                    ? "active bg-primary text-white"
                    : "text-body"
                }`
              }
            >
              <i className="bi bi-receipt"></i>
              Orders
            </NavLink>
          </li>

          {/* ✅ NEW: RIDERS */}
          <li className="nav-item">
            <NavLink
              to="/vendor/riders"
              className={({ isActive }) =>
                `nav-link d-flex align-items-center gap-2 ${
                  isActive
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
