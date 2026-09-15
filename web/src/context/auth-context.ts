import { createContext } from "react";

export interface AuthState {
  user: { username: string; role: string | null } | null;
  allowedCameras: string[];
  isLoading: boolean;
  isAuthenticated: boolean; // true if auth is required
}

interface AuthContextType {
  auth: AuthState;
  login: (user: AuthState["user"]) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  auth: {
    user: null,
    allowedCameras: [],
    isLoading: true,
    isAuthenticated: false,
  },
  login: () => {},
  logout: () => {},
});
