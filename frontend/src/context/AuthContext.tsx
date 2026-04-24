import { createContext, useContext, useState, ReactNode } from "react";

type AuthContextType = {
  token: string | null;
  role: string | null;
  login: (token: string, role?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

const decodeRole = (token: string): string => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role || "STAFF";
  } catch {
    return "STAFF";
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const storedToken = localStorage.getItem("token");
  const storedRole = localStorage.getItem("role");

  const [token, setToken] = useState<string | null>(storedToken);
  const [role, setRole] = useState<string | null>(storedRole);

  const login = (newToken: string, explicitRole?: string) => {
    const resolvedRole = explicitRole ?? (newToken === "mock-token" ? "STAFF" : decodeRole(newToken));
    localStorage.setItem("token", newToken);
    localStorage.setItem("role", resolvedRole);
    setToken(newToken);
    setRole(resolvedRole);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setToken(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ token, role, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
