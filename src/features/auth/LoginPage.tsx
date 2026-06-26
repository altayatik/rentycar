import { ArrowLeft, LogIn } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ErrorState } from "../../components/ErrorState";
import { useAuth } from "./authStore";
import { isSupabaseConfigured, supabaseConfigError } from "../../lib/supabase";
import { loginSchema } from "../../lib/validators";
import logo from "../../assets/logo.png";

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
    <div className="night-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition hover:text-teal-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to RentyCar
        </Link>

        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5 font-display text-xl font-bold text-white">
          <img src={logo} alt="RentyCar" className="h-12 w-12 rounded-2xl shadow-glass" />
          RentyCar
        </Link>

        <form className="glass-panel space-y-6 p-6 sm:p-8" onSubmit={handleSubmit}>
          <div className="text-center">
            <h1 className="font-display text-2xl font-semibold text-white">Sign in</h1>
            <p className="mt-2 text-sm text-slate-400">
              Use your RentyCar account, or create one with an invite code.
            </p>
          </div>

          {!isSupabaseConfigured ? (
            <ErrorState title="Supabase is not configured" message={supabaseConfigError} tone="dark" />
          ) : null}

          {formError ? <ErrorState title="Login failed" message={formError} tone="dark" /> : null}

          <label className="block space-y-1.5">
            <span className="glass-label">Username</span>
            <input
              className="glass-input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
            {errors.username ? <span className="text-xs text-red-400">{errors.username}</span> : null}
          </label>

          <label className="block space-y-1.5">
            <span className="glass-label">Password</span>
            <input
              className="glass-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
            {errors.password ? <span className="text-xs text-red-400">{errors.password}</span> : null}
          </label>

          <button
            className="glass-button-primary w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
            type="submit"
            disabled={submitting}
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {submitting ? "Signing in" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">
          Have an invite code?{" "}
          <Link to="/signup" className="font-semibold text-teal-300 hover:text-teal-200">
            Create an account
          </Link>
        </p>
        <p className="mt-4 text-center text-xs leading-5 text-slate-500">
          RentyCar is independent and not affiliated with rental car companies, airports, automakers,
          or travel providers.
        </p>
      </div>
    </div>
  );
}
