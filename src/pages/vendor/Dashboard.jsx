import { useEffect, useState } from "react";
import { fetchVendorDashboard } from "../../api/vendor.api";

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchVendorDashboard().then((res) => setStats(res.data));
  }, []);

  return (
    <>
      <h4>Dashboard</h4>

      {!stats ? (
        <p>Loading...</p>
      ) : (
        <div className="row mt-3">
          <div className="col-md-3">
            <div className="card p-3">
              <h6>Total Stores</h6>
              <h4>{stats.totalStores}</h4>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card p-3">
              <h6>Total Orders</h6>
              <h4>{stats.totalOrders}</h4>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card p-3">
              <h6>Active Orders</h6>
              <h4>{stats.activeOrders}</h4>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
