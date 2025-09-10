import { useContext } from "react";
import { AuthContext } from "@/context/auth-context";

export function useAllowedCameras() {
  const { auth } = useContext(AuthContext);
  return auth.allowedCameras;
}
