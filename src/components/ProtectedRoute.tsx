import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/authStore";
import { isSupabaseConfigured, supabaseConfigError } from "../lib/supabase";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <ErrorState
          title="Supabase is not configured"
          message={supabaseConfigError}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <LoadingState label="Checking session" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
