import { MapPinned, MousePointer2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { allRegions, countryNames, regionKey } from "../data/regions";
import { formatDate, formatNumber } from "../lib/formatters";
import type { CountryCode, PublicAirportStats, PublicRegionStats } from "../lib/types";

export interface SelectedRegion {
  country: CountryCode;
  regionCode: string;
  regionName: string;
}

interface NorthAmericaRegionMapProps {
  airports: PublicAirportStats[];
  regions?: PublicRegionStats[];
  selectedRegion: SelectedRegion | null;
  onSelectRegion: (region: SelectedRegion | null) => void;
}

interface RegionStats {
  country: CountryCode;
  regionCode: string;
  regionName: string;
  airportCount: number;
  reportCount: number;
  rentalCompanyCount: number;
  averageMileage: number | null;
  latestReportDate: string | null;
}

interface RegionTile {
  country: CountryCode;
  code: string;
  label: string;
  x: number;
  y: number;
}

const tileWidth = 42;
const tileHeight = 34;

const tiles: RegionTile[] = [
  { country: "CA", code: "YT", label: "YT", x: 62, y: 32 },
  { country: "CA", code: "NT", label: "NT", x: 108, y: 32 },
  { country: "CA", code: "NU", label: "NU", x: 154, y: 32 },
  // Main Canadian row lines up with the US states roughly to their south:
  // BC/WA, AB/MT, SK/ND, MB/MN, ON over the Michigan-Ohio-New York cluster,
  // QC to the east of Ontario, with the Atlantic provinces grouped further east.
  { country: "CA", code: "BC", label: "BC", x: 72, y: 72 },
  { country: "CA", code: "AB", label: "AB", x: 164, y: 72 },
  { country: "CA", code: "SK", label: "SK", x: 210, y: 72 },
  { country: "CA", code: "MB", label: "MB", x: 256, y: 72 },
  { country: "CA", code: "ON", label: "ON", x: 380, y: 72 },
  { country: "CA", code: "QC", label: "QC", x: 480, y: 72 },
  { country: "CA", code: "NL", label: "NL", x: 580, y: 58 },
  { country: "CA", code: "NB", label: "NB", x: 540, y: 112 },
  { country: "CA", code: "NS", label: "NS", x: 586, y: 112 },
  { country: "CA", code: "PE", label: "PE", x: 632, y: 112 },

  { country: "US", code: "WA", label: "WA", x: 72, y: 156 },
  { country: "US", code: "ID", label: "ID", x: 118, y: 196 },
  { country: "US", code: "MT", label: "MT", x: 164, y: 156 },
  { country: "US", code: "ND", label: "ND", x: 210, y: 156 },
  { country: "US", code: "MN", label: "MN", x: 256, y: 156 },
  { country: "US", code: "WI", label: "WI", x: 302, y: 196 },
  { country: "US", code: "MI", label: "MI", x: 348, y: 176 },
  { country: "US", code: "ME", label: "ME", x: 578, y: 156 },

  { country: "US", code: "OR", label: "OR", x: 72, y: 196 },
  { country: "US", code: "NV", label: "NV", x: 118, y: 236 },
  { country: "US", code: "WY", label: "WY", x: 164, y: 196 },
  { country: "US", code: "SD", label: "SD", x: 210, y: 196 },
  { country: "US", code: "IA", label: "IA", x: 256, y: 236 },
  { country: "US", code: "IL", label: "IL", x: 302, y: 236 },
  { country: "US", code: "IN", label: "IN", x: 348, y: 236 },
  { country: "US", code: "OH", label: "OH", x: 394, y: 236 },
  { country: "US", code: "PA", label: "PA", x: 440, y: 216 },
  { country: "US", code: "NY", label: "NY", x: 486, y: 196 },
  { country: "US", code: "VT", label: "VT", x: 532, y: 176 },
  { country: "US", code: "NH", label: "NH", x: 578, y: 196 },
  { country: "US", code: "MA", label: "MA", x: 624, y: 216 },

  { country: "US", code: "CA", label: "CA", x: 72, y: 276 },
  { country: "US", code: "UT", label: "UT", x: 118, y: 276 },
  { country: "US", code: "CO", label: "CO", x: 164, y: 276 },
  { country: "US", code: "NE", label: "NE", x: 210, y: 236 },
  { country: "US", code: "MO", label: "MO", x: 256, y: 276 },
  { country: "US", code: "KY", label: "KY", x: 302, y: 276 },
  { country: "US", code: "WV", label: "WV", x: 348, y: 276 },
  { country: "US", code: "VA", label: "VA", x: 394, y: 276 },
  { country: "US", code: "MD", label: "MD", x: 440, y: 256 },
  { country: "US", code: "DE", label: "DE", x: 486, y: 256 },
  { country: "US", code: "NJ", label: "NJ", x: 532, y: 236 },
  { country: "US", code: "CT", label: "CT", x: 578, y: 236 },
  { country: "US", code: "RI", label: "RI", x: 624, y: 256 },

  { country: "US", code: "AZ", label: "AZ", x: 118, y: 316 },
  { country: "US", code: "NM", label: "NM", x: 164, y: 316 },
  { country: "US", code: "KS", label: "KS", x: 210, y: 276 },
  { country: "US", code: "AR", label: "AR", x: 256, y: 316 },
  { country: "US", code: "TN", label: "TN", x: 302, y: 316 },
  { country: "US", code: "NC", label: "NC", x: 348, y: 316 },
  { country: "US", code: "SC", label: "SC", x: 394, y: 356 },
  { country: "US", code: "DC", label: "DC", x: 486, y: 296 },

  { country: "US", code: "OK", label: "OK", x: 210, y: 316 },
  { country: "US", code: "LA", label: "LA", x: 256, y: 356 },
  { country: "US", code: "MS", label: "MS", x: 302, y: 356 },
  { country: "US", code: "AL", label: "AL", x: 348, y: 356 },
  { country: "US", code: "GA", label: "GA", x: 394, y: 396 },
  { country: "US", code: "FL", label: "FL", x: 440, y: 436 },

  { country: "US", code: "TX", label: "TX", x: 210, y: 356 },
  { country: "US", code: "AK", label: "AK", x: 62, y: 416 },
  { country: "US", code: "HI", label: "HI", x: 154, y: 424 },
];

export function NorthAmericaRegionMap({
  airports,
  regions = [],
  selectedRegion,
  onSelectRegion,
}: NorthAmericaRegionMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<SelectedRegion | null>(null);
  const regionStats = useMemo(() => buildRegionStats(airports, regions), [airports, regions]);
  const activeRegion = hoveredRegion ?? selectedRegion;
  const activeStats = activeRegion
    ? regionStats.get(regionKey(activeRegion.country, activeRegion.regionCode))
    : null;
  const maxReports = Math.max(1, ...Array.from(regionStats.values()).map((stats) => stats.reportCount));

  return (
    <section className="panel overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.35fr)_330px]">
        <div className="min-w-0 bg-[#fbf6e8] p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-indigo-700">Region atlas</p>
              <h2 className="text-xl font-semibold text-slate-950">US and Canada report density</h2>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600">
              <MousePointer2 className="h-3.5 w-3.5 text-indigo-700" aria-hidden="true" />
              Hover or click a region
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white/70 p-3">
            <svg className="block h-auto w-full" viewBox="0 0 720 510" role="img" aria-label="Stylized US and Canada rental car report density map">
              <text x="62" y="24" className="fill-slate-500 text-[13px] font-semibold">
                Canada
              </text>
              <text x="62" y="148" className="fill-slate-500 text-[13px] font-semibold">
                United States
              </text>
              <text x="62" y="408" className="fill-slate-500 text-[11px] font-semibold">
                Insets
              </text>
              {tiles.map((tile) => (
                <RegionTileButton
                  key={`${tile.country}-${tile.code}`}
                  tile={tile}
                  stats={regionStats.get(regionKey(tile.country, tile.code))}
                  maxReports={maxReports}
                  selectedRegion={selectedRegion}
                  onHover={setHoveredRegion}
                  onSelect={onSelectRegion}
                />
              ))}
            </svg>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600">
            <span>Report density</span>
            <LegendSwatch className="bg-slate-100" label="None" />
            <LegendSwatch className="bg-indigo-100" label="Low" />
            <LegendSwatch className="bg-indigo-300" label="Medium" />
            <LegendSwatch className="bg-indigo-600" label="High" />
          </div>
        </div>

        <aside className="border-t border-slate-200 bg-white p-5 lg:border-l lg:border-t-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Selected region</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                {activeRegion?.regionName ?? "All regions"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {activeRegion ? countryNames[activeRegion.country] : "Click a state, province, or territory."}
              </p>
            </div>
            {selectedRegion ? (
              <button className="button-secondary px-3 py-1.5" type="button" onClick={() => onSelectRegion(null)}>
                <X className="h-4 w-4" aria-hidden="true" />
                Clear
              </button>
            ) : null}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Detail label="Reports" value={formatNumber(activeStats?.reportCount ?? 0)} />
            <Detail label="Airports" value={formatNumber(activeStats?.airportCount ?? 0)} />
            <Detail label="Companies" value={formatNumber(activeStats?.rentalCompanyCount ?? 0)} />
            <Detail label="Latest" value={formatDate(activeStats?.latestReportDate)} />
          </div>

          {activeRegion && !activeStats?.reportCount ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No rental car reports yet for this region.
            </div>
          ) : null}

          <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
            <div className="flex items-center gap-2 font-semibold">
              <MapPinned className="h-4 w-4" aria-hidden="true" />
              Regional filter
            </div>
            <p className="mt-2">
              Selecting a region filters the public report table and focuses airport searches on that area.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function RegionTileButton({
  tile,
  stats,
  maxReports,
  selectedRegion,
  onHover,
  onSelect,
}: {
  tile: RegionTile;
  stats?: RegionStats;
  maxReports: number;
  selectedRegion: SelectedRegion | null;
  onHover: (region: SelectedRegion | null) => void;
  onSelect: (region: SelectedRegion) => void;
}) {
  const width = tileWidth;
  const height = tileHeight;
  const isSelected = selectedRegion?.country === tile.country && selectedRegion.regionCode === tile.code;
  const regionName =
    allRegions.find((region) => region.country === tile.country && region.code === tile.code)?.name ?? tile.code;
  const region = { country: tile.country, regionCode: tile.code, regionName };

  return (
    <g
      className="cursor-pointer outline-none"
      role="button"
      tabIndex={0}
      aria-label={`${regionName}: ${stats?.reportCount ?? 0} reports, ${stats?.airportCount ?? 0} airports`}
      onMouseEnter={() => onHover(region)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(region)}
      onBlur={() => onHover(null)}
      onClick={() => onSelect(region)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(region);
        }
      }}
    >
      <rect
        x={tile.x}
        y={tile.y}
        width={width}
        height={height}
        rx={7}
        fill={getRegionFill(stats?.reportCount ?? 0, maxReports)}
        stroke={isSelected ? "#0f172a" : "#ffffff"}
        strokeWidth={isSelected ? 3 : 1.5}
        className="transition duration-150 hover:brightness-95"
      />
      <text
        x={tile.x + width / 2}
        y={tile.y + height / 2 + 5}
        textAnchor="middle"
        className="pointer-events-none select-none fill-slate-800 text-[12px] font-bold"
      >
        {tile.label}
      </text>
      <title>
        {regionName}: {stats?.reportCount ?? 0} reports, {stats?.airportCount ?? 0} airports,{" "}
        {stats?.rentalCompanyCount ?? 0} companies
      </title>
    </g>
  );
}

