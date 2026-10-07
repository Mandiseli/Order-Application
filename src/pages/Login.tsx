import {
  FormEvent,
  useState
} from "react";

import {
  Link,
  useNavigate
} from "react-router-dom";

import { toast } from "react-toastify";

import {
  api,
  getApiErrorMessage
} from "../api/api";

import {
  getUserFromToken
} from "../utils/auth";

export default function Login() {
  const navigate = useNavigate();

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const login = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    const trimmedUsername =
      username.trim();

    if (!trimmedUsername) {
      toast.error(
        "Username is required."
      );
      return;
    }

    if (!password) {
      toast.error(
        "Password is required."
      );
      return;
    }

    setLoading(true);

    /*
     * Clear any stale session before
     * attempting a new login.
     */
    localStorage.removeItem(
      "accessToken"
    );

    localStorage.removeItem(
      "refreshToken"
    );

    localStorage.removeItem(
      "role"
    );

    localStorage.removeItem(
      "employeeNumber"
    );

    try {
      /*
       * ----------------------------------------------------
       * Authenticate against the backend
       * ----------------------------------------------------
       */
      const response =
        await api.post(
          "/auth/login",
          {
            username:
              trimmedUsername,
            password
          }
        );

      /*
       * ----------------------------------------------------
       * Read authentication response
       *
       * Expected backend response:
       *
       * {
       *   accessToken: "...",
       *   refreshToken: "...",
       *   role: "Employee",
       *   employeeNumber: "EMP001"
       * }
       * ----------------------------------------------------
       */
      const accessToken =
        response.data?.accessToken ??
        response.data?.token ??
        null;

      const refreshToken =
        response.data?.refreshToken ??
        null;

      const responseRole =
        response.data?.role ??
        null;

      const responseEmployeeNumber =
        response.data?.employeeNumber ??
        null;

      if (!accessToken) {
        throw new Error(
          "Login response did not contain an access token."
        );
      }

      /*
       * ----------------------------------------------------
       * Store authentication information
       * ----------------------------------------------------
       */
      localStorage.setItem(
        "accessToken",
        String(accessToken)
      );

      if (refreshToken) {
        localStorage.setItem(
          "refreshToken",
          String(refreshToken)
        );
      }

      if (responseRole) {
        localStorage.setItem(
          "role",
          String(responseRole)
        );
      }

      if (responseEmployeeNumber) {
        localStorage.setItem(
          "employeeNumber",
          String(
            responseEmployeeNumber
          )
        );
      }

      /*
       * ----------------------------------------------------
       * Read the JWT.
       *
       * getUserFromToken() should read:
       *
       * - username
       * - role
       * - employeeNumber
       *
       * from the access token.
       * ----------------------------------------------------
       */
      const user =
        getUserFromToken();

      /*
       * ----------------------------------------------------
       * Determine the user's role.
       *
       * Prefer the JWT because the JWT is the
       * authenticated source of truth.
       *
       * Fall back to the login response if
       * the helper cannot read the token.
       * ----------------------------------------------------
       */
      const role = String(
        user?.role ??
          responseRole ??
          ""
      )
        .trim()
        .toLowerCase();

      /*
       * ----------------------------------------------------
       * Keep localStorage synchronized with
       * the authenticated JWT information.
       * ----------------------------------------------------
       */
      if (user?.role) {
        localStorage.setItem(
          "role",
          user.role
        );
      }

      if (
        user?.employeeNumber
      ) {
        localStorage.setItem(
          "employeeNumber",
          user.employeeNumber
        );
      }

      /*
       * ----------------------------------------------------
       * Notify Main.tsx.
       *
       * Main.tsx owns the SignalR lifecycle.
       *
       * Login.tsx should NOT call startConnection()
       * directly.
       *
       * This also means a SignalR failure cannot
       * cause a successful login to fail.
       * ----------------------------------------------------
       */
      window.dispatchEvent(
        new Event("auth-changed")
      );

      toast.success(
        "Login successful."
      );

      /*
       * ----------------------------------------------------
       * Navigate according to role
       * ----------------------------------------------------
       */
      switch (role) {
        case "admin":
          navigate("/admin", {
            replace: true
          });
          break;

        case "manager":
          navigate("/reports", {
            replace: true
          });
          break;

        case "employee":
          navigate(
            "/employee-dashboard",
            {
              replace: true
            }
          );
          break;

        default:
          /*
           * The login was technically successful,
           * but the role is not recognized.
           */
          localStorage.removeItem(
            "accessToken"
          );

          localStorage.removeItem(
            "refreshToken"
          );

          localStorage.removeItem(
            "role"
          );

          localStorage.removeItem(
            "employeeNumber"
          );

          window.dispatchEvent(
            new Event(
              "auth-changed"
            )
          );

          throw new Error(
            "Your account has an invalid or unsupported role."
          );
      }
    } catch (error: unknown) {
      console.error(
        "Login failed:",
        error
      );

      /*
       * Do not leave a partially authenticated
       * session behind.
       */
      localStorage.removeItem(
        "accessToken"
      );

      localStorage.removeItem(
        "refreshToken"
      );

      localStorage.removeItem(
        "role"
      );

      localStorage.removeItem(
        "employeeNumber"
      );

      window.dispatchEvent(
        new Event("auth-changed")
      );

      /*
       * Clear password after failure.
       */
      setPassword("");

      toast.error(
        getApiErrorMessage(
          error,
          "Invalid username or password."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h2>Login</h2>

        <p>
          Sign in to your cafeteria
          account.
        </p>

        <form
          onSubmit={login}
          noValidate
        >
          <div>
            <label
              htmlFor="username"
              className="input-label"
            >
              Username
            </label>

            <input
              id="username"
              name="username"
              className="input"
              type="text"
              value={username}
              onChange={event =>
                setUsername(
                  event.target.value
                )
              }
              placeholder="Enter username"
              autoComplete="username"
              autoFocus
              disabled={loading}
              required
              maxLength={100}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="input-label"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              className="input"
              type="password"
              value={password}
              onChange={event =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="Enter password"
              autoComplete="current-password"
              disabled={loading}
              required
              minLength={8}
              maxLength={200}
            />
          </div>

          <button
            type="submit"
            className="button"
            disabled={
              loading ||
              !username.trim() ||
              !password
            }
          >
            {loading
              ? "Signing in..."
              : "Login"}
          </button>
        </form>

        <p className="auth-link">
          New employee?{" "}
          <Link to="/signup">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}