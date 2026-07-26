import { createBrowserRouter, Navigate } from "react-router-dom";
import { AdminRoute } from "../components/AdminRoute";
import { AppShell } from "../components/AppShell";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AdminPage } from "../features/admin/AdminPage";
import { LoginPage } from "../features/auth/LoginPage";
import { ForgotPasswordPage, ResetPasswordPage } from "../features/auth/PasswordResetPages";
import { SignupPage } from "../features/auth/SignupPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { FriendsPage } from "../features/dashboard/FriendsPage";
import { StampsPage } from "../features/dashboard/StampsPage";
import { SubmitReportForm } from "../features/dashboard/SubmitReportForm";
import { AboutPage } from "../features/public/AboutPage";
import { HomePage } from "../features/public/HomePage";
import { NotFoundPage } from "../features/public/NotFoundPage";

export const router = createBrowserRouter(
  [
    { path: "/", element: <AppShell><HomePage /></AppShell> },
    { path: "/about", element: <AppShell><AboutPage /></AppShell> },
    // Legal now lives at the bottom of About. Keep the old URL working.
    { path: "/legal", element: <Navigate to="/about#legal" replace /> },

    { path: "/login", element: <LoginPage /> },
    { path: "/signup", element: <SignupPage /> },
    { path: "/forgot-password", element: <ForgotPasswordPage /> },
    { path: "/reset-password", element: <ResetPasswordPage /> },

    {
      path: "/dashboard",
      element: (
        <ProtectedRoute>
          <AppShell>
            <DashboardPage />
          </AppShell>
        </ProtectedRoute>
      ),
    },
    {
      path: "/friends",
      element: (
        <ProtectedRoute>
          <AppShell>
            <FriendsPage />
          </AppShell>
        </ProtectedRoute>
      ),
    },
    {
      path: "/stamps",
      element: (
        <ProtectedRoute>
          <AppShell>
            <StampsPage />
          </AppShell>
        </ProtectedRoute>
      ),
    },
    {
      path: "/submit",
      element: (
        <ProtectedRoute>
          <AppShell>
            <div className="mx-auto max-w-3xl">
              <SubmitReportForm />
            </div>
          </AppShell>
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin",
      element: (
        <AdminRoute>
          <AppShell>
            <AdminPage />
          </AppShell>
        </AdminRoute>
      ),
    },

    { path: "*", element: <AppShell><NotFoundPage /></AppShell> },
  ],
  { basename: "/rentycar" },
);
