
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { api, getApiErrorMessage } from "../api/api";
import {
  getDefaultRouteForRole,
  getUserFromToken
} from "../utils/auth";

export default function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) return;

    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password) {
      toast.error("Username and password are required.");
      return;
    }

    setLoading(true);

    // Remove any previous session before attempting login.
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("role");
    localStorage.removeItem("employeeNumber");

    try {
      const response = await api.post("/auth/login", {
        username: trimmedUsername,
        password
      });

      const accessToken =
        response.data?.accessToken ??
        response.data?.token;

      const refreshToken = response.data?.refreshToken;
      const responseRole = response.data?.role;
      const responseEmployeeNumber = response.data?.employeeNumber;

      if (!accessToken || typeof accessToken !== "string") {
        throw new Error("The server did not return an access token.");
      }

      localStorage.setItem("accessToken", accessToken);

      if (typeof refreshToken === "string" && refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }

      const tokenUser = getUserFromToken();

      const role = String(
        tokenUser?.role ?? responseRole ?? ""
      ).trim();

      const normalizedRole = role.toLowerCase();

      if (!["admin", "manager", "employee"].includes(normalizedRole)) {
        throw new Error(
          "Your account has an invalid or unsupported role."
        );
      }

      const employeeNumber =
        tokenUser?.employeeNumber ||
        responseEmployeeNumber ||
        "";

      localStorage.setItem("role", role);

      if (employeeNumber) {
        localStorage.setItem(
          "employeeNumber",
          String(employeeNumber)
        );
      }

      // Update the sidebar and notify the SignalR bootstrap.
      window.dispatchEvent(new Event("auth-changed"));

      toast.success("Login successful.");

      navigate(getDefaultRouteForRole(role), {
        replace: true
      });
    } catch (error: unknown) {
      console.error("Login failed:", error);

      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("role");
      localStorage.removeItem("employeeNumber");

      window.dispatchEvent(new Event("auth-changed"));

      setPassword("");

      toast.error(
        getApiErrorMessage(error, "Unable to log in. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h2>Login</h2>

        <p>Sign in to your cafeteria account.</p>

        <form onSubmit={login} noValidate>
          <div>
            <label htmlFor="username" className="input-label">
              Username
            </label>

            <input
              id="username"
              name="username"
              className="input"
              type="text"
              value={username}
              onChange={event => setUsername(event.target.value)}
              placeholder="Enter username"
              autoComplete="username"
              autoFocus
              required
              maxLength={100}
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="input-label">
              Password
            </label>

            <input
              id="password"
              name="password"
              className="input"
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              required
              minLength={8}
              maxLength={200}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="button"
            disabled={loading || !username.trim() || !password}
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="auth-link">
          New employee? <Link to="/signup">Create account</Link>
        </p>
      </div>
    </div>
  );
}
