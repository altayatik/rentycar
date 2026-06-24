import { Building2, MapPin, StickyNote } from "lucide-react";
import { CarMakeBadge } from "./CarMakeBadge";
import { EmptyState } from "./EmptyState";
import { formatCondition, formatDate, formatNumber } from "../lib/formatters";
import type { Condition, MyReportRow, PublicRecentReport } from "../lib/types";

type ReportRow = PublicRecentReport | MyReportRow;

interface ReportTableProps {
  reports: ReportRow[];
  mode?: "public" | "private";
}

const conditionStyles: Record<Condition, string> = {
  excellent: "bg-emerald-100 text-emerald-800 border-emerald-200",
  good: "bg-teal-100 text-teal-800 border-teal-200",
  fair: "bg-amber-100 text-amber-800 border-amber-200",
  poor: "bg-red-100 text-red-800 border-red-200",
};

export function ReportTable({ reports, mode = "public" }: ReportTableProps) {
  if (reports.length === 0) {
    return (
      <EmptyState
        title="No reports yet"
        message="Reports will appear here as trusted users submit airport lot observations."
      />
    );
  }

  const rows = reports.map((report, index) => ({ row: normalizeReport(report), index }));

  return (
    <>
      {/* Mobile / tablet card layout */}
      <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
        {rows.map(({ row, index }) => (
          <ReportCard key={`${row.airport}-${row.model}-${row.observed}-${index}`} row={row} mode={mode} />
        ))}
      </div>

      {/* Desktop table layout */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100/70 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
              <tr>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Airport</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Mileage</th>
                <th className="px-4 py-3">Exterior</th>
                <th className="px-4 py-3">Interior</th>
                <th className="px-4 py-3">{mode === "private" ? "Observed" : "Date"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ row, index }) => (
                <tr key={`${row.airport}-${row.model}-${row.observed}-${index}`} className="transition hover:bg-teal-50/40">
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <CarMakeBadge make={row.make} size="sm" />
                      <span className="font-semibold text-slate-950">
                        {row.year ? `${row.year} ` : ""}
                        {row.make} {row.model}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-950">{row.airport}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.company}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatNumber(row.mileage)} mi</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <ConditionPill condition={row.exterior} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <ConditionPill condition={row.interior} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(row.observed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function ConditionPill({ condition }: { condition: Condition | null | undefined }) {
  if (!condition) {
    return <span className="text-xs text-slate-400">Not reported</span>;
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${conditionStyles[condition]}`}
    >
      {formatCondition(condition)}
    </span>
  );
}

function ReportCard({ row, mode }: { row: NormalizedReport; mode: "public" | "private" }) {
  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-lg sm:p-5">
      <div className="flex items-start gap-3">
        <CarMakeBadge make={row.make} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-slate-950 sm:text-lg">
            {row.year ? `${row.year} ` : ""}
            {row.make} {row.model}
          </h3>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            {row.company} at {row.airport}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
          <MapPin className="h-3 w-3" aria-hidden="true" />
          {formatNumber(row.mileage)} mi
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
          <Building2 className="h-3 w-3" aria-hidden="true" />
          {row.airport}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-400">Exterior</span>
        <ConditionPill condition={row.exterior} />
        <span className="text-xs font-medium text-slate-400">Interior</span>
        <ConditionPill condition={row.interior} />
      </div>

      {row.notes ? (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-slate-50 p-2.5 text-xs leading-5 text-slate-600">
          <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          {row.notes}
        </p>
      ) : null}

      <p className="mt-3 text-xs font-medium text-slate-400">
        {mode === "private" ? "Observed" : "Spotted"} {formatDate(row.observed)}
      </p>
    </article>
  );
}

interface NormalizedReport {
  airport: string;
  company: string;
  make: string;
  model: string;
  year: number | null;
  mileage: number | null;
  exterior: Condition | null | undefined;
  interior: Condition | null | undefined;
  observed: string;
  notes?: string | null;
}

function normalizeReport(report: ReportRow): NormalizedReport {
  if ("airport_code" in report) {
    return {
      airport: report.airport_code,
      company: report.rental_company_name,
      make: report.make,
      model: report.model,
      year: report.year,
      mileage: report.mileage,
      exterior: report.exterior_condition,
      interior: report.interior_condition,
      observed: report.observed_date,
    };
  }

  return {
    airport: report.airports?.iata_code ?? "Unknown",
    company: report.rental_companies?.name ?? "Unknown",
    make: report.car_makes?.name ?? "Unknown",
    model: report.car_models?.name ?? "Unknown",
    year: report.year,
    mileage: report.mileage,
    exterior: report.exterior_condition,
    interior: report.interior_condition,
    observed: report.observed_at,
    notes: report.notes,
  };
}
