import {
  Building2,
  ClipboardList,
  Gauge,
  Map,
  MapPin,
  Sparkles,
  TrendingDown,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CarMakeBadge } from "../../components/CarMakeBadge";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import {
  emptyReportFilters,
  FilterBar,
  type AirportFilterOption,
  type ReportFilters,
} from "../../components/FilterBar";
import { LoadingState } from "../../components/LoadingState";
import {
  NorthAmericaRegionMap,
  type SelectedRegion,
} from "../../components/NorthAmericaRegionMap";
import { StatCard } from "../../components/StatCard";
import { fallbackAirportStats } from "../../data/fallbackAirports";
import { formatDate, formatMileage, formatNumber } from "../../lib/formatters";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { useAuth } from "../auth/authStore";
import type { PublicAirportStats, PublicRecentReport, PublicRegionStats } from "../../lib/types";

export function HomePage() {
  const { user } = useAuth();
  const [airportStats, setAirportStats] = useState<PublicAirportStats[]>(fallbackAirportStats);
  const [regionStats, setRegionStats] = useState<PublicRegionStats[]>([]);
  const [recentReports, setRecentReports] = useState<PublicRecentReport[]>([]);
  const [companyCount, setCompanyCount] = useState(0);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<ReportFilters>(emptyReportFilters);
  const [selectedRegion, setSelectedRegion] = useState<SelectedRegion | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const client = supabase;

    const loadPublicData = async () => {
      setLoading(true);
      const [statsResult, regionStatsResult, reportsResult, companiesResult] = await Promise.all([
        client.from("public_airport_stats").select("*").order("report_count", { ascending: false }),
        client.from("public_region_stats").select("*").order("report_count", { ascending: false }),
        client.from("public_recent_reports").select("*").limit(100),
        client.from("rental_companies").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);

      const loadError =
        statsResult.error ?? regionStatsResult.error ?? reportsResult.error ?? companiesResult.error;
      if (loadError) {
        const isMissingSchema =
          loadError.code === "PGRST205" || loadError.message.toLowerCase().includes("schema cache");
        setError(
          isMissingSchema
            ? "Supabase is connected, but RentyCar tables/views are not installed yet. Run supabase/schema.sql and supabase/seed.sql in the Supabase SQL editor."
            : loadError.message,
        );
      } else {
        const stats = (statsResult.data ?? []) as PublicAirportStats[];
        setAirportStats(stats.length ? stats : fallbackAirportStats);
        setRegionStats((regionStatsResult.data ?? []) as PublicRegionStats[]);
        setRecentReports((reportsResult.data ?? []) as PublicRecentReport[]);
        setCompanyCount(companiesResult.count ?? 0);
      }
      setLoading(false);
    };

    void loadPublicData();
  }, []);

  const filteredReports = useMemo(() => {
    return recentReports.filter((report) => {
      const airportNeedle = filters.airportQuery.trim().toLowerCase();
      const companyNeedle = filters.companyQuery.trim().toLowerCase();
      const plateNeedle = filters.licensePlateQuery.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      const regionFilter = filters.region ? filters.region.split("-") : null;
      const mileageMin = filters.mileageMin ? Number(filters.mileageMin) : null;
      const mileageMax = filters.mileageMax ? Number(filters.mileageMax) : null;
      const observedTime = new Date(report.observed_date).getTime();

      return (
        (!airportNeedle ||
          normalizeText([report.airport_code, report.airport_name, report.airport_city].join(" ")).includes(
            normalizeText(airportNeedle),
          )) &&
        (!companyNeedle || normalizeText(report.rental_company_name).includes(normalizeText(companyNeedle))) &&
        (!plateNeedle ||
          (report.license_plate ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").includes(plateNeedle)) &&
        (!filters.country || report.airport_country === filters.country) &&
        (!regionFilter ||
          (report.airport_country === regionFilter[0] && report.airport_region_code === regionFilter[1])) &&
        (!filters.make || report.make === filters.make) &&
        (!filters.model || report.model === filters.model) &&
        (!filters.condition ||
          report.exterior_condition === filters.condition ||
          report.interior_condition === filters.condition) &&
        (mileageMin === null || (report.mileage ?? 0) >= mileageMin) &&
        (mileageMax === null || (report.mileage ?? 0) <= mileageMax) &&
        (!filters.observedFrom || observedTime >= new Date(`${filters.observedFrom}T00:00:00`).getTime()) &&
        (!filters.observedTo || observedTime <= new Date(`${filters.observedTo}T23:59:59`).getTime()) &&
        (!selectedRegion ||
          (report.airport_country === selectedRegion.country &&
            report.airport_region_code === selectedRegion.regionCode))
      );
    });
  }, [recentReports, filters, selectedRegion]);

  const filterOptions = useMemo(
    () => ({
      airports: airportStats
        .filter(
          (airport) =>
            !selectedRegion ||
            (airport.country === selectedRegion.country && airport.region_code === selectedRegion.regionCode),
        )
        .map<AirportFilterOption>((airport) => ({
          code: airport.iata_code,
          name: airport.airport_name,
          city: airport.city,
          country: airport.country,
          regionCode: airport.region_code ?? airport.state,
          regionName: airport.region_name ?? airport.state,
        })),
      companies: unique(recentReports.map((report) => report.rental_company_name)),
      regions: uniqueBy(
        airportStats
          .filter((airport) => airport.region_code && airport.region_name)
          .map((airport) => ({
            key: `${airport.country}-${airport.region_code}`,
            label: `${airport.region_name} (${airport.country === "CA" ? "Canada" : "US"})`,
            country: airport.country,
          })),
        (region) => region.key,
      ).sort((a, b) => a.label.localeCompare(b.label)),
      makes: unique(recentReports.map((report) => report.make)),
      models: unique(recentReports.map((report) => report.model)),
    }),
    [airportStats, recentReports, selectedRegion],
  );

  const totalReports = airportStats.reduce((sum, airport) => sum + airport.report_count, 0);
  const airportsCovered = airportStats.filter((airport) => airport.report_count > 0).length;
  const usRegionsCovered = new Set(
    airportStats
      .filter((airport) => airport.country === "US" && airport.report_count > 0 && airport.region_code)
      .map((airport) => airport.region_code),
  ).size;
  const canadaRegionsCovered = new Set(
    airportStats
      .filter((airport) => airport.country === "CA" && airport.report_count > 0 && airport.region_code)
      .map((airport) => airport.region_code),
  ).size;
  const mostReportedMake = useMemo(() => {
    const counts = recentReports.reduce<Record<string, number>>((acc, report) => {
      acc[report.make] = (acc[report.make] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }, [recentReports]);

  const newestCar = useMemo(() => {
    const withYear = recentReports.filter((report) => typeof report.year === "number");
    if (!withYear.length) return null;
    return withYear.reduce((newest, report) => ((report.year ?? 0) > (newest.year ?? 0) ? report : newest));
  }, [recentReports]);

  const oldestCar = useMemo(() => {
    const withYear = recentReports.filter((report) => typeof report.year === "number");
    if (!withYear.length) return null;
    return withYear.reduce((oldest, report) =>
      (report.year ?? Infinity) < (oldest.year ?? Infinity) ? report : oldest,
    );
  }, [recentReports]);

  const mostActiveAirport = useMemo(() => {
    return airportStats.filter((airport) => airport.report_count > 0).sort((a, b) => b.report_count - a.report_count)[0] ?? null;
  }, [airportStats]);

  const newestReport = useMemo(() => {
    if (!recentReports.length) return null;
    return recentReports.reduce((newest, report) =>
      new Date(report.observed_date).getTime() > new Date(newest.observed_date).getTime() ? report : newest,
    );
  }, [recentReports]);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-panel sm:px-6">
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            <h1 className="text-lg font-semibold leading-tight text-slate-950 sm:text-xl">
              RentyCar — real rental car sightings from airport lots.
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <a className="button-primary" href="#reports">
              View public reports
            </a>
            {user ? (
              <Link className="button-secondary" to="/dashboard">
                Go to dashboard
              </Link>
            ) : (
              <Link className="button-secondary" to="/login">
                Sign in if assigned
              </Link>
            )}
          </div>
        </div>
        {!isSupabaseConfigured ? (
          <div className="relative mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Supabase is not configured yet, so the atlas is showing fallback US and Canada airport regions.
          </div>
        ) : null}
      </section>

      <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs leading-5 text-slate-600 sm:text-sm">
        Public browsing is open to everyone. There's no public sign-up yet — report submission is limited
        to manually assigned tester accounts while the project is still taking shape.
      </p>

      <FilterBar
        filters={filters}
        airports={filterOptions.airports}
        companies={filterOptions.companies}
        regions={filterOptions.regions}
        makes={filterOptions.makes}
        models={filterOptions.models}
        onChange={setFilters}
      />

      <NorthAmericaRegionMap
        airports={airportStats}
        regions={regionStats}
        selectedRegion={selectedRegion}
        onSelectRegion={setSelectedRegion}
        allRegionsTotals={{
          reportCount: totalReports,
          airportCount: airportsCovered,
          rentalCompanyCount: companyCount,
          latestReportDate: newestReport?.observed_date ?? null,
        }}
      />

      {error ? <ErrorState message={error} /> : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">Airport lot pulse</h2>
          <p className="mt-1 text-sm text-slate-500">A quick read on what's being spotted right now.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total reports"
            value={formatNumber(totalReports)}
            icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
            tone="indigo"
          />
          <StatCard
            label="Airport lots covered"
            value={formatNumber(airportsCovered)}
            icon={<MapPin className="h-5 w-5" aria-hidden="true" />}
            tone="sky"
          />
          <StatCard
            label="Rental companies covered"
            value={formatNumber(companyCount)}
            icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
            tone="violet"
          />
          <StatCard
            label="Regions reporting (US + Canada)"
            value={formatNumber(usRegionsCovered + canadaRegionsCovered)}
            icon={<Map className="h-5 w-5" aria-hidden="true" />}
            tone="rose"
          />
          <StatCard
            label="Most spotted make"
            value={mostReportedMake ?? "Not enough data yet"}
            icon={<Trophy className="h-5 w-5" aria-hidden="true" />}
            tone="amber"
          />
          <StatCard
            label="Newest car"
            value={newestCar ? `${newestCar.year} ${newestCar.make} ${newestCar.model}` : "Not enough data yet"}
            icon={<Gauge className="h-5 w-5" aria-hidden="true" />}
            tone="teal"
          />
          <StatCard
            label="Most active airport"
            value={
              mostActiveAirport
                ? `${mostActiveAirport.iata_code} · ${formatNumber(mostActiveAirport.report_count)} reports`
                : "Not enough data yet"
            }
            icon={<MapPin className="h-5 w-5" aria-hidden="true" />}
            tone="sky"
          />
          <StatCard
            label="Oldest car"
            value={oldestCar ? `${oldestCar.year} ${oldestCar.make} ${oldestCar.model}` : "Not enough data yet"}
            icon={<TrendingDown className="h-5 w-5" aria-hidden="true" />}
            tone="indigo"
          />
        </div>
      </section>

      <section id="reports" className="space-y-4 scroll-mt-24">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">What people are spotting</h2>
            <p className="mt-1 text-sm text-slate-500">
              Recent sightings from the lot. Reporter identities are never shown publicly.
              {selectedRegion ? ` Filtered to ${selectedRegion.regionName}.` : ""}
            </p>
          </div>
          <p className="text-sm text-slate-500">{filteredReports.length} visible</p>
        </div>
        {loading ? (
          <LoadingState label="Loading public reports" />
        ) : recentReports.length && filteredReports.length ? (
          <AutoScrollFeed reports={filteredReports} />
        ) : selectedRegion ? (
          <EmptyState
            title={`No reports for ${selectedRegion.regionName}`}
            message="No rental car reports yet for this region."
          />
        ) : (
          <EmptyState
            title="No public reports yet"
            message="Once trusted users submit observations, this feed will start filling in."
          />
        )}
      </section>
    </div>
  );
}

const FEED_ROW_HEIGHT = 76;
const FEED_VISIBLE_ROWS = 5;

function AutoScrollFeed({ reports }: { reports: PublicRecentReport[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || reports.length <= FEED_VISIBLE_ROWS) return;

    let frame: number;
    const tick = () => {
      if (!pausedRef.current) {
        node.scrollTop += 0.4;
        const loopPoint = node.scrollHeight / 2;
        if (node.scrollTop >= loopPoint) {
          node.scrollTop -= loopPoint;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reports.length]);

  const loopedReports = reports.length > FEED_VISIBLE_ROWS ? [...reports, ...reports] : reports;

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
      className="overflow-y-hidden rounded-2xl border border-slate-200 bg-white shadow-panel"
      style={{ height: FEED_ROW_HEIGHT * FEED_VISIBLE_ROWS }}
    >
      <ul className="divide-y divide-slate-100">
        {loopedReports.map((report, index) => (
          <li
            key={`${report.airport_code}-${report.model}-${report.observed_date}-${index}`}
            className="flex items-start gap-3 px-4 py-3 sm:px-5"
            style={{ height: FEED_ROW_HEIGHT }}
          >
            <div className="flex h-5 w-28 shrink-0 items-center justify-start overflow-visible">
              <CarMakeBadge make={report.make} size="sm" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-5 text-slate-950">
                {report.year ? `${report.year} ` : ""}
                {report.make} {report.model}
              </p>
              <p className="truncate text-xs leading-5 text-slate-500">
                {report.rental_company_name} at {report.airport_code}
              </p>
            </div>
            <div className="hidden text-right text-xs leading-5 text-slate-500 sm:block">
              <p className="leading-5">{formatMileage(report.mileage)}</p>
              <p className="leading-5">{formatDate(report.observed_date)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function uniqueBy<T>(values: T[], getKey: (value: T) => string) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = getKey(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
