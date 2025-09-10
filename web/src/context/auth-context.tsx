import axios from "axios";
import { createContext, useEffect, useState } from "react";
import useSWR from "swr";

interface AuthState {
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    allowedCameras: [],
    isLoading: true,
    isAuthenticated: false,
  });

  const { data: profile, error } = useSWR("/profile", {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    fetcher: (url) =>
      axios.get(url, { withCredentials: true }).then((res) => res.data),
  });

  useEffect(() => {
    if (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        // auth required but not logged in
        setAuth({
          user: null,
          allowedCameras: [],
          isLoading: false,
          isAuthenticated: true,
        });
      }
      return;
    }

    if (profile) {
      if (profile.username && profile.username !== "anonymous") {
        const newUser = {
          username: profile.username,
          role: profile.role || "viewer",
        };

        const allowedCameras = Array.isArray(profile.allowed_cameras)
          ? profile.allowed_cameras
          : [];
        setAuth({
          user: newUser,
          allowedCameras,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        // Unauthenticated mode (anonymous)
        setAuth({
          user: null,
          allowedCameras: [],
          isLoading: false,
          isAuthenticated: false,
        });
      }
    }
  }, [profile, error]);

  const login = (user: AuthState["user"]) => {
    setAuth((current) => ({
      ...current,
      user,
      isLoading: false,
      isAuthenticated: true,
    }));
  };

  const logout = () => {
    setAuth({
      user: null,
      allowedCameras: [],
      isLoading: false,
      isAuthenticated: true,
    });
    axios.get("/logout", { withCredentials: true });
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
