import { useContext } from "react";
import { AuthContext } from "@/context/auth-context";

export function useIsCustomRole() {
  const { auth } = useContext(AuthContext);
  return !(
    auth.user?.role === "admin" ||
    auth.user?.role == "viewer" ||
    !auth.isAuthenticated
  );
}
