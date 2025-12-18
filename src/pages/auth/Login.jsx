import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginVendor } from "../../api/auth.api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await loginVendor({ email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("vendor", JSON.stringify(res.data.vendor));
      navigate("/vendor/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: 400 }}>
      <h4 className="mb-3">Vendor Login</h4>
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>
        <input
          className="form-control mb-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="form-control mb-3"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="btn btn-primary w-100">Login</button>
      </form>
    </div>
  );
}
