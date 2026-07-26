import { Eye, EyeOff, LogIn } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button, Callout, ErrorState, Field, TextInput } from "../../components/ui";
import { isSupabaseConfigured, supabaseConfigError } from "../../lib/supabase";
import { loginSchema } from "../../lib/validators";
import { AuthLayout } from "./AuthLayout";
import { NeedsEmailLoginError, useAuth } from "./authStore";

type LoginErrors = Partial<Record<"identifier" | "password", string>>;

export function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState("");
  const [needsEmail, setNeedsEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/dashboard";

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    setNeedsEmail(false);
    setErrors({});

    const result = loginSchema.safeParse({ identifier, password });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        identifier: fieldErrors.identifier?.[0],
        password: fieldErrors.password?.[0],
      });
      return;
    }

    setSubmitting(true);
    try {
      await signIn(result.data.identifier, result.data.password);
      navigate(from, { replace: true });
    } catch (error) {
      if (error instanceof NeedsEmailLoginError) {
        setNeedsEmail(true);
      } else {
        setFormError(error instanceof Error ? error.message : "Unable to sign in.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to log sightings and collect airport stamps."
      footer={
        <p className="muted">
          New here?{" "}
          <Link to="/signup" className="font-bold" style={{ color: "var(--sky)" }}>
            Create a free account
          </Link>
        </p>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {!isSupabaseConfigured ? (
          <ErrorState title="Supabase is not configured" message={supabaseConfigError} />
        ) : null}

        {formError ? <ErrorState title="Sign-in failed" message={formError} /> : null}

        {needsEmail ? (
          <Callout tone="sky" title="Use your email address">
            This account was created with an email, so sign in with the email instead of the username.
          </Callout>
        ) : null}

        <Field label="Username or email" error={errors.identifier}>
          {(id) => (
            <TextInput
              id={id}
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              autoComplete="username"
              autoCorrect="off"
              autoCapitalize="off"
              placeholder="yourname"
              invalid={Boolean(errors.identifier)}
              required
            />
          )}
        </Field>

        <Field label="Password" error={errors.password}>
          {(id) => (
            <div className="relative">
              <TextInput
                id={id}
                type={showPassword ? "text" : "password"}
                className="pr-11"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                invalid={Boolean(errors.password)}
                required
              />
              <button
                type="button"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-2 transition-colors hover:bg-[#4a382214]"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-ink-3" />
                ) : (
                  <Eye className="h-4 w-4 text-ink-3" />
                )}
              </button>
            </div>
          )}
        </Field>

        <div className="flex justify-end">
          <Link to="/forgot-password" className="hint font-semibold hover:text-ink">
            Forgot your password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          loading={submitting}
          icon={<LogIn className="h-4 w-4" />}
          sheen
        >
          {submitting ? "Signing in" : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
