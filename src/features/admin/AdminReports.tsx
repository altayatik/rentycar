import { ClipboardList, RefreshCw, RotateCcw, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CarMakeBadge } from "../../components/CarMakeBadge";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  SectionHeader,
  TextInput,
  Toggle,
  useToast,
} from "../../components/ui";
import { formatDate, formatMileage } from "../../lib/formatters";
import { supabase } from "../../lib/supabase";
import type { AdminReportRow, Condition } from "../../lib/types";

const conditionTones: Record<Condition, "mint" | "sky" | "gold" | "danger"> = {
  excellent: "mint",
  good: "sky",
  fair: "gold",
  poor: "danger",
};

export function AdminReports() {
  const toast = useToast();
  const [reports, setReports] = useState<AdminReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AdminReportRow | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);

    const { data, error: loadError } = await supabase.rpc("admin_list_reports", {
      max_rows: 300,
      skip_rows: 0,
      search: search.trim() || null,
      include_deleted: includeDeleted,
    });

    if (loadError) {
      setError(loadError.message);
    } else {
      setError("");
      setReports((data ?? []) as AdminReportRow[]);
    }
    setLoading(false);
  }, [search, includeDeleted]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const softDelete = async () => {
    if (!supabase || !deleting) return;
    setBusyId(deleting.id);

    const { error: updateError } = await supabase
      .from("vehicle_reports")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", deleting.id)
      .select("id");

    setBusyId(null);

    if (updateError) {
      toast.push(updateError.message, "error");
      return;
    }

    toast.push("Report removed from the atlas.");
    setDeleting(null);
    void load();
  };

  const restore = async (report: AdminReportRow) => {
    if (!supabase) return;
    setBusyId(report.id);

    const { error: updateError } = await supabase
      .from("vehicle_reports")
      .update({ deleted_at: null })
      .eq("id", report.id)
      .select("id");

    setBusyId(null);

    if (updateError) {
      toast.push(updateError.message, "error");
      return;
    }

    toast.push("Report restored.");
    void load();
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Moderation"
        title="All reports"
        description="Every member's submissions. Deletes are reversible."
        action={
          <Button size="sm" variant="ghost" onClick={load} icon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[16rem] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4"
            aria-hidden="true"
          />
          <TextInput
            className="pl-9"
            placeholder="Search by member, airport, company, make, or model"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search reports"
          />
        </div>
        <div className="w-56">
          <Toggle
            label="Show deleted"
            checked={includeDeleted}
            onChange={setIncludeDeleted}
          />
        </div>
      </div>

      {error ? (
        <ErrorState
          title="Could not load reports"
          message={`${error} — if this mentions a missing function, run supabase/migrations/0001_open_signup_and_admin.sql.`}
        />
      ) : loading ? (
        <LoadingState label="Loading reports" rows={4} />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-5 w-5" />}
          title="No reports found"
          message={search ? "Nothing matches that search." : "Nobody has logged anything yet."}
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Reporter</th>
                <th>Airport</th>
                <th>Company</th>
                <th>Mileage</th>
                <th>Condition</th>
                <th>Observed</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => {
                const busy = busyId === report.id;
                const isDeleted = Boolean(report.deleted_at);

                return (
                  <tr key={report.id} style={isDeleted ? { opacity: 0.55 } : undefined}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        {report.make_name ? <CarMakeBadge make={report.make_name} size="sm" /> : null}
                        <div className="min-w-0">
                          <p className="truncate font-bold text-ink">
                            {report.year ? `${report.year} ` : ""}
                            {report.model_name ?? "Unknown"}
                          </p>
                          {isDeleted ? <Badge tone="danger">deleted</Badge> : null}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      {report.reporter_username ? `@${report.reporter_username}` : "—"}
                    </td>
                    <td className="font-semibold">{report.airport_code ?? "—"}</td>
                    <td className="max-w-[10rem] truncate">{report.company_name ?? "—"}</td>
                    <td className="whitespace-nowrap">{formatMileage(report.mileage)}</td>
                    <td>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone={conditionTones[report.exterior_condition]}>
                          {report.exterior_condition}
                        </Badge>
                      </div>
                    </td>
                    <td className="whitespace-nowrap">{formatDate(report.observed_at)}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        {isDeleted ? (
                          <IconButton
                            label="Restore report"
                            icon={<RotateCcw className="h-3.5 w-3.5" />}
                            onClick={() => restore(report)}
                            disabled={busy}
                            style={{ color: "var(--forest)" }}
                          />
                        ) : (
                          <IconButton
                            label="Delete report"
                            icon={<Trash2 className="h-3.5 w-3.5" />}
                            onClick={() => setDeleting(report)}
                            disabled={busy}
                            style={{ color: "var(--danger)" }}
                          />
                        )}
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
        onConfirm={softDelete}
        loading={busyId === deleting?.id}
        destructive
        title="Remove this report?"
        message={
          deleting
            ? `${deleting.year ?? ""} ${deleting.make_name ?? ""} ${deleting.model_name ?? ""} by @${
                deleting.reporter_username ?? "unknown"
              }. It disappears from public pages but stays recoverable here.`
            : undefined
        }
        confirmLabel="Remove report"
      />
    </div>
  );
}
