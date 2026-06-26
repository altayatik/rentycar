import { ArrowLeft, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ErrorState } from "../../components/ErrorState";
import { useAuth } from "./authStore";
import { isSupabaseConfigured, supabaseConfigError } from "../../lib/supabase";
import { signupSchema } from "../../lib/validators";
import logo from "../../assets/logo.png";
import { useTheme } from "../theme/themeStore";

type SignupErrors = Partial<Record<"username" | "nickname" | "password" | "inviteCode", string>>;

export function SignupPage() {
  const { user, signUp } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
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
              Create account
            </h1>
            <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Use an invite code. RentyCar only needs a username, nickname, and password.
            </p>
          </div>

          {!isSupabaseConfigured ? (
            <ErrorState title="Supabase is not configured" message={supabaseConfigError} tone={isDark ? "dark" : "light"} />
          ) : null}

          {formError ? <ErrorState title="Signup failed" message={formError} tone={isDark ? "dark" : "light"} /> : null}

          <div
            className={`rounded-2xl border p-3 text-sm leading-6 ${
              isDark ? "border-amber-400/20 bg-amber-400/10 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            RentyCar does not collect email addresses or recovery details. If a password is forgotten, there is
            currently no way to reset it.
          </div>

          <label className="block space-y-1.5">
            <span className={isDark ? "glass-label" : "label"}>Username</span>
            <input
              className={isDark ? "glass-input" : "input"}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoCorrect="off"
            />
            {errors.username ? <span className="text-xs text-red-400">{errors.username}</span> : null}
          </label>

          <label className="block space-y-1.5">
            <span className={isDark ? "glass-label" : "label"}>Nickname</span>
            <input
              className={isDark ? "glass-input" : "input"}
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              autoCorrect="off"
            />
            {errors.nickname ? <span className="text-xs text-red-400">{errors.nickname}</span> : null}
          </label>

          <label className="block space-y-1.5">
            <span className={isDark ? "glass-label" : "label"}>Password</span>
            <input
              className={isDark ? "glass-input" : "input"}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />
            {errors.password ? <span className="text-xs text-red-400">{errors.password}</span> : null}
          </label>

          <label className="block space-y-1.5">
            <span className={isDark ? "glass-label" : "label"}>Invite code</span>
            <input
              className={isDark ? "glass-input" : "input"}
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              autoCorrect="off"
              autoCapitalize="characters"
            />
            {errors.inviteCode ? <span className="text-xs text-red-400">{errors.inviteCode}</span> : null}
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
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {submitting ? "Creating account" : "Create account"}
          </button>
        </form>

        <p className={`mt-6 text-center text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Already have an account?{" "}
          <Link
            to="/login"
            className={`font-semibold ${isDark ? "text-teal-300 hover:text-teal-200" : "text-indigo-700 hover:text-indigo-800"}`}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
