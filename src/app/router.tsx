import { createBrowserRouter } from "react-router-dom";
import { AdminRoute } from "../components/AdminRoute";
import { AppShell } from "../components/AppShell";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AdminPage } from "../features/admin/AdminPage";
import { LoginPage } from "../features/auth/LoginPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { SubmitReportForm } from "../features/dashboard/SubmitReportForm";
import { AboutPage } from "../features/public/AboutPage";
import { HomePage } from "../features/public/HomePage";
import { LegalPage } from "../features/public/LegalPage";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: (
        <AppShell>
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
