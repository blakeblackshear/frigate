import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "@/context/auth-context";
import ActivityIndicator from "../indicators/activity-indicator";

export default function ProtectedRoute({
  requiredRoles,
}: {
  requiredRoles: ("admin" | "viewer")[];
}) {
  const { auth } = useContext(AuthContext);

  if (auth.isLoading) {
    return (
      <ActivityIndicator className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
    );
  }

  // Unauthenticated mode
  if (!auth.isAuthenticated) {
    return <Outlet />;
  }

  // Authenticated mode (8971): require login
  if (!auth.user) {
    return <Navigate to="/login" replace />;
  }

  // If role is null (shouldn’t happen if isAuthenticated, but type safety), fallback
  // though isAuthenticated should catch this
  if (auth.user.role === null) {
    return <Outlet />;
  }

  if (!requiredRoles.includes(auth.user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
