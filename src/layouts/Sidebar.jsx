import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="bg-dark text-white vh-100 p-3" style={{ width: 240 }}>
      <h5 className="mb-4">Vendor</h5>

      <NavLink to="/vendor/dashboard" className="d-block text-white mb-2">
        Dashboard
      </NavLink>

      <NavLink to="/vendor/stores" className="d-block text-white mb-2">
        Stores
      </NavLink>

      <NavLink to="/vendor/orders" className="d-block text-white">
        Orders
      </NavLink>
    </div>
  );
}
