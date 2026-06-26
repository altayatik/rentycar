import { Building2, MapPin, Pencil } from "lucide-react";
import { CarMakeBadge } from "./CarMakeBadge";
import { EmptyState } from "./EmptyState";
import { formatCondition, formatDate, formatDrivetrain, formatMileage, formatTireCondition } from "../lib/formatters";
import type { Condition, Drivetrain, MyReportRow, PublicRecentReport, TireCondition } from "../lib/types";

type ReportRow = PublicRecentReport | MyReportRow;

interface ReportTableProps {
  reports: ReportRow[];
  mode?: "public" | "private";
  onEdit?: (report: MyReportRow) => void;
  theme?: "light" | "dark";
}

const conditionStylesDark: Record<Condition, string> = {
  excellent: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
  good: "bg-teal-400/10 text-teal-300 border-teal-400/20",
  fair: "bg-amber-400/10 text-amber-300 border-amber-400/20",
  poor: "bg-red-400/10 text-red-300 border-red-400/20",
};

const conditionStylesLight: Record<Condition, string> = {
  excellent: "bg-emerald-50 text-emerald-700 border-emerald-100",
  good: "bg-indigo-50 text-indigo-700 border-indigo-100",
  fair: "bg-amber-50 text-amber-700 border-amber-100",
  poor: "bg-red-50 text-red-700 border-red-100",
};

