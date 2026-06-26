import { createBrowserRouter } from "react-router-dom";
import { AdminRoute } from "../components/AdminRoute";
import { AppShell } from "../components/AppShell";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AdminPage } from "../features/admin/AdminPage";
import { LoginPage } from "../features/auth/LoginPage";
import { SignupPage } from "../features/auth/SignupPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { FriendsPage } from "../features/dashboard/FriendsPage";
import { StampsPage } from "../features/dashboard/StampsPage";
import { SubmitReportForm } from "../features/dashboard/SubmitReportForm";
import { AboutPage } from "../features/public/AboutPage";
import { HomePage } from "../features/public/HomePage";
import { LegalPage } from "../features/public/LegalPage";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: (
        <AppShell variant="light">
          <HomePage />
        </AppShell>
      ),
    },
    {
      path: "/about",
      element: (
        <AppShell>
          <AboutPage />
        </AppShell>
      ),
    },
    {
      path: "/legal",
      element: (
        <AppShell>
          <LegalPage />
        </AppShell>
      ),
    },
    {
      path: "/login",
      element: <LoginPage />,
    },
    {
      path: "/signup",
      element: <SignupPage />,
    },
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
            <div className="mx-auto max-w-4xl">
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
  ],
  { basename: "/rentycar" },
);
