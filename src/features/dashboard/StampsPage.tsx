import {
  Award,
  BookOpen,
  Building2,
  Calendar,
  Gauge,
  Lock,
  PlaneTakeoff,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { CarMakeBadge } from "../../components/CarMakeBadge";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { formatMonthYear } from "../../lib/formatters";
import { supabase } from "../../lib/supabase";
import type { MyReportRow } from "../../lib/types";
import { useAuth } from "../auth/authStore";
import { useTheme } from "../theme/themeStore";

interface Achievement {
  title: string;
  subtitle: string;
  detail: string;
  icon: ReactNode;
  isUnlocked: boolean;
}

export function StampsPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
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
      .select(
        "*, airports(iata_code, name), rental_companies(name), car_makes(name), car_models(name)",
      )
      .is("deleted_at", null)
      .eq("reporter_id", user.id)
      .order("observed_at", { ascending: false })
      .limit(100);

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
  const achievements = useMemo(() => buildAchievements(reports, stats), [reports, stats]);

  if (loading) {
    return <LoadingState label="Stamping your rental book" tone={isDark ? "dark" : "light"} />;
  }

  if (error) {
    return <ErrorState title="Could not load Stamps" message={error} tone={isDark ? "dark" : "light"} />;
  }

  if (reports.length === 0) {
    return (
      <EmptyState
        title="No stamps yet"
        message="Submit your first rental sighting and your stamp book starts filling up."
        tone={isDark ? "dark" : "light"}
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className={isDark ? "glass-panel p-6" : "panel p-6"}>
        <p className={`text-sm font-semibold uppercase tracking-normal ${isDark ? "text-teal-300" : "text-indigo-700"}`}>
          Stamps
        </p>
        <h1 className={`mt-2 text-3xl font-semibold ${isDark ? "font-display text-white" : "text-slate-950"}`}>
          {reports.length} stamps
        </h1>
        <p className={`mt-2 max-w-2xl ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          Every report adds a little airport-lot memory to your stamp book.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatPill label="Most rented brand" value={stats.favoriteMake} icon={<Award className="h-4 w-4" />} isDark={isDark} />
        <StatPill label="Top company" value={stats.favoriteCompany} icon={<Building2 className="h-4 w-4" />} isDark={isDark} />
        <StatPill label="Top airport" value={stats.favoriteAirport} icon={<PlaneTakeoff className="h-4 w-4" />} isDark={isDark} />
        <StatPill label="Lowest mileage" value={stats.lowestMileage} icon={<Gauge className="h-4 w-4" />} isDark={isDark} />
        <StatPill label="Brands tried" value={String(stats.uniqueMakes)} icon={<Sparkles className="h-4 w-4" />} isDark={isDark} />
        <StatPill label="Latest rental" value={stats.latestRental} icon={<Calendar className="h-4 w-4" />} isDark={isDark} />
      </div>

      <section className={isDark ? "glass-panel p-6" : "panel p-6"}>
        <h2
          className={`flex items-center gap-2 text-lg font-semibold ${
            isDark ? "font-display text-white" : "text-slate-950"
          }`}
        >
          <Award className={`h-5 w-5 ${isDark ? "text-teal-300" : "text-indigo-700"}`} aria-hidden="true" />
          Achievements
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {achievements.map((achievement) => (
            <AchievementTile key={achievement.title} achievement={achievement} isDark={isDark} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className={`text-lg font-semibold ${isDark ? "font-display text-white" : "text-slate-950"}`}>
          Stamp history
        </h2>
        <div className="space-y-2">
          {reports.map((report) => (
            <StampRow key={report.id} report={report} theme={theme} />
          ))}
        </div>
      </section>
    </div>
  );
}

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
    lowestMileage: typeof lowestMileageValue === "number" ? `${lowestMileageValue.toLocaleString()} mi` : "TBD",
    uniqueMakes: new Set(reports.map((r) => r.make_id)).size,
    uniqueAirports: new Set(reports.map((r) => r.airport_id)).size,
    uniqueCompanies: new Set(reports.map((r) => r.rental_company_id)).size,
    latestRental: reports[0] ? formatMonthYear(reports[0].observed_at) : "TBD",
  };
}

function buildAchievements(reports: MyReportRow[], stats: ReturnType<typeof computeStats>): Achievement[] {
  return [
    {
      title: "First Stamp",
      subtitle: "Your stamp book begins.",
      detail: "Submit one rental sighting to unlock your first RentyCar stamp.",
      icon: <Award className="h-5 w-5" />,
      isUnlocked: reports.length >= 1,
    },
    {
      title: "Lot Regular",
      subtitle: "Five sightings logged.",
      detail: "Five reports means you are officially paying attention at the rental counter.",
      icon: <BookOpen className="h-5 w-5" />,
      isUnlocked: reports.length >= 5,
    },
    {
      title: "Airport Hopper",
      subtitle: "Three airports spotted.",
      detail: "Collect stamps from at least three different airports.",
      icon: <PlaneTakeoff className="h-5 w-5" />,
      isUnlocked: stats.uniqueAirports >= 3,
    },
    {
      title: "Brand Collector",
      subtitle: "Five makes tried.",
      detail: "A garage full of variety: log at least five different vehicle makes.",
      icon: <Sparkles className="h-5 w-5" />,
      isUnlocked: stats.uniqueMakes >= 5,
    },
    {
      title: "Company Sampler",
      subtitle: "Three rental companies.",
      detail: "Try sightings from three different rental companies.",
      icon: <Building2 className="h-5 w-5" />,
      isUnlocked: stats.uniqueCompanies >= 3,
    },
    {
      title: "Low-Mile Legend",
      subtitle: "Under 1,000 miles.",
      detail: "Find a rental with fewer than 1,000 miles on the odometer.",
      icon: <Gauge className="h-5 w-5" />,
      isUnlocked: reports.some((r) => (r.mileage ?? Number.MAX_SAFE_INTEGER) < 1000),
    },
    {
      title: "Plug Watcher",
      subtitle: "Electric sighting.",
      detail: "Log a BEV or plug-in hybrid rental sighting.",
      icon: <Zap className="h-5 w-5" />,
      isUnlocked: reports.some((r) => r.fuel_type === "bev" || r.fuel_type === "phev"),
    },
    {
      title: "Clean Find",
      subtitle: "Excellent inside and out.",
      detail: "Spot a rental marked excellent for both exterior and interior condition.",
      icon: <Wand2 className="h-5 w-5" />,
      isUnlocked: reports.some((r) => r.exterior_condition === "excellent" && r.interior_condition === "excellent"),
    },
  ];
}

function mostCommon(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))[0][0];
}

function StatPill({
  label,
  value,
  icon,
  isDark,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  isDark: boolean;
}) {
  return (
    <div className={isDark ? "glass-panel p-4" : "panel p-4"}>
      <div className={`flex items-center gap-2 ${isDark ? "text-teal-300" : "text-indigo-700"}`}>{icon}</div>
      <p className={`mt-2 truncate text-base font-semibold ${isDark ? "text-white" : "text-slate-950"}`}>{value}</p>
      <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
    </div>
  );
}

function AchievementTile({ achievement, isDark }: { achievement: Achievement; isDark: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        isDark
          ? achievement.isUnlocked
            ? "border-teal-400/25 bg-teal-400/10"
            : "border-white/10 bg-white/[0.03]"
          : achievement.isUnlocked
            ? "border-indigo-100 bg-indigo-50"
            : "border-slate-200 bg-slate-50"
      }`}
      title={achievement.detail}
    >
      <span
        className={`inline-flex ${
          isDark
            ? achievement.isUnlocked
              ? "text-teal-300"
              : "text-slate-500"
            : achievement.isUnlocked
              ? "text-indigo-700"
              : "text-slate-400"
        }`}
      >
        {achievement.isUnlocked ? achievement.icon : <Lock className="h-5 w-5" />}
      </span>
      <p className={`mt-2 truncate text-sm font-semibold ${isDark ? "text-white" : "text-slate-950"}`}>
        {achievement.title}
      </p>
      <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{achievement.subtitle}</p>
    </div>
  );
}

function StampRow({ report, theme }: { report: MyReportRow; theme: "light" | "dark" }) {
  const isDark = theme === "dark";
  const make = report.car_makes?.name ?? "Unknown";
  const model = report.car_models?.name ?? "vehicle";
  const title = [report.year, make, model].filter(Boolean).join(" ");
  const subtitle = `${report.rental_companies?.name ?? "Company"} at ${report.airports?.iata_code ?? "Airport"}`;

  return (
    <div className={isDark ? "glass-panel flex items-center gap-3 p-3" : "panel flex items-center gap-3 p-3"}>
      <CarMakeBadge make={make} size="sm" theme={theme} />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-semibold ${isDark ? "text-white" : "text-slate-950"}`}>{title}</p>
        <p className={`truncate text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{subtitle}</p>
      </div>
      <span
        className={`glass-pill ${isDark ? "bg-teal-400/15 text-teal-300" : "bg-indigo-50 text-indigo-700"}`}
      >
        {formatMonthYear(report.observed_at)}
      </span>
    </div>
  );
}
