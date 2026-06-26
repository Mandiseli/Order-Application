import { useState } from "react";
import { api } from "../api/api";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");

  const signup = async () => {
    if (!username.trim()) {
      toast.error("Username is required");
      return;
    }

    if (!password.trim()) {
      toast.error("Password is required");
      return;
    }

    if (!employeeNumber.trim()) {
      toast.error("Employee number is required");
      return;
    }

    try {
      const res = await api.post("/auth/register", {
        username,
        password,
        employeeNumber
      });

      localStorage.setItem("accessToken", res.data.accessToken);
      localStorage.setItem("refreshToken", res.data.refreshToken);

      toast.success("Account created successfully");
      window.location.href = "/employee-dashboard";
    } catch (error: any) {
      toast.error(error.response?.data || "Signup failed");
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h2>Create Employee Account</h2>

        <input
          className="input"
          value={employeeNumber}
          onChange={(e) => setEmployeeNumber(e.target.value)}
          placeholder="Employee Number e.g. EMP001"
        />

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

        <button className="button button-success" onClick={signup}>
          Sign Up
        </button>

        <p className="auth-link">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}