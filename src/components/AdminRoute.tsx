import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../features/auth/authStore";
import { BootScreen, ProtectedRoute } from "./ProtectedRoute";
import { LoadingState } from "./ui";

export function AdminRoute({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();

  return (
    <ProtectedRoute>
      {loading || !profile ? (
        <BootScreen>
          <LoadingState label="Checking admin access" rows={2} />
        </BootScreen>
      ) : profile.role === "admin" ? (
        <>{children}</>
      ) : (
        <Navigate to="/dashboard" replace />
      )}
    </ProtectedRoute>
  );
}
