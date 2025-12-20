import { getVendor, logout } from "../utils/auth";

export default function Header() {
  const vendor = getVendor();

  return (
    <nav className="navbar navbar-expand bg-body border-bottom px-4">
      {/* Left */}
      <span className="navbar-brand fw-semibold mb-0">
        Vendor Dashboard
      </span>

      {/* Right */}
      <div className="ms-auto d-flex align-items-center gap-3">
        <span className="text-muted small">
          {vendor?.name || "Vendor"}
        </span>

        <button
          className="btn btn-outline-danger btn-sm"
          onClick={logout}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
