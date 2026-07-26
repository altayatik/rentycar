import {
  BadgeCheck,
  ChevronDown,
  Eye,
  EyeOff,
  Mail,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { FormEvent, type ReactNode, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button, Callout, Card, ErrorState, Field, TextInput, cx } from "../../components/ui";
import { isSupabaseConfigured, supabaseConfigError } from "../../lib/supabase";
import { signupSchema } from "../../lib/validators";
import { AuthLayout } from "./AuthLayout";
import { useAuth } from "./authStore";

type SignupErrors = Partial<Record<"username" | "nickname" | "password" | "email" | "inviteCode", string>>;

export function SignupPage() {
  const { user, signUp } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    setErrors({});

    const result = signupSchema.safeParse({ username, nickname, password, email, inviteCode });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        username: fieldErrors.username?.[0],
        nickname: fieldErrors.nickname?.[0],
        password: fieldErrors.password?.[0],
        email: fieldErrors.email?.[0],
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
        email: result.data.email,
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
    <AuthLayout
      title="Join the atlas"
      subtitle="Free, and takes about thirty seconds."
      footer={
        <p className="muted">
          Already have an account?{" "}
          <Link to="/login" className="font-bold" style={{ color: "var(--sky)" }}>
            Sign in
          </Link>
        </p>
      }
      aside={
        <Card className="p-6">
          <p className="eyebrow">What happens next</p>
          <ul className="mt-4 space-y-4">
            <AsideStep
              icon={<BadgeCheck className="h-4 w-4" />}
              tone="var(--sky)"
              tint="var(--sky-tint)"
              title="Browse right away"
              body="The full map and report feed are open to everyone, immediately."
            />
            <AsideStep
              icon={<ShieldCheck className="h-4 w-4" />}
              tone="var(--gold)"
              tint="var(--gold-tint)"
              title="A quick review"
              body="New accounts are approved by an admin before their first report goes live. It keeps the atlas clean."
            />
            <AsideStep
              icon={<Sparkles className="h-4 w-4" />}
              tone="var(--forest)"
              tint="var(--mint-tint)"
              title="Got an invite code?"
              body="Enter it below and you skip the queue entirely."
            />
          </ul>
        </Card>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {!isSupabaseConfigured ? (
          <ErrorState title="Supabase is not configured" message={supabaseConfigError} />
        ) : null}

        {formError ? <ErrorState title="Signup failed" message={formError} /> : null}

        <Field
          label="Username"
          error={errors.username}
          hint="3-32 characters. Letters, numbers, dashes, underscores."
          required
        >
          {(id) => (
            <TextInput
              id={id}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoCorrect="off"
              autoCapitalize="off"
              placeholder="lotwatcher"
              invalid={Boolean(errors.username)}
              required
            />
          )}
        </Field>

        <Field label="Nickname" error={errors.nickname} hint="What friends see. Change it any time." required>
          {(id) => (
            <TextInput
              id={id}
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="Sam"
              invalid={Boolean(errors.nickname)}
              required
            />
          )}
        </Field>

        <Field
          label="Email (optional)"
          error={errors.email}
          hint="The only way to reset a forgotten password. Never shown publicly."
        >
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
                invalid={Boolean(errors.email)}
              />
            </div>
          )}
        </Field>

        {!email ? (
          <Callout tone="gold" title="No email, no recovery">
            Without an email address there is no way to reset a forgotten password — you would need an
            admin to issue you a new one.
          </Callout>
        ) : (
          <Callout tone="sky" title="You'll sign in with this email">
            Accounts with an email address use it to sign in, rather than the username.
          </Callout>
        )}

        <Field label="Password" error={errors.password} required>
          {(id) => (
            <>
              <div className="relative">
                <TextInput
                  id={id}
                  type={showPassword ? "text" : "password"}
                  className="pr-11"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
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
              {password ? (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex flex-1 gap-1">
                    {[0, 1, 2, 3].map((index) => (
                      <span
                        key={index}
                        className="h-1.5 flex-1 rounded-full transition-colors duration-300"
                        style={{
                          background: index < strength.score ? strength.color : "var(--line-2)",
                        }}
                      />
                    ))}
                  </div>
                  <span className="hint font-semibold" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              ) : null}
            </>
          )}
        </Field>

        <div>
          <button
            type="button"
            className="btn btn-ghost btn-sm -ml-2"
            onClick={() => setShowInvite((value) => !value)}
            aria-expanded={showInvite}
          >
            I have an invite code
            <ChevronDown
              className={cx("h-3.5 w-3.5 transition-transform duration-300", showInvite && "rotate-180")}
              aria-hidden="true"
            />
          </button>

          {showInvite ? (
            <div className="animate-rise mt-2">
              <Field label="Invite code" error={errors.inviteCode} hint="Skips the approval queue.">
                {(id) => (
                  <TextInput
                    id={id}
                    value={inviteCode}
                    onChange={(event) => setInviteCode(event.target.value)}
                    className="uppercase placeholder:normal-case"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    placeholder="RC-XXXXXX"
                    invalid={Boolean(errors.inviteCode)}
                  />
                )}
              </Field>
            </div>
          ) : null}
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          loading={submitting}
          icon={<UserPlus className="h-4 w-4" />}
          sheen
        >
          {submitting ? "Creating account" : "Create account"}
        </Button>

        <p className="hint text-center leading-relaxed">
          By joining you agree to the{" "}
          <Link to="/about#legal" className="font-semibold underline">
            disclaimers
          </Link>
          .
        </p>
      </form>
    </AuthLayout>
  );
}

function AsideStep({
  icon,
  tone,
  tint,
  title,
  body,
}: {
  icon: ReactNode;
  tone: string;
  tint: string;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ background: tint, color: tone }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold">{title}</p>
        <p className="muted mt-0.5 text-sm leading-relaxed">{body}</p>
      </div>
    </li>
  );
}

function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) || /[^\w\s]/.test(password)) score += 1;

  const levels = [
    { label: "Too short", color: "var(--danger)" },
    { label: "Weak", color: "var(--danger)" },
    { label: "Okay", color: "var(--gold)" },
    { label: "Good", color: "var(--sky)" },
    { label: "Strong", color: "var(--forest)" },
  ];

  return { score, ...levels[score] };
}
