import { ArrowLeft, CarFront, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ErrorState } from "../../components/ErrorState";
import { useAuth } from "./authStore";
import { isSupabaseConfigured, supabaseConfigError } from "../../lib/supabase";
import { signupSchema } from "../../lib/validators";

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50 via-slate-50 to-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to RentyCar
        </Link>

        <Link to="/" className="mb-8 flex items-center justify-center gap-2 text-xl font-bold text-slate-950">
          <span className="rounded-lg bg-indigo-700 p-2 text-white">
            <CarFront className="h-5 w-5" aria-hidden="true" />
          </span>
          RentyCar
        </Link>

        <form className="panel space-y-6 p-6 sm:p-8" onSubmit={handleSubmit}>
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-slate-950">Create account</h1>
            <p className="mt-2 text-sm text-slate-500">
              Use an invite code. RentyCar only needs a username, nickname, and password.
            </p>
          </div>

          {!isSupabaseConfigured ? (
            <ErrorState title="Supabase is not configured" message={supabaseConfigError} />
          ) : null}

          {formError ? <ErrorState title="Signup failed" message={formError} /> : null}

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
            RentyCar does not collect email addresses or recovery details. If a password is forgotten, there is
            currently no way to reset it.
          </div>

          <label className="block space-y-1.5">
            <span className="label">Username</span>
            <input
              className="input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoCorrect="off"
            />
            {errors.username ? <span className="text-xs text-red-700">{errors.username}</span> : null}
          </label>

          <label className="block space-y-1.5">
            <span className="label">Nickname</span>
            <input
              className="input"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              autoCorrect="off"
            />
            {errors.nickname ? <span className="text-xs text-red-700">{errors.nickname}</span> : null}
          </label>

          <label className="block space-y-1.5">
            <span className="label">Password</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />
            {errors.password ? <span className="text-xs text-red-700">{errors.password}</span> : null}
          </label>

          <label className="block space-y-1.5">
            <span className="label">Invite code</span>
            <input
              className="input"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              autoCorrect="off"
              autoCapitalize="characters"
            />
            {errors.inviteCode ? <span className="text-xs text-red-700">{errors.inviteCode}</span> : null}
          </label>

          <button
            className="button-primary w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
            type="submit"
            disabled={submitting}
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {submitting ? "Creating account" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-indigo-700 hover:text-indigo-800">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
