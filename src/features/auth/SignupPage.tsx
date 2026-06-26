import { ArrowLeft, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ErrorState } from "../../components/ErrorState";
import { useAuth } from "./authStore";
import { isSupabaseConfigured, supabaseConfigError } from "../../lib/supabase";
import { signupSchema } from "../../lib/validators";
import logo from "../../assets/logo.png";

type SignupErrors = Partial<Record<"username" | "nickname" | "password" | "inviteCode", string>>;

export function SignupPage() {
  const { user, signUp } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [errors, setErrors] = useState<SignupErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    setErrors({});

    const result = signupSchema.safeParse({ username, nickname, password, inviteCode });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        username: fieldErrors.username?.[0],
        nickname: fieldErrors.nickname?.[0],
        password: fieldErrors.password?.[0],
        inviteCode: fieldErrors.inviteCode?.[0],
      });
      return;
    }

    setSubmitting(true);
    try {
      await signUp({
        username: result.data.username,
        nickname: result.data.nickname,
        password: result.data.password,
        inviteCode: result.data.inviteCode,
      });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to create account.");
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
            <h1 className="font-display text-2xl font-semibold text-white">Create account</h1>
            <p className="mt-2 text-sm text-slate-400">
              Use an invite code. RentyCar only needs a username, nickname, and password.
            </p>
          </div>

          {!isSupabaseConfigured ? (
            <ErrorState title="Supabase is not configured" message={supabaseConfigError} tone="dark" />
          ) : null}

          {formError ? <ErrorState title="Signup failed" message={formError} tone="dark" /> : null}

          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm leading-6 text-amber-200">
            RentyCar does not collect email addresses or recovery details. If a password is forgotten, there is
            currently no way to reset it.
          </div>

          <label className="block space-y-1.5">
            <span className="glass-label">Username</span>
            <input
              className="glass-input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoCorrect="off"
            />
            {errors.username ? <span className="text-xs text-red-400">{errors.username}</span> : null}
          </label>

          <label className="block space-y-1.5">
            <span className="glass-label">Nickname</span>
            <input
              className="glass-input"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              autoCorrect="off"
            />
            {errors.nickname ? <span className="text-xs text-red-400">{errors.nickname}</span> : null}
          </label>

          <label className="block space-y-1.5">
            <span className="glass-label">Password</span>
            <input
              className="glass-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />
            {errors.password ? <span className="text-xs text-red-400">{errors.password}</span> : null}
          </label>

          <label className="block space-y-1.5">
            <span className="glass-label">Invite code</span>
            <input
              className="glass-input"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              autoCorrect="off"
              autoCapitalize="characters"
            />
            {errors.inviteCode ? <span className="text-xs text-red-400">{errors.inviteCode}</span> : null}
          </label>

          <button
            className="glass-button-primary w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
            type="submit"
            disabled={submitting}
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {submitting ? "Creating account" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-teal-300 hover:text-teal-200">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
