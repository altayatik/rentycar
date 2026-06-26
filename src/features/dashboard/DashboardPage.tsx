import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { ReportTable } from "../../components/ReportTable";
import { supabase } from "../../lib/supabase";
import type { MyReportRow } from "../../lib/types";
import { useAuth } from "../auth/authStore";
import { SubmitReportForm } from "./SubmitReportForm";

export function DashboardPage() {
  const { profile, user } = useAuth();
  const [reports, setReports] = useState<MyReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingReport, setEditingReport] = useState<MyReportRow | null>(null);

  const loadReports = useCallback(async () => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error: reportError } = await supabase
      .from("vehicle_reports")
      .select(
        "*, airports(iata_code, name), rental_companies(name), car_makes(name), car_models(name)",
      )
      .is("deleted_at", null)
      .eq("reporter_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (reportError) {
      setError(reportError.message);
    } else {
      setReports((data ?? []) as MyReportRow[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  return (
    <div className="space-y-8">
      <section className="glass-panel p-6">
        <p className="text-sm font-semibold uppercase tracking-normal text-teal-300">Dashboard</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white">
          Welcome{profile?.username ? `, ${profile.username}` : ""}
        </h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          Submit verified lot observations and review your recent rental car reports.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <SubmitReportForm
          onSubmitted={loadReports}
          editingReport={editingReport}
          onCancelEdit={() => setEditingReport(null)}
        />

        <section className="space-y-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-white">My recent reports</h2>
            <p className="mt-1 text-sm text-slate-400">Your latest non-deleted submissions.</p>
          </div>
          {error ? <ErrorState message={error} tone="dark" /> : null}
          {loading ? (
            <LoadingState label="Loading your reports" tone="dark" />
          ) : reports.length ? (
            <ReportTable reports={reports} mode="private" onEdit={(report) => setEditingReport(report)} />
          ) : (
            <EmptyState title="No reports submitted" message="Your reports will show up here." tone="dark" />
          )}
        </section>
      </div>
    </div>
  );
}
