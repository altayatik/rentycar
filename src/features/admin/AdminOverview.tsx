import {
  Building2,
  ClipboardList,
  MapPin,
  ShieldAlert,
  Ticket,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card, ErrorState, LoadingState, SectionHeader, StatCard } from "../../components/ui";
import { formatNumber } from "../../lib/formatters";
import { supabase } from "../../lib/supabase";
import type { AdminActivityRow, AdminStats } from "../../lib/types";

export function AdminOverview({ onJumpToUsers }: { onJumpToUsers: () => void }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activity, setActivity] = useState<AdminActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;

    const load = async () => {
      setLoading(true);
      const [statsResult, activityResult] = await Promise.all([
        client.rpc("admin_stats"),
        client.rpc("admin_activity", { days: 30 }),
      ]);

      const failure = statsResult.error ?? activityResult.error;
      if (failure) {
        setError(failure.message);
      } else {
        const row = Array.isArray(statsResult.data) ? statsResult.data[0] : statsResult.data;
        setStats((row ?? null) as AdminStats | null);
        setActivity((activityResult.data ?? []) as AdminActivityRow[]);
        setError("");
      }
      setLoading(false);
    };

    void load();
  }, []);

  const peak = useMemo(
    () => Math.max(1, ...activity.map((day) => Math.max(day.reports, day.signups))),
    [activity],
  );

  if (loading) return <LoadingState label="Loading site stats" rows={4} />;
  if (error) {
    return (
      <ErrorState
        title="Could not load stats"
        message={`${error} — if this mentions a missing function, run supabase/migrations/0001_open_signup_and_admin.sql in the Supabase SQL editor.`}
      />
    );
  }
  if (!stats) return <ErrorState title="No stats returned" message="Are you signed in as an admin?" />;

  return (
    <div className="space-y-8">
      {stats.pending_users > 0 ? (
        <button
          type="button"
          onClick={onJumpToUsers}
          className="card card-hover flex w-full items-center gap-4 p-5 text-left"
          style={{ background: "var(--gold-tint)", borderColor: "#e0a92e44" }}
        >
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--gold)", color: "#fff" }}
          >
            <UserCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold tracking-tight" style={{ color: "#8a6511" }}>
              {stats.pending_users} account{stats.pending_users === 1 ? "" : "s"} waiting for approval
            </p>
            <p className="mt-0.5 text-sm" style={{ color: "#8a6511cc" }}>
              They can&apos;t post until you review them. Click to open the queue.
            </p>
          </div>
        </button>
      ) : null}

      <section className="space-y-5">
        <SectionHeader eyebrow="At a glance" title="Site health" />
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Members"
            value={formatNumber(stats.total_users)}
            sublabel={`${stats.signups_last_7d} joined this week`}
            icon={<Users className="h-5 w-5" />}
            tone="sky"
          />
          <StatCard
            label="Pending approval"
            value={formatNumber(stats.pending_users)}
            sublabel={stats.pending_users ? "Needs your attention" : "All clear"}
            icon={<UserCheck className="h-5 w-5" />}
            tone="gold"
          />
          <StatCard
            label="Live reports"
            value={formatNumber(stats.total_reports)}
            sublabel={`${stats.reports_last_7d} this week`}
            icon={<ClipboardList className="h-5 w-5" />}
            tone="mint"
          />
          <StatCard
            label="Suspended"
            value={formatNumber(stats.suspended_users)}
            icon={<ShieldAlert className="h-5 w-5" />}
            tone="terra"
          />
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeader
          eyebrow="Last 30 days"
          title="Activity"
          description="Reports logged and accounts created, per day."
        />
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--sky)" }} />
              Reports
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--terracotta)" }} />
              Signups
            </span>
            <span className="muted-2 ml-auto flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              Peak {peak}/day
            </span>
          </div>

          <div className="flex h-40 items-end gap-[3px]">
            {activity.map((day) => (
              <div
                key={day.day}
                className="group relative flex h-full flex-1 flex-col justify-end gap-[2px]"
                title={`${day.day}: ${day.reports} reports, ${day.signups} signups`}
              >
                <div
                  className="w-full rounded-t transition-all duration-500"
                  style={{
                    height: `${(day.signups / peak) * 45}%`,
                    background: "var(--terracotta)",
                    opacity: day.signups ? 0.8 : 0.12,
                    minHeight: 2,
                  }}
                />
                <div
                  className="w-full rounded-t transition-all duration-500"
                  style={{
                    height: `${(day.reports / peak) * 55}%`,
                    background: "var(--sky)",
                    opacity: day.reports ? 0.9 : 0.12,
                    minHeight: 2,
                  }}
                />
              </div>
            ))}
          </div>

          <div className="muted-2 mt-2 flex justify-between text-[10px] font-semibold">
            <span>{activity[0]?.day ?? ""}</span>
            <span>{activity[activity.length - 1]?.day ?? ""}</span>
          </div>
        </Card>
      </section>

      <section className="space-y-5">
        <SectionHeader eyebrow="Catalog" title="Reference data" />
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Active airports"
            value={formatNumber(stats.active_airports)}
            icon={<MapPin className="h-5 w-5" />}
            tone="terra"
          />
          <StatCard
            label="Rental companies"
            value={formatNumber(stats.active_companies)}
            icon={<Building2 className="h-5 w-5" />}
            tone="lavender"
          />
          <StatCard
            label="Unused invites"
            value={formatNumber(stats.unused_invites)}
            icon={<Ticket className="h-5 w-5" />}
            tone="gold"
          />
          <StatCard
            label="Deleted reports"
            value={formatNumber(stats.deleted_reports)}
            sublabel="Soft-deleted, recoverable"
            icon={<ClipboardList className="h-5 w-5" />}
            tone="sky"
          />
        </div>
      </section>
    </div>
  );
}
