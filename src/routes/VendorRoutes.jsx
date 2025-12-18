import { Routes, Route } from "react-router-dom";
import VendorLayout from "../layouts/VendorLayout";
import Dashboard from "../pages/vendor/Dashboard";
import ProtectedRoute from "../components/ProtectedRoute";

export default function VendorRoutes() {
  return (
    <ProtectedRoute>
      <VendorLayout>
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
        </Routes>
      </VendorLayout>
    </ProtectedRoute>
  );
}
