import { useConfigValidator } from "@/hooks/use-config-validator";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function ConfigProtection() {
  const invalidConfig = useConfigValidator();
  const location = useLocation();
  if (invalidConfig && location.pathname !== "/config") {
    return <Navigate to="/config" replace />;
  }
  return <Outlet />;
}
