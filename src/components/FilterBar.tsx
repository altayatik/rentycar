import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { useState } from "react";
import type { Condition, CountryCode } from "../lib/types";

export interface ReportFilters {
  airportQuery: string;
  companyQuery: string;
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
}: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const update = (key: keyof ReportFilters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const reset = () => onChange(emptyReportFilters);
  const countryRegions = filters.country
    ? regions.filter((region) => region.country === filters.country)
    : regions;

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Search className="h-4 w-4 text-teal-700" aria-hidden="true" />
            Search reports
          </div>
          <p className="mt-1 text-xs text-slate-500">Start with an airport or rental company.</p>
        </div>
        <button className="button-secondary px-3 py-1.5" type="button" onClick={reset}>
          <X className="h-4 w-4" aria-hidden="true" />
          Clear
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_220px_180px]">
        <label className="space-y-1.5">
          <span className="label">Airport</span>
          <input
            className="input"
            list="airport-search-options"
            placeholder="Search airport, city, or IATA code"
            value={filters.airportQuery}
            onChange={(event) => update("airportQuery", event.target.value)}
          />
          <datalist id="airport-search-options">
            {airports.map((airport) => (
              <option
                key={`${airport.country}-${airport.code}`}
                value={`${airport.code} - ${airport.city}`}
              >
                {airport.name}
              </option>
            ))}
          </datalist>
        </label>

        <label className="space-y-1.5">
          <span className="label">Rental company</span>
          <input
            className="input"
            list="company-search-options"
            placeholder="Search rental company"
            value={filters.companyQuery}
            onChange={(event) => update("companyQuery", event.target.value)}
          />
          <datalist id="company-search-options">
            {companies.map((company) => (
              <option key={company} value={company} />
            ))}
          </datalist>
        </label>

        <label className="space-y-1.5">
          <span className="label">Region</span>
          <select className="input" value={filters.region} onChange={(event) => update("region", event.target.value)}>
            <option value="">State or province</option>
            {countryRegions.map((region) => (
              <option key={region.key} value={region.key}>
                {region.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="label">Country</span>
          <select
            className="input"
            value={filters.country}
            onChange={(event) => update("country", event.target.value)}
          >
            <option value="">All</option>
            <option value="US">US</option>
            <option value="CA">Canada</option>
          </select>
        </label>
      </div>

      <button
        className="button-secondary mt-4 px-3 py-1.5"
        type="button"
        onClick={() => setShowAdvanced((current) => !current)}
      >
        {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        Advanced filters
      </button>

      {showAdvanced ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Select label="Car make" value={filters.make} options={makes} onChange={(value) => update("make", value)} />
          <Select label="Car model" value={filters.model} options={models} onChange={(value) => update("model", value)} />
          <label className="space-y-1.5">
            <span className="label">Mileage min</span>
            <input className="input" type="number" value={filters.mileageMin} onChange={(event) => update("mileageMin", event.target.value)} />
          </label>
          <label className="space-y-1.5">
            <span className="label">Mileage max</span>
            <input className="input" type="number" value={filters.mileageMax} onChange={(event) => update("mileageMax", event.target.value)} />
          </label>
          <label className="space-y-1.5">
            <span className="label">Condition</span>
            <select className="input" value={filters.condition} onChange={(event) => update("condition", event.target.value)}>
              <option value="">Any</option>
              {conditionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1.5">
              <span className="label">From</span>
              <input className="input" type="date" value={filters.observedFrom} onChange={(event) => update("observedFrom", event.target.value)} />
            </label>
            <label className="space-y-1.5">
              <span className="label">To</span>
              <input className="input" type="date" value={filters.observedTo} onChange={(event) => update("observedTo", event.target.value)} />
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface SelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

function Select({ label, value, options, onChange }: SelectProps) {
  return (
    <label className="space-y-1.5">
      <span className="label">{label}</span>
      <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