export function ReportTable({ reports, mode = "public", onEdit, theme = "light" }: ReportTableProps) {
  const isDark = theme === "dark";

  if (reports.length === 0) {
    return (
      <EmptyState
        title="No reports yet"
        message="Reports will appear here as trusted users submit airport lot observations."
        tone={isDark ? "dark" : "light"}
      />
    );
  }

  const rows = reports.map((report, index) => ({ row: normalizeReport(report), original: report, index }));
  const showEdit = mode === "private" && Boolean(onEdit);

  return (
    <>
      {/* Mobile / tablet card layout */}
      <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
        {rows.map(({ row, original, index }) => (
          <ReportCard
            key={`${row.airport}-${row.model}-${row.observed}-${index}`}
            row={row}
            mode={mode}
            onEdit={showEdit ? () => onEdit?.(original as MyReportRow) : undefined}
            isDark={isDark}
          />
        ))}
      </div>

      {/* Desktop table layout */}
      <div
        className={
          isDark
            ? "hidden overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] lg:block"
            : "hidden overflow-hidden rounded-2xl border border-slate-200 bg-white lg:block"
        }
      >
        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y text-sm ${isDark ? "divide-white/10" : "divide-slate-200"}`}>
            <thead
              className={
                isDark
                  ? "bg-white/[0.03] text-left text-xs font-semibold uppercase tracking-normal text-slate-400"
                  : "bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500"
              }
            >
              <tr>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Airport</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Mileage</th>
                <th className="px-4 py-3">Exterior</th>
                <th className="px-4 py-3">Interior</th>
                <th className="px-4 py-3">{mode === "private" ? "Observed" : "Date"}</th>
                {showEdit ? <th className="px-4 py-3" /> : null}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? "divide-white/5" : "divide-slate-100"}`}>
              {rows.map(({ row, original, index }) => (
                <tr
                  key={`${row.airport}-${row.model}-${row.observed}-${index}`}
                  className={`transition ${isDark ? "hover:bg-teal-400/5" : "hover:bg-indigo-50/60"}`}
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <CarMakeBadge make={row.make} size="sm" theme={theme} />
                      <span className={`font-semibold ${isDark ? "text-white" : "text-slate-950"}`}>
                        {row.year ? `${row.year} ` : ""}
                        {row.make} {row.model}
                      </span>
                    </div>
                  </td>
                  <td className={`whitespace-nowrap px-4 py-3 font-semibold ${isDark ? "text-white" : "text-slate-950"}`}>
                    {row.airport}
                  </td>
                  <td className={`whitespace-nowrap px-4 py-3 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    {row.company}
                  </td>
                  <td className={`whitespace-nowrap px-4 py-3 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    {formatMileage(row.mileage)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <ConditionPill condition={row.exterior} isDark={isDark} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <ConditionPill condition={row.interior} isDark={isDark} />
                  </td>
                  <td className={`whitespace-nowrap px-4 py-3 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    {formatDate(row.observed)}
                  </td>
                  {showEdit ? (
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        type="button"
                        className={
                          isDark
                            ? "inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-xs font-semibold text-teal-300 transition hover:bg-teal-400/10"
                            : "inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
                        }
                        onClick={() => onEdit?.(original as MyReportRow)}
                      >
                        <Pencil className="h-3 w-3" aria-hidden="true" />
                        Edit
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function ConditionPill({ condition, isDark }: { condition: Condition | null | undefined; isDark: boolean }) {
  if (!condition) {
    return <span className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>Not reported</span>;
  }
  const conditionStyles = isDark ? conditionStylesDark : conditionStylesLight;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${conditionStyles[condition]}`}
    >
      {formatCondition(condition)}
    </span>
  );
}

function ReportCard({
  row,
  mode,
  onEdit,
  isDark,
}: {
  row: NormalizedReport;
  mode: "public" | "private";
  onEdit?: () => void;
  isDark: boolean;
}) {
  return (
    <article
      className={
        isDark
          ? "group glass-panel p-4 transition duration-150 hover:-translate-y-0.5 sm:p-5"
          : "group panel p-4 transition duration-150 hover:-translate-y-0.5 hover:shadow-lg sm:p-5"
      }
    >
      <div className="flex items-start gap-3">
        <CarMakeBadge make={row.make} size="lg" theme={isDark ? "dark" : "light"} />
        <div className="min-w-0 flex-1">
          <h3
            className={`truncate text-base font-semibold sm:text-lg ${
              isDark ? "font-display text-white" : "text-slate-950"
            }`}
          >
            {row.year ? `${row.year} ` : ""}
            {row.make} {row.model}
          </h3>
          <p className={`mt-0.5 truncate text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {row.company} at {row.airport}
          </p>
        </div>
        {onEdit ? (
          <button
            type="button"
            className={
              isDark
                ? "inline-flex shrink-0 items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-xs font-semibold text-teal-300 transition hover:bg-teal-400/10"
                : "inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
            }
            onClick={onEdit}
          >
            <Pencil className="h-3 w-3" aria-hidden="true" />
            Edit
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={isDark ? "glass-pill bg-white/[0.06] text-slate-300" : "glass-pill bg-slate-100 text-slate-600"}>
          <MapPin className="h-3 w-3" aria-hidden="true" />
          {formatMileage(row.mileage)}
        </span>
        <span className={isDark ? "glass-pill bg-white/[0.06] text-slate-300" : "glass-pill bg-slate-100 text-slate-600"}>
          <Building2 className="h-3 w-3" aria-hidden="true" />
          {row.airport}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`text-xs font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>Exterior</span>
        <ConditionPill condition={row.exterior} isDark={isDark} />
        <span className={`text-xs font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>Interior</span>
        <ConditionPill condition={row.interior} isDark={isDark} />
      </div>

      {row.tireCondition || row.drivetrain || row.licensePlate ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {row.tireCondition ? (
            <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Tires: {formatTireCondition(row.tireCondition)}
            </span>
          ) : null}
          {row.drivetrain ? (
            <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Drivetrain: {formatDrivetrain(row.drivetrain)}
            </span>
          ) : null}
          {row.licensePlate ? (
            <span
              className={
                isDark
                  ? "glass-pill bg-white/[0.06] uppercase tracking-wide text-slate-300"
                  : "glass-pill bg-slate-100 uppercase tracking-wide text-slate-600"
              }
            >
              {row.licensePlateState ? `${row.licensePlateState} · ` : ""}
              {row.licensePlate}
            </span>
          ) : null}
        </div>
      ) : null}

      <p className={`mt-3 text-xs font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>
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
  tireCondition?: TireCondition | null;
  drivetrain?: Drivetrain | null;
  licensePlate?: string | null;
  licensePlateState?: string | null;
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
      tireCondition: report.tire_condition,
      drivetrain: report.drivetrain,
      licensePlate: report.license_plate,
      licensePlateState: report.license_plate_state,
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
    tireCondition: report.tire_condition,
    drivetrain: report.drivetrain,
    licensePlate: report.license_plate,
    licensePlateState: report.license_plate_state,
  };
}
