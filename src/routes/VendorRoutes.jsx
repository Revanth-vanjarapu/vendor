import { Routes, Route } from "react-router-dom";
import VendorLayout from "../layouts/VendorLayout";
import Dashboard from "../pages/vendor/Dashboard";
import ProtectedRoute from "../components/ProtectedRoute";
import Orders from "../pages/vendor/Orders/Orders";
import OrderDetails from "../pages/vendor/Orders/OrderDetails";
import Stores from "../pages/vendor/Stores";
import CreateOrder from "../pages/vendor/Orders/CreateOrder";
import Riders from "../pages/vendor/Riders";

export default function VendorRoutes() {
  return (
    <ProtectedRoute>
      <VendorLayout>
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:orderId" element={<OrderDetails />} />
          <Route path="orders/create" element={<CreateOrder />} />


          <Route path="Stores" element={<Stores />} />


          <Route path="Riders" element={<Riders />} />
          
        </Routes>
      </VendorLayout>
    </ProtectedRoute>
  );
}
