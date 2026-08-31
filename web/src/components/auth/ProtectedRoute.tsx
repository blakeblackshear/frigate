import { useContext, useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "@/context/auth-context";
import ActivityIndicator from "../indicators/activity-indicator";
import { isRedirectingToLogin, redirectToLogin } from "@/api/auth-redirect";

export default function ProtectedRoute({
  requiredRoles,
}: {
  requiredRoles?: string[];
}) {
  const { auth } = useContext(AuthContext);

  // Redirect to the login page when not authenticated. This uses
  // client-side navigation so an installed PWA stays inside its own
  // window. State is reset after a successful login instead of through
  // a full page load (see resetAppState).
  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated && !auth.user) {
      redirectToLogin();
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.user]);

  // Show loading indicator during redirect to prevent React from attempting to render
  // lazy components, which would cause error #426 (suspension during synchronous navigation)
  if (isRedirectingToLogin()) {
    return (
      <ActivityIndicator className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
    );
  }

  // Wait for config to provide required roles
  if (!requiredRoles) {
    return (
      <ActivityIndicator className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
    );
  }

  if (auth.isLoading) {
    return (
      <ActivityIndicator className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
    );
  }

  // Unauthenticated mode
  if (!auth.isAuthenticated) {
    return <Outlet />;
  }

  // Authenticated mode (external port): require login
  if (!auth.user) {
    return (
      <ActivityIndicator className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
    );
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
