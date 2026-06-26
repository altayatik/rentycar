import { ArrowLeft, LogIn } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ErrorState } from "../../components/ErrorState";
import { useAuth } from "./authStore";
import { isSupabaseConfigured, supabaseConfigError } from "../../lib/supabase";
import { loginSchema } from "../../lib/validators";
import logo from "../../assets/logo.png";
import { useTheme } from "../theme/themeStore";

type LoginErrors = Partial<Record<"username" | "password", string>>;

export function LoginPage() {
  const { user, signIn } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/dashboard";

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    setErrors({});

    const result = loginSchema.safeParse({ username, password });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        username: fieldErrors.username?.[0],
        password: fieldErrors.password?.[0],
      });
      return;
    }

    setSubmitting(true);
    try {
      await signIn(result.data.username, result.data.password);
      navigate(from, { replace: true });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`flex min-h-screen items-center justify-center px-4 py-10 ${
        isDark ? "night-shell" : "bg-slate-50"
      }`}
    >
      <div className="w-full max-w-md">
        <Link
          to="/"
          className={`mb-6 inline-flex items-center gap-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
            isDark
              ? "text-slate-400 hover:text-teal-300 focus-visible:outline-teal-400"
              : "text-slate-500 hover:text-indigo-700 focus-visible:outline-indigo-700"
          }`}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to RentyCar
        </Link>

        <Link
          to="/"
          className={`mb-8 flex items-center justify-center gap-2.5 text-xl font-bold ${
            isDark ? "font-display text-white" : "text-slate-950"
          }`}
        >
          <img
            src={logo}
            alt="RentyCar"
            className={`h-12 w-12 rounded-2xl ${isDark ? "shadow-glass" : "shadow-md"}`}
          />
          RentyCar
        </Link>

        <form className={isDark ? "glass-panel space-y-6 p-6 sm:p-8" : "panel space-y-6 p-6 sm:p-8"} onSubmit={handleSubmit}>
          <div className="text-center">
            <h1 className={`text-2xl font-semibold ${isDark ? "font-display text-white" : "text-slate-950"}`}>
              Sign in
            </h1>
            <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Use your RentyCar account, or create one with an invite code.
            </p>
          </div>

          {!isSupabaseConfigured ? (
            <ErrorState title="Supabase is not configured" message={supabaseConfigError} tone={isDark ? "dark" : "light"} />
          ) : null}

          {formError ? <ErrorState title="Login failed" message={formError} tone={isDark ? "dark" : "light"} /> : null}

          <label className="block space-y-1.5">
            <span className={isDark ? "glass-label" : "label"}>Username</span>
            <input
              className={isDark ? "glass-input" : "input"}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
            {errors.username ? <span className="text-xs text-red-400">{errors.username}</span> : null}
          </label>

          <label className="block space-y-1.5">
            <span className={isDark ? "glass-label" : "label"}>Password</span>
            <input
              className={isDark ? "glass-input" : "input"}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
            {errors.password ? <span className="text-xs text-red-400">{errors.password}</span> : null}
          </label>

          <button
            className={`${
              isDark ? "glass-button-primary" : "button-primary"
            } w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
              isDark ? "focus-visible:outline-teal-400" : "focus-visible:outline-indigo-700"
            }`}
            type="submit"
            disabled={submitting}
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {submitting ? "Signing in" : "Sign in"}
          </button>
        </form>
        <p className={`mt-6 text-center text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Have an invite code?{" "}
          <Link
            to="/signup"
            className={`font-semibold ${isDark ? "text-teal-300 hover:text-teal-200" : "text-indigo-700 hover:text-indigo-800"}`}
          >
            Create an account
          </Link>
        </p>
        <p className={`mt-4 text-center text-xs leading-5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
          RentyCar is independent and not affiliated with rental car companies, airports, automakers,
          or travel providers.
        </p>
      </div>
    </div>
  );
}
