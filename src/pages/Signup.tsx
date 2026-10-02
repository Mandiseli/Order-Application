import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { api, getApiErrorMessage } from "../api/api";

export default function Signup() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const signup = async () => {
    const cleanUsername = username.trim();
    const cleanEmployeeNumber = employeeNumber.trim().toUpperCase();

    if (!cleanUsername) {
      toast.error("Username is required.");
      return;
    }

    if (cleanUsername.length < 3) {
      toast.error("Username must be at least 3 characters.");
      return;
    }

    if (!password) {
      toast.error("Password is required.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (!cleanEmployeeNumber) {
      toast.error("Employee number is required.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/register", {
        username: cleanUsername,
        password,
        employeeNumber: cleanEmployeeNumber
      });

      const accessToken =
        response.data?.accessToken ?? response.data?.token;

      const refreshToken = response.data?.refreshToken;

      if (!accessToken) {
        throw new Error(
          "Registration succeeded, but no access token was returned."
        );
      }

      localStorage.setItem("accessToken", accessToken);

      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }

      if (response.data?.role) {
        localStorage.setItem("role", response.data.role);
      }

      if (response.data?.employeeNumber) {
        localStorage.setItem(
          "employeeNumber",
          response.data.employeeNumber
        );
      }

      toast.success("Account created successfully.");

      navigate("/employee-dashboard", { replace: true });
    } catch (error: unknown) {
      console.error("Registration error:", error);

      toast.error(
        getApiErrorMessage(
          error,
          "Registration failed. Please check your details."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h2>Create Employee Account</h2>

        <p className="muted">
          Register using your existing employee number.
        </p>

        <input
          className="input"
          value={employeeNumber}
          onChange={(e) =>
            setEmployeeNumber(e.target.value.toUpperCase())
          }
          placeholder="Employee Number e.g. EMP001"
          disabled={loading}
        />

        <input
          className="input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          autoComplete="username"
          disabled={loading}
        />

        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="new-password"
          disabled={loading}
        />

        <button
          className="button button-success"
          onClick={signup}
          disabled={loading}
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>

        <p className="auth-link">
          Already have an account?{" "}
          <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}