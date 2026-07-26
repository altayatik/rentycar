import { ChevronDown, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import type { Condition, CountryCode } from "../lib/types";
import { Badge, Button, Field, Select, TextInput, cx } from "./ui";

export interface ReportFilters {
  airportQuery: string;
  companyQuery: string;
  licensePlateQuery: string;
  country: "" | CountryCode;
  region: string;
  make: string;
  model: string;
  condition: "" | Condition;
  mileageMin: string;
  mileageMax: string;
  observedFrom: string;
  observedTo: string;
}

export interface AirportFilterOption {
  code: string;
  name: string;
  city: string;
  country: CountryCode;
  regionCode: string;
  regionName: string;
}

interface FilterBarProps {
  filters: ReportFilters;
  airports: AirportFilterOption[];
  companies: string[];
  regions: Array<{ key: string; label: string; country: CountryCode }>;
  makes: string[];
  models: string[];
  onChange: (filters: ReportFilters) => void;
  /** Live count of matches, shown next to the search button. */
  resultCount?: number;
  /** Jumps to the results. Filtering is live; this is for orientation. */
  onSubmit?: () => void;
}

const conditionOptions: Array<{ value: Condition; label: string }> = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

export const emptyReportFilters: ReportFilters = {
  airportQuery: "",
  companyQuery: "",
  licensePlateQuery: "",
  country: "",
  region: "",
  make: "",
  model: "",
  condition: "",
  mileageMin: "",
  mileageMax: "",
  observedFrom: "",
  observedTo: "",
};

export function FilterBar({
  filters,
  airports,
  companies,
  regions,
  makes,
  models,
  onChange,
  resultCount,
  onSubmit,
}: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const update = (key: keyof ReportFilters, value: string) => onChange({ ...filters, [key]: value });
  const reset = () => onChange(emptyReportFilters);

  const activeCount = useMemo(
    () => Object.values(filters).filter((value) => value !== "").length,
    [filters],
  );

  const countryRegions = filters.country
    ? regions.filter((region) => region.country === filters.country)
    : regions;

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-xs"
            style={{ background: "var(--sodium-tint)", color: "#8a6111" }}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold">Search the register</p>
            <p className="hint">Start with an airport or rental company.</p>
          </div>
          {activeCount > 0 ? <Badge tone="gold">{activeCount} active</Badge> : null}
        </div>
        {activeCount > 0 ? (
          <Button size="sm" variant="ghost" onClick={reset} icon={<RotateCcw className="h-3.5 w-3.5" />}>
            Clear all
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,1fr)_140px]">
        <Field label="Airport">
          {(id) => (
            <>
              <TextInput
                id={id}
                list="airport-search-options"
                placeholder="Airport, city, or IATA"
                value={filters.airportQuery}
                onChange={(event) => update("airportQuery", event.target.value)}
              />
              {/* Value is the bare IATA code. It used to be
                  "LAS - Las Vegas", which then got searched verbatim
                  against the code column and matched nothing. */}
              <datalist id="airport-search-options">
                {airports.map((airport) => (
                  <option key={`${airport.country}-${airport.code}`} value={airport.code}>
                    {airport.city} — {airport.name}
                  </option>
                ))}
              </datalist>
            </>
          )}
        </Field>

        <Field label="Rental company">
          {(id) => (
            <>
              <TextInput
                id={id}
                list="company-search-options"
                placeholder="Hertz, Avis, Turo…"
                value={filters.companyQuery}
                onChange={(event) => update("companyQuery", event.target.value)}
              />
              <datalist id="company-search-options">
                {companies.map((company) => (
                  <option key={company} value={company} />
                ))}
              </datalist>
            </>
          )}
        </Field>

        <Field label="License plate">
          {(id) => (
            <TextInput
              id={id}
              className="uppercase placeholder:normal-case"
              placeholder="Plate number"
              value={filters.licensePlateQuery}
              onChange={(event) => update("licensePlateQuery", event.target.value)}
            />
          )}
        </Field>

        <Field label="Rental location" hint="Airport's state or province">
          {(id) => (
            <Select id={id} value={filters.region} onChange={(event) => update("region", event.target.value)}>
              <option value="">Anywhere</option>
              {countryRegions.map((region) => (
                <option key={region.key} value={region.key}>
                  {region.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Country">
          {(id) => (
            <Select id={id} value={filters.country} onChange={(event) => update("country", event.target.value)}>
              <option value="">All</option>
              <option value="US">US</option>
              <option value="CA">Canada</option>
            </Select>
          )}
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn-accent"
          onClick={() => onSubmit?.()}
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Search
          {typeof resultCount === "number" ? (
            <span
              className="mono ml-1 rounded-[3px] px-1.5 py-0.5 text-[10px]"
              style={{ background: "#241a0526", color: "#241a05" }}
            >
              {resultCount}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setShowAdvanced((current) => !current)}
          aria-expanded={showAdvanced}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Advanced filters
          <ChevronDown
            className={cx("h-3.5 w-3.5 transition-transform duration-300", showAdvanced && "rotate-180")}
            aria-hidden="true"
          />
        </button>

        {activeCount > 0 ? (
          <span className="hint">
            Filtering live — results update as you type.
          </span>
        ) : null}
      </div>

      {showAdvanced ? (
        <div className="animate-rise mt-4 grid gap-3 border-t pt-4 md:grid-cols-2 xl:grid-cols-4" style={{ borderColor: "var(--line)" }}>
          <Field label="Car make">
            {(id) => (
              <Select id={id} value={filters.make} onChange={(event) => update("make", event.target.value)}>
                <option value="">All makes</option>
                {makes.map((make) => (
                  <option key={make} value={make}>
                    {make}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Car model">
            {(id) => (
              <Select id={id} value={filters.model} onChange={(event) => update("model", event.target.value)}>
                <option value="">All models</option>
                {models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Condition">
            {(id) => (
              <Select
                id={id}
                value={filters.condition}
                onChange={(event) => update("condition", event.target.value)}
              >
                <option value="">Any</option>
                {conditionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Miles min">
              {(id) => (
                <TextInput
                  id={id}
                  type="number"
                  min={0}
                  placeholder="0"
                  value={filters.mileageMin}
                  onChange={(event) => update("mileageMin", event.target.value)}
                />
              )}
            </Field>
            <Field label="Miles max">
              {(id) => (
                <TextInput
                  id={id}
                  type="number"
                  min={0}
                  placeholder="Any"
                  value={filters.mileageMax}
                  onChange={(event) => update("mileageMax", event.target.value)}
                />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2 md:col-span-2">
            <Field label="Seen from">
              {(id) => (
                <TextInput
                  id={id}
                  type="date"
                  value={filters.observedFrom}
                  onChange={(event) => update("observedFrom", event.target.value)}
                />
              )}
            </Field>
            <Field label="Seen to">
              {(id) => (
                <TextInput
                  id={id}
                  type="date"
                  value={filters.observedTo}
                  onChange={(event) => update("observedTo", event.target.value)}
                />
              )}
            </Field>
          </div>
        </div>
      ) : null}
    </div>
  );
}
