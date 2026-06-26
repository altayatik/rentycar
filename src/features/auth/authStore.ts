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
import { isSupabaseConfigured, supabase, supabaseConfigError, usernameToPseudoEmail } from "../../lib/supabase";
import type { Profile } from "../../lib/types";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (params: { username: string; nickname: string; password: string; inviteCode: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, nickname, role, created_at")
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
    if (user) {
      await loadProfile(user.id);
    }
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
        void loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (username: string, password: string) => {
    if (!supabase) {
      throw new Error(supabaseConfigError || "Supabase is not configured.");
    }

    const email = usernameToPseudoEmail(username);
    if (import.meta.env.DEV) {
      console.info("RentyCar login email:", email);
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  }, []);

  const signUp = useCallback(
    async ({
      username,
      nickname,
      password,
      inviteCode,
    }: {
      username: string;
      nickname: string;
      password: string;
      inviteCode: string;
    }) => {
      if (!supabase) {
        throw new Error(supabaseConfigError || "Supabase is not configured.");
      }

      const normalizedUsername = username.trim().toLowerCase();
      const normalizedNickname = nickname.trim();
      const normalizedInviteCode = inviteCode.trim().toUpperCase();

      const { data: preflight, error: preflightError } = await supabase.rpc("validate_invite_signup", {
        target_username: normalizedUsername,
        target_invite_code: normalizedInviteCode,
      });

      if (preflightError) {
        throw preflightError;
      }

      const result = Array.isArray(preflight) ? preflight[0] : preflight;
      if (result && !result.ok) {
        throw new Error(result.message as string);
      }

      const { data, error } = await supabase.auth.signUp({
        email: usernameToPseudoEmail(normalizedUsername),
        password,
        options: {
          data: {
            username: normalizedUsername,
            nickname: normalizedNickname,
            invite_code: normalizedInviteCode,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (!data.session) {
        throw new Error(
          "Account created, but no session was returned. Confirm email may be enabled in Supabase Auth — turn it off and try signing in.",
        );
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ user, profile, session, loading, signIn, signUp, signOut, refreshProfile }),
    [user, profile, session, loading, signIn, signUp, signOut, refreshProfile],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
