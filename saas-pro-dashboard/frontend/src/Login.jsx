import React, { useState } from "react";
import { useAuth } from "./AuthContext";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("admin@alpha.com");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f5f5f7" }}>
      <form onSubmit={submit} style={{ width: 360, background: "#fff", padding: 24, borderRadius: 12, border: "1px solid #eee" }}>
        <h2>SaaS Pro Login</h2>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" style={{ width: "100%", marginBottom: 10, padding: 10 }} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" style={{ width: "100%", marginBottom: 10, padding: 10 }} />
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button disabled={loading} style={{ width: "100%", padding: 10 }}>{loading ? "..." : "Sign in"}</button>
      </form>
    </div>
  );
}

