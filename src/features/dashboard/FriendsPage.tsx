import { Check, PlaneTakeoff, Award, Search, UserMinus, UserPlus, Users, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { formatMonthYear } from "../../lib/formatters";
import { supabase } from "../../lib/supabase";
import type { FriendStampSummary } from "../../lib/types";
import { useAuth } from "../auth/authStore";

export function FriendsPage() {
  const { user } = useAuth();
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
      <section className="glass-panel p-6">
        <p className="text-sm font-semibold uppercase tracking-normal text-teal-300">Friends</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white">Compare stamp books</h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          Add friends by username to see their rental stamp stats side by side with yours.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="space-y-4">
          <div className="glass-panel p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                className="glass-input pl-9"
                placeholder="Search friends"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          {actionError ? <ErrorState title="Friend action failed" message={actionError} tone="dark" /> : null}
          {successMessage ? (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm font-medium text-emerald-300">
              {successMessage}
            </div>
          ) : null}
          {loadError ? <ErrorState message={loadError} tone="dark" /> : null}

          {loading ? (
            <LoadingState label="Finding your crew" tone="dark" />
          ) : (
            <>
              {pendingFriends.length > 0 ? (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-normal text-slate-400">Pending</h2>
                  {pendingFriends.map((friend) => (
                    <FriendCard
                      key={friend.friendship_id}
                      friend={friend}
                      busy={pendingActionId === friend.friendship_id}
                      onAccept={() => respond(friend, true)}
                      onDecline={() => respond(friend, false)}
                      onRemove={() => remove(friend)}
                    />
                  ))}
                </div>
              ) : null}

              {friends.length === 0 ? (
                <EmptyState
                  title="No friends yet"
                  message="Add a friend by username to compare rental stamps."
                  tone="dark"
                />
              ) : acceptedFriends.length === 0 && pendingFriends.length === 0 && query ? (
                <EmptyState title="No matching friends" message="Try another username or nickname." tone="dark" />
              ) : acceptedFriends.length > 0 ? (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-normal text-slate-400">Friend stamps</h2>
                  {acceptedFriends.map((friend) => (
                    <FriendCard
                      key={friend.friendship_id}
                      friend={friend}
                      busy={pendingActionId === friend.friendship_id}
                      onRemove={() => remove(friend)}
                    />
                  ))}
                </div>
              ) : null}
            </>
          )}
        </section>

        <section className="glass-panel h-fit space-y-4 p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-white">
            <UserPlus className="h-5 w-5 text-teal-300" aria-hidden="true" />
            Add friend
          </h2>
          <form className="space-y-3" onSubmit={handleSendRequest}>
            <label className="block space-y-1.5">
              <span className="glass-label">Friend username</span>
              <input
                className="glass-input"
                value={usernameInput}
                onChange={(event) => setUsernameInput(event.target.value)}
                autoCorrect="off"
              />
            </label>
            <button className="glass-button-primary w-full" type="submit" disabled={sending || !usernameInput.trim()}>
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
}: {
  friend: FriendStampSummary;
  busy: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onRemove: () => void;
}) {
  const displayName = friend.nickname?.trim() || friend.username;
  const isAccepted = friend.status === "accepted";
  const sinceDate = friend.friendship_created_at ?? friend.latest_observed_at;

  return (
    <div className="glass-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              isAccepted ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"
            }`}
          >
            <Users className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold text-white">{displayName}</p>
            <p className="text-xs text-slate-400">@{friend.username}</p>
          </div>
        </div>
        <span
          className={`glass-pill ${
            isAccepted ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"
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
          <MiniStat label="Stamps" value={String(friend.stamp_count)} icon={<Award className="h-4 w-4" />} />
          <MiniStat label="Top brand" value={friend.top_make ?? "TBD"} icon={<Award className="h-4 w-4" />} />
          <MiniStat label="Company" value={friend.top_company ?? "TBD"} icon={<Users className="h-4 w-4" />} />
          <MiniStat label="Airport" value={friend.top_airport ?? "TBD"} icon={<PlaneTakeoff className="h-4 w-4" />} />
        </div>
      ) : friend.direction === "incoming" ? (
        <div className="mt-4 flex gap-2">
          <button className="glass-button-primary" type="button" onClick={onAccept} disabled={busy}>
            <Check className="h-4 w-4" aria-hidden="true" />
            Accept
          </button>
          <button className="glass-button-secondary" type="button" onClick={onDecline} disabled={busy}>
            <X className="h-4 w-4" aria-hidden="true" />
            Decline
          </button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-400">Waiting for them to accept.</p>
      )}

      {isAccepted ? (
        <div className="mt-4">
          <button
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300"
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

function MiniStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/[0.04] p-3">
      <div className="flex items-center gap-2 text-teal-300">{icon}</div>
      <p className="mt-1 truncate text-sm font-semibold text-white">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}
