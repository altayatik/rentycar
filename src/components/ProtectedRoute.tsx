import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/authStore";
import { isSupabaseConfigured, supabaseConfigError } from "../lib/supabase";
import { BackgroundArt } from "./BackgroundArt";
import { ErrorState, LoadingState } from "./ui";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (!isSupabaseConfigured) {
    return (
      <BootScreen>
        <ErrorState title="Supabase is not configured" message={supabaseConfigError} />
      </BootScreen>
    );
  }

  if (loading) {
    return (
      <BootScreen>
        <LoadingState label="Checking your session" rows={2} />
      </BootScreen>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export function BootScreen({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-6">
      <BackgroundArt />
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
