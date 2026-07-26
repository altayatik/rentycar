import {
  BookOpen,
  Check,
  ClipboardList,
  Clock,
  Gauge,
  MapPin,
  Pencil,
  PlusCircle,
  ShieldAlert,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ReportTable } from "../../components/ReportTable";
import {
  Badge,
  Button,
  Callout,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionHeader,
  StatCard,
  TextInput,
  useToast,
} from "../../components/ui";
import { Avatar } from "../../components/Navbar";
import { formatDate, formatNumber } from "../../lib/formatters";
import { supabase } from "../../lib/supabase";
import type { MyReportRow } from "../../lib/types";
import { useAuth } from "../auth/authStore";
import { SubmitReportForm } from "./SubmitReportForm";

export function DashboardPage() {
  const { profile, user, updateNickname } = useAuth();
  const toast = useToast();
  const [reports, setReports] = useState<MyReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingReport, setEditingReport] = useState<MyReportRow | null>(null);
  const [deleting, setDeleting] = useState<MyReportRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");

  const isPending = profile?.status === "pending";
  const isSuspended = profile?.status === "suspended";

  const loadReports = useCallback(async () => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error: reportError } = await supabase
      .from("vehicle_reports")
      .select("*, airports(iata_code, name), rental_companies(name), car_makes(name), car_models(name)")
      .is("deleted_at", null)
      .eq("reporter_id", user.id)
      .order("observed_at", { ascending: false });

    if (reportError) {
      setError(reportError.message);
    } else {
      setError("");
      setReports((data ?? []) as MyReportRow[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const stats = useMemo(() => {
    const airports = new Set(reports.map((report) => report.airports?.iata_code).filter(Boolean));
    const companies = new Set(reports.map((report) => report.rental_companies?.name).filter(Boolean));
    const mileages = reports.map((report) => report.mileage).filter((m): m is number => typeof m === "number");
    const avgMileage = mileages.length
      ? Math.round(mileages.reduce((sum, value) => sum + value, 0) / mileages.length)
      : null;
    return { airports: airports.size, companies: companies.size, avgMileage };
  }, [reports]);

  /**
   * Soft-delete. Under the old RLS policy this silently did nothing —
   * the UPDATE's WITH CHECK required `deleted_at is null`, so writing a
   * timestamp into it was always rejected. Fixed in migration 0001.
   */
  const handleDelete = async () => {
    if (!supabase || !deleting) return;
    setDeleteBusy(true);

    const { data: written, error: deleteError } = await supabase
      .from("vehicle_reports")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", deleting.id)
      .select("id");

    setDeleteBusy(false);

    if (deleteError) {
      toast.push(deleteError.message, "error");
      return;
    }

    // A row blocked by RLS comes back as no error AND no rows. Without this
    // check the UI cheerfully claimed success while nothing was deleted.
    if (!written || written.length === 0) {
      toast.push(
        "The database refused the delete. Run supabase/migrations/0001_open_signup_and_admin.sql — the policy fix lives there.",
        "error",
      );
      return;
    }

    if (editingReport?.id === deleting.id) setEditingReport(null);
    setDeleting(null);
    toast.push("Report deleted.");
    void loadReports();
  };

  const handleNicknameSave = async () => {
    try {
      await updateNickname(nicknameDraft);
      setEditingNickname(false);
      toast.push("Nickname updated.");
    } catch (caught) {
      toast.push(caught instanceof Error ? caught.message : "Could not update nickname.", "error");
    }
  };

  return (
    <div className="space-y-10">
      {/* ------------------------------ Header ------------------------------ */}
      <section className="animate-rise pt-2">
        <Card className="relative overflow-hidden p-6 sm:p-8">
          <span className="ghost-num -right-3 -top-5 text-[8rem]" style={{ color: "var(--sky)" }}>
            {formatNumber(reports.length)}
          </span>

          <div className="relative flex flex-wrap items-center gap-4">
            <Avatar name={profile?.nickname || profile?.username || "?"} size={56} />
            <div className="min-w-0 flex-1">
              <p className="eyebrow">Your logbook</p>
              {editingNickname ? (
                <div className="mt-1.5 flex max-w-xs items-center gap-2">
                  <TextInput
                    value={nicknameDraft}
                    onChange={(event) => setNicknameDraft(event.target.value)}
                    autoFocus
                    aria-label="Nickname"
                  />
                  <Button size="sm" variant="primary" onClick={handleNicknameSave} icon={<Check className="h-3.5 w-3.5" />}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingNickname(false)} icon={<X className="h-3.5 w-3.5" />}>
                    <span className="sr-only">Cancel</span>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="h1 truncate">{profile?.nickname || profile?.username}</h1>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={() => {
                      setNicknameDraft(profile?.nickname ?? "");
                      setEditingNickname(true);
                    }}
                    aria-label="Edit nickname"
                    title="Edit nickname"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <p className="muted mt-0.5 text-sm">
                @{profile?.username}
                {profile?.created_at ? ` · joined ${formatDate(profile.created_at)}` : ""}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {profile?.role === "admin" ? <Badge tone="gold">Admin</Badge> : null}
              {isPending ? <Badge tone="gold">Pending approval</Badge> : null}
              {isSuspended ? <Badge tone="danger">Suspended</Badge> : null}
              {!isPending && !isSuspended ? (
                <Link to="/submit" className="btn btn-accent btn-sheen">
                  <PlusCircle className="h-4 w-4" aria-hidden="true" />
                  Log a car
                </Link>
              ) : null}
            </div>
          </div>
        </Card>
      </section>

      {isSuspended ? (
        <Callout tone="danger" title="Your account is suspended" icon={<ShieldAlert className="h-4 w-4" />}>
          {profile?.suspended_reason ||
            "You can still browse the atlas, but you cannot submit or edit reports. Contact the site operator if you think this is a mistake."}
        </Callout>
      ) : isPending ? (
        <Callout tone="gold" title="Waiting on approval" icon={<Clock className="h-4 w-4" />}>
          An admin reviews new accounts before their first report goes live. You can browse everything
          in the meantime — and if someone gives you an invite code, it approves you instantly.
        </Callout>
      ) : null}

      {/* ------------------------------- Stats ------------------------------ */}
      <section className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Reports logged"
          value={formatNumber(reports.length)}
          icon={<ClipboardList className="h-5 w-5" />}
          tone="sky"
        />
        <StatCard
          label="Airports visited"
          value={formatNumber(stats.airports)}
          sublabel="Each one is a stamp"
          icon={<MapPin className="h-5 w-5" />}
          tone="terra"
        />
        <StatCard
          label="Companies covered"
          value={formatNumber(stats.companies)}
          icon={<BookOpen className="h-5 w-5" />}
          tone="lavender"
        />
        <StatCard
          label="Average mileage"
          value={stats.avgMileage !== null ? formatNumber(stats.avgMileage) : "—"}
          sublabel={stats.avgMileage !== null ? "miles" : "No data yet"}
          icon={<Gauge className="h-5 w-5" />}
          tone="mint"
        />
      </section>

      {/* ------------------------------ Content ----------------------------- */}
      {/* Single column on purpose: the report table has seven columns plus an
          actions cell, and squeezing it beside the form pushed edit/delete
          off the right edge where nobody could reach them. */}
      {isPending || isSuspended ? (
        <Card className="p-6">
          <p className="stencil">Submitting is locked</p>
          <p className="muted mt-2 text-sm leading-relaxed">
            {isSuspended
              ? "Suspended accounts cannot submit reports."
              : "You'll be able to log sightings as soon as an admin approves your account."}
          </p>
        </Card>
      ) : formOpen || editingReport ? (
        <section id="report-form" className="scroll-mt-24">
          <SubmitReportForm
            onSubmitted={() => {
              void loadReports();
              setFormOpen(false);
            }}
            editingReport={editingReport}
            onCancelEdit={() => {
              setEditingReport(null);
              setFormOpen(false);
            }}
          />
        </section>
      ) : null}

      <section className="space-y-5">
        <SectionHeader
          eyebrow="Your reports"
          title="Everything you've logged"
          description="Only you can see this list. Public pages never show who reported what."
          action={
            <>
              {reports.length ? <Badge tone="neutral">{reports.length} total</Badge> : null}
              {!isPending && !isSuspended && !formOpen && !editingReport ? (
                <Button
                  size="sm"
                  variant="accent"
                  icon={<PlusCircle className="h-3.5 w-3.5" />}
                  onClick={() => setFormOpen(true)}
                >
                  Log a sighting
                </Button>
              ) : null}
            </>
          }
        />

        {error ? <ErrorState title="Could not load your reports" message={error} /> : null}

        {loading ? (
          <LoadingState label="Loading your reports" rows={3} />
        ) : reports.length ? (
          <ReportTable
            reports={reports}
            mode="private"
            onEdit={(report) => {
              setEditingReport(report);
              setFormOpen(true);
              window.setTimeout(
                () => document.getElementById("report-form")?.scrollIntoView({ behavior: "smooth" }),
                60,
              );
            }}
            onDelete={(report) => setDeleting(report)}
          />
        ) : (
          <EmptyState
            icon={<ClipboardList className="h-5 w-5" />}
            title="Nothing logged yet"
            message={
              isPending
                ? "Once an admin approves your account you can start logging sightings."
                : "Spotted a rental car? Log it and it shows up here."
            }
          />
        )}
      </section>

      <ConfirmDialog
        open={Boolean(deleting)}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteBusy}
        destructive
        title="Delete this report?"
        message={
          deleting
            ? `${deleting.year ?? ""} ${deleting.car_makes?.name ?? ""} ${
                deleting.car_models?.name ?? ""
              } at ${deleting.airports?.iata_code ?? "an airport"} will be removed from the atlas.`
            : undefined
        }
        confirmLabel="Delete report"
      />
    </div>
  );
}
