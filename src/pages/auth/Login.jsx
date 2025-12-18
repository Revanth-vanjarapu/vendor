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

      // ✅ BACKEND RESPONSE STRUCTURE
      const token = res.data?.data?.token;
      const vendor = res.data?.data?.vendor;

      if (!token) {
        throw new Error("Token missing in response");
      }

      localStorage.setItem("token", token);
      localStorage.setItem("vendor", JSON.stringify(vendor));

      navigate("/vendor/dashboard");
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      setError(
        err.response?.data?.message ||
        err.message ||
        "Login failed"
      );
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: 400 }}>
      <h4 className="mb-3">Vendor Login</h4>

      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>
        <input
          className="form-control mb-2"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <input
          className="form-control mb-3"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" className="btn btn-primary w-100">
          Login
        </button>
      </form>
    </div>
  );
}
