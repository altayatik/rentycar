import {
  ArrowRight,
  Building2,
  ClipboardList,
  Gauge,
  MapPin,
  PlusCircle,
  TrendingDown,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  emptyReportFilters,
  FilterBar,
  type AirportFilterOption,
  type ReportFilters,
} from "../../components/FilterBar";
import { NorthAmericaRegionMap, type SelectedRegion } from "../../components/NorthAmericaRegionMap";
import { TerminalScene } from "../../components/TerminalScene";
import {
  Board,
  BoardHeaderRow,
  Button,
  Callout,
  CountUp,
  ErrorState,
  Flaps,
  Reveal,
  SectionHeader,
  Stamp,
  StatCard,
} from "../../components/ui";
import { fallbackAirportStats } from "../../data/fallbackAirports";
import { formatDate, formatMileage, formatNumber } from "../../lib/formatters";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { useAuth } from "../auth/authStore";
import type { PublicAirportStats, PublicRecentReport, PublicRegionStats } from "../../lib/types";

export function HomePage() {
  const { user, profile } = useAuth();
  const [airportStats, setAirportStats] = useState<PublicAirportStats[]>(fallbackAirportStats);
  const [regionStats, setRegionStats] = useState<PublicRegionStats[]>([]);
  const [recentReports, setRecentReports] = useState<PublicRecentReport[]>([]);
  const [companyCount, setCompanyCount] = useState(0);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<ReportFilters>(emptyReportFilters);
  const [selectedRegion, setSelectedRegion] = useState<SelectedRegion | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [searchResults, setSearchResults] = useState<PublicRecentReport[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [catalog, setCatalog] = useState<{ companies: string[]; makes: string[]; models: string[] }>({
    companies: [],
    makes: [],
    models: [],
  });

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const client = supabase;

    const loadPublicData = async () => {
      setLoading(true);
      const [statsResult, regionStatsResult, reportsResult, companiesResult, makesResult, modelsResult] =
        await Promise.all([
          client.from("public_airport_stats").select("*").order("report_count", { ascending: false }),
          client.from("public_region_stats").select("*").order("report_count", { ascending: false }),
          client.from("public_recent_reports").select("*").limit(100),
          // Filter dropdowns are built from the catalogue tables, not from
          // the recent-reports array — that array is capped at 100 rows, so
          // the menus were missing most makes, models and companies.
          client.from("rental_companies").select("name").eq("is_active", true).order("name"),
          client.from("car_makes").select("name").eq("is_active", true).order("name"),
          client.from("car_models").select("name").eq("is_active", true).order("name"),
        ]);

      const loadError =
        statsResult.error ?? regionStatsResult.error ?? reportsResult.error ?? companiesResult.error;
      if (loadError) {
        const isMissingSchema =
          loadError.code === "PGRST205" || loadError.message.toLowerCase().includes("schema cache");
        setError(
          isMissingSchema
            ? "Supabase is connected, but the RentyCar tables and views are not installed yet. Run supabase/schema.sql, then supabase/migrations/0001_open_signup_and_admin.sql."
            : loadError.message,
        );
      } else {
        const stats = (statsResult.data ?? []) as PublicAirportStats[];
        setAirportStats(stats.length ? stats : fallbackAirportStats);
        setRegionStats((regionStatsResult.data ?? []) as PublicRegionStats[]);
        setRecentReports((reportsResult.data ?? []) as PublicRecentReport[]);

        const companyNames = ((companiesResult.data ?? []) as Array<{ name: string }>).map((r) => r.name);
        setCatalog({
          companies: companyNames,
          makes: ((makesResult.data ?? []) as Array<{ name: string }>).map((r) => r.name),
          models: unique(((modelsResult.data ?? []) as Array<{ name: string }>).map((r) => r.name)),
        });
        setCompanyCount(companyNames.length);
      }
      setLoading(false);
    };

    void loadPublicData();
  }, []);

  // Any filter set, or a region picked on the map, means the visitor is
  // searching rather than browsing.
  const isSearching = useMemo(
    () => Object.values(filters).some((value) => value !== "") || selectedRegion !== null,
    [filters, selectedRegion],
  );

  /**
   * Search runs in Postgres, not the browser.
   *
   * It used to filter the `public_recent_reports` array, but that view is
   * capped at 100 rows — anything older simply could not be found. The RPC
   * searches the whole register.
   */
  useEffect(() => {
    if (!supabase || !isSearching) {
      setSearchResults([]);
      setSearchTotal(0);
      return;
    }

    const client = supabase;
    const controller = { cancelled: false };

    const timer = window.setTimeout(async () => {
      setSearching(true);
      const { data, error: rpcError } = await client.rpc("search_public_reports", {
        // The airport datalist fills in "LAS - Las Vegas"; send just the
        // code so an exact IATA match still works.
        airport_q: normalizeAirportQuery(filters.airportQuery),
        company_q: filters.companyQuery || null,
        plate_q: filters.licensePlateQuery || null,
        country_q: selectedRegion?.country || filters.country || null,
        region_q: selectedRegion?.regionCode || (filters.region ? filters.region.split("-")[1] : null),
        make_q: filters.make || null,
        model_q: filters.model || null,
        condition_q: filters.condition || null,
        mileage_min: filters.mileageMin ? Number(filters.mileageMin) : null,
        mileage_max: filters.mileageMax ? Number(filters.mileageMax) : null,
        observed_from: filters.observedFrom || null,
        observed_to: filters.observedTo || null,
        max_rows: 200,
      });

      if (controller.cancelled) return;

      if (rpcError) {
        setSearchError(
          `${rpcError.message} — if this mentions a missing function, run supabase/migrations/0002_public_search.sql.`,
        );
        setSearchResults([]);
        setSearchTotal(0);
      } else {
        const rows = (data ?? []) as Array<PublicRecentReport & { total_matches: number }>;
        setSearchError("");
        setSearchResults(rows);
        setSearchTotal(rows[0]?.total_matches ?? 0);
      }
      setSearching(false);
    }, 260);

    return () => {
      controller.cancelled = true;
      window.clearTimeout(timer);
    };
  }, [filters, selectedRegion, isSearching]);

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
      companies: catalog.companies,
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
      makes: catalog.makes,
      models: catalog.models,
    }),
    [airportStats, catalog, selectedRegion],
  );

  const totalReports = airportStats.reduce((sum, airport) => sum + airport.report_count, 0);
  const airportsCovered = airportStats.filter((airport) => airport.report_count > 0).length;

  const regionsCovered = new Set(
    airportStats.filter((a) => a.report_count > 0 && a.region_code).map((a) => `${a.country}-${a.region_code}`),
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

  const mostActiveAirport = useMemo(
    () =>
      airportStats.filter((a) => a.report_count > 0).sort((a, b) => b.report_count - a.report_count)[0] ?? null,
    [airportStats],
  );

  const newestReport = useMemo(() => {
    if (!recentReports.length) return null;
    return recentReports.reduce((newest, report) =>
      new Date(report.observed_date).getTime() > new Date(newest.observed_date).getTime() ? report : newest,
    );
  }, [recentReports]);

  const visibleRows = showAll ? filteredReports : filteredReports.slice(0, 12);

  const signedOut = !user;

  return (
    <div className="space-y-14">
      {/* ============================ 1 · BOARDING ========================= */}
      {signedOut ? (
        <section className="animate-rise pt-6">
          <div
            className="relative overflow-hidden"
            style={{
              borderRadius: "var(--r-md)",
              borderTop: "3px solid var(--sodium)",
              boxShadow: "var(--sh-board)",
              background: "#16181c",
            }}
          >
            {/* Illustrated lot scene */}
            <div className="absolute inset-0">
              <TerminalScene className="h-full w-full" />
              {/* readability scrim, left-weighted */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(96deg, #121418f2 0%, #12141ae0 38%, #12141a80 62%, transparent 88%)",
                }}
              />
            </div>

            <div className="relative px-6 py-14 sm:px-10 lg:py-20">
              <p className="stencil" style={{ color: "var(--sodium)" }}>
                Now boarding · Free to join
              </p>
              <h1 className="h-display mt-4 max-w-2xl" style={{ color: "var(--board-ink)" }}>
                Log what
                <br />
                you <span style={{ color: "var(--sodium)" }}>drove</span>
              </h1>
              <p
                className="mt-5 max-w-lg text-base leading-relaxed"
                style={{ color: "var(--board-ink-2)" }}
              >
                RentyCar is a community register of what&apos;s actually sitting on airport rental
                lots — make, mileage, tyres, dents. Browse it free, or add what you drove.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/signup" className="btn btn-accent btn-lg">
                  Create account
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/login"
                  className="btn btn-lg"
                  style={{ color: "var(--board-ink)", border: "1px solid #ffffff2e" }}
                >
                  Sign in
                </Link>
              </div>

              {/* live counters */}
              <div className="mt-10 flex flex-wrap gap-8">
                {[
                  { label: "Sightings", value: totalReports, accent: "var(--sodium)" },
                  { label: "Airport lots", value: airportsCovered },
                  { label: "Regions", value: regionsCovered },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="stencil" style={{ color: "#8d8a80" }}>
                      {item.label}
                    </p>
                    <p
                      className="odo mt-1 text-3xl"
                      style={{ color: item.accent ?? "var(--board-ink)" }}
                    >
                      <CountUp value={item.value} />
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* Signed in: same illustrated stage, different job to do. */
        <section className="animate-rise pt-6">
          <div
            className="relative overflow-hidden"
            style={{
              borderRadius: "var(--r-md)",
              borderTop: "3px solid var(--sodium)",
              boxShadow: "var(--sh-board)",
              background: "#16181c",
            }}
          >
            <div className="absolute inset-0">
              <TerminalScene className="h-full w-full" />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(96deg, #121418f2 0%, #12141ae0 38%, #12141a80 64%, transparent 90%)",
                }}
              />
            </div>

            <div className="relative px-6 py-12 sm:px-10">
              <p className="stencil" style={{ color: "var(--sodium)" }}>
                Welcome back, {profile?.nickname || profile?.username}
              </p>
              <h1 className="h-display mt-3 max-w-2xl" style={{ color: "var(--board-ink)" }}>
                What&apos;s on
                <br />
                the <span style={{ color: "var(--sodium)" }}>lot</span>
              </h1>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                {profile?.status !== "pending" ? (
                  <Link to="/submit" className="btn btn-accent btn-lg">
                    <PlusCircle className="h-4 w-4" aria-hidden="true" />
                    Log a sighting
                  </Link>
                ) : null}
                <Link
                  to="/stamps"
                  className="btn btn-lg"
                  style={{ color: "var(--board-ink)", border: "1px solid #ffffff2e" }}
                >
                  Your stamp book
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-8">
                {[
                  { label: "Sightings", value: totalReports, accent: "var(--sodium)" },
                  { label: "Airport lots", value: airportsCovered },
                  { label: "Regions", value: regionsCovered },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="stencil" style={{ color: "#8d8a80" }}>
                      {item.label}
                    </p>
                    <p className="odo mt-1 text-3xl" style={{ color: item.accent ?? "var(--board-ink)" }}>
                      <CountUp value={item.value} />
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {error ? <ErrorState title="Could not load the register" message={error} /> : null}

      {!isSupabaseConfigured ? (
        <Callout tone="gold" title="Preview mode">
          Supabase isn&apos;t configured, so the board is showing fallback airport regions.
        </Callout>
      ) : null}

      {/* ============================= 2 · SEARCH ========================= */}
      <Reveal as="section" className="space-y-5">
        <SectionHeader
          eyebrow="Find a car"
          title="Search the register"
          description="Everything below responds to these filters."
        />
        <FilterBar
          filters={filters}
          airports={filterOptions.airports}
          companies={filterOptions.companies}
          regions={filterOptions.regions}
          makes={filterOptions.makes}
          models={filterOptions.models}
          onChange={setFilters}
          resultCount={isSearching ? searchTotal : undefined}
          onSubmit={() =>
            document
              .getElementById(isSearching ? "results" : "board")
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        />

        {/* Results get their own board. They used to be folded into "recent
            sightings", which made it impossible to tell a search result from
            the default feed. */}
        {isSearching ? (
          <div id="results" className="scroll-mt-24">
            {searchError ? <ErrorState title="Search failed" message={searchError} /> : null}

            <Board
              title="Search results"
              subtitle={describeSearch(filters, selectedRegion)}
              actions={
                <div className="flex items-center gap-2">
                  <span className="mono text-[11px] board-dim">
                    {searching ? "Searching…" : `${searchTotal} match${searchTotal === 1 ? "" : "es"}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFilters(emptyReportFilters);
                      setSelectedRegion(null);
                    }}
                    className="mono text-[11px] underline"
                    style={{ color: "var(--sodium)" }}
                  >
                    Clear
                  </button>
                </div>
              }
            >
              <BoardHeaderRow
                columns={["Airport", "Vehicle", "Company", "Odometer", "Condition", "Seen"]}
                hideBelowMd={["Company", "Odometer", "Seen"]}
              />
              {searching ? (
                <div className="px-5 py-8">
                  <p className="mono text-sm board-dim">Searching the register…</p>
                </div>
              ) : searchResults.length ? (
                <div className="flip-stagger">
                  {searchResults.map((report, index) => (
                    <BoardRow
                      key={`${report.airport_code}-${report.model}-${report.observed_date}-${index}`}
                      report={report}
                    />
                  ))}
                </div>
              ) : (
                <div className="px-5 py-10 text-center">
                  <p className="sign text-lg" style={{ color: "var(--board-ink)" }}>
                    Nothing matches
                  </p>
                  <p className="mono mt-1 text-xs board-dim">
                    Try a broader airport, company or date range.
                  </p>
                </div>
              )}
            </Board>
          </div>
        ) : null}
      </Reveal>

      {/* =========================== 3 · TELEMETRY ======================== */}
      <Reveal as="section" className="space-y-5">
        <SectionHeader title="Fleet telemetry" eyebrow="Readouts" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total sightings"
            value={formatNumber(totalReports)}
            icon={<ClipboardList className="h-5 w-5" />}
            tone="sky"
          />
          <StatCard
            label="Airport lots"
            value={formatNumber(airportsCovered)}
            icon={<MapPin className="h-5 w-5" />}
            tone="terra"
          />
          <StatCard
            label="Companies"
            value={formatNumber(companyCount)}
            icon={<Building2 className="h-5 w-5" />}
            tone="lavender"
          />
          <StatCard
            label="Regions live"
            value={formatNumber(regionsCovered)}
            icon={<MapPin className="h-5 w-5" />}
            tone="mint"
          />
          <StatCard
            label="Most spotted"
            value={mostReportedMake ?? "—"}
            sublabel={mostReportedMake ? "make" : "No data"}
            icon={<Trophy className="h-5 w-5" />}
            tone="gold"
          />
          <StatCard
            label="Newest"
            value={newestCar ? String(newestCar.year) : "—"}
            sublabel={newestCar ? `${newestCar.make} ${newestCar.model}` : "No data"}
            icon={<Gauge className="h-5 w-5" />}
            tone="mint"
          />
          <StatCard
            label="Busiest lot"
            value={mostActiveAirport ? mostActiveAirport.iata_code : "—"}
            sublabel={
              mostActiveAirport ? `${formatNumber(mostActiveAirport.report_count)} sightings` : "No data"
            }
            icon={<MapPin className="h-5 w-5" />}
            tone="sky"
          />
          <StatCard
            label="Oldest"
            value={oldestCar ? String(oldestCar.year) : "—"}
            sublabel={oldestCar ? `${oldestCar.make} ${oldestCar.model}` : "No data"}
            icon={<TrendingDown className="h-5 w-5" />}
            tone="terra"
          />
        </div>
      </Reveal>

      {/* ============================== 4 · MAP =========================== */}
      <Reveal as="section" className="space-y-5">
        <SectionHeader
          title="Gate map"
          eyebrow="Where the fleet sits"
          description="Select a region to filter the board below."
          action={
            selectedRegion ? (
              <Button size="sm" variant="secondary" onClick={() => setSelectedRegion(null)}>
                Clear {selectedRegion.regionName}
              </Button>
            ) : null
          }
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
      </Reveal>

      {/* ========================== 5 · THE BOARD ========================= */}
      <Reveal as="section" className="scroll-mt-24 space-y-5">
        <div id="board" />
        <Board
          title="Recent sightings"
          subtitle={
            selectedRegion
              ? `Filtered to ${selectedRegion.regionName}`
              : "Newest first · reporter identities never shown"
          }
          live
          actions={
            <span className="mono text-[11px] board-dim">
              {filteredReports.length} shown
            </span>
          }
        >
          <BoardHeaderRow
            columns={["Airport", "Vehicle", "Company", "Odometer", "Condition", "Seen"]}
            hideBelowMd={["Company", "Odometer", "Seen"]}
          />

          {loading ? (
            <div className="px-5 py-8">
              <p className="mono text-sm board-dim">Loading register…</p>
            </div>
          ) : visibleRows.length ? (
            <div className="flip-stagger">
              {visibleRows.map((report, index) => (
                <BoardRow
                  key={`${report.airport_code}-${report.model}-${report.observed_date}-${index}`}
                  report={report}
                />
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="sign text-lg" style={{ color: "var(--board-ink)" }}>
                No sightings match
              </p>
              <p className="mono mt-1 text-xs board-dim">
                {recentReports.length ? "Try loosening the filters." : "Nothing logged yet."}
              </p>
            </div>
          )}

          {filteredReports.length > 12 ? (
            <button
              type="button"
              onClick={() => setShowAll((value) => !value)}
              className="mono w-full py-3 text-[11px] font-bold uppercase tracking-[0.16em] transition-colors"
              style={{ color: "var(--sodium)", background: "#0b0d10" }}
            >
              {showAll ? "Collapse" : `Show all ${filteredReports.length}`}
            </button>
          ) : null}
        </Board>
      </Reveal>
    </div>
  );
}

function stampTone(condition: string) {
  switch (condition) {
    case "excellent":
      return "go" as const;
    case "good":
      return "go" as const;
    case "fair":
      return "sodium" as const;
    default:
      return "stop" as const;
  }
}

/** One row of the arrivals board. Shared so search results and the recent
 *  feed are rendered identically. */
function BoardRow({ report }: { report: PublicRecentReport }) {
  return (
    <div className="board-row board-grid py-2.5">
      <Flaps text={report.airport_code} size="sm" />

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold" style={{ color: "var(--board-ink)" }}>
          {report.year ? `${report.year} ` : ""}
          {report.make} {report.model}
        </p>
        {report.license_plate ? (
          <p className="mono text-[10px] board-dim">
            {report.license_plate_state ? `${report.license_plate_state} ` : ""}
            {report.license_plate}
          </p>
        ) : null}
      </div>

      <p className="mono hidden truncate text-xs board-dim md:block">{report.rental_company_name}</p>

      <p className="mono hidden text-xs board-amber md:block">
        {report.mileage != null ? formatMileage(report.mileage) : "\u2014"}
      </p>

      <div>
        <Stamp tone={stampTone(report.exterior_condition)}>{report.exterior_condition}</Stamp>
      </div>

      <p className="mono hidden text-[11px] board-dim md:block">{formatDate(report.observed_date)}</p>
    </div>
  );
}

/** Human-readable summary of what is being searched. */
function describeSearch(
  filters: ReportFilters,
  region: SelectedRegion | null,
): string {
  const parts: string[] = [];
  if (filters.airportQuery.trim()) parts.push(`airport "${filters.airportQuery.trim()}"`);
  if (filters.companyQuery.trim()) parts.push(`company "${filters.companyQuery.trim()}"`);
  if (filters.licensePlateQuery.trim()) parts.push(`plate "${filters.licensePlateQuery.trim()}"`);
  if (filters.make) parts.push(filters.make);
  if (filters.model) parts.push(filters.model);
  if (filters.condition) parts.push(`${filters.condition} condition`);
  if (region) parts.push(region.regionName);
  else if (filters.region) parts.push(filters.region.split("-")[1] ?? filters.region);
  if (filters.country) parts.push(filters.country === "CA" ? "Canada" : "US");

  return parts.length ? `Searching ${parts.join(" · ")}` : "Searching the whole register";
}

/**
 * The airport datalist inserts "LAS - Las Vegas". Searching for that whole
 * string against an IATA code matches nothing, which is why picking an
 * airport from the list returned no results. Strip it back to the code.
 */
function normalizeAirportQuery(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const codeFirst = trimmed.match(/^([A-Za-z]{3,4})\s*[-–—]\s*/);
  if (codeFirst) return codeFirst[1].toUpperCase();

  return trimmed;
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
