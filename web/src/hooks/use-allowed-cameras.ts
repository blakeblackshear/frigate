import { useContext } from "react";
import { AuthContext } from "@/context/auth-context";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { isReplayCamera } from "@/utils/cameraUtil";

export function useAllowedCameras() {
  const { auth } = useContext(AuthContext);
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  if (
    auth.user?.role === "viewer" ||
    auth.user?.role === "admin" ||
    !auth.isAuthenticated // anonymous internal port
  ) {
    // return all cameras, excluding replay cameras
    return config?.cameras
      ? Object.keys(config.cameras).filter((name) => !isReplayCamera(name))
      : [];
  }

  return (auth.allowedCameras || []).filter((name) => !isReplayCamera(name));
}
