import {
  Award,
  Building2,
  Check,
  PlaneTakeoff,
  Search,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "../../components/Navbar";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  SectionHeader,
  TextInput,
  useToast,
} from "../../components/ui";
import { formatMonthYear } from "../../lib/formatters";
import { supabase } from "../../lib/supabase";
import type { FriendStampSummary } from "../../lib/types";
import { useAuth } from "../auth/authStore";

export function FriendsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [friends, setFriends] = useState<FriendStampSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");

  const [usernameInput, setUsernameInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<FriendStampSummary | null>(null);

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

  const incoming = useMemo(
    () => friends.filter((f) => f.status === "pending" && f.direction === "incoming" && matches(f)),
    [friends, matches],
  );
  const outgoing = useMemo(
    () => friends.filter((f) => f.status === "pending" && f.direction === "outgoing" && matches(f)),
    [friends, matches],
  );
  const accepted = useMemo(
    () => friends.filter((f) => f.status === "accepted" && matches(f)),
    [friends, matches],
  );

  const handleSendRequest = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    const target = usernameInput.trim().toLowerCase();
    if (!target) return;

    setSending(true);
    const { data, error } = await supabase.rpc("send_friend_request", { target_username: target });
    setSending(false);

    if (error) {
      toast.push(error.message, "error");
      return;
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      toast.push(
        "No request was created. Check the username, and make sure you aren't already connected.",
        "error",
      );
      return;
    }

    setUsernameInput("");
    toast.push(`Request sent to @${target}.`);
    await load();
  };

  const respond = async (friend: FriendStampSummary, accept: boolean) => {
    if (!supabase) return;
    setPendingActionId(friend.friendship_id);

    const { error } = await supabase.rpc("respond_friend_request", {
      target_friendship_id: friend.friendship_id,
      accept,
    });

    setPendingActionId(null);

    if (error) {
      toast.push(error.message, "error");
      return;
    }

    toast.push(accept ? "Friend added." : "Request declined.");
    await load();
  };

  const remove = async () => {
    if (!supabase || !removing) return;
    setPendingActionId(removing.friendship_id);

    const { error } = await supabase.rpc("remove_friendship", {
      target_friendship_id: removing.friendship_id,
    });

    setPendingActionId(null);

    if (error) {
      toast.push(error.message, "error");
      return;
    }

    toast.push(removing.status === "accepted" ? "Friend removed." : "Request withdrawn.");
    setRemoving(null);
    await load();
  };

  return (
    <div className="space-y-10">
      <section className="animate-rise pt-2">
        <Card className="relative overflow-hidden p-6 sm:p-8">
          <span className="ghost-num -right-3 -top-6 text-[9rem]" style={{ color: "var(--lavender)" }}>
            {accepted.length}
          </span>
          <div className="relative">
            <p className="eyebrow">Friends</p>
            <h1 className="h-display mt-2">
              Compare <span style={{ color: "var(--lavender)" }}>stamps</span>
            </h1>
            <p className="muted mt-3 max-w-lg">
              Add friends by username to see how many airports they&apos;ve covered — and who&apos;s
              actually paying attention at the counter.
            </p>
          </div>
        </Card>
      </section>

      {loadError ? <ErrorState title="Could not load friends" message={loadError} /> : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-8">
          {loading ? (
            <LoadingState label="Loading your friends" rows={3} />
          ) : (
            <>
              {incoming.length ? (
                <section className="space-y-4">
                  <SectionHeader
                    eyebrow="Needs a response"
                    title="Friend requests"
                    action={<Badge tone="gold">{incoming.length}</Badge>}
                  />
                  <div className="stagger grid gap-3 sm:grid-cols-2">
                    {incoming.map((friend) => (
                      <FriendCard
                        key={friend.friendship_id}
                        friend={friend}
                        busy={pendingActionId === friend.friendship_id}
                        onAccept={() => respond(friend, true)}
                        onDecline={() => respond(friend, false)}
                        onRemove={() => setRemoving(friend)}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="space-y-4">
                <SectionHeader
                  eyebrow="Your circle"
                  title="Friends"
                  action={
                    friends.length > 4 ? (
                      <div className="relative w-48">
                        <Search
                          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4"
                          aria-hidden="true"
                        />
                        <TextInput
                          className="pl-9 text-xs"
                          placeholder="Search friends"
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          aria-label="Search friends"
                        />
                      </div>
                    ) : null
                  }
                />
                {accepted.length ? (
                  <div className="stagger grid gap-3 sm:grid-cols-2">
                    {accepted.map((friend) => (
                      <FriendCard
                        key={friend.friendship_id}
                        friend={friend}
                        busy={pendingActionId === friend.friendship_id}
                        onRemove={() => setRemoving(friend)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Users className="h-5 w-5" />}
                    title={query ? "No matches" : "No friends yet"}
                    message={
                      query
                        ? "Nobody in your circle matches that search."
                        : "Send a request using someone's username to get started."
                    }
                  />
                )}
              </section>

              {outgoing.length ? (
                <section className="space-y-4">
                  <SectionHeader eyebrow="Waiting" title="Sent requests" />
                  <div className="stagger grid gap-3 sm:grid-cols-2">
                    {outgoing.map((friend) => (
                      <FriendCard
                        key={friend.friendship_id}
                        friend={friend}
                        busy={pendingActionId === friend.friendship_id}
                        onRemove={() => setRemoving(friend)}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>

        <aside className="lg:sticky lg:top-24">
          <Card className="p-5">
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ background: "var(--lavender-tint)", color: "var(--lavender)" }}
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-extrabold tracking-tight">Add a friend</p>
                <p className="hint">They&apos;ll need to accept.</p>
              </div>
            </div>

            <form className="mt-4 space-y-3" onSubmit={handleSendRequest}>
              <Field label="Username" hint="Exactly as they typed it at signup.">
                {(id) => (
                  <TextInput
                    id={id}
                    value={usernameInput}
                    onChange={(event) => setUsernameInput(event.target.value)}
                    placeholder="lotwatcher"
                    autoCorrect="off"
                    autoCapitalize="off"
                  />
                )}
              </Field>
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                loading={sending}
                disabled={!usernameInput.trim()}
                icon={<UserPlus className="h-4 w-4" />}
              >
                {sending ? "Sending" : "Send request"}
              </Button>
            </form>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(removing)}
        onCancel={() => setRemoving(null)}
        onConfirm={remove}
        loading={pendingActionId === removing?.friendship_id}
        destructive
        title={removing?.status === "accepted" ? "Remove this friend?" : "Withdraw this request?"}
        message={
          removing
            ? `@${removing.username} will no longer be connected to you. You can send a new request later.`
            : undefined
        }
        confirmLabel={removing?.status === "accepted" ? "Remove friend" : "Withdraw"}
      />
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
    <Card hover className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={displayName} size={40} />
          <div className="min-w-0">
            <p className="truncate font-bold">{displayName}</p>
            <p className="hint truncate">@{friend.username}</p>
          </div>
        </div>
        <Badge tone={isAccepted ? "mint" : "gold"}>
          {isAccepted
            ? sinceDate
              ? `Since ${formatMonthYear(sinceDate)}`
              : "Friends"
            : friend.direction === "incoming"
              ? "Incoming"
              : "Pending"}
        </Badge>
      </div>

      {isAccepted ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MiniStat label="Stamps" value={String(friend.stamp_count)} icon={<Award className="h-3.5 w-3.5" />} />
          <MiniStat label="Brand" value={friend.top_make ?? "—"} icon={<Award className="h-3.5 w-3.5" />} />
          <MiniStat label="Company" value={friend.top_company ?? "—"} icon={<Building2 className="h-3.5 w-3.5" />} />
          <MiniStat label="Airport" value={friend.top_airport ?? "—"} icon={<PlaneTakeoff className="h-3.5 w-3.5" />} />
        </div>
      ) : friend.direction === "incoming" ? (
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="primary" onClick={onAccept} disabled={busy} icon={<Check className="h-3.5 w-3.5" />}>
            Accept
          </Button>
          <Button size="sm" variant="secondary" onClick={onDecline} disabled={busy} icon={<X className="h-3.5 w-3.5" />}>
            Decline
          </Button>
        </div>
      ) : (
        <p className="muted mt-3 text-sm">Waiting for them to accept.</p>
      )}

      <div className="mt-3">
        <button
          className="inline-flex items-center gap-1.5 text-xs font-bold transition-opacity hover:opacity-75 disabled:opacity-50"
          style={{ color: "var(--danger)" }}
          type="button"
          onClick={onRemove}
          disabled={busy}
        >
          <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
          {isAccepted ? "Remove friend" : "Withdraw"}
        </button>
      </div>
    </Card>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="card-dashed p-2.5">
      <span className="inline-flex text-ink-3">{icon}</span>
      <p className="mt-1 truncate text-sm font-bold" title={value}>
        {value}
      </p>
      <p className="hint truncate">{label}</p>
    </div>
  );
}
