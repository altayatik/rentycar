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
import { useEffect, useMemo, useState } from "react";
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
import { ReportTable } from "../../components/ReportTable";
import { StatCard } from "../../components/StatCard";
import { fallbackAirportStats } from "../../data/fallbackAirports";
import { formatDate, formatNumber } from "../../lib/formatters";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import type { PublicAirportStats, PublicRecentReport, PublicRegionStats } from "../../lib/types";

export function HomePage() {
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

  const lowestMileageSighting = useMemo(() => {
    const withMileage = recentReports.filter((report) => typeof report.mileage === "number");
    if (!withMileage.length) return null;
    return withMileage.reduce((lowest, report) =>
      (report.mileage ?? Infinity) < (lowest.mileage ?? Infinity) ? report : lowest,
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

  const averageMileage = useMemo(() => {
    const withMileage = recentReports.filter((report) => typeof report.mileage === "number");
    if (!withMileage.length) return null;
    const total = withMileage.reduce((sum, report) => sum + (report.mileage ?? 0), 0);
    return Math.round(total / withMileage.length);
  }, [recentReports]);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-panel sm:p-8">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-teal-100 opacity-60 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-normal text-teal-700">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              RentyCar
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
              Real rental car sightings from airport lots.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              RentyCar is a fun community-style experiment for tracking the actual cars people see at
              rental counters — make, model, mileage, condition, airport, and company.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a className="button-primary" href="#reports">
                View public reports
              </a>
              <Link className="button-secondary" to="/login">
                Sign in if assigned
              </Link>
            </div>
            {!isSupabaseConfigured ? (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Supabase is not configured yet, so the atlas is showing fallback US and Canada airport regions.
              </div>
            ) : null}
          </div>
          <div className="rounded-2xl border border-teal-100 bg-teal-50 p-5">
            <p className="text-sm font-semibold text-teal-900">Early access note</p>
            <p className="mt-2 text-sm leading-6 text-teal-900/80">
              Public browsing is open to everyone. There's no public sign-up yet — report submission
              is limited to manually assigned tester accounts while the project is still taking shape.
            </p>
          </div>
        </div>
      </section>

      <NorthAmericaRegionMap
        airports={airportStats}
        regions={regionStats}
        selectedRegion={selectedRegion}
        onSelectRegion={setSelectedRegion}
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
          />
          <StatCard
            label="Airport lots covered"
            value={formatNumber(airportsCovered)}
            icon={<MapPin className="h-5 w-5" aria-hidden="true" />}
          />
          <StatCard
            label="Rental companies covered"
            value={formatNumber(companyCount)}
            icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
          />
          <StatCard
            label="Regions reporting (US + Canada)"
            value={formatNumber(usRegionsCovered + canadaRegionsCovered)}
            icon={<Map className="h-5 w-5" aria-hidden="true" />}
          />
          <StatCard
            label="Most spotted make"
            value={mostReportedMake ?? "Not enough data yet"}
            icon={<Trophy className="h-5 w-5" aria-hidden="true" />}
          />
          <StatCard
            label="Lowest mileage sighting"
            value={
              lowestMileageSighting
                ? `${formatNumber(lowestMileageSighting.mileage)} mi · ${lowestMileageSighting.make} ${lowestMileageSighting.model}`
                : "Not enough data yet"
            }
            icon={<TrendingDown className="h-5 w-5" aria-hidden="true" />}
          />
          <StatCard
            label="Most active airport"
            value={
              mostActiveAirport
                ? `${mostActiveAirport.iata_code} · ${formatNumber(mostActiveAirport.report_count)} reports`
                : "Not enough data yet"
            }
            icon={<MapPin className="h-5 w-5" aria-hidden="true" />}
          />
          <StatCard
            label="Newest report"
            value={
              newestReport
                ? `${newestReport.make} ${newestReport.model} · ${formatDate(newestReport.observed_date)}`
                : "Not enough data yet"
            }
            icon={<Sparkles className="h-5 w-5" aria-hidden="true" />}
          />
          <StatCard
            label="Average reported mileage"
            value={averageMileage !== null ? `${formatNumber(averageMileage)} mi` : "Not enough data yet"}
            icon={<Gauge className="h-5 w-5" aria-hidden="true" />}
          />
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-panel sm:p-8 lg:grid-cols-[auto_1fr] lg:items-center">
        <CarMakeBadge make={mostReportedMake ?? "RentyCar"} size="lg" />
        <div>
          <h2 className="text-xl font-semibold text-slate-950">The "or similar" decoder</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            Rental listings love the phrase "Toyota Camry or similar." RentyCar exists so you can see
            what "or similar" has actually turned out to mean at real airports, based on what people
            report after picking up their keys.
          </p>
        </div>
      </section>

      <FilterBar
        filters={filters}
        airports={filterOptions.airports}
        companies={filterOptions.companies}
        regions={filterOptions.regions}
        makes={filterOptions.makes}
        models={filterOptions.models}
        onChange={setFilters}
      />

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
          <ReportTable reports={filteredReports} />
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
