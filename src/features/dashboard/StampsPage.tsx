import {
  Award,
  BookOpen,
  Building2,
  Calendar,
  CircleDot,
  ClipboardList,
  Fuel,
  Gauge,
  Globe2,
  Lock,
  PlaneTakeoff,
  PlusCircle,
  Route,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Wand2,
  Wrench,
  Zap,
} from "lucide-react";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CarMakeBadge } from "../../components/CarMakeBadge";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  Reveal,
  Ring,
  SectionHeader,
  cx,
} from "../../components/ui";
import { formatMonthYear } from "../../lib/formatters";
import { supabase } from "../../lib/supabase";
import type { MyReportRow } from "../../lib/types";
import { useAuth } from "../auth/authStore";

interface Milestone {
  title: string;
  detail: string;
  icon: ReactNode;
  isUnlocked: boolean;
  tone: string;
  tint: string;
  /** Shown as the "3/5" pill in the detail dialog. */
  progress: { current: number; target: number };
}

interface MilestoneGroup {
  title: string;
  subtitle: string;
  milestones: Milestone[];
}

export function StampsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<MyReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("vehicle_reports")
      .select("*, airports(iata_code, name), rental_companies(name), car_makes(name), car_models(name)")
      .is("deleted_at", null)
      .eq("reporter_id", user.id)
      .order("observed_at", { ascending: false })
      .limit(200);

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setError("");
      setReports((data ?? []) as MyReportRow[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => computeStats(reports), [reports]);
  const groups = useMemo(() => buildMilestones(reports, stats), [reports, stats]);
  const airportStamps = useMemo(() => buildAirportStamps(reports), [reports]);
  const [selected, setSelected] = useState<Milestone | null>(null);

  const allMilestones = groups.flatMap((group) => group.milestones);
  const unlocked = allMilestones.filter((milestone) => milestone.isUnlocked).length;

  if (loading) return <LoadingState label="Stamping your rental book" rows={4} />;
  if (error) return <ErrorState title="Could not load your stamps" message={error} />;

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="h-5 w-5" />}
        title="Your stamp book is empty"
        message="Log your first rental sighting and the stamps start rolling in."
        action={
          <Link to="/submit" className="btn btn-accent btn-sm">
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            Log a sighting
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-12">
      {/* ------------------------------ Header ----------------------------- */}
      <section className="animate-rise pt-2">
        <Card className="relative overflow-hidden p-6 sm:p-8">
          <div className="relative flex flex-wrap items-center justify-between gap-8">
            <div className="min-w-0">
              <p className="stencil">Quest board</p>
              <h1 className="h-display mt-3">Stamp book</h1>
              <p className="muted mt-3 max-w-lg">
                <strong className="text-ink">{unlocked}</strong> of {allMilestones.length} milestones
                earned — collected across airports, brands and rental desks.
              </p>
            </div>
            <div className="text-center">
              <Ring value={unlocked} max={allMilestones.length} size={116} label="earned" tone="gold" />
            </div>
          </div>
        </Card>
      </section>

      {/* ------------------------------ Readouts --------------------------- */}
      <section className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatPill label="Top brand" value={stats.favoriteMake} icon={<Award className="h-4 w-4" />} tone="var(--runway)" />
        <StatPill label="Top company" value={stats.favoriteCompany} icon={<Building2 className="h-4 w-4" />} tone="var(--runway)" />
        <StatPill label="Top airport" value={stats.favoriteAirport} icon={<PlaneTakeoff className="h-4 w-4" />} tone="var(--sodium)" />
        <StatPill label="Lowest miles" value={stats.lowestMileage} icon={<Gauge className="h-4 w-4" />} tone="var(--go)" />
        <StatPill label="Brands tried" value={String(stats.uniqueMakes)} icon={<Sparkles className="h-4 w-4" />} tone="var(--sodium)" />
        <StatPill label="Latest" value={stats.latestRental} icon={<Calendar className="h-4 w-4" />} tone="var(--runway)" />
      </section>

      {/* ----------------------------- Milestones -------------------------- */}
      {groups.map((group) => {
        const earned = group.milestones.filter((milestone) => milestone.isUnlocked).length;

        return (
          <section key={group.title} className="space-y-4">
            <div
              className="flex flex-wrap items-end justify-between gap-3 pb-3"
              style={{ borderBottom: "1px solid var(--line-2)" }}
            >
              <div>
                <h2 className="h2">{group.title}</h2>
                <p className="muted mt-1 text-sm">{group.subtitle}</p>
              </div>
              <p className="odo text-2xl">
                {earned}
                <span className="muted-2">/{group.milestones.length}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {group.milestones.map((milestone, index) => (
                <MilestoneTile
                  key={milestone.title}
                  milestone={milestone}
                  index={index}
                  onOpen={() => setSelected(milestone)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* --------------------------- Airport stamps ------------------------ */}
      <section className="space-y-5">
        <SectionHeader
          eyebrow="Passport"
          title="Airport stamps"
          description="One stamp per airport you have reported from."
          action={<Badge tone="gold">{airportStamps.length} collected</Badge>}
        />
        <div
          className="grid grid-cols-3 gap-5 p-6 sm:grid-cols-5 lg:grid-cols-7"
          style={{
            background: "var(--paper)",
            border: "1px solid var(--line-2)",
            borderRadius: "var(--r-md)",
            boxShadow: "var(--sh-1)",
          }}
        >
          {airportStamps.map((stamp, index) => (
            <AirportStamp key={stamp.code} stamp={stamp} index={index} />
          ))}
        </div>
      </section>

      <MilestoneDialog milestone={selected} onClose={() => setSelected(null)} />

      {/* ------------------------------ Timeline --------------------------- */}
      <section className="space-y-5">
        <SectionHeader eyebrow="Timeline" title="Every sighting" />
        <div className="space-y-2">
          {reports.map((report) => (
            <StampRow key={report.id} report={report} />
          ))}
        </div>
      </section>
    </div>
  );
}

/* ----------------------------- Milestone tile --------------------------- */

function MilestoneTile({
  milestone,
  index,
  onOpen,
}: {
  milestone: Milestone;
  index: number;
  onOpen: () => void;
}) {
  const unlocked = milestone.isUnlocked;

  return (
    <Reveal delay={index * 0.04} className="h-full">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${milestone.title} — ${unlocked ? "unlocked" : "locked"}`}
        className={cx(
          "milestone flex h-full w-full flex-col items-center justify-center gap-3 px-4 py-6 text-center",
          unlocked && "milestone-earned",
        )}
        style={{
          background: unlocked ? milestone.tint : "#1b1d2108",
          border: `1px solid ${unlocked ? "transparent" : "var(--line-2)"}`,
          opacity: unlocked ? 1 : 0.62,
        }}
        title={milestone.detail}
      >
        <span
          className={cx(
            "milestone-icon flex h-14 w-14 items-center justify-center rounded-[14px]",
            unlocked && "animate-unlock",
          )}
          style={{
            background: unlocked ? milestone.tone : "var(--line-2)",
            color: unlocked ? "#fff" : "var(--ink-4)",
            animationDelay: `${index * 0.05}s`,
          }}
        >
          {unlocked ? milestone.icon : <Lock className="h-5 w-5" />}
        </span>

        <div>
          <p className="text-sm font-bold leading-snug">{milestone.title}</p>
          <p
            className="mono mt-1.5 text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ color: unlocked ? milestone.tone : "var(--ink-4)" }}
          >
            {unlocked ? "Unlocked" : "Locked"}
          </p>
        </div>
      </button>
    </Reveal>
  );
}

/** Detail dialog for a single milestone. */
function MilestoneDialog({
  milestone,
  onClose,
}: {
  milestone: Milestone | null;
  onClose: () => void;
}) {
  const unlocked = milestone?.isUnlocked ?? false;
  const pct = milestone
    ? Math.min(100, Math.round((milestone.progress.current / milestone.progress.target) * 100))
    : 0;

  return (
    <Modal open={Boolean(milestone)} onClose={onClose} title={milestone?.title ?? ""} hideHeader width="max-w-sm">
      {milestone ? (
        <div className="flex flex-col items-center px-2 pb-2 pt-6 text-center">
          <span
            className="animate-unlock flex h-24 w-24 items-center justify-center rounded-[22px]"
            style={{
              background: unlocked
                ? `linear-gradient(160deg, ${milestone.tone}, ${milestone.tone} 40%, #ffffff40)`
                : "var(--line-2)",
              color: unlocked ? "#fff" : "var(--ink-4)",
              boxShadow: unlocked ? "var(--sh-2)" : "none",
            }}
          >
            <span className="scale-[2]">{unlocked ? milestone.icon : <Lock className="h-5 w-5" />}</span>
          </span>

          <p
            className="stencil mt-6"
            style={{ color: unlocked ? milestone.tone : "var(--ink-3)" }}
          >
            {unlocked ? "Unlocked badge" : "Locked badge"}
          </p>

          <h2 className="h1 mt-2">{milestone.title}</h2>
          <p className="muted mt-2 max-w-xs text-sm leading-relaxed">{milestone.detail}</p>

          <div className="mt-6 w-full max-w-[13rem]">
            <div
              className="h-1.5 w-full overflow-hidden rounded-full"
              style={{ background: "var(--line-2)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: unlocked ? milestone.tone : "var(--ink-4)",
                  transition: "width 0.8s var(--ease-out)",
                }}
              />
            </div>
            <span
              className="odo mt-3 inline-block rounded-full px-3 py-1 text-sm"
              style={{
                background: unlocked ? milestone.tint : "#1b1d210f",
                color: unlocked ? milestone.tone : "var(--ink-3)",
              }}
            >
              {Math.min(milestone.progress.current, milestone.progress.target)}/
              {milestone.progress.target}
            </span>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

/* ------------------------------ Milestone data -------------------------- */

const TONES = {
  runway: { tone: "var(--runway)", tint: "var(--runway-tint)" },
  sodium: { tone: "var(--sodium)", tint: "var(--sodium-tint)" },
  go: { tone: "var(--go)", tint: "var(--go-tint)" },
  safety: { tone: "var(--safety)", tint: "var(--safety-tint)" },
};

/** Boolean milestones are simply 0/1. */
const flag = (done: boolean) => ({ current: done ? 1 : 0, target: 1 });

function buildMilestones(reports: MyReportRow[], stats: ReturnType<typeof computeStats>): MilestoneGroup[] {
  const count = reports.length;
  const has = (predicate: (r: MyReportRow) => boolean) => reports.some(predicate);

  const tier = (current: number, target: number, title: string, detail: string, icon: ReactNode, tone: typeof TONES.go) => ({
    title,
    detail,
    icon,
    isUnlocked: current >= target,
    progress: { current, target },
    ...tone,
  });

  const boolean = (done: boolean, title: string, detail: string, icon: ReactNode, tone: typeof TONES.go) => ({
    title,
    detail,
    icon,
    isUnlocked: done,
    progress: flag(done),
    ...tone,
  });

  return [
    {
      title: "The Long Haul",
      subtitle: "Raw sightings, one lot at a time.",
      milestones: [
        tier(count, 1, "First Stamp", "Log one rental sighting.", <Award className="h-5 w-5" />, TONES.go),
        tier(count, 5, "Lot Regular", "Log five sightings.", <BookOpen className="h-5 w-5" />, TONES.go),
        tier(count, 10, "Double Digits", "Log ten sightings.", <Route className="h-5 w-5" />, TONES.sodium),
        tier(count, 25, "Frequent Flyer", "Log twenty-five sightings.", <PlaneTakeoff className="h-5 w-5" />, TONES.safety),
      ],
    },
    {
      title: "Range",
      subtitle: "How wide the net goes.",
      milestones: [
        tier(stats.uniqueAirports, 3, "Airport Hopper", "Report from three different airports.", <PlaneTakeoff className="h-5 w-5" />, TONES.runway),
        tier(stats.uniqueMakes, 5, "Brand Collector", "Log five different vehicle makes.", <Sparkles className="h-5 w-5" />, TONES.runway),
        tier(stats.uniqueCompanies, 3, "Company Sampler", "Log sightings from three rental companies.", <Building2 className="h-5 w-5" />, TONES.runway),
        tier(stats.uniqueAirports, 6, "Coast to Coast", "Report from six or more different airports.", <Globe2 className="h-5 w-5" />, TONES.sodium),
      ],
    },
    {
      title: "Rare Finds",
      subtitle: "The ones worth bragging about.",
      milestones: [
        boolean(has((r) => (r.mileage ?? Number.MAX_SAFE_INTEGER) < 1000), "Low-Mile Legend", "Find a rental under 1,000 miles.", <Gauge className="h-5 w-5" />, TONES.go),
        boolean(has((r) => (r.mileage ?? Number.MAX_SAFE_INTEGER) < 100), "Delivery Mileage", "Find one under 100 miles. Practically new.", <Sparkles className="h-5 w-5" />, TONES.go),
        boolean(has((r) => (r.mileage ?? 0) > 40000), "High Miler", "Find one over 40,000 miles still on the lot.", <Route className="h-5 w-5" />, TONES.safety),
        boolean(has((r) => r.exterior_condition === "excellent" && r.interior_condition === "excellent"), "Clean Find", "Spot one marked excellent inside and out.", <Wand2 className="h-5 w-5" />, TONES.go),
        boolean(has((r) => r.exterior_condition === "poor" || r.interior_condition === "poor"), "Rough Rider", "Log one in poor condition. Somebody has to.", <Wrench className="h-5 w-5" />, TONES.safety),
        boolean(has((r) => r.tire_condition === "almost_bald"), "Bald Truth", "Report a car with almost-bald tyres.", <CircleDot className="h-5 w-5" />, TONES.safety),
        boolean(has((r) => r.tire_condition === "brand_new"), "Fresh Rubber", "Report a car on brand new tyres.", <CircleDot className="h-5 w-5" />, TONES.go),
        boolean(has((r) => r.fuel_level_percent != null && r.fuel_level_percent <= 25), "Running on Fumes", "Catch one handed over under a quarter tank.", <Fuel className="h-5 w-5" />, TONES.sodium),
      ],
    },
    {
      title: "Powertrain",
      subtitle: "What's actually under the bonnet.",
      milestones: [
        boolean(has((r) => r.fuel_type === "bev" || r.fuel_type === "phev"), "Plug Watcher", "Log a battery-electric or plug-in hybrid.", <Zap className="h-5 w-5" />, TONES.sodium),
        boolean(has((r) => r.ev_charging_speed === "dcfc_250" || r.ev_charging_speed === "dcfc_350"), "Fast Charger", "Find an EV rated for 250kW charging or better.", <Zap className="h-5 w-5" />, TONES.go),
        boolean(has((r) => r.fuel_type === "hybrid"), "Hybrid Theory", "Log a traditional hybrid.", <Gauge className="h-5 w-5" />, TONES.go),
        boolean(has((r) => r.fuel_octane === "premium"), "Premium Only", "Find one that demands premium fuel.", <Fuel className="h-5 w-5" />, TONES.sodium),
        boolean(has((r) => r.drivetrain === "awd" || r.drivetrain === "4wd"), "Four Corners", "Log an AWD or 4WD rental.", <Snowflake className="h-5 w-5" />, TONES.runway),
        boolean(has((r) => r.fuel_type === "diesel"), "Diesel Sighting", "Increasingly rare on a US rental lot.", <Fuel className="h-5 w-5" />, TONES.safety),
        boolean(has((r) => r.lane_centering && r.lane_departure_assist && r.adaptive_cruise_control && r.early_collision_prevention), "Full Assist", "Find one with every driver-assist box ticked.", <ShieldCheck className="h-5 w-5" />, TONES.runway),
        boolean(has((r) => !r.lane_centering && !r.lane_departure_assist && !r.adaptive_cruise_control && !r.early_collision_prevention), "Analogue Survivor", "Log one with no driver assistance at all.", <Wrench className="h-5 w-5" />, TONES.sodium),
      ],
    },
    {
      title: "The Details",
      subtitle: "Credit for filling things in properly.",
      milestones: [
        boolean(has((r) => Boolean(r.license_plate)), "Plate Spotter", "Record a licence plate.", <ClipboardList className="h-5 w-5" />, TONES.runway),
        boolean(has((r) => Boolean(r.license_plate_state) && r.license_plate_state !== r.airports?.iata_code), "Out of State", "Find a plate from outside the airport's own region.", <Globe2 className="h-5 w-5" />, TONES.runway),
        boolean(has((r) => r.year != null && r.mileage != null && Boolean(r.tire_condition) && Boolean(r.fuel_type)), "Fully Specced", "File one report with year, mileage, tyres and fuel filled in.", <ClipboardList className="h-5 w-5" />, TONES.go),
        boolean(has((r) => r.year != null && new Date().getFullYear() - r.year >= 5), "Time Traveller", "Log a vehicle five or more model years old.", <Calendar className="h-5 w-5" />, TONES.sodium),
      ],
    },
  ];
}

/* ----------------------------- Airport stamps --------------------------- */

interface AirportStampData {
  code: string;
  name: string;
  count: number;
  first: string;
}

function buildAirportStamps(reports: MyReportRow[]): AirportStampData[] {
  const byCode = new Map<string, AirportStampData>();

  for (const report of reports) {
    const code = report.airports?.iata_code;
    if (!code) continue;

    const existing = byCode.get(code);
    if (existing) {
      existing.count += 1;
      if (new Date(report.observed_at) < new Date(existing.first)) existing.first = report.observed_at;
    } else {
      byCode.set(code, {
        code,
        name: report.airports?.name ?? code,
        count: 1,
        first: report.observed_at,
      });
    }
  }

  return Array.from(byCode.values()).sort(
    (a, b) => new Date(a.first).getTime() - new Date(b.first).getTime(),
  );
}

/** Circular cancellation stamp, tilted a few degrees off-axis. */
function AirportStamp({ stamp, index }: { stamp: AirportStampData; index: number }) {
  const tones = ["var(--sodium)", "var(--runway)", "var(--go)", "var(--safety)"];
  const seed = stamp.code.charCodeAt(0) + stamp.code.charCodeAt(stamp.code.length - 1);
  const color = tones[seed % tones.length];
  // Seeded so a given airport always sits at the same angle.
  const rotation = ((seed % 9) - 4) * 1.6;

  return (
    <Reveal delay={index * 0.03}>
      <div
        className="passport"
        style={{ color, transform: `rotate(${rotation}deg)` }}
        title={`${stamp.name} · ${stamp.count} sighting${stamp.count === 1 ? "" : "s"}`}
      >
        <span className="mono text-[8px] font-bold uppercase tracking-[0.12em] opacity-70">
          {formatMonthYear(stamp.first)}
        </span>
        <span className="sign text-2xl leading-none">{stamp.code}</span>
        <span className="mono text-[8px] font-bold uppercase tracking-[0.1em] opacity-70">
          ×{stamp.count}
        </span>
      </div>
    </Reveal>
  );
}

/* --------------------------------- Stats -------------------------------- */

function computeStats(reports: MyReportRow[]) {
  const makeNames = reports.map((r) => r.car_makes?.name ?? "Unknown");
  const companyNames = reports.map((r) => r.rental_companies?.name ?? "Company");
  const airportCodes = reports.map((r) => r.airports?.iata_code ?? "Airport");

  const lowestMileageValue = reports
    .map((r) => r.mileage)
    .filter((m): m is number => typeof m === "number")
    .sort((a, b) => a - b)[0];

  return {
    favoriteMake: mostCommon(makeNames) ?? "TBD",
    favoriteCompany: mostCommon(companyNames) ?? "TBD",
    favoriteAirport: mostCommon(airportCodes) ?? "TBD",
    lowestMileage:
      typeof lowestMileageValue === "number" ? `${lowestMileageValue.toLocaleString()} mi` : "TBD",
    uniqueMakes: new Set(reports.map((r) => r.make_id)).size,
    uniqueAirports: new Set(reports.map((r) => r.airport_id)).size,
    uniqueCompanies: new Set(reports.map((r) => r.rental_company_id)).size,
    latestRental: reports[0] ? formatMonthYear(reports[0].observed_at) : "TBD",
  };
}

function mostCommon(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

function StatPill({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <div className="bay card-hover relative overflow-hidden p-4">
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: tone, opacity: 0.85 }}
        aria-hidden="true"
      />
      <span className="inline-flex" style={{ color: tone }}>
        {icon}
      </span>
      <p className="mt-2 truncate text-base font-bold" title={value}>
        {value}
      </p>
      <p className="hint">{label}</p>
    </div>
  );
}

function StampRow({ report }: { report: MyReportRow }) {
  const make = report.car_makes?.name ?? "Unknown";
  const model = report.car_models?.name ?? "vehicle";
  const title = [report.year, make, model].filter(Boolean).join(" ");
  const subtitle = `${report.rental_companies?.name ?? "Company"} · ${
    report.airports?.iata_code ?? "Airport"
  }`;

  return (
    <div className="card card-hover flex items-center gap-3 p-3">
      <CarMakeBadge make={make} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{title}</p>
        <p className="hint truncate">{subtitle}</p>
      </div>
      <Badge tone="gold">{formatMonthYear(report.observed_at)}</Badge>
    </div>
  );
}