function buildRegionStats(airports: PublicAirportStats[], regions: PublicRegionStats[]) {
  const stats = new Map<string, RegionStats>();

  for (const region of allRegions) {
    stats.set(regionKey(region.country, region.code), {
      country: region.country,
      regionCode: region.code,
      regionName: region.name,
      airportCount: 0,
      reportCount: 0,
      rentalCompanyCount: 0,
      averageMileage: null,
      latestReportDate: null,
    });
  }

  for (const airport of airports) {
    const key = regionKey(airport.country, airport.region_code ?? airport.state);
    const current = stats.get(key);
    if (!current) continue;

    stats.set(key, {
      ...current,
      airportCount: current.airportCount + 1,
      reportCount: current.reportCount + airport.report_count,
      averageMileage: airport.average_mileage ?? current.averageMileage,
      latestReportDate: latestDate(current.latestReportDate, airport.latest_report_date),
    });
  }

  for (const region of regions) {
    const key = regionKey(region.country, region.region_code);
    const current = stats.get(key);
    stats.set(key, {
      country: region.country,
      regionCode: region.region_code,
      regionName: region.region_name,
      airportCount: region.airport_count,
      reportCount: region.report_count,
      rentalCompanyCount: region.rental_company_count,
      averageMileage: region.average_mileage,
      latestReportDate: region.latest_report_at,
    });
  }

  return stats;
}

function latestDate(left: string | null, right: string | null) {
  if (!left) return right;
  if (!right) return left;
  return new Date(left) > new Date(right) ? left : right;
}

function getRegionFill(reportCount: number, maxReports: number) {
  if (reportCount <= 0) return "#f1f5f9";
  const intensity = reportCount / maxReports;
  if (intensity > 0.66) return "#4338ca";
  if (intensity > 0.33) return "#a5b4fc";
  return "#e0e7ff";
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-6 rounded-full border border-slate-200 ${className}`} />
      {label}
    </span>
  );
}
