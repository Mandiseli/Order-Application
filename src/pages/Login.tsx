import { useState } from "react";
import { toast } from "react-toastify";

import { api } from "../api/api";

import LoadingSpinner from "../components/LoadingSpinner";

export default function Login() {

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const login = async () => {

    if (!username || !password) {

      toast.error("Please enter username and password");
      return;
    }

    try {

      setLoading(true);

      const res = await api.post("/auth/login", null, {
        params: {
          username,
          password
        }
      });

      localStorage.setItem("token", res.data.token);

      toast.success("Login successful");

      setTimeout(() => {
        window.location.href = "/restaurants";
      }, 1500);

    } catch {

      toast.error("Invalid username or password");

    } finally {

      setLoading(false);

    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "80vh"
      }}
    >

      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "400px"
        }}
      >

        <h1 className="page-title">
          🔐 Login
        </h1>

        <div
          style={{
            marginTop: "20px"
          }}
        >

          <label>
            Username
          </label>

          <input
            className="input"
            placeholder="Enter username"
            onChange={e => setUsername(e.target.value)}
          />

        </div>

        <div
          style={{
            marginTop: "20px"
          }}
        >

          <label>
            Password
          </label>

          <input
            className="input"
            type="password"
            placeholder="Enter password"
            onChange={e => setPassword(e.target.value)}
          />

        </div>

        <div
          style={{
            marginTop: "25px"
          }}
        >

          <button
            className="button"
            onClick={login}
            disabled={loading}
          >

            {loading ? "Signing In..." : "Login"}

          </button>

        </div>

        {loading && <LoadingSpinner />}

      </div>

    </div>
  );
}