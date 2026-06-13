/**
 * BiteStreak – Auth Context
 * Global auth state: user, login, logout, role helpers.
 */
import { createContext, useContext, useState, useCallback } from "react";
import { authService } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // ── Safe State Initialization ──────────────────────────────────────────────
  const [user, setUser] = useState(() => {
    try {
      // Safely attempt to read the user state from authService
      const storedUser = authService.getUser();
      
      // If it evaluates to an unexpected data state or string, clear it gracefully
      if (!storedUser || storedUser === "undefined" || storedUser === "null") {
        return null;
      }
      return storedUser;
    } catch (error) {
      console.error("AuthContext Initialization Error: Failed to parse user session.", error);
      // Fallback state so the app doesn't crash to a black screen
      return null;
    }
  });

  const login = useCallback(async (credentials) => {
    const data = await authService.login(credentials);
    
    // Explicitly persist tokens into localStorage to keep session active indefinitely
    if (data?.access && data?.refresh) {
      localStorage.setItem("accessToken", data.access);
      localStorage.setItem("refreshToken", data.refresh);
      localStorage.setItem("userData", JSON.stringify(data.user));
    }
    
    setUser(data?.user || null);
    return data;
  }, []);

  const register = useCallback(async (credentials) => {
    await authService.register(credentials);
    // Auto-login after register
    const loginData = await authService.login({
      mobile_number: credentials.mobile_number,
      password: credentials.password,
    });

    if (loginData?.access && loginData?.refresh) {
      localStorage.setItem("accessToken", loginData.access);
      localStorage.setItem("refreshToken", loginData.refresh);
      localStorage.setItem("userData", JSON.stringify(loginData.user));
    }

    setUser(loginData?.user || null);
    return loginData;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      // Clear storage files completely on manual logout trigger
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userData");
      setUser(null);
    }
  }, []);

  const isAdmin = user?.role === "admin";
  const isCustomer = user?.role === "customer";

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAdmin, isCustomer }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};