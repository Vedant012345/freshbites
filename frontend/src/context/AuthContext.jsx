/**
 * BiteStreak – Auth Context
 * Global auth state: user, login, logout, role helpers.
 */
import { createContext, useContext, useState, useCallback } from "react";
import { authService } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getUser());

  const login = useCallback(async (credentials) => {
    const data = await authService.login(credentials);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (credentials) => {
    const res = await authService.register(credentials);
    // Auto-login after register
    const loginData = await authService.login({
      mobile_number: credentials.mobile_number,
      password: credentials.password,
    });
    setUser(loginData.user);
    return loginData;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
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
