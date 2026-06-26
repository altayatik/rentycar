import { Check, PlaneTakeoff, Award, Search, UserMinus, UserPlus, Users, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { formatMonthYear } from "../../lib/formatters";
import { supabase } from "../../lib/supabase";
import type { FriendStampSummary } from "../../lib/types";
import { useAuth } from "../auth/authStore";
import { useTheme } from "../theme/themeStore";

export function FriendsPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [friends, setFriends] = useState<FriendStampSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");

  const [usernameInput, setUsernameInput] = useState("");
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.rpc("list_friends_with_stats", { cache_bust: "web" });

    if (error) {
      setLoadError(error.message);
    } else {
      setLoadError("");
      setFriends((data ?? []) as FriendStampSummary[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const query = search.trim().toLowerCase();
  const matches = useCallback(
    (friend: FriendStampSummary) =>
      !query ||
      friend.username.toLowerCase().includes(query) ||
      (friend.nickname ?? "").toLowerCase().includes(query),
    [query],
  );

  const pendingFriends = useMemo(() => friends.filter((f) => f.status === "pending" && matches(f)), [friends, matches]);
  const acceptedFriends = useMemo(() => friends.filter((f) => f.status === "accepted" && matches(f)), [friends, matches]);

  const handleSendRequest = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    const target = usernameInput.trim().toLowerCase();
    if (!target) return;

    setSending(true);
    setActionError("");
    setSuccessMessage("");

    const { data, error } = await supabase.rpc("send_friend_request", { target_username: target });

    if (error) {
      setActionError(error.message);
    } else if (!data || (Array.isArray(data) && data.length === 0)) {
      setActionError(
        "No friend request was created. Check the username, make sure you are signed in, and make sure a request does not already exist.",
      );
    } else {
      setUsernameInput("");
      setSuccessMessage("Friend request sent.");
      await load();
    }
    setSending(false);
  };

  const respond = async (friend: FriendStampSummary, accept: boolean) => {
    if (!supabase) return;
    setPendingActionId(friend.friendship_id);
    setActionError("");
    setSuccessMessage("");

    const { error } = await supabase.rpc("respond_friend_request", {
      target_friendship_id: friend.friendship_id,
      accept,
    });

    if (error) {
      setActionError(error.message);
    } else {
      setSuccessMessage(accept ? "Friend added." : "Request removed.");
      await load();
    }
    setPendingActionId(null);
  };

  const remove = async (friend: FriendStampSummary) => {
    if (!supabase) return;
    setPendingActionId(friend.friendship_id);
    setActionError("");
    setSuccessMessage("");

    const { error } = await supabase.rpc("remove_friendship", { target_friendship_id: friend.friendship_id });

    if (error) {
      setActionError(error.message);
    } else {
      setSuccessMessage(friend.status === "accepted" ? "Friend removed." : "Request removed.");
      await load();
    }
    setPendingActionId(null);
  };

  return (
    <div className="space-y-8">
      <section className={isDark ? "glass-panel p-6" : "panel p-6"}>
        <p className={`text-sm font-semibold uppercase tracking-normal ${isDark ? "text-teal-300" : "text-indigo-700"}`}>
          Friends
        </p>
        <h1 className={`mt-2 text-3xl font-semibold ${isDark ? "font-display text-white" : "text-slate-950"}`}>
          Compare stamp books
        </h1>
        <p className={`mt-2 max-w-2xl ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          Add friends by username to see their rental stamp stats side by side with yours.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="space-y-4">
          <div className={isDark ? "glass-panel p-4" : "panel p-4"}>
            <div className="relative">
              <Search
                className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
                  isDark ? "text-slate-500" : "text-slate-400"
                }`}
              />
              <input
                className={`${isDark ? "glass-input" : "input"} pl-9`}
                placeholder="Search friends"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          {actionError ? (
            <ErrorState title="Friend action failed" message={actionError} tone={isDark ? "dark" : "light"} />
          ) : null}
          {successMessage ? (
            <div
              className={`rounded-2xl border p-3 text-sm font-medium ${
                isDark ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-emerald-100 bg-emerald-50 text-emerald-700"
              }`}
            >
              {successMessage}
            </div>
          ) : null}
          {loadError ? <ErrorState message={loadError} tone={isDark ? "dark" : "light"} /> : null}

          {loading ? (
            <LoadingState label="Finding your crew" tone={isDark ? "dark" : "light"} />
          ) : (
            <>
              {pendingFriends.length > 0 ? (
                <div className="space-y-3">
                  <h2 className={`text-sm font-semibold uppercase tracking-normal ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Pending
                  </h2>
                  {pendingFriends.map((friend) => (
                    <FriendCard
                      key={friend.friendship_id}
                      friend={friend}
                      busy={pendingActionId === friend.friendship_id}
                      onAccept={() => respond(friend, true)}
                      onDecline={() => respond(friend, false)}
                      onRemove={() => remove(friend)}
                      isDark={isDark}
                    />
                  ))}
                </div>
              ) : null}

              {friends.length === 0 ? (
                <EmptyState
                  title="No friends yet"
                  message="Add a friend by username to compare rental stamps."
                  tone={isDark ? "dark" : "light"}
                />
              ) : acceptedFriends.length === 0 && pendingFriends.length === 0 && query ? (
                <EmptyState
                  title="No matching friends"
                  message="Try another username or nickname."
                  tone={isDark ? "dark" : "light"}
                />
              ) : acceptedFriends.length > 0 ? (
                <div className="space-y-3">
                  <h2 className={`text-sm font-semibold uppercase tracking-normal ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Friend stamps
                  </h2>
                  {acceptedFriends.map((friend) => (
                    <FriendCard
                      key={friend.friendship_id}
                      friend={friend}
                      busy={pendingActionId === friend.friendship_id}
                      onRemove={() => remove(friend)}
                      isDark={isDark}
                    />
                  ))}
                </div>
              ) : null}
            </>
          )}
        </section>

        <section className={isDark ? "glass-panel h-fit space-y-4 p-6" : "panel h-fit space-y-4 p-6"}>
          <h2
            className={`flex items-center gap-2 text-lg font-semibold ${
              isDark ? "font-display text-white" : "text-slate-950"
            }`}
          >
            <UserPlus className={`h-5 w-5 ${isDark ? "text-teal-300" : "text-indigo-700"}`} aria-hidden="true" />
            Add friend
          </h2>
          <form className="space-y-3" onSubmit={handleSendRequest}>
            <label className="block space-y-1.5">
              <span className={isDark ? "glass-label" : "label"}>Friend username</span>
              <input
                className={isDark ? "glass-input" : "input"}
                value={usernameInput}
                onChange={(event) => setUsernameInput(event.target.value)}
                autoCorrect="off"
              />
            </label>
            <button
              className={`${isDark ? "glass-button-primary" : "button-primary"} w-full`}
              type="submit"
              disabled={sending || !usernameInput.trim()}
            >
              {sending ? "Sending" : "Send request"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function FriendCard({
  friend,
  busy,
  onAccept,
  onDecline,
  onRemove,
  isDark,
}: {
  friend: FriendStampSummary;
  busy: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onRemove: () => void;
  isDark: boolean;
}) {
  const displayName = friend.nickname?.trim() || friend.username;
  const isAccepted = friend.status === "accepted";
  const sinceDate = friend.friendship_created_at ?? friend.latest_observed_at;

  return (
    <div className={isDark ? "glass-panel p-4" : "panel p-4"}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              isDark
                ? isAccepted
                  ? "bg-emerald-400/15 text-emerald-300"
                  : "bg-amber-400/15 text-amber-300"
                : isAccepted
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
            }`}
          >
            <Users className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className={`font-semibold ${isDark ? "text-white" : "text-slate-950"}`}>{displayName}</p>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>@{friend.username}</p>
          </div>
        </div>
        <span
          className={`glass-pill ${
            isDark
              ? isAccepted
                ? "bg-emerald-400/15 text-emerald-300"
                : "bg-amber-400/15 text-amber-300"
              : isAccepted
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
          }`}
        >
          {isAccepted
            ? sinceDate
              ? `Friends since ${formatMonthYear(sinceDate)}`
              : "Friends"
            : friend.direction === "incoming"
              ? "Incoming"
              : "Pending"}
        </span>
      </div>

      {isAccepted ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Stamps" value={String(friend.stamp_count)} icon={<Award className="h-4 w-4" />} isDark={isDark} />
          <MiniStat label="Top brand" value={friend.top_make ?? "TBD"} icon={<Award className="h-4 w-4" />} isDark={isDark} />
          <MiniStat label="Company" value={friend.top_company ?? "TBD"} icon={<Users className="h-4 w-4" />} isDark={isDark} />
          <MiniStat
            label="Airport"
            value={friend.top_airport ?? "TBD"}
            icon={<PlaneTakeoff className="h-4 w-4" />}
            isDark={isDark}
          />
        </div>
      ) : friend.direction === "incoming" ? (
        <div className="mt-4 flex gap-2">
          <button
            className={isDark ? "glass-button-primary" : "button-primary"}
            type="button"
            onClick={onAccept}
            disabled={busy}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Accept
          </button>
          <button
            className={isDark ? "glass-button-secondary" : "button-secondary"}
            type="button"
            onClick={onDecline}
            disabled={busy}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Decline
          </button>
        </div>
      ) : (
        <p className={`mt-3 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Waiting for them to accept.</p>
      )}

      {isAccepted ? (
        <div className="mt-4">
          <button
            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
              isDark ? "text-red-400 hover:text-red-300" : "text-red-600 hover:text-red-700"
            }`}
            type="button"
            onClick={onRemove}
            disabled={busy}
          >
            <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
            Remove friend
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
  isDark,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <div className={`rounded-xl p-3 ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
      <div className={`flex items-center gap-2 ${isDark ? "text-teal-300" : "text-indigo-700"}`}>{icon}</div>
      <p className={`mt-1 truncate text-sm font-semibold ${isDark ? "text-white" : "text-slate-950"}`}>{value}</p>
      <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
    </div>
  );
}
