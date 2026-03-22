import React from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import { SocketProvider } from "./SocketContext";
import Dashboard from "./Dashboard";
import Login from "./Login";

function AppShell() {
  const { user, signOut } = useAuth();
  if (!user) return <Login />;
  return (
    <SocketProvider>
      <div>
        <div style={{ padding: 12, background: "#111827", color: "#fff", display: "flex", justifyContent: "space-between" }}>
          <span>{user.full_name} ({user.role_name})</span>
          <button onClick={signOut}>Logout</button>
        </div>
        <Dashboard />
      </div>
    </SocketProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

