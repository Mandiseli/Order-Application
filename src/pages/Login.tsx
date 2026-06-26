import { useState } from "react";
import { api } from "../api/api";
import { toast } from "react-toastify";
import { getUserFromToken } from "../utils/auth";
import { Link } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    if (!username.trim() || !password.trim()) {
      toast.error("Username and password are required");
      return;
    }

    try {
      const res = await api.post("/auth/login", {
        username,
        password
      });

      localStorage.setItem("accessToken", res.data.accessToken);
      localStorage.setItem("refreshToken", res.data.refreshToken);

      const user = getUserFromToken();

      toast.success("Login successful");

      if (user?.role === "Admin") {
        window.location.href = "/admin";
      } else if (user?.role === "Manager") {
        window.location.href = "/reports";
      } else {
        window.location.href = "/employee-dashboard";
      }
    } catch (error: any) {
      toast.error(error.response?.data || "Invalid username or password");
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h2>Login</h2>

        <input
          className="input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
        />

        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />

        <button className="button" onClick={login}>
          Login
        </button>

        <p className="auth-link">
          New employee? <Link to="/signup">Create account</Link>
        </p>
      </div>
    </div>
  );
}