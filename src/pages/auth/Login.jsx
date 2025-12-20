import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginVendor } from "../../api/auth.api";

export default function Login() {
  const [username, setUsername] = useState("ratnadeep_admin1");
  const [password, setPassword] = useState("Test@123");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await loginVendor({ username, password });

      const token = res.data?.data?.token;
      const vendor = res.data?.data?.vendor;

      if (!token) throw new Error("Token missing");

      localStorage.setItem("token", token);
      localStorage.setItem("vendor", JSON.stringify(vendor));

      navigate("/vendor/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Login failed"
      );
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div style={{ width: 420 }}>
        {/* Logo */}
        <div className="text-center mb-4">
          <img
            src="/logo.png"
            alt="Shippzi"
            height="40"
            className="mb-2"
          />
        </div>

        {/* Card */}
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <h4 className="fw-semibold text-center mb-1">
              Welcome back
            </h4>
            <p
              className="text-muted text-center mb-4"
              style={{ fontSize: 14 }}
            >
              Enter your credentials to access your account
            </p>

            {error && (
              <div className="alert alert-danger py-2">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-medium">
                  Email address
                </label>
                <input
                  className="form-control"
                  placeholder="admin@shippzi.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="mb-2">
                <label className="form-label small fw-medium">
                  Password
                </label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="text-end mb-4">
                <a
                  href="#"
                  className="text-primary text-decoration-none small"
                >
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 py-2"
              >
                Sign In
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <p className="text-muted small text-center mt-4 mb-0">
          © 2025 Shippzi Logistics Platform. All rights reserved.
        </p>
      </div>
    </div>
  );
}
