import { Car, Fuel, Gauge, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Button,
  Callout,
  Card,
  ErrorState,
  Field,
  LoadingState,
  Select,
  TextInput,
  Toggle,
  cx,
  useToast,
} from "../../components/ui";
import { allRegions, countryNames } from "../../data/regions";
import { useAuth } from "../auth/authStore";
import { isSupabaseConfigured, supabase, supabaseConfigError } from "../../lib/supabase";
import type { Airport, CarMake, CarModel, MyReportRow, RentalCompany } from "../../lib/types";
import { reportSchema, type ReportFormValues } from "../../lib/validators";

type ReportErrors = Partial<Record<keyof ReportFormValues, string>>;

function fuelLevelColor(percent: number) {
  const clamped = Math.max(0, Math.min(100, percent));
  const hue = (clamped / 100) * 120; // 0 = red, 120 = green
  return `hsl(${hue}, 62%, 42%)`;
}

const conditions = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

const trimOptions = [
  { value: "entry", label: "Entry" },
  { value: "mid_tier", label: "Mid tier" },
  { value: "high_tier", label: "High tier" },
];

const tireConditionOptions = [
  { value: "brand_new", label: "Brand new" },
  { value: "decent", label: "Decent" },
  { value: "almost_bald", label: "Almost bald" },
];

const drivetrainOptions = [
  { value: "fwd", label: "FWD" },
  { value: "rwd", label: "RWD" },
  { value: "awd", label: "AWD" },
  { value: "4wd", label: "4WD" },
];

