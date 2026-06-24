import { ArrowLeft, CarFront, LogIn } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ErrorState } from "../../components/ErrorState";
import { useAuth } from "./authStore";
import { isSupabaseConfigured, supabaseConfigError } from "../../lib/supabase";
import { loginSchema } from "../../lib/validators";

type LoginErrors = Partial<Record<"username" | "password", string>>;

export function LoginPage() {
  const { user, signIn } = useAuth();
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-teal-50 via-slate-50 to-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to RentyCar
        </Link>

        <Link to="/" className="mb-8 flex items-center justify-center gap-2 text-xl font-bold text-slate-950">
          <span className="rounded-lg bg-teal-700 p-2 text-white">
            <CarFront className="h-5 w-5" aria-hidden="true" />
          </span>
          RentyCar
        </Link>

        <form className="panel space-y-6 p-6 sm:p-8" onSubmit={handleSubmit}>
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-slate-950">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-500">Sign in with your assigned RentyCar username.</p>
          </div>

          {!isSupabaseConfigured ? (
            <ErrorState
              title="Supabase is not configured"
              message={supabaseConfigError}
            />
          ) : null}

          {formError ? <ErrorState title="Login failed" message={formError} /> : null}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
            Accounts are manually created during early testing. Public sign-up is not available yet.
          </div>

          <label className="block space-y-1.5">
            <span className="label">Username</span>
            <input
              className="input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
            {errors.username ? <span className="text-xs text-red-700">{errors.username}</span> : null}
          </label>

          <label className="block space-y-1.5">
            <span className="label">Password</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
            {errors.password ? <span className="text-xs text-red-700">{errors.password}</span> : null}
          </label>

          <button
            className="button-primary w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            type="submit"
            disabled={submitting}
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {submitting ? "Signing in" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          RentyCar is independent and not affiliated with rental car companies, airports, automakers,
          or travel providers.
        </p>
      </div>
    </div>
  );
}
