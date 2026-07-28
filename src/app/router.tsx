import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AdminRoute } from "../components/AdminRoute";
import { AppShell } from "../components/AppShell";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { getAppBasePath } from "../lib/basePath";

const HomePage = lazy(() => import("../features/public/HomePage").then((module) => ({ default: module.HomePage })));
const AboutPage = lazy(() => import("../features/public/AboutPage").then((module) => ({ default: module.AboutPage })));
const NotFoundPage = lazy(() =>
  import("../features/public/NotFoundPage").then((module) => ({ default: module.NotFoundPage })),
);
const LoginPage = lazy(() => import("../features/auth/LoginPage").then((module) => ({ default: module.LoginPage })));
const SignupPage = lazy(() => import("../features/auth/SignupPage").then((module) => ({ default: module.SignupPage })));
const ForgotPasswordPage = lazy(() =>
  import("../features/auth/PasswordResetPages").then((module) => ({ default: module.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import("../features/auth/PasswordResetPages").then((module) => ({ default: module.ResetPasswordPage })),
);
const AccountPage = lazy(() =>
  import("../features/dashboard/AccountPage").then((module) => ({ default: module.AccountPage })),
);
const DashboardPage = lazy(() =>
  import("../features/dashboard/DashboardPage").then((module) => ({ default: module.DashboardPage })),
);
const FriendsPage = lazy(() =>
  import("../features/dashboard/FriendsPage").then((module) => ({ default: module.FriendsPage })),
);
const StampsPage = lazy(() =>
  import("../features/dashboard/StampsPage").then((module) => ({ default: module.StampsPage })),
);
const SubmitReportForm = lazy(() =>
  import("../features/dashboard/SubmitReportForm").then((module) => ({ default: module.SubmitReportForm })),
);
const AdminPage = lazy(() => import("../features/admin/AdminPage").then((module) => ({ default: module.AdminPage })));

function deferred(element: ReactNode) {
  return (
    <Suspense
      fallback={
        <div className="route-loading" role="status" aria-label="Loading page">
          <span />
        </div>
      }
    >
      {element}
    </Suspense>
  );
}

export const router = createBrowserRouter(
  [
    { path: "/", element: <AppShell>{deferred(<HomePage />)}</AppShell> },
    { path: "/search", element: <AppShell wide>{deferred(<HomePage view="search" />)}</AppShell> },
    { path: "/about", element: <AppShell>{deferred(<AboutPage />)}</AppShell> },
    // Legal now lives at the bottom of About. Keep the old URL working.
    { path: "/legal", element: <Navigate to="/about#legal" replace /> },

    { path: "/login", element: deferred(<LoginPage />) },
    { path: "/signup", element: deferred(<SignupPage />) },
    { path: "/forgot-password", element: deferred(<ForgotPasswordPage />) },
    { path: "/reset-password", element: deferred(<ResetPasswordPage />) },

    {
      path: "/account",
      element: (
        <ProtectedRoute>
          <AppShell>
            {deferred(<AccountPage />)}
          </AppShell>
        </ProtectedRoute>
      ),
    },
    {
      path: "/dashboard",
      element: (
        <ProtectedRoute>
          <AppShell>
            {deferred(<DashboardPage />)}
          </AppShell>
        </ProtectedRoute>
      ),
    },
    {
      path: "/friends",
      element: (
        <ProtectedRoute>
          <AppShell>
            {deferred(<FriendsPage />)}
          </AppShell>
        </ProtectedRoute>
      ),
    },
    {
      path: "/stamps",
      element: (
        <ProtectedRoute>
          <AppShell>
            {deferred(<StampsPage />)}
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
              {deferred(<SubmitReportForm />)}
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
            {deferred(<AdminPage />)}
          </AppShell>
        </AdminRoute>
      ),
    },

    { path: "*", element: <AppShell>{deferred(<NotFoundPage />)}</AppShell> },
  ],
  { basename: getAppBasePath() },
);
