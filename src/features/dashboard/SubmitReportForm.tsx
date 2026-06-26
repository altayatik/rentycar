import { Send, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { allRegions, countryNames } from "../../data/regions";
import { useAuth } from "../auth/authStore";
import { isSupabaseConfigured, supabase, supabaseConfigError } from "../../lib/supabase";
import type { Airport, CarMake, CarModel, MyReportRow, RentalCompany } from "../../lib/types";
import { reportSchema, type ReportFormValues } from "../../lib/validators";

type ReportErrors = Partial<Record<keyof ReportFormValues, string>>;

function fuelLevelColor(percent: number) {
  const clamped = Math.max(0, Math.min(100, percent));
  const hue = (clamped / 100) * 120; // 0 = red, 120 = green
  return `hsl(${hue}, 80%, 42%)`;
}

const conditions = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

const trimOptions = [
  { value: "entry", label: "Entry" },
  { value: "mid_tier", label: "Mid Tier" },
  { value: "high_tier", label: "High Tier" },
];

const tireConditionOptions = [
  { value: "brand_new", label: "Brand New" },
  { value: "decent", label: "Decent" },
  { value: "almost_bald", label: "Almost Bald" },
];

const drivetrainOptions = [
  { value: "fwd", label: "FWD" },
  { value: "rwd", label: "RWD" },
  { value: "awd", label: "AWD" },
  { value: "4wd", label: "4WD" },
];

const fuelTypeOptions = [
  { value: "gasoline", label: "Gasoline" },
  { value: "phev", label: "Plug-In Hybrid" },
  { value: "hybrid", label: "Traditional Hybrid" },
  { value: "bev", label: "Battery Electric" },
  { value: "hydrogen", label: "Hydrogen" },
  { value: "diesel", label: "Diesel" },
];

const fuelOctaneOptions = [
  { value: "regular", label: "Regular" },
  { value: "midgrade", label: "Midgrade" },
  { value: "premium", label: "Premium" },
];

const evChargingSpeedOptions = [
  { value: "level_2", label: "Level 2" },
  { value: "dcfc_150", label: "DCFC 150kW" },
  { value: "dcfc_250", label: "DCFC 250kW" },
  { value: "dcfc_350", label: "DCFC 350kW" },
];

const adasOptions: Array<{ key: "lane_centering" | "lane_departure_assist" | "adaptive_cruise_control" | "early_collision_prevention"; label: string }> = [
  { key: "lane_centering", label: "Lane centering" },
  { key: "lane_departure_assist", label: "Lane departure assistance" },
  { key: "adaptive_cruise_control", label: "Adaptive cruise control" },
  { key: "early_collision_prevention", label: "Early collision prevention" },
];

interface SubmitReportFormProps {
  onSubmitted?: () => void;
  editingReport?: MyReportRow | null;
  onCancelEdit?: () => void;
}

type AdasKey = "lane_centering" | "lane_departure_assist" | "adaptive_cruise_control" | "early_collision_prevention";

type FormValues = Omit<Record<keyof ReportFormValues, string>, AdasKey> & Record<AdasKey, boolean>;

function reportToFormValues(report: MyReportRow): FormValues {
  return {
    airport_id: report.airport_id ?? "",
    rental_company_id: report.rental_company_id ?? "",
    make_id: report.make_id ?? "",
    model_id: report.model_id ?? "",
    year: report.year != null ? String(report.year) : "",
    trim: report.trim ?? "",
    mileage: report.mileage != null ? String(report.mileage) : "",
    exterior_condition: report.exterior_condition ?? "good",
    interior_condition: report.interior_condition ?? "good",
    tire_condition: report.tire_condition ?? "",
    drivetrain: report.drivetrain ?? "",
    fuel_type: report.fuel_type ?? "",
    fuel_octane: report.fuel_octane ?? "",
    ev_charging_speed: report.ev_charging_speed ?? "",
    fuel_level_percent: report.fuel_level_percent != null ? String(report.fuel_level_percent) : "",
    lane_centering: Boolean(report.lane_centering),
    lane_departure_assist: Boolean(report.lane_departure_assist),
    adaptive_cruise_control: Boolean(report.adaptive_cruise_control),
    early_collision_prevention: Boolean(report.early_collision_prevention),
    license_plate: report.license_plate ?? "",
    license_plate_state: report.license_plate_state ?? "",
    observed_at: report.observed_at ? report.observed_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
  };
}

const initialValues: FormValues = {
  airport_id: "",
  rental_company_id: "",
  make_id: "",
  model_id: "",
  year: "",
  trim: "",
  mileage: "",
  exterior_condition: "good",
  interior_condition: "good",
  tire_condition: "",
  drivetrain: "",
  fuel_type: "",
  fuel_octane: "",
  ev_charging_speed: "",
  fuel_level_percent: "",
  lane_centering: false,
  lane_departure_assist: false,
  adaptive_cruise_control: false,
  early_collision_prevention: false,
  license_plate: "",
  license_plate_state: "",
  observed_at: new Date().toISOString().slice(0, 10),
};

export function SubmitReportForm({ onSubmitted, editingReport, onCancelEdit }: SubmitReportFormProps) {
  const { user } = useAuth();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [airports, setAirports] = useState<Airport[]>([]);
  const [companies, setCompanies] = useState<RentalCompany[]>([]);
  const [makes, setMakes] = useState<CarMake[]>([]);
  const [models, setModels] = useState<CarModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<ReportErrors>({});
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const client = supabase;

    const loadLookups = async () => {
      setLoading(true);
      const [airportResult, companyResult, makeResult, modelResult] = await Promise.all([
        client
          .from("airports")
          .select("*")
          .eq("is_active", true)
          .order("country")
          .order("region_name")
          .order("iata_code"),
        client.from("rental_companies").select("*").eq("is_active", true).order("name"),
        client.from("car_makes").select("*").eq("is_active", true).order("name"),
        client.from("car_models").select("*").eq("is_active", true).order("name"),
      ]);

      const error =
        airportResult.error ?? companyResult.error ?? makeResult.error ?? modelResult.error;
      if (error) {
        setFormError(error.message);
      } else {
        setAirports((airportResult.data ?? []) as Airport[]);
        setCompanies((companyResult.data ?? []) as RentalCompany[]);
        setMakes((makeResult.data ?? []) as CarMake[]);
        setModels((modelResult.data ?? []) as CarModel[]);
      }
      setLoading(false);
    };

    void loadLookups();
  }, []);

  useEffect(() => {
    setErrors({});
    setFormError("");
    setSuccess("");
    setValues(editingReport ? reportToFormValues(editingReport) : initialValues);
  }, [editingReport]);

  const filteredModels = useMemo(
    () => models.filter((model) => !values.make_id || model.make_id === values.make_id),
    [models, values.make_id],
  );

  const update = (key: keyof ReportFormValues, value: string) => {
    setValues((current) => ({
      ...current,
      [key]: value,
      ...(key === "make_id" ? { model_id: "" } : {}),
      ...(key === "fuel_type" ? { fuel_octane: "", ev_charging_speed: "" } : {}),
    }));
  };

  const toggleAdas = (key: "lane_centering" | "lane_departure_assist" | "adaptive_cruise_control" | "early_collision_prevention") => {
    setValues((current) => ({ ...current, [key]: !current[key] }));
  };

  const showOctane = values.fuel_type === "gasoline" || values.fuel_type === "hybrid";
  const showChargingSpeed = values.fuel_type === "bev" || values.fuel_type === "phev";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setFormError("");
    setSuccess("");

    const result = reportSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors(
        Object.fromEntries(
          Object.entries(fieldErrors).map(([key, messages]) => [key, messages?.[0]]),
        ) as ReportErrors,
      );
      return;
    }

    if (!supabase || !user) {
      setFormError("You must be signed in with Supabase configured to submit reports.");
      return;
    }

    setSubmitting(true);
    const data = result.data;
    const observedAt = data.observed_at
      ? new Date(`${data.observed_at}T12:00:00`).toISOString()
      : new Date().toISOString();
    const payload = {
      airport_id: data.airport_id,
      rental_company_id: data.rental_company_id,
      make_id: data.make_id,
      model_id: data.model_id,
      year: data.year ?? null,
      trim: data.trim ?? null,
      mileage: data.mileage ?? null,
      exterior_condition: data.exterior_condition,
      interior_condition: data.interior_condition,
      tire_condition: data.tire_condition ?? null,
      drivetrain: data.drivetrain ?? null,
      fuel_type: data.fuel_type ?? null,
      fuel_octane: showOctane ? data.fuel_octane ?? null : null,
      ev_charging_speed: showChargingSpeed ? data.ev_charging_speed ?? null : null,
      fuel_level_percent: data.fuel_level_percent ?? null,
      lane_centering: values.lane_centering,
      lane_departure_assist: values.lane_departure_assist,
      adaptive_cruise_control: values.adaptive_cruise_control,
      early_collision_prevention: values.early_collision_prevention,
      license_plate: data.license_plate || null,
      license_plate_state: data.license_plate_state || null,
      observed_at: observedAt,
    };

    const { error } = editingReport
      ? await supabase.from("vehicle_reports").update(payload).eq("id", editingReport.id)
      : await supabase.from("vehicle_reports").insert({ ...payload, reporter_id: user.id });

    if (error) {
      setFormError(error.message);
    } else {
      setSuccess(editingReport ? "Report updated." : "Report submitted.");
      if (editingReport) {
        onCancelEdit?.();
      } else {
        setValues({ ...initialValues, observed_at: new Date().toISOString().slice(0, 10) });
      }
      onSubmitted?.();
    }
    setSubmitting(false);
  };

  const stateGroups = useMemo(
    () => [
      {
        label: countryNames.US,
        options: allRegions
          .filter((region) => region.country === "US")
          .map((region) => ({ value: region.code, label: region.name })),
      },
      {
        label: countryNames.CA,
        options: allRegions
          .filter((region) => region.country === "CA")
          .map((region) => ({ value: region.code, label: region.name })),
      },
    ],
    [],
  );

  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase is not configured"
        message={supabaseConfigError}
        tone="dark"
      />
    );
  }

  if (loading) {
    return <LoadingState label="Loading report form" tone="dark" />;
  }

  return (
    <form className="glass-panel space-y-6 p-5 sm:p-6" onSubmit={handleSubmit}>
      <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-white">
            {editingReport ? "Edit rental car report" : "Submit rental car report"}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {editingReport
              ? "Update the details of this report."
              : "Add an observed vehicle from an airport rental lot."}
          </p>
        </div>
        {editingReport ? (
          <button
            type="button"
            className="glass-button-secondary"
            onClick={() => onCancelEdit?.()}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Cancel
          </button>
        ) : null}
      </div>

      {formError ? <ErrorState title="Could not submit report" message={formError} tone="dark" /> : null}
      {success ? (
        <div className="rounded-xl border border-teal-400/20 bg-teal-400/10 p-4 text-sm text-teal-300">
          {success}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <GroupedSelectField
          label="Airport"
          value={values.airport_id}
          error={errors.airport_id}
          onChange={(value) => update("airport_id", value)}
          groups={groupAirports(airports)}
          required
        />
        <SelectField
          label="Rental company"
          value={values.rental_company_id}
          error={errors.rental_company_id}
          onChange={(value) => update("rental_company_id", value)}
          options={companies.map((company) => ({ value: company.id, label: company.name }))}
          required
        />
        <SelectField
          label="Car make"
          value={values.make_id}
          error={errors.make_id}
          onChange={(value) => update("make_id", value)}
          options={makes.map((make) => ({ value: make.id, label: make.name }))}
          required
        />
        <SelectField
          label="Car model"
          value={values.model_id}
          error={errors.model_id}
          onChange={(value) => update("model_id", value)}
          options={filteredModels.map((model) => ({ value: model.id, label: model.name }))}
          required
        />
        <InputField
          label="Year (optional)"
          type="number"
          value={values.year}
          error={errors.year}
          onChange={(value) => update("year", value)}
        />
        <SelectField
          label="Trim (optional)"
          value={values.trim}
          error={errors.trim}
          onChange={(value) => update("trim", value)}
          options={trimOptions}
        />
        <InputField
          label="Mileage (optional)"
          type="number"
          value={values.mileage}
          error={errors.mileage}
          onChange={(value) => update("mileage", value)}
        />
        <InputField
          label="Date observed (optional)"
          type="date"
          value={values.observed_at}
          error={errors.observed_at}
          onChange={(value) => update("observed_at", value)}
        />
        <SelectField
          label="Exterior condition"
          value={values.exterior_condition}
          error={errors.exterior_condition}
          onChange={(value) => update("exterior_condition", value)}
          options={conditions}
          required
        />
        <SelectField
          label="Interior condition"
          value={values.interior_condition}
          error={errors.interior_condition}
          onChange={(value) => update("interior_condition", value)}
          options={conditions}
          required
        />
        <SelectField
          label="Tire condition (optional)"
          value={values.tire_condition}
          error={errors.tire_condition}
          onChange={(value) => update("tire_condition", value)}
          options={tireConditionOptions}
        />
        <SelectField
          label="Drivetrain (optional)"
          value={values.drivetrain}
          error={errors.drivetrain}
          onChange={(value) => update("drivetrain", value)}
          options={drivetrainOptions}
        />
        <SelectField
          label="Fuel type (optional)"
          value={values.fuel_type}
          error={errors.fuel_type}
          onChange={(value) => update("fuel_type", value)}
          options={fuelTypeOptions}
        />
        {showOctane ? (
          <SelectField
            label="Fuel octane (optional)"
            value={values.fuel_octane}
            error={errors.fuel_octane}
            onChange={(value) => update("fuel_octane", value)}
            options={fuelOctaneOptions}
          />
        ) : null}
        {showChargingSpeed ? (
          <SelectField
            label="Max charging speed (optional)"
            value={values.ev_charging_speed}
            error={errors.ev_charging_speed}
            onChange={(value) => update("ev_charging_speed", value)}
            options={evChargingSpeedOptions}
          />
        ) : null}
      </div>

      <label className="block space-y-1.5">
        <span className="glass-label">
          Fuel / battery level{values.fuel_level_percent ? `: ${values.fuel_level_percent}%` : " (optional)"}
        </span>
        <input
          className="w-full"
          style={{
            accentColor: fuelLevelColor(Number(values.fuel_level_percent) || 0),
          }}
          type="range"
          min={0}
          max={100}
          step={1}
          value={values.fuel_level_percent || 0}
          onChange={(event) => update("fuel_level_percent", event.target.value)}
        />
        {errors.fuel_level_percent ? (
          <span className="text-xs text-red-400">{errors.fuel_level_percent}</span>
        ) : null}
      </label>

      <fieldset className="space-y-2">
        <legend className="glass-label">Driver assistance features</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {adasOptions.map((option) => (
            <label key={option.key} className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-teal-400 focus:ring-teal-400"
                checked={values[option.key]}
                onChange={() => toggleAdas(option.key)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 md:grid-cols-2">
        <InputField
          label="License plate (optional)"
          value={values.license_plate}
          error={errors.license_plate}
          onChange={(value) => update("license_plate", value)}
        />
        <GroupedSelectField
          label="License plate state/province (optional)"
          value={values.license_plate_state}
          error={errors.license_plate_state}
          onChange={(value) => update("license_plate_state", value)}
          groups={stateGroups}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="glass-button-primary w-full sm:w-auto"
          type="submit"
          disabled={submitting}
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {submitting ? "Saving" : editingReport ? "Update report" : "Submit report"}
        </button>
        {editingReport ? (
          <button type="button" className="glass-button-secondary" onClick={() => onCancelEdit?.()}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

interface Option {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  error?: string;
  options: Option[];
  onChange: (value: string) => void;
  required?: boolean;
}

function RequiredMark() {
  return (
    <span className="text-red-600" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

function SelectField({ label, value, error, options, onChange, required }: SelectFieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="glass-label">
        {label}
        {required ? <RequiredMark /> : null}
      </span>
      <select className="glass-input" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Choose</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </label>
  );
}

interface GroupedSelectFieldProps {
  label: string;
  value: string;
  error?: string;
  groups: Array<{ label: string; options: Option[] }>;
  onChange: (value: string) => void;
  required?: boolean;
}

function GroupedSelectField({ label, value, error, groups, onChange, required }: GroupedSelectFieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="glass-label">
        {label}
        {required ? <RequiredMark /> : null}
      </span>
      <select className="glass-input" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Choose</option>
        {groups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </label>
  );
}

function groupAirports(airports: Airport[]) {
  const groups = new Map<string, Option[]>();

  for (const airport of airports) {
    const countryName = countryNames[airport.country] ?? airport.country;
    const regionName = airport.region_name ?? airport.state;
    const label = `${countryName} / ${regionName}`;
    const options = groups.get(label) ?? [];
    options.push({
      value: airport.id,
      label: `${airport.iata_code} - ${airport.name}`,
    });
    groups.set(label, options);
  }

  return Array.from(groups.entries()).map(([label, options]) => ({
    label,
    options: options.sort((a, b) => a.label.localeCompare(b.label)),
  }));
}

interface InputFieldProps {
  label: string;
  value: string;
  error?: string;
  type?: string;
  onChange: (value: string) => void;
}

function InputField({ label, value, error, type = "text", onChange }: InputFieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="glass-label">{label}</span>
      <input className="glass-input" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </label>
  );
}
