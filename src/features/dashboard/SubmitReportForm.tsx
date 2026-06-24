import { Send } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { countryNames } from "../../data/regions";
import { useAuth } from "../auth/authStore";
import { isSupabaseConfigured, supabase, supabaseConfigError } from "../../lib/supabase";
import type { Airport, CarMake, CarModel, RentalCompany } from "../../lib/types";
import { reportSchema, type ReportFormValues } from "../../lib/validators";

type ReportErrors = Partial<Record<keyof ReportFormValues, string>>;

const conditions = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

interface SubmitReportFormProps {
  onSubmitted?: () => void;
}

const initialValues: Record<keyof ReportFormValues, string> = {
  airport_id: "",
  rental_company_id: "",
  make_id: "",
  model_id: "",
  year: String(new Date().getFullYear()),
  trim: "",
  mileage: "",
  exterior_condition: "good",
  interior_condition: "good",
  fuel_or_battery_level: "",
  notes: "",
  photo_url: "",
  observed_at: new Date().toISOString().slice(0, 10),
};

export function SubmitReportForm({ onSubmitted }: SubmitReportFormProps) {
  const { user } = useAuth();
  const [values, setValues] = useState(initialValues);
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

  const filteredModels = useMemo(
    () => models.filter((model) => !values.make_id || model.make_id === values.make_id),
    [models, values.make_id],
  );

  const update = (key: keyof ReportFormValues, value: string) => {
    setValues((current) => ({
      ...current,
      [key]: value,
      ...(key === "make_id" ? { model_id: "" } : {}),
    }));
  };

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
    const { error } = await supabase.from("vehicle_reports").insert({
      reporter_id: user.id,
      airport_id: data.airport_id,
      rental_company_id: data.rental_company_id,
      make_id: data.make_id,
      model_id: data.model_id,
      year: data.year,
      trim: data.trim || null,
      mileage: data.mileage,
      exterior_condition: data.exterior_condition,
      interior_condition: data.interior_condition,
      fuel_or_battery_level: data.fuel_or_battery_level || null,
      notes: data.notes || null,
      photo_url: data.photo_url || null,
      observed_at: new Date(`${data.observed_at}T12:00:00`).toISOString(),
    });

    if (error) {
      setFormError(error.message);
    } else {
      setSuccess("Report submitted.");
      setValues({ ...initialValues, observed_at: new Date().toISOString().slice(0, 10) });
      onSubmitted?.();
    }
    setSubmitting(false);
  };

  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase is not configured"
        message={supabaseConfigError}
      />
    );
  }

  if (loading) {
    return <LoadingState label="Loading report form" />;
  }

  return (
    <form className="panel space-y-6 p-5 sm:p-6" onSubmit={handleSubmit}>
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-xl font-semibold text-slate-950">Submit rental car report</h2>
        <p className="mt-1 text-sm text-slate-500">
          Add an observed vehicle from an airport rental lot.
        </p>
      </div>

      {formError ? <ErrorState title="Could not submit report" message={formError} /> : null}
      {success ? (
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">
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
        />
        <SelectField
          label="Rental company"
          value={values.rental_company_id}
          error={errors.rental_company_id}
          onChange={(value) => update("rental_company_id", value)}
          options={companies.map((company) => ({ value: company.id, label: company.name }))}
        />
        <SelectField
          label="Car make"
          value={values.make_id}
          error={errors.make_id}
          onChange={(value) => update("make_id", value)}
          options={makes.map((make) => ({ value: make.id, label: make.name }))}
        />
        <SelectField
          label="Car model"
          value={values.model_id}
          error={errors.model_id}
          onChange={(value) => update("model_id", value)}
          options={filteredModels.map((model) => ({ value: model.id, label: model.name }))}
        />
        <InputField
          label="Year"
          type="number"
          value={values.year}
          error={errors.year}
          onChange={(value) => update("year", value)}
        />
        <InputField
          label="Trim"
          value={values.trim}
          error={errors.trim}
          onChange={(value) => update("trim", value)}
        />
        <InputField
          label="Mileage"
          type="number"
          value={values.mileage}
          error={errors.mileage}
          onChange={(value) => update("mileage", value)}
        />
        <InputField
          label="Fuel or EV battery level"
          value={values.fuel_or_battery_level}
          error={errors.fuel_or_battery_level}
          onChange={(value) => update("fuel_or_battery_level", value)}
        />
        <SelectField
          label="Exterior condition"
          value={values.exterior_condition}
          error={errors.exterior_condition}
          onChange={(value) => update("exterior_condition", value)}
          options={conditions}
        />
        <SelectField
          label="Interior condition"
          value={values.interior_condition}
          error={errors.interior_condition}
          onChange={(value) => update("interior_condition", value)}
          options={conditions}
        />
        <InputField
          label="Date observed"
          type="date"
          value={values.observed_at}
          error={errors.observed_at}
          onChange={(value) => update("observed_at", value)}
        />
        <InputField
          label="Photo URL"
          value={values.photo_url}
          error={errors.photo_url}
          onChange={(value) => update("photo_url", value)}
        />
      </div>

      <label className="block space-y-1.5">
        <span className="label">Notes</span>
        <textarea
          className="input min-h-28"
          value={values.notes}
          onChange={(event) => update("notes", event.target.value)}
        />
        {errors.notes ? <span className="text-xs text-red-700">{errors.notes}</span> : null}
      </label>

      <button className="button-primary w-full sm:w-auto" type="submit" disabled={submitting}>
        <Send className="h-4 w-4" aria-hidden="true" />
        {submitting ? "Submitting" : "Submit report"}
      </button>
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
}

function SelectField({ label, value, error, options, onChange }: SelectFieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="label">{label}</span>
      <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Choose</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </label>
  );
}

interface GroupedSelectFieldProps {
  label: string;
  value: string;
  error?: string;
  groups: Array<{ label: string; options: Option[] }>;
  onChange: (value: string) => void;
}

function GroupedSelectField({ label, value, error, groups, onChange }: GroupedSelectFieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="label">{label}</span>
      <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
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
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
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
      <span className="label">{label}</span>
      <input className="input" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </label>
  );
}
