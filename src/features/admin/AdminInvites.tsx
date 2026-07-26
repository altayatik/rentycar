import { Check, Copy, Plus, RefreshCw, Ticket, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  LoadingState,
  SectionHeader,
  Select,
  TextInput,
  useToast,
} from "../../components/ui";
import { formatDate } from "../../lib/formatters";
import { supabase } from "../../lib/supabase";
import type { InviteCodeRow } from "../../lib/types";

export function AdminInvites() {
  const toast = useToast();
  const [invites, setInvites] = useState<InviteCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [count, setCount] = useState("5");
  const [label, setLabel] = useState("");
  const [expiry, setExpiry] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error: loadError } = await supabase.rpc("admin_list_invites");

    if (loadError) {
      setError(loadError.message);
    } else {
      setError("");
      setInvites((data ?? []) as InviteCodeRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = async () => {
    if (!supabase) return;
    setGenerating(true);

    const { data, error: rpcError } = await supabase.rpc("admin_create_invites", {
      how_many: Number(count) || 1,
      code_label: label.trim() || null,
      expires: expiry ? new Date(`${expiry}T23:59:59`).toISOString() : null,
    });

    setGenerating(false);

    if (rpcError) {
      toast.push(rpcError.message, "error");
      return;
    }

    const created = (data ?? []) as Array<{ code: string }>;
    toast.push(`Generated ${created.length} invite code${created.length === 1 ? "" : "s"}.`);
    setLabel("");
    setExpiry("");
    void load();
  };

  const revoke = async (invite: InviteCodeRow) => {
    if (!supabase) return;
    setBusyId(invite.id);

    const { error: rpcError } = await supabase.rpc("admin_revoke_invite", {
      target_invite_id: invite.id,
    });

    setBusyId(null);

    if (rpcError) {
      toast.push(rpcError.message, "error");
      return;
    }

    toast.push(`${invite.code} revoked.`);
    void load();
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      toast.push("Could not access the clipboard.", "error");
    }
  };

  const statusOf = (invite: InviteCodeRow) => {
    if (invite.used_at) return { tone: "neutral" as const, label: "used" };
    if (invite.revoked_at) return { tone: "danger" as const, label: "revoked" };
    if (invite.expires_at && new Date(invite.expires_at) < new Date())
      return { tone: "gold" as const, label: "expired" };
    return { tone: "mint" as const, label: "available" };
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Access"
        title="Invite codes"
        description="A valid code skips the approval queue entirely."
        action={
          <Button size="sm" variant="ghost" onClick={load} icon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh
          </Button>
        }
      />

      <Card className="p-5">
        <p className="eyebrow mb-4">Generate new codes</p>
        <div className="grid gap-4 sm:grid-cols-[110px_minmax(0,1fr)_180px_auto] sm:items-end">
          <Field label="How many">
            {(id) => (
              <Select id={id} value={count} onChange={(event) => setCount(event.target.value)}>
                {[1, 3, 5, 10, 25, 50].map((option) => (
                  <option key={option} value={String(option)}>
                    {option}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Label (optional)" hint="A note to remember who these were for.">
            {(id) => (
              <TextInput
                id={id}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Reddit thread, Jan batch…"
              />
            )}
          </Field>

          <Field label="Expires (optional)">
            {(id) => (
              <TextInput
                id={id}
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={expiry}
                onChange={(event) => setExpiry(event.target.value)}
              />
            )}
          </Field>

          <Button
            variant="primary"
            onClick={generate}
            loading={generating}
            icon={<Plus className="h-4 w-4" />}
            sheen
          >
            Generate
          </Button>
        </div>
      </Card>

      {error ? (
        <ErrorState
          title="Could not load invite codes"
          message={`${error} — if this mentions a missing function, run supabase/migrations/0001_open_signup_and_admin.sql.`}
        />
      ) : loading ? (
        <LoadingState label="Loading invite codes" rows={3} />
      ) : invites.length === 0 ? (
        <EmptyState
          icon={<Ticket className="h-5 w-5" />}
          title="No invite codes yet"
          message="Generate a batch above and hand them out to skip the approval queue."
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Status</th>
                <th>Label</th>
                <th>Used by</th>
                <th>Created</th>
                <th>Expires</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => {
                const status = statusOf(invite);
                const canRevoke = !invite.used_at && !invite.revoked_at;

                return (
                  <tr key={invite.id}>
                    <td>
                      <code className="text-sm font-extrabold tracking-wider text-ink">{invite.code}</code>
                    </td>
                    <td>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </td>
                    <td className="max-w-[12rem] truncate">{invite.label ?? "—"}</td>
                    <td className="whitespace-nowrap">
                      {invite.used_by_username ? `@${invite.used_by_username}` : "—"}
                    </td>
                    <td className="whitespace-nowrap">{formatDate(invite.created_at)}</td>
                    <td className="whitespace-nowrap">
                      {invite.expires_at ? formatDate(invite.expires_at) : "Never"}
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <IconButton
                          label={copied === invite.code ? "Copied" : "Copy code"}
                          icon={
                            copied === invite.code ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )
                          }
                          onClick={() => copy(invite.code)}
                          style={copied === invite.code ? { color: "var(--forest)" } : undefined}
                        />
                        {canRevoke ? (
                          <IconButton
                            label="Revoke code"
                            icon={<XCircle className="h-3.5 w-3.5" />}
                            onClick={() => revoke(invite)}
                            disabled={busyId === invite.id}
                            style={{ color: "var(--danger)" }}
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
