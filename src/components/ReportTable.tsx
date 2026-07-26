import { Building2, CalendarDays, Gauge, MapPin, Pencil, Trash2 } from "lucide-react";
import { CarMakeBadge } from "./CarMakeBadge";
import { Badge, type BadgeTone, Card, EmptyState, IconButton } from "./ui";
import {
  formatCondition,
  formatDate,
  formatDrivetrain,
  formatMileage,
  formatTireCondition,
} from "../lib/formatters";
import type { Condition, Drivetrain, MyReportRow, PublicRecentReport, TireCondition } from "../lib/types";

type ReportRow = PublicRecentReport | MyReportRow;

interface ReportTableProps {
  reports: ReportRow[];
  mode?: "public" | "private";
  onEdit?: (report: MyReportRow) => void;
  onDelete?: (report: MyReportRow) => void;
}

const conditionTones: Record<Condition, BadgeTone> = {
  excellent: "mint",
  good: "sky",
  fair: "gold",
  poor: "danger",
};

export function ReportTable({ reports, mode = "public", onEdit, onDelete }: ReportTableProps) {
  if (reports.length === 0) {
    return (
      <EmptyState
        title="No reports yet"
        message="Reports appear here as members log airport lot observations."
      />
    );
  }

  const rows = reports.map((report, index) => ({ row: normalizeReport(report), original: report, index }));
  const isPrivate = mode === "private";

  return (
    <>
      {/* Card layout — mobile and tablet */}
      <div className="stagger grid gap-4 sm:grid-cols-2 lg:hidden">
        {rows.map(({ row, original, index }) => (
          <ReportCard
            key={`${row.airport}-${row.model}-${row.observed}-${index}`}
            row={row}
            mode={mode}
            onEdit={isPrivate && onEdit ? () => onEdit(original as MyReportRow) : undefined}
            onDelete={isPrivate && onDelete ? () => onDelete(original as MyReportRow) : undefined}
          />
        ))}
      </div>

      {/* Table layout — desktop */}
      <div className="table-wrap hidden lg:block">
        <table className="table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Airport</th>
              <th>Company</th>
              <th>Mileage</th>
              <th>Ext / Int</th>
              <th>{isPrivate ? "Observed" : "Spotted"}</th>
              {isPrivate && (onEdit || onDelete) ? <th className="text-right">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ row, original, index }) => (
              <tr key={`${row.airport}-${row.model}-${row.observed}-${index}`}>
                <td>
                  <div className="flex items-center gap-2.5">
                    <CarMakeBadge make={row.make} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink">
                        {row.year ? `${row.year} ` : ""}
                        {row.model}
                      </p>
                      {row.licensePlate ? (
                        <p className="hint uppercase tracking-wide">
                          {row.licensePlateState ? `${row.licensePlateState} · ` : ""}
                          {row.licensePlate}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="font-semibold">{row.airport}</td>
                <td>{row.company}</td>
                <td className="whitespace-nowrap">{formatMileage(row.mileage)}</td>
                <td>
                  <div className="flex flex-col gap-1">
                    {row.exterior ? (
                      <Badge tone={conditionTones[row.exterior]} className="w-fit whitespace-nowrap">
                        {formatCondition(row.exterior)}
                      </Badge>
                    ) : null}
                    {row.interior ? (
                      <Badge tone={conditionTones[row.interior]} className="w-fit whitespace-nowrap opacity-70">
                        {formatCondition(row.interior)}
                      </Badge>
                    ) : null}
                  </div>
                </td>
                <td className="whitespace-nowrap">{formatDate(row.observed)}</td>
                {isPrivate && (onEdit || onDelete) ? (
                  <td>
                    <div className="flex justify-end gap-1">
                      {onEdit ? (
                        <IconButton
                          label="Edit report"
                          icon={<Pencil className="h-3.5 w-3.5" />}
                          onClick={() => onEdit(original as MyReportRow)}
                        />
                      ) : null}
                      {onDelete ? (
                        <IconButton
                          label="Delete report"
                          icon={<Trash2 className="h-3.5 w-3.5" />}
                          onClick={() => onDelete(original as MyReportRow)}
                          style={{ color: "var(--danger)" }}
                        />
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ReportCard({
  row,
  mode,
  onEdit,
  onDelete,
}: {
  row: NormalizedReport;
  mode: "public" | "private";
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <Card hover as="article" className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <CarMakeBadge make={row.make} size="sm" />
          <p className="mt-2 truncate text-base font-extrabold tracking-tight">
            {row.year ? `${row.year} ` : ""}
            {row.model}
          </p>
        </div>
        {onEdit || onDelete ? (
          <div className="flex shrink-0 gap-1">
            {onEdit ? (
              <IconButton label="Edit report" icon={<Pencil className="h-3.5 w-3.5" />} onClick={onEdit} />
            ) : null}
            {onDelete ? (
              <IconButton
                label="Delete report"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={onDelete}
                style={{ color: "var(--danger)" }}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      <dl className="muted mt-3 space-y-1.5 text-sm">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden="true" />
          <span className="truncate">{row.airport}</span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden="true" />
          <span className="truncate">{row.company}</span>
        </div>
        <div className="flex items-center gap-2">
          <Gauge className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden="true" />
          <span>{formatMileage(row.mileage)}</span>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {row.exterior ? (
          <Badge tone={conditionTones[row.exterior]}>Ext {formatCondition(row.exterior)}</Badge>
        ) : null}
        {row.interior ? (
          <Badge tone={conditionTones[row.interior]}>Int {formatCondition(row.interior)}</Badge>
        ) : null}
        {row.tireCondition ? <Badge tone="neutral">{formatTireCondition(row.tireCondition)}</Badge> : null}
        {row.drivetrain ? <Badge tone="neutral">{formatDrivetrain(row.drivetrain)}</Badge> : null}
        {row.licensePlate ? (
          <Badge tone="neutral" className="uppercase tracking-wide">
            {row.licensePlateState ? `${row.licensePlateState} · ` : ""}
            {row.licensePlate}
          </Badge>
        ) : null}
      </div>

      <p className="hint mt-3 flex items-center gap-1.5">
        <CalendarDays className="h-3 w-3" aria-hidden="true" />
        {mode === "private" ? "Observed" : "Spotted"} {formatDate(row.observed)}
      </p>
    </Card>
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
