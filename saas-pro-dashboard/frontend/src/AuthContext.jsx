import React, { createContext, useContext, useMemo, useState } from "react";
import { api, login } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("saas_user");
    return raw ? JSON.parse(raw) : null;
  });

  const signIn = async (email, password) => {
    const result = await login(email, password);
    localStorage.setItem("saas_access_token", result.access_token);
    localStorage.setItem("saas_refresh_token", result.refresh_token);
    localStorage.setItem("saas_user", JSON.stringify(result.user));
    setUser(result.user);
  };

  const signOut = async () => {
    const refreshToken = localStorage.getItem("saas_refresh_token");
    if (refreshToken) {
      try {
        await api.post("/auth/logout", { refresh_token: refreshToken });
      } catch {
        // ignore logout errors
      }
    }
    localStorage.removeItem("saas_access_token");
    localStorage.removeItem("saas_refresh_token");
    localStorage.removeItem("saas_user");
    setUser(null);
  };

  const value = useMemo(() => ({ user, signIn, signOut }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

