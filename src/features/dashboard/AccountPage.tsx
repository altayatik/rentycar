import { AtSign, Check, KeyRound, LockKeyhole, Mail, Save, UserRound } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Avatar } from "../../components/Navbar";
import { Badge, Button, Card, Field, SectionHeader, TextInput, useToast } from "../../components/ui";
import { useAuth } from "../auth/authStore";

export function AccountPage() {
  const {
    profile,
    user,
    updateEmail,
    updateNickname,
    updatePassword,
    updateUsername,
  } = useAuth();
  const toast = useToast();

  const realEmail = useMemo(() => {
    const email = user?.email?.trim() ?? "";
    return email.endsWith("@rentycar.local") ? "" : email;
  }, [user?.email]);

  const [nickname, setNickname] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    setNickname(profile?.nickname ?? "");
    setUsername(profile?.username ?? "");
  }, [profile?.nickname, profile?.username]);

  useEffect(() => setEmail(realEmail), [realEmail]);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    const nextNickname = nickname.trim();
    const nextUsername = username.trim().toLowerCase();

    if (nextNickname.length < 2 || nextNickname.length > 40) {
      toast.push("Name must be 2-40 characters.", "error");
      return;
    }
    if (!/^[a-z0-9_-]{3,32}$/.test(nextUsername)) {
      toast.push("Username is 3-32 characters: letters, numbers, underscores, or dashes.", "error");
      return;
    }

    setProfileSaving(true);
    try {
      if (nextUsername !== profile?.username) await updateUsername(nextUsername);
      if (nextNickname !== profile?.nickname) await updateNickname(nextNickname);
      toast.push("Profile details updated.");
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Could not update your profile.", "error");
    } finally {
      setProfileSaving(false);
    }
  };

  const saveEmail = async (event: FormEvent) => {
    event.preventDefault();
    const nextEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      toast.push("Enter a valid email address.", "error");
      return;
    }
    if (nextEmail === realEmail.toLowerCase()) {
      toast.push("That is already your account email.");
      return;
    }

    setEmailSaving(true);
    try {
      const result = await updateEmail(nextEmail);
      toast.push(
        result.confirmationRequired
          ? "Check your inbox to confirm the new email address."
          : "Email address updated. Use it the next time you sign in.",
      );
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Could not update your email.", "error");
    } finally {
      setEmailSaving(false);
    }
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      toast.push("Password must be at least 8 characters.", "error");
      return;
    }
    if (password !== confirmPassword) {
      toast.push("Passwords do not match.", "error");
      return;
    }

    setPasswordSaving(true);
    try {
      await updatePassword(password);
      setPassword("");
      setConfirmPassword("");
      toast.push("Password updated.");
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Could not update your password.", "error");
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="account-page space-y-8">
      <section className="account-hero animate-rise">
        <div className="account-identity">
          <Avatar name={profile?.nickname || profile?.username || "?"} size={64} />
          <div>
            <p className="eyebrow">Account settings</p>
            <h1>{profile?.nickname || profile?.username}</h1>
            <p>@{profile?.username}</p>
          </div>
        </div>
        <div className="account-hero-copy">
          <Badge tone={profile?.status === "approved" ? "mint" : "gold"}>
            {profile?.status === "approved" ? <Check /> : null}
            {profile?.status ?? "Member"}
          </Badge>
          <p>Keep your login details current and your private logbook easy to recognize.</p>
        </div>
      </section>

      <div className="account-settings-grid">
        <Card as="section" className="account-settings-card">
          <SectionHeader
            eyebrow="Identity"
            title="Profile details"
            description="Your name appears inside your workspace. Your username identifies your account."
          />
          <form className="account-form" onSubmit={saveProfile}>
            <Field label="Name" hint="2-40 characters">
              {(id) => (
                <TextInput
                  id={id}
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  autoComplete="name"
                  placeholder="Your name"
                />
              )}
            </Field>
            <Field label="Username" hint="Changing this also changes username-based sign in.">
              {(id) => (
                <div className="relative">
                  <AtSign className="account-field-icon" aria-hidden="true" />
                  <TextInput
                    id={id}
                    className="account-input-with-icon"
                    value={username}
                    onChange={(event) => setUsername(event.target.value.toLowerCase())}
                    autoComplete="username"
                    placeholder="username"
                  />
                </div>
              )}
            </Field>
            <Button
              type="submit"
              variant="accent"
              loading={profileSaving}
              icon={<Save />}
              disabled={
                nickname.trim() === (profile?.nickname ?? "") &&
                username.trim().toLowerCase() === (profile?.username ?? "")
              }
            >
              Save profile
            </Button>
          </form>
        </Card>

        <div className="account-security-stack">
          <Card as="section" className="account-settings-card">
            <SectionHeader
              eyebrow="Sign in"
              title="Email address"
              description={
                realEmail
                  ? "Used for sign in and password recovery."
                  : "Add an email for password recovery and email-based sign in."
              }
            />
            <form className="account-form" onSubmit={saveEmail}>
              <Field label="Email">
                {(id) => (
                  <div className="relative">
                    <Mail className="account-field-icon" aria-hidden="true" />
                    <TextInput
                      id={id}
                      type="email"
                      className="account-input-with-icon"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      placeholder="you@example.com"
                    />
                  </div>
                )}
              </Field>
              <Button type="submit" loading={emailSaving} icon={<UserRound />} disabled={!email.trim()}>
                {realEmail ? "Update email" : "Add email"}
              </Button>
            </form>
          </Card>

          <Card as="section" className="account-settings-card">
            <SectionHeader
              eyebrow="Security"
              title="Change password"
              description="Use at least eight characters and avoid reusing another password."
            />
            <form className="account-form account-password-grid" onSubmit={savePassword}>
              <Field label="New password">
                {(id) => (
                  <div className="relative">
                    <LockKeyhole className="account-field-icon" aria-hidden="true" />
                    <TextInput
                      id={id}
                      type="password"
                      className="account-input-with-icon"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                )}
              </Field>
              <Field label="Confirm password">
                {(id) => (
                  <div className="relative">
                    <KeyRound className="account-field-icon" aria-hidden="true" />
                    <TextInput
                      id={id}
                      type="password"
                      className="account-input-with-icon"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                )}
              </Field>
              <Button
                type="submit"
                variant="primary"
                loading={passwordSaving}
                icon={<KeyRound />}
                disabled={!password || !confirmPassword}
              >
                Update password
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
