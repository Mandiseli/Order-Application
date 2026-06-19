import { useState } from "react";
import { api } from "../api/api";
import { toast } from "react-toastify";
import { getUserFromToken } from "../utils/auth";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    try {
      const res = await api.post("/auth/login", null, {
        params: { username, password }
      });

      localStorage.setItem("token", res.data.token);

      const user = getUserFromToken();

      toast.success("Login successful");

      if (user?.role === "Admin") {
        window.location.href = "/admin";
      } else if (user?.role === "Manager") {
        window.location.href = "/reports";
      } else {
        window.location.href = "/employee-dashboard";
      }
    } catch {
      toast.error("Invalid username or password");
    }
  };

  return (
    <div className="card">
      <h2>Login</h2>

      <input
        className="input"
        value={username}
        onChange={e => setUsername(e.target.value)}
        placeholder="Username"
      />

      <input
        className="input"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
      />

      <button className="button" onClick={login}>
        Login
      </button>
    </div>
  );
}