import {
  Check,
  Mail,
  RefreshCw,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "../../components/Navbar";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  SectionHeader,
  Tabs,
  TextInput,
  useToast,
} from "../../components/ui";
import { formatDate } from "../../lib/formatters";
import { supabase } from "../../lib/supabase";
import type { AccountStatus, AdminUserRow } from "../../lib/types";
import { useAuth } from "../auth/authStore";

type Filter = "pending" | "approved" | "suspended" | "admins" | "all";

export function AdminUsers() {
  const { profile } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("pending");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AdminUserRow | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error: loadError } = await supabase.rpc("admin_list_users");

    if (loadError) {
      setError(loadError.message);
    } else {
      setError("");
      setUsers((data ?? []) as AdminUserRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(
    () => ({
      pending: users.filter((u) => u.status === "pending").length,
      approved: users.filter((u) => u.status === "approved").length,
      suspended: users.filter((u) => u.status === "suspended").length,
      admins: users.filter((u) => u.role === "admin").length,
    }),
    [users],
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "admins" ? user.role === "admin" : user.status === filter);
      const matchesSearch =
        !query ||
        user.username.toLowerCase().includes(query) ||
        (user.nickname ?? "").toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [users, filter, search]);

  const setStatus = async (user: AdminUserRow, status: AccountStatus) => {
    if (!supabase) return;
    setBusyId(user.id);

    const { error: rpcError } = await supabase.rpc("admin_set_user_status", {
      target_user_id: user.id,
      new_status: status,
      reason: null,
    });

    setBusyId(null);

    if (rpcError) {
      toast.push(rpcError.message, "error");
      return;
    }

    toast.push(
      status === "approved"
        ? `@${user.username} approved.`
        : status === "suspended"
          ? `@${user.username} suspended.`
          : `@${user.username} moved back to pending.`,
    );
    void load();
  };

  const setRole = async (user: AdminUserRow, role: "admin" | "reporter") => {
    if (!supabase) return;
    setBusyId(user.id);

    const { error: rpcError } = await supabase.rpc("admin_set_user_role", {
      target_user_id: user.id,
      new_role: role,
    });

    setBusyId(null);

    if (rpcError) {
      toast.push(rpcError.message, "error");
      return;
    }

    toast.push(role === "admin" ? `@${user.username} is now an admin.` : `@${user.username} demoted.`);
    void load();
  };

  const deleteUser = async () => {
    if (!supabase || !deleting) return;
    setBusyId(deleting.id);

    const { error: rpcError } = await supabase.rpc("admin_delete_user", {
      target_user_id: deleting.id,
    });

    setBusyId(null);

    if (rpcError) {
      toast.push(rpcError.message, "error");
      return;
    }

    toast.push(`@${deleting.username} deleted.`);
    setDeleting(null);
    void load();
  };

  if (loading) return <LoadingState label="Loading members" rows={4} />;
  if (error) {
    return (
      <ErrorState
        title="Could not load members"
        message={`${error} — if this mentions a missing function, run supabase/migrations/0001_open_signup_and_admin.sql.`}
      />
    );
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="People"
        title="Members"
        description="Approve new signups, promote admins, and suspend abusers."
        action={
          <Button size="sm" variant="ghost" onClick={load} icon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          value={filter}
          onChange={setFilter}
          tabs={[
            { id: "pending", label: "Pending", count: counts.pending },
            { id: "approved", label: "Approved", count: counts.approved },
            { id: "suspended", label: "Suspended", count: counts.suspended },
            { id: "admins", label: "Admins", count: counts.admins },
            { id: "all", label: "All" },
          ]}
        />
        <div className="relative ml-auto w-full sm:w-56">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4"
            aria-hidden="true"
          />
          <TextInput
            className="pl-9 text-xs"
            placeholder="Search members"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search members"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<UserCheck className="h-5 w-5" />}
          title={filter === "pending" ? "Nothing to review" : "No members here"}
          message={
            filter === "pending"
              ? "Every account has been reviewed. Nice."
              : "Try a different filter or search term."
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Status</th>
                <th>Reports</th>
                <th>Joined</th>
                <th>Last seen</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((user) => {
                const isSelf = user.id === profile?.id;
                const busy = busyId === user.id;

                return (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={user.nickname || user.username} size={32} />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate font-bold text-ink">
                            {user.nickname || user.username}
                            {user.role === "admin" ? <Shield className="h-3 w-3 text-gold" /> : null}
                          </p>
                          <p className="hint flex items-center gap-1 truncate">
                            @{user.username}
                            {user.has_email ? (
                              <Mail className="h-3 w-3" aria-label="Has recovery email" />
                            ) : null}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge
                          tone={
                            user.status === "approved"
                              ? "mint"
                              : user.status === "pending"
                                ? "gold"
                                : "danger"
                          }
                        >
                          {user.status}
                        </Badge>
                        {user.role === "admin" ? <Badge tone="lavender">admin</Badge> : null}
                      </div>
                    </td>
                    <td className="font-semibold">{user.report_count}</td>
                    <td className="whitespace-nowrap">{formatDate(user.created_at)}</td>
                    <td className="whitespace-nowrap">
                      {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : "Never"}
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        {user.status !== "approved" ? (
                          <IconButton
                            label="Approve"
                            icon={<Check className="h-3.5 w-3.5" />}
                            onClick={() => setStatus(user, "approved")}
                            disabled={busy}
                            style={{ color: "var(--forest)" }}
                          />
                        ) : null}
                        {user.status !== "suspended" && !isSelf ? (
                          <IconButton
                            label="Suspend"
                            icon={<UserX className="h-3.5 w-3.5" />}
                            onClick={() => setStatus(user, "suspended")}
                            disabled={busy}
                            style={{ color: "var(--gold)" }}
                          />
                        ) : null}
                        {!isSelf ? (
                          <IconButton
                            label={user.role === "admin" ? "Remove admin" : "Make admin"}
                            icon={
                              user.role === "admin" ? (
                                <ShieldOff className="h-3.5 w-3.5" />
                              ) : (
                                <Shield className="h-3.5 w-3.5" />
                              )
                            }
                            onClick={() => setRole(user, user.role === "admin" ? "reporter" : "admin")}
                            disabled={busy}
                            style={{ color: "var(--lavender)" }}
                          />
                        ) : null}
                        {!isSelf ? (
                          <IconButton
                            label="Delete account"
                            icon={<Trash2 className="h-3.5 w-3.5" />}
                            onClick={() => setDeleting(user)}
                            disabled={busy}
                            style={{ color: "var(--danger)" }}
                          />
                        ) : null}
                        {isSelf ? <span className="hint px-2">That&apos;s you</span> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onCancel={() => setDeleting(null)}
        onConfirm={deleteUser}
        loading={busyId === deleting?.id}
        destructive
        title={`Delete @${deleting?.username ?? ""}?`}
        message="The account is removed permanently and cannot be restored. Their reports stay in the atlas but are no longer attributed to anyone. Consider suspending instead."
        confirmLabel="Delete permanently"
      />
    </div>
  );
}
