import { useState } from "react";
import { api } from "../api/api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    const res = await api.post("/auth/login", null, {
      params: { username, password }
    });

    localStorage.setItem("token", res.data.token);
    window.location.href = "/restaurants";
  };

  return (
    <div className="card">
      <h2>Login</h2>

      <input className="input" onChange={e => setUsername(e.target.value)} placeholder="Username" />
      <input className="input" type="password" onChange={e => setPassword(e.target.value)} placeholder="Password" />

      <button className="button" onClick={login}>Login</button>
    </div>
  );
}