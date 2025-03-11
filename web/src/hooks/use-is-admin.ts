import { useContext } from "react";
import { AuthContext } from "@/context/auth-context";

export function useIsAdmin() {
  const { auth } = useContext(AuthContext);
  const isAdmin =
    (auth.isAuthenticated && auth.user?.role === "admin") ||
    auth.user?.role === undefined;
  return isAdmin;
}
