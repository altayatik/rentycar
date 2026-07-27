import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  createElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  isSupabaseConfigured,
  supabase,
  supabaseConfigError,
  usernameToPseudoEmail,
} from "../../lib/supabase";
import type { Profile } from "../../lib/types";

const PROFILE_COLUMNS =
  "id, username, nickname, role, status, uses_email_login, suspended_reason, approved_at, created_at";

interface SignUpParams {
  username: string;
  nickname: string;
  password: string;
  /** Optional. Supplying one switches this account to email-based login. */
  email?: string;
  /** Optional. A valid code skips the approval queue. */
  inviteCode?: string;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (params: SignUpParams) => Promise<{ status: Profile["status"] }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateNickname: (nickname: string) => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
  updateEmail: (email: string) => Promise<{ confirmationRequired: boolean }>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Thrown when someone types a username that belongs to an email-login
 * account. We deliberately do NOT reveal which address it is — that would
 * turn the public username list into an email harvesting tool.
 */
export class NeedsEmailLoginError extends Error {
  constructor() {
    super("This account signs in with its email address. Enter your email instead of your username.");
    this.name = "NeedsEmailLoginError";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const syncEmailLoginFlag = useCallback(async (authUser: User) => {
    if (!supabase) return;
    const email = authUser.email?.trim().toLowerCase() ?? "";
    if (!email || email.endsWith("@rentycar.local")) return;

    const { error } = await supabase
      .from("profiles")
      .update({ uses_email_login: true })
      .eq("id", authUser.id)
      .eq("uses_email_login", false);

    if (error) console.error("Failed to sync email login preference", error);
  }, []);

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Failed to load profile", error);
      setProfile(null);
      return;
    }

    setProfile(data as Profile | null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [loadProfile, user]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        await syncEmailLoginFlag(data.session.user);
        await loadProfile(data.session.user.id);
      }
      if (mounted) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        void syncEmailLoginFlag(nextSession.user).then(() => loadProfile(nextSession.user.id));
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile, syncEmailLoginFlag]);

  /**
   * Accepts either a username or an email address.
   *
   * Accounts created without an email authenticate against the synthetic
   * <username>@rentycar.local address, which the client can derive on its
   * own. Accounts created WITH an email authenticate against that email,
   * so a bare username can't be resolved client-side — we ask the server
   * only for the login *kind* and prompt the user accordingly.
   */
  const signIn = useCallback(async (identifier: string, password: string) => {
    if (!supabase) throw new Error(supabaseConfigError || "Supabase is not configured.");
    const client = supabase;

    const trimmed = identifier.trim();
    const looksLikeEmail = trimmed.includes("@") && !trimmed.toLowerCase().endsWith("@rentycar.local");

    let email: string;
    if (looksLikeEmail) {
      email = trimmed.toLowerCase();
    } else {
      const username = trimmed.toLowerCase().replace(/@rentycar\.local$/, "");
      const { data, error } = await client.rpc("login_kind_for_username", {
        target_username: username,
      });

      if (!error) {
        const row = Array.isArray(data) ? data[0] : data;
        const kind = (row?.kind ?? row) as string | undefined;
        if (kind === "email") throw new NeedsEmailLoginError();
      }
      // If the RPC is missing (migration not run yet) we fall through and
      // try the pseudo-email, which is the pre-migration behaviour.
      email = usernameToPseudoEmail(username);
    }

    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(
        error.message.toLowerCase().includes("invalid login credentials")
          ? "That username/email and password combination doesn't match an account."
          : error.message,
      );
    }
  }, []);

  const signUp = useCallback(
    async ({ username, nickname, password, email, inviteCode }: SignUpParams) => {
      if (!supabase) throw new Error(supabaseConfigError || "Supabase is not configured.");
      const client = supabase;

      const normalizedUsername = username.trim().toLowerCase();
      const normalizedNickname = nickname.trim();
      const normalizedEmail = email?.trim().toLowerCase() || "";
      const normalizedInvite = inviteCode?.trim().toUpperCase() || "";

      // Cheap server-side pre-flight so users get a clear message before
      // an auth user is created and the trigger rolls it back.
      const { data: preflight, error: preflightError } = await client.rpc("validate_invite_signup", {
        target_username: normalizedUsername,
        target_invite_code: normalizedInvite,
      });

      if (preflightError) throw preflightError;

      const result = Array.isArray(preflight) ? preflight[0] : preflight;
      if (result && !result.ok) throw new Error(result.message as string);

      const usesEmailLogin = normalizedEmail.length > 0;

      const { data, error } = await client.auth.signUp({
        email: usesEmailLogin ? normalizedEmail : usernameToPseudoEmail(normalizedUsername),
        password,
        options: {
          data: {
            username: normalizedUsername,
            nickname: normalizedNickname,
            invite_code: normalizedInvite,
            uses_email_login: usesEmailLogin,
          },
        },
      });

      if (error) throw error;

      if (!data.session) {
        throw new Error(
          "Account created, but no session was returned. Email confirmation may be enabled in Supabase Auth — turn it off, or confirm the address, then sign in.",
        );
      }

      await loadProfile(data.session.user.id);
      return { status: normalizedInvite ? ("approved" as const) : ("pending" as const) };
    },
    [loadProfile],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const updateNickname = useCallback(
    async (nickname: string) => {
      if (!supabase || !user) throw new Error("You are not signed in.");
      const trimmed = nickname.trim();
      if (trimmed.length < 2 || trimmed.length > 40) {
        throw new Error("Nickname must be 2-40 characters.");
      }

      const { error } = await supabase.from("profiles").update({ nickname: trimmed }).eq("id", user.id);
      if (error) throw error;
      await loadProfile(user.id);
    },
    [loadProfile, user],
  );

  const updateUsername = useCallback(
    async (username: string) => {
      if (!supabase || !user) throw new Error("You are not signed in.");
      const normalized = username.trim().toLowerCase();
      if (!/^[a-z0-9_-]{3,32}$/.test(normalized)) {
        throw new Error("Username is 3-32 characters: letters, numbers, underscores, or dashes.");
      }

      const { error } = await supabase.rpc("update_own_username", {
        target_username: normalized,
      });
      if (error) throw error;
      await supabase.auth.refreshSession();
      await loadProfile(user.id);
    },
    [loadProfile, user],
  );

  const updateEmail = useCallback(
    async (email: string) => {
      if (!supabase || !user) throw new Error("You are not signed in.");
      const normalized = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.updateUser({ email: normalized });
      if (error) throw error;

      const confirmationRequired = data.user.email?.toLowerCase() !== normalized;
      if (!confirmationRequired) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ uses_email_login: true })
          .eq("id", user.id);
        if (profileError) throw profileError;
        await loadProfile(user.id);
      }

      return { confirmationRequired };
    },
    [loadProfile, user],
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!supabase) throw new Error(supabaseConfigError || "Supabase is not configured.");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/rentycar/reset-password`,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) throw new Error(supabaseConfigError || "Supabase is not configured.");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateNickname,
      updateUsername,
      updateEmail,
      requestPasswordReset,
      updatePassword,
    }),
    [
      user,
      profile,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateNickname,
      updateUsername,
      updateEmail,
      requestPasswordReset,
      updatePassword,
    ],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
