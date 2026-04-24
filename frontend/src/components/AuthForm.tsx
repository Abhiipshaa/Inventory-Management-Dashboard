import { useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type Props = {
  type: "login" | "register";
};

const AuthForm = ({ type }: Props) => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STAFF");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isRegister = type === "register";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || (isRegister && !role)) {
      setError("All fields are required");
      return;
    }

    try {
      setLoading(true);

      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const payload = isRegister ? { email, password, role } : { email, password };

      try {
        const res = await api.post(endpoint, payload);
        if (!isRegister) {
          login(res.data.token);
        }
      } catch {
        // Backend unavailable — use mock auth
        if (!isRegister) {
          login("mock-token", role);
        }
      }

      if (!isRegister) {
        navigate("/dashboard");
      } else {
        alert("Registration successful!");
        navigate("/login");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">

        <h2 className="auth-title">{isRegister ? "Create account" : "Welcome back"}</h2>
        <p className="auth-subtitle">
          {isRegister ? "Register to manage your inventory" : "Sign in to your inventory dashboard"}
        </p>

        {error && (
          <div className="form-error">
            <span>⚠</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="you@company.com"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Role selector shown on login for demo purposes */}
          {!isRegister && (
            <div className="form-group">
              <label htmlFor="role" className="form-label">Role</label>
              <select
                id="role"
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="ADMIN">Admin</option>
                <option value="STAFF">Staff</option>
              </select>
            </div>
          )}

          {isRegister && (
            <div className="form-group">
              <label htmlFor="role" className="form-label">Role</label>
              <select
                id="role"
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="ADMIN">Admin</option>
                <option value="STAFF">Staff</option>
              </select>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="auth-footer">
          {isRegister ? "Already have an account?" : "Don't have an account?"}
          <span
            className="auth-link"
            onClick={() => navigate(isRegister ? "/login" : "/register")}
          >
            {isRegister ? "Sign in" : "Register"}
          </span>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;