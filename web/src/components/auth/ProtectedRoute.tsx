import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "@/context/auth-context";
import ActivityIndicator from "../indicators/activity-indicator";
import { useConfigValidator } from "@/hooks/use-config-validator";

interface ProtectedRouteProps {
  requiredRoles: ("admin" | "viewer")[];
  configGuard?: boolean;
}

export default function ProtectedRoute({
  requiredRoles,
  configGuard = true,
}: ProtectedRouteProps) {
  const { auth } = useContext(AuthContext);
  const invalidConfig = useConfigValidator(); // Use the hook to check config validity

  if (auth.isLoading) {
    return (
      <ActivityIndicator className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
    );
  }

  if (!auth.isAuthenticated) {
    return <Outlet />;
  }

  if (!auth.user) {
    return <Navigate to="/login" replace />;
  }

  if (auth.user.role === null) {
    return <Outlet />;
  }

  if (!requiredRoles.includes(auth.user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (configGuard && invalidConfig) {
    return <Navigate to="/config" replace />;
  }

  return <Outlet />;
}
