import { getVendor, logout } from "../utils/auth";

export default function Header() {
  const vendor = getVendor();

  return (
    <nav className="navbar navbar-light bg-white border-bottom px-4">
      <span className="navbar-brand">
        Vendor Panel – {vendor?.name || "Vendor"}
      </span>
      <button className="btn btn-outline-danger btn-sm" onClick={logout}>
        Logout
      </button>
    </nav>
  );
}
