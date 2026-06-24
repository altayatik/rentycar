import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../features/auth/authStore";
import { LoadingState } from "./LoadingState";
import { ProtectedRoute } from "./ProtectedRoute";

interface AdminRouteProps {
  children: ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { profile, loading } = useAuth();

  return (
    <ProtectedRoute>
      {loading ? (
        <LoadingState label="Checking admin access" />
      ) : profile?.role === "admin" ? (
        children
      ) : (
        <Navigate to="/dashboard" replace />
      )}
    </ProtectedRoute>
  );
}
