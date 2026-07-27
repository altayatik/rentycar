import {
  ArrowRight,
  Building2,
  ClipboardList,
  Gauge,
  KeyRound,
  MapPin,
  ScanLine,
  PlusCircle,
  Search,
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

function createPublicCoreRequest() {
  const client = supabase!;
  return Promise.all([
    client.from("public_airport_stats").select("*").order("report_count", { ascending: false }),
    client.from("public_region_stats").select("*").order("report_count", { ascending: false }),
    client.from("public_recent_reports").select("*").limit(100),
    client.from("rental_companies").select("name").eq("is_active", true).order("name"),
  ]);
}

function createSearchCatalogRequest() {
  const client = supabase!;
  return Promise.all([
    client.from("car_makes").select("name").eq("is_active", true).order("name"),
    client.from("car_models").select("name").eq("is_active", true).order("name"),
  ]);
}

// React Strict Mode mounts effects twice in development, and navigating from
// Home to Search mounts this route again. Share in-flight/completed requests
// so those transitions do not repeat the same public reads.
let publicCorePromise: ReturnType<typeof createPublicCoreRequest> | null = null;
let searchCatalogPromise: ReturnType<typeof createSearchCatalogRequest> | null = null;

function getPublicCoreData() {
  publicCorePromise ??= createPublicCoreRequest();
  return publicCorePromise;
}

function getSearchCatalog() {
  searchCatalogPromise ??= createSearchCatalogRequest();
  return searchCatalogPromise;
}

export function HomePage({ view = "home" }: { view?: "home" | "search" }) {
  const isSearchPage = view === "search";
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

    const loadPublicData = async () => {
      setLoading(true);
      const [coreResults, searchCatalogResults] = await Promise.all([
        getPublicCoreData(),
        isSearchPage ? getSearchCatalog() : Promise.resolve(null),
      ]);
      const [statsResult, regionStatsResult, reportsResult, companiesResult] = coreResults;
      const makesResult = searchCatalogResults?.[0];
      const modelsResult = searchCatalogResults?.[1];

      const loadError =
        statsResult.error ??
        regionStatsResult.error ??
        reportsResult.error ??
        companiesResult.error ??
        makesResult?.error ??
        modelsResult?.error;
      if (loadError) {
        publicCorePromise = null;
        if (makesResult?.error || modelsResult?.error) searchCatalogPromise = null;
        const isMissingSchema =
          loadError.code === "PGRST205" || loadError.message.toLowerCase().includes("schema cache");
        setError(
          isMissingSchema
            ? "Supabase is connected, but the RentyCar tables and views are not installed yet. Run supabase/schema.sql, then supabase/migrations/0001_open_signup_and_admin.sql."
            : loadError.message,
        );
      } else {
        setError("");
        const stats = (statsResult.data ?? []) as PublicAirportStats[];
        setAirportStats(stats.length ? stats : fallbackAirportStats);
        setRegionStats((regionStatsResult.data ?? []) as PublicRegionStats[]);
        setRecentReports((reportsResult.data ?? []) as PublicRecentReport[]);

        const companyNames = ((companiesResult.data ?? []) as Array<{ name: string }>).map((r) => r.name);
        setCatalog({
          companies: companyNames,
          makes: ((makesResult?.data ?? []) as Array<{ name: string }>).map((r) => r.name),
          models: unique(((modelsResult?.data ?? []) as Array<{ name: string }>).map((r) => r.name)),
        });
        setCompanyCount(companyNames.length);
      }
      setLoading(false);
    };

    void loadPublicData();
  }, [isSearchPage]);

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
    <div className={isSearchPage ? "search-page-layout search-page-stack" : "space-y-14"}>
      {isSearchPage ? (
        <section className="search-page-hero animate-rise">
          <div>
            <p className="product-kicker"><Search />Fleet search</p>
            <h1>Find what&apos;s been leaving the lot.</h1>
          </div>
          <p>
            Search the community register by airport, rental company, plate, vehicle, condition,
            mileage, or date. Reporter identities always stay private.
          </p>
        </section>
      ) : (
      <section className="atlas-hero main-board-hero animate-rise">
        <div className="atlas-hero-copy">
          <h1>
            Rental cars,
            <span>minus the mystery.</span>
          </h1>
          <p>
            RentyCar maps the actual vehicles leaving airport lots—model, mileage, condition,
            equipment, and rental desk—so “or similar” feels a little less vague.
          </p>
          <div className="atlas-hero-actions">
            {signedOut ? (
              <>
                <Link to="/signup" className="btn btn-accent btn-lg">Create your logbook <ArrowRight /></Link>
                <Link to="/search" className="btn btn-ghost btn-lg"><Search />Search sightings</Link>
              </>
            ) : (
              <>
                {profile?.status !== "pending" ? (
                  <Link to="/submit" className="btn btn-accent btn-lg"><PlusCircle />Log a sighting</Link>
                ) : null}
                <Link to="/dashboard" className="btn btn-secondary btn-lg">Open my logbook</Link>
              </>
            )}
          </div>
          <div className="atlas-hero-stats">
            {[
              ["Sightings", totalReports],
              ["Airports", airportsCovered],
              ["Regions", regionsCovered],
            ].map(([label, value]) => (
              <div key={label}>
                <strong><CountUp value={Number(value)} /></strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <RecentSightingsBoard
          compact
          selectedRegion={selectedRegion}
          filteredReports={filteredReports}
          recentReports={recentReports}
          visibleRows={visibleRows}
          loading={loading}
          showAll={showAll}
          onToggleShowAll={() => setShowAll((value) => !value)}
        />
      </section>
      )}

      {error ? <ErrorState title="Could not load the register" message={error} /> : null}

      {!isSupabaseConfigured ? (
        <Callout tone="gold" title="Preview mode">
          Supabase isn&apos;t configured, so the board is showing fallback airport regions.
        </Callout>
      ) : null}

      {/* ============================= 2 · SEARCH ========================= */}
      {isSearchPage ? (
      <Reveal as="section" className="search-filter-section space-y-4">
        <div id="register-search" className="scroll-mt-24" />
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
              .getElementById(isSearching ? "results" : "gate-map")
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
      ) : null}

      {/* =========================== 3 · TELEMETRY ======================== */}
      {!isSearchPage ? (
      <Reveal as="section" className="home-telemetry space-y-5">
        <SectionHeader title="Fleet telemetry" eyebrow="Readouts" />
        <div className="home-telemetry-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
      ) : null}

      {!isSearchPage ? (
        <Reveal as="section" className="home-how">
          <div className="home-how-heading">
            <p className="product-kicker">From counter to community</p>
            <h2>A better rental picture in under a minute.</h2>
            <p>
              No essays and no perfect memory required. A few useful details turn one rental into
              intelligence for the next traveler.
            </p>
          </div>
          <div className="home-how-steps">
            {[
              {
                icon: KeyRound,
                number: "01",
                title: "Pick up the keys",
                body: "Get the actual car behind the category you booked.",
              },
              {
                icon: ScanLine,
                number: "02",
                title: "Notice the details",
                body: "Mileage, condition, equipment, and the rental desk.",
              },
              {
                icon: MapPin,
                number: "03",
                title: "Pin it to the atlas",
                body: "Your report helps reveal what is really at that airport.",
              },
            ].map(({ icon: Icon, number, title, body }) => (
              <article key={number}>
                <span className="home-how-number">{number}</span>
                <div><Icon /></div>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </Reveal>
      ) : null}

      {/* ============================== 4 · MAP =========================== */}
      {isSearchPage ? (
      <Reveal as="section" className="search-map-section space-y-4">
        <div id="gate-map" className="scroll-mt-24" />
        <SectionHeader
          title="Gate map"
          eyebrow="Where the fleet sits"
          description="Select a region to narrow the search results."
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
      ) : null}
    </div>
  );
}

function RecentSightingsBoard({
  compact = false,
  selectedRegion,
  filteredReports,
  recentReports,
  visibleRows,
  loading,
  showAll,
  onToggleShowAll,
}: {
  compact?: boolean;
  selectedRegion: SelectedRegion | null;
  filteredReports: PublicRecentReport[];
  recentReports: PublicRecentReport[];
  visibleRows: PublicRecentReport[];
  loading: boolean;
  showAll: boolean;
  onToggleShowAll: () => void;
}) {
  const rows = compact ? visibleRows.slice(0, 5) : visibleRows;

  return (
    <Reveal as="section" className={`scroll-mt-24 space-y-5 ${compact ? "hero-sightings" : ""}`}>
      <div id="board" />
      <Board
        className={compact ? "hero-sightings-board" : undefined}
        title="Recent sightings"
        subtitle={
          selectedRegion
            ? `Filtered to ${selectedRegion.regionName}`
            : "Newest first · reporter identities never shown"
        }
        live
        actions={<span className="mono text-[11px] board-dim">{filteredReports.length} shown</span>}
      >
        <BoardHeaderRow
          columns={["Airport", "Vehicle", "Company", "Odometer", "Condition", "Seen"]}
          hideBelowMd={["Company", "Odometer", "Seen"]}
        />

        {loading ? (
          <div className="px-5 py-8">
            <p className="mono text-sm board-dim">Loading register…</p>
          </div>
        ) : rows.length ? (
          <div className="flip-stagger">
            {rows.map((report, index) => (
              <BoardRow
                key={`${report.airport_code}-${report.model}-${report.observed_date}-${index}`}
                report={report}
              />
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="sign text-lg" style={{ color: "var(--board-ink)" }}>No sightings match</p>
            <p className="mono mt-1 text-xs board-dim">
              {recentReports.length ? "Try loosening the filters." : "Nothing logged yet."}
            </p>
          </div>
        )}

        {compact ? (
          <Link to="/search" className="hero-sightings-more">
            View all {filteredReports.length} sightings <ArrowRight />
          </Link>
        ) : filteredReports.length > 12 ? (
          <button
            type="button"
            onClick={onToggleShowAll}
            className="mono w-full py-3 text-[11px] font-bold uppercase tracking-[0.16em] transition-colors"
            style={{ color: "var(--sodium)", background: "#0b0d10" }}
          >
            {showAll ? "Collapse" : `Show all ${filteredReports.length}`}
          </button>
        ) : null}
      </Board>
    </Reveal>
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
