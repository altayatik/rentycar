import { CheckCircle2, KeyRound, Mail } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Callout, ErrorState, Field, TextInput } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { newPasswordSchema, resetRequestSchema } from "../../lib/validators";
import { AuthLayout } from "./AuthLayout";
import { useAuth } from "./authStore";

/* -------------------------- Request a reset link ------------------------- */

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setFieldError("");

    const result = resetRequestSchema.safeParse({ email });
    if (!result.success) {
      setFieldError(result.error.flatten().fieldErrors.email?.[0] ?? "Enter a valid email");
      return;
    }

    setSubmitting(true);
    try {
      await requestPasswordReset(result.data.email);
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send the reset email.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll email you a link to set a new one."
      footer={
        <p className="muted">
          Remembered it?{" "}
          <Link to="/login" className="font-bold" style={{ color: "var(--sky)" }}>
            Back to sign in
          </Link>
        </p>
      }
    >
      {sent ? (
        <div className="animate-pop space-y-5 text-center">
          <span
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "var(--mint-tint)", color: "var(--forest)" }}
          >
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </span>
          <div>
            <p className="h3">Check your inbox</p>
            <p className="muted mt-2 text-sm leading-relaxed">
              If an account exists for <strong className="text-ink">{email}</strong>, a reset link is on
              its way. It expires in an hour.
            </p>
          </div>
          <Link to="/login" className="btn btn-secondary w-full">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          {error ? <ErrorState title="Could not send reset email" message={error} /> : null}

          <Callout tone="gold" title="Email accounts only">
            Password reset needs an email address on the account. If you signed up without one, an admin
            has to reset it for you.
          </Callout>

          <Field label="Email address" error={fieldError} required>
            {(id) => (
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4"
                  aria-hidden="true"
                />
                <TextInput
                  id={id}
                  type="email"
                  className="pl-10"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  invalid={Boolean(fieldError)}
                  required
                />
              </div>
            )}
          </Field>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            loading={submitting}
            icon={<Mail className="h-4 w-4" />}
            sheen
          >
            {submitting ? "Sending" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

/* ---------------------- Set a new password from a link -------------------- */

export function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Supabase puts the recovery token in the URL fragment and exchanges it
  // for a session automatically (requires detectSessionInUrl: true).
  // Wait for that before enabling the form.
  useEffect(() => {
    if (!supabase) return;

    // Supabase reports expired/invalid links via the fragment rather than
    // by failing the exchange, so read that first.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const linkError = hash.get("error_description") ?? hash.get("error");
    if (linkError) {
      setError(
        `${linkError.replace(/\+/g, " ")}. Reset links expire after an hour — request a fresh one.`,
      );
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setErrors({});

    const result = newPasswordSchema.safeParse({ password, confirm });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({ password: fieldErrors.password?.[0], confirm: fieldErrors.confirm?.[0] });
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(result.data.password);
      setDone(true);
      window.setTimeout(() => navigate("/dashboard", { replace: true }), 1600);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update your password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Choose a new password" subtitle="Make it one you'll actually remember.">
      {done ? (
        <div className="animate-pop space-y-4 text-center">
          <span
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "var(--mint-tint)", color: "var(--forest)" }}
          >
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="h3">Password updated</p>
          <p className="muted text-sm">Taking you to your dashboard…</p>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          {error ? <ErrorState title="Could not update password" message={error} /> : null}

          {!ready ? (
            <Callout tone="gold" title="Waiting for your reset link">
              Open this page from the link in your reset email. If you got here another way, request a
              new link.
            </Callout>
          ) : null}

          <Field label="New password" error={errors.password} required>
            {(id) => (
              <TextInput
                id={id}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                invalid={Boolean(errors.password)}
                required
              />
            )}
          </Field>

          <Field label="Confirm new password" error={errors.confirm} required>
            {(id) => (
              <TextInput
                id={id}
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="new-password"
                invalid={Boolean(errors.confirm)}
                required
              />
            )}
          </Field>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            loading={submitting}
            disabled={!ready}
            icon={<KeyRound className="h-4 w-4" />}
            sheen
          >
            {submitting ? "Updating" : "Update password"}
          </Button>

          <p className="hint text-center">
            <Link to="/forgot-password" className="font-semibold underline">
              Request a new link
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