const fuelTypeOptions = [
  { value: "gasoline", label: "Gasoline" },
  { value: "phev", label: "Plug-in hybrid" },
  { value: "hybrid", label: "Hybrid" },
  { value: "bev", label: "Battery electric" },
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

type AdasKey =
  | "lane_centering"
  | "lane_departure_assist"
  | "adaptive_cruise_control"
  | "early_collision_prevention";

const adasOptions: Array<{ key: AdasKey; label: string }> = [
  { key: "lane_centering", label: "Lane centering" },
  { key: "lane_departure_assist", label: "Lane departure assist" },
  { key: "adaptive_cruise_control", label: "Adaptive cruise control" },
  { key: "early_collision_prevention", label: "Collision prevention" },
];

interface SubmitReportFormProps {
  onSubmitted?: () => void;
  editingReport?: MyReportRow | null;
  onCancelEdit?: () => void;
}

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
    observed_at: report.observed_at
      ? report.observed_at.slice(0, 10)
      : new Date().toISOString().slice(0, 10),
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
  const toast = useToast();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [airports, setAirports] = useState<Airport[]>([]);
  const [companies, setCompanies] = useState<RentalCompany[]>([]);
  const [makes, setMakes] = useState<CarMake[]>([]);
  const [models, setModels] = useState<CarModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<ReportErrors>({});
  const [formError, setFormError] = useState("");

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

      const error = airportResult.error ?? companyResult.error ?? makeResult.error ?? modelResult.error;
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
    setValues(editingReport ? reportToFormValues(editingReport) : initialValues);
  }, [editingReport]);

  const filteredModels = useMemo(
    () => models.filter((model) => !values.make_id || model.make_id === values.make_id),
    [models, values.make_id],
  );

  const airportGroups = useMemo(() => {
    const groups = new Map<string, Airport[]>();
    for (const airport of airports) {
      const key = `${countryNames[airport.country] ?? airport.country} · ${
        airport.region_name ?? airport.state
      }`;
      const bucket = groups.get(key);
      if (bucket) bucket.push(airport);
      else groups.set(key, [airport]);
    }
    return Array.from(groups.entries());
  }, [airports]);

  const update = (key: keyof ReportFormValues, value: string) => {
    setValues((current) => ({
      ...current,
      [key]: value,
      ...(key === "make_id" ? { model_id: "" } : {}),
      ...(key === "fuel_type" ? { fuel_octane: "", ev_charging_speed: "" } : {}),
    }));
  };

  const toggleAdas = (key: AdasKey) =>
    setValues((current) => ({ ...current, [key]: !current[key] }));

  const showOctane = values.fuel_type === "gasoline" || values.fuel_type === "hybrid";
  const showChargingSpeed = values.fuel_type === "bev" || values.fuel_type === "phev";
  const fuelLevel = values.fuel_level_percent === "" ? null : Number(values.fuel_level_percent);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setFormError("");

    const result = reportSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors(
        Object.fromEntries(
          Object.entries(fieldErrors).map(([key, messages]) => [key, messages?.[0]]),
        ) as ReportErrors,
      );
      toast.push("Some fields need attention.", "error");
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

    // `.select()` matters: without it a policy-blocked write returns no
    // error AND no rows, which is how the old silent-failure bug hid.
    const { data: written, error } = editingReport
      ? await supabase.from("vehicle_reports").update(payload).eq("id", editingReport.id).select("id")
      : await supabase
          .from("vehicle_reports")
          .insert({ ...payload, reporter_id: user.id })
          .select("id");

    setSubmitting(false);

    if (error) {
      setFormError(error.message);
      toast.push(error.message, "error");
      return;
    }

    if (!written || written.length === 0) {
      const message =
        "The database accepted the request but saved nothing. Your account is probably still awaiting approval.";
      setFormError(message);
      toast.push(message, "error");
      return;
    }

    toast.push(editingReport ? "Report updated." : "Report logged. Nice find.");
    if (editingReport) {
      onCancelEdit?.();
    } else {
      setValues({ ...initialValues, observed_at: new Date().toISOString().slice(0, 10) });
    }
    onSubmitted?.();
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
    return <ErrorState title="Supabase is not configured" message={supabaseConfigError} />;
  }

  if (loading) {
    return (
      <Card className="p-6">
        <LoadingState label="Loading the report form" rows={4} />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6"
        style={{ borderBottom: "1px solid var(--line)", background: "#4a38220a" }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{
              background: editingReport ? "var(--gold-tint)" : "var(--sky-tint)",
              color: editingReport ? "var(--gold)" : "var(--sky)",
            }}
          >
            {editingReport ? <Sparkles className="h-4 w-4" /> : <Car className="h-4 w-4" />}
          </span>
          <div>
            <p className="text-sm font-extrabold tracking-tight">
              {editingReport ? "Edit report" : "Log a sighting"}
            </p>
            <p className="hint">Only the first four fields are required.</p>
          </div>
        </div>
        {editingReport ? (
          <Button size="sm" variant="ghost" onClick={onCancelEdit} icon={<X className="h-3.5 w-3.5" />}>
            Cancel
          </Button>
        ) : null}
      </div>

      <form className="space-y-6 p-5 sm:p-6" onSubmit={handleSubmit} noValidate>
        {formError ? <ErrorState title="Could not save the report" message={formError} /> : null}

        {/* ---------------------------- Required ---------------------------- */}
        <fieldset className="space-y-4">
          <legend className="eyebrow mb-1">Where and what</legend>

          <Field label="Airport" error={errors.airport_id} required>
            {(id) => (
              <Select
                id={id}
                value={values.airport_id}
                onChange={(event) => update("airport_id", event.target.value)}
                invalid={Boolean(errors.airport_id)}
              >
                <option value="">Choose an airport</option>
                {airportGroups.map(([label, group]) => (
                  <optgroup key={label} label={label}>
                    {group.map((airport) => (
                      <option key={airport.id} value={airport.id}>
                        {airport.iata_code} — {airport.city}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Rental company" error={errors.rental_company_id} required>
            {(id) => (
              <Select
                id={id}
                value={values.rental_company_id}
                onChange={(event) => update("rental_company_id", event.target.value)}
                invalid={Boolean(errors.rental_company_id)}
              >
                <option value="">Choose a company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Make" error={errors.make_id} required>
              {(id) => (
                <Select
                  id={id}
                  value={values.make_id}
                  onChange={(event) => update("make_id", event.target.value)}
                  invalid={Boolean(errors.make_id)}
                >
                  <option value="">Choose a make</option>
                  {makes.map((make) => (
                    <option key={make.id} value={make.id}>
                      {make.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field
              label="Model"
              error={errors.model_id}
              hint={!values.make_id ? "Pick a make first" : undefined}
              required
            >
              {(id) => (
                <Select
                  id={id}
                  value={values.model_id}
                  onChange={(event) => update("model_id", event.target.value)}
                  disabled={!values.make_id}
                  invalid={Boolean(errors.model_id)}
                >
                  <option value="">Choose a model</option>
                  {filteredModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Year" error={errors.year}>
              {(id) => (
                <TextInput
                  id={id}
                  type="number"
                  min={1990}
                  max={2100}
                  placeholder="2024"
                  value={values.year}
                  onChange={(event) => update("year", event.target.value)}
                  invalid={Boolean(errors.year)}
                />
              )}
            </Field>

            <Field label="Mileage" error={errors.mileage}>
              {(id) => (
                <TextInput
                  id={id}
                  type="number"
                  min={0}
                  placeholder="24000"
                  value={values.mileage}
                  onChange={(event) => update("mileage", event.target.value)}
                  invalid={Boolean(errors.mileage)}
                />
              )}
            </Field>

            <Field label="Date seen" error={errors.observed_at}>
              {(id) => (
                <TextInput
                  id={id}
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={values.observed_at}
                  onChange={(event) => update("observed_at", event.target.value)}
                  invalid={Boolean(errors.observed_at)}
                />
              )}
            </Field>
          </div>
        </fieldset>

        <div className="divider" />

        {/* ---------------------------- Condition --------------------------- */}
        <fieldset className="space-y-4">
          <legend className="eyebrow mb-1">Condition</legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <ChipGroup
              label="Exterior"
              value={values.exterior_condition}
              options={conditions}
              onChange={(value) => update("exterior_condition", value)}
              error={errors.exterior_condition}
            />
            <ChipGroup
              label="Interior"
              value={values.interior_condition}
              options={conditions}
              onChange={(value) => update("interior_condition", value)}
              error={errors.interior_condition}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Tires">
              {(id) => (
                <Select
                  id={id}
                  value={values.tire_condition}
                  onChange={(event) => update("tire_condition", event.target.value)}
                >
                  <option value="">Not noted</option>
                  {tireConditionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label="Drivetrain">
              {(id) => (
                <Select
                  id={id}
                  value={values.drivetrain}
                  onChange={(event) => update("drivetrain", event.target.value)}
                >
                  <option value="">Not noted</option>
                  {drivetrainOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label="Trim">
              {(id) => (
                <Select id={id} value={values.trim} onChange={(event) => update("trim", event.target.value)}>
                  <option value="">Not noted</option>
                  {trimOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        </fieldset>

        <div className="divider" />

        {/* ------------------------------ Fuel ------------------------------ */}
        <fieldset className="space-y-4">
          <legend className="eyebrow mb-1 flex items-center gap-1.5">
            <Fuel className="h-3.5 w-3.5" aria-hidden="true" />
            Fuel &amp; charge
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fuel type">
              {(id) => (
                <Select
                  id={id}
                  value={values.fuel_type}
                  onChange={(event) => update("fuel_type", event.target.value)}
                >
                  <option value="">Not noted</option>
                  {fuelTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            {showOctane ? (
              <Field label="Octane">
                {(id) => (
                  <Select
                    id={id}
                    value={values.fuel_octane}
                    onChange={(event) => update("fuel_octane", event.target.value)}
                  >
                    <option value="">Not noted</option>
                    {fuelOctaneOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ) : null}

            {showChargingSpeed ? (
              <Field label="Charging speed">
                {(id) => (
                  <Select
                    id={id}
                    value={values.ev_charging_speed}
                    onChange={(event) => update("ev_charging_speed", event.target.value)}
                  >
                    <option value="">Not noted</option>
                    {evChargingSpeedOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="label flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
                Fuel / battery level
              </span>
              <span
                className="text-sm font-extrabold tabular-nums"
                style={{ color: fuelLevel === null ? "var(--ink-3)" : fuelLevelColor(fuelLevel) }}
              >
                {fuelLevel === null ? "Not noted" : `${fuelLevel}%`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={fuelLevel ?? 50}
              onChange={(event) => update("fuel_level_percent", event.target.value)}
              className="w-full accent-[var(--sky)]"
              aria-label="Fuel or battery level percentage"
            />
            {fuelLevel !== null ? (
              <button
                type="button"
                className="hint font-semibold underline"
                onClick={() => update("fuel_level_percent", "")}
              >
                Clear
              </button>
            ) : null}
          </div>
        </fieldset>

        <div className="divider" />

        {/* ------------------------------ ADAS ------------------------------ */}
        <fieldset className="space-y-3">
          <legend className="eyebrow mb-1 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Driver assistance
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {adasOptions.map((option) => (
              <Toggle
                key={option.key}
                label={option.label}
                checked={values[option.key]}
                onChange={() => toggleAdas(option.key)}
              />
            ))}
          </div>
        </fieldset>

        <div className="divider" />

        {/* ------------------------------ Plate ----------------------------- */}
        <fieldset className="space-y-4">
          <legend className="eyebrow mb-1">License plate (optional)</legend>
          <Callout tone="gold">
            Plates are optional and public. Never submit VINs, reservation numbers, or anyone&apos;s
            personal details.
          </Callout>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Plate number" error={errors.license_plate}>
              {(id) => (
                <TextInput
                  id={id}
                  className="uppercase placeholder:normal-case"
                  placeholder="ABC1234"
                  value={values.license_plate}
                  onChange={(event) => update("license_plate", event.target.value)}
                  invalid={Boolean(errors.license_plate)}
                />
              )}
            </Field>
            <Field label="Plate state / province">
              {(id) => (
                <Select
                  id={id}
                  value={values.license_plate_state}
                  onChange={(event) => update("license_plate_state", event.target.value)}
                >
                  <option value="">Not noted</option>
                  {stateGroups.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map((option) => (
                        <option key={`${group.label}-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            loading={submitting}
            icon={<Send className="h-4 w-4" />}
            sheen
          >
            {submitting
              ? editingReport
                ? "Saving"
                : "Submitting"
              : editingReport
                ? "Save changes"
                : "Submit report"}
          </Button>
          {editingReport ? (
            <Button type="button" variant="secondary" onClick={onCancelEdit}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}

function ChipGroup({
  label,
  value,
  options,
  onChange,
  error,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <span className="label block">{label}</span>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={cx(
                "px-3 py-1.5 text-xs font-bold transition-all duration-200",
                active ? "text-ink" : "text-ink-3 hover:text-ink-2",
              )}
              style={{
                borderRadius: 999,
                background: active ? "var(--sky-tint)" : "var(--paper)",
                border: `1px solid ${active ? "var(--sky)" : "var(--line-2)"}`,
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
