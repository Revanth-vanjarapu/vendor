import { Bell, Settings, User, LogOut } from "lucide-react";
import { getVendor, logout } from "../utils/auth";

export default function Header() {
  const vendor = getVendor();

  const name =
    vendor?.name || vendor?.username || "Vendor";

  const profilePic =
    vendor?.profilePicUrl || null;

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <nav className="navbar bg-light px-4 border-bottom">
      <div className="d-flex align-items-center w-100">
        {/* Left */}
        {/* <h5 className="mb-0 fw-semibold">
          Vendor Dashboard
        </h5> */}

        {/* Right */}
        <div className="ms-auto d-flex align-items-center gap-3">
          {/* <button className="btn btn-light btn-sm">
            <Bell size={18} />
          </button>

          <button className="btn btn-light btn-sm">
            <Settings size={18} />
          </button> */}

          <div className="vr"></div>

          <div className="text-end">
            <div className="fw-semibold">{name}</div>

          </div>

          {/* Profile dropdown */}
          <div className="dropdown">
            <button
              className="btn btn-secondary btn-sm rounded-circle p-0 overflow-hidden d-flex align-items-center justify-content-center"
              style={{ width: 36, height: 36 }}
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              {profilePic ? (
                <img
                  src={profilePic}
                  alt={name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement.textContent =
                      initials;
                  }}
                />
              ) : (
                <span className="fw-bold text-white">
                  {initials}
                </span>
              )}
            </button>

            <ul className="dropdown-menu dropdown-menu-end shadow-sm">
              <li>
                <button className="dropdown-item d-flex align-items-center gap-2">
                  <User size={16} />
                  Profile
                </button>
              </li>

              <li>
                <hr className="dropdown-divider" />
              </li>

              <li>
                <button
                  className="dropdown-item d-flex align-items-center gap-2 text-danger"
                  onClick={logout}
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
}
