import { Edit, RefreshCw, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { formatCondition, formatDate, formatNumber } from "../../lib/formatters";
import { supabase } from "../../lib/supabase";
import type { Airport, CarMake, CarModel, MyReportRow, RentalCompany, RentalCompanyType } from "../../lib/types";

type Tab = "airports" | "companies" | "makes" | "models" | "reports";

const tabs: { id: Tab; label: string }[] = [
  { id: "airports", label: "Airports" },
  { id: "companies", label: "Rental companies" },
  { id: "makes", label: "Car makes" },
  { id: "models", label: "Car models" },
  { id: "reports", label: "Reports" },
];

const emptyAirport = {
  iata_code: "",
  name: "",
  city: "",
  state: "",
  country: "US" as "US" | "CA",
  region_code: "",
  region_name: "",
  latitude: "",
  longitude: "",
  is_commercial: true,
  is_active: true,
};

const emptyNamed = { name: "", type: "traditional_rental" as RentalCompanyType, is_active: true };
const emptyModel = { make_id: "", name: "", is_active: true };

export function AdminPage() {
  const [tab, setTab] = useState<Tab>("airports");
  const [airports, setAirports] = useState<Airport[]>([]);
  const [companies, setCompanies] = useState<RentalCompany[]>([]);
  const [makes, setMakes] = useState<CarMake[]>([]);
  const [models, setModels] = useState<CarModel[]>([]);
  const [reports, setReports] = useState<MyReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    if (!supabase) return;
    setLoading(true);
    setError("");

    const [airportResult, companyResult, makeResult, modelResult, reportResult] = await Promise.all([
      supabase.from("airports").select("*").order("iata_code"),
      supabase.from("rental_companies").select("*").order("name"),
      supabase.from("car_makes").select("*").order("name"),
      supabase.from("car_models").select("*").order("name"),
      supabase
        .from("vehicle_reports")
        .select("*, airports(iata_code, name), rental_companies(name), car_makes(name), car_models(name)")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const loadError =
      airportResult.error ??
      companyResult.error ??
      makeResult.error ??
      modelResult.error ??
      reportResult.error;

    if (loadError) {
      setError(loadError.message);
    } else {
      setAirports((airportResult.data ?? []) as Airport[]);
      setCompanies((companyResult.data ?? []) as RentalCompany[]);
      setMakes((makeResult.data ?? []) as CarMake[]);
      setModels((modelResult.data ?? []) as CarModel[]);
      setReports((reportResult.data ?? []) as MyReportRow[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  return (
    <div className="space-y-6">
      <section className="panel flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-teal-700">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">RentyCar operations</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Manage reference data and moderate submitted rental car reports.
          </p>
        </div>
        <button className="button-secondary self-start sm:self-auto" type="button" onClick={loadData}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </section>

      {error ? <ErrorState message={error} /> : null}

      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-panel">
        {tabs.map((item) => (
          <button
            key={item.id}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
              tab === item.id ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            }`}
            type="button"
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState label="Loading admin data" />
      ) : (
        <>
          {tab === "airports" ? <AirportManager airports={airports} onChanged={loadData} /> : null}
          {tab === "companies" ? (
            <NamedManager
              title="Rental companies"
              table="rental_companies"
              rows={companies}
              onChanged={loadData}
            />
          ) : null}
          {tab === "makes" ? (
            <NamedManager title="Car makes" table="car_makes" rows={makes} onChanged={loadData} />
          ) : null}
          {tab === "models" ? (
            <ModelManager makes={makes} models={models} onChanged={loadData} />
          ) : null}
          {tab === "reports" ? <ReportManager reports={reports} onChanged={loadData} /> : null}
        </>
      )}
    </div>
  );
}

function AirportManager({ airports, onChanged }: { airports: Airport[]; onChanged: () => Promise<void> }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyAirport);
  const [error, setError] = useState("");

  const edit = (airport: Airport) => {
    setEditingId(airport.id);
    setForm({
      iata_code: airport.iata_code,
      name: airport.name,
      city: airport.city,
      state: airport.state,
      country: airport.country,
      region_code: airport.region_code ?? airport.state,
      region_name: airport.region_name ?? airport.state,
      latitude: String(airport.latitude),
      longitude: String(airport.longitude),
      is_commercial: airport.is_commercial,
      is_active: airport.is_active,
    });
  };

  const reset = () => {
    setEditingId(null);
    setForm(emptyAirport);
    setError("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    const payload = {
      iata_code: form.iata_code.trim().toUpperCase(),
      name: form.name.trim(),
      city: form.city.trim(),
      state: form.state.trim().toUpperCase(),
      country: form.country,
      region_code: form.region_code.trim().toUpperCase() || form.state.trim().toUpperCase(),
      region_name: form.region_name.trim() || form.state.trim().toUpperCase(),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      is_commercial: form.is_commercial,
      is_active: form.is_active,
    };

    const result = editingId
      ? await supabase.from("airports").update(payload).eq("id", editingId)
      : await supabase.from("airports").insert(payload);

    if (result.error) {
      setError(result.error.message);
    } else {
      reset();
      await onChanged();
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
      <form className="panel space-y-4 p-5" onSubmit={submit}>
        <h2 className="text-lg font-semibold text-slate-950">{editingId ? "Edit airport" : "Add airport"}</h2>
        {error ? <ErrorState message={error} /> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="IATA" value={form.iata_code} onChange={(value) => setForm({ ...form, iata_code: value })} />
          <label className="block space-y-1.5">
            <span className="label">Country</span>
            <select
              className="input"
              value={form.country}
              onChange={(event) => setForm({ ...form, country: event.target.value as "US" | "CA" })}
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
            </select>
          </label>
          <Field label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} span />
          <Field label="City" value={form.city} onChange={(value) => setForm({ ...form, city: value })} />
          <Field label="State/province code" value={form.state} onChange={(value) => setForm({ ...form, state: value, region_code: value })} />
          <Field
            label="Region name"
            value={form.region_name}
            onChange={(value) => setForm({ ...form, region_name: value })}
          />
          <Field label="Latitude" value={form.latitude} onChange={(value) => setForm({ ...form, latitude: value })} />
          <Field
            label="Longitude"
            value={form.longitude}
            onChange={(value) => setForm({ ...form, longitude: value })}
          />
        </div>
        <ActiveToggle
          label="Commercial passenger airport"
          checked={form.is_commercial}
          onChange={(value) => setForm({ ...form, is_commercial: value })}
        />
        <ActiveToggle checked={form.is_active} onChange={(value) => setForm({ ...form, is_active: value })} />
        <div className="flex gap-2">
          <button className="button-primary" type="submit">
            {editingId ? "Save airport" : "Add airport"}
          </button>
          {editingId ? (
            <button className="button-secondary" type="button" onClick={reset}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="panel overflow-hidden">
        <AdminTable
          headers={["IATA", "Name", "City", "Country", "Region", "Commercial", "Active", ""]}
          rows={airports.map((airport) => [
            airport.iata_code,
            airport.name,
            airport.city,
            airport.country,
            `${airport.region_code ?? airport.state} - ${airport.region_name ?? airport.state}`,
            airport.is_commercial ? "Yes" : "No",
            airport.is_active ? "Yes" : "No",
            <button className="button-secondary px-3 py-1.5" type="button" onClick={() => edit(airport)}>
              <Edit className="h-4 w-4" aria-hidden="true" />
              Edit
            </button>,
          ])}
        />
      </div>
    </div>
  );
}

type NamedTable = "rental_companies" | "car_makes";

function NamedManager({
  title,
  table,
  rows,
  onChanged,
}: {
  title: string;
  table: NamedTable;
  rows: Array<RentalCompany | CarMake>;
  onChanged: () => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyNamed);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    const result =
      table === "rental_companies"
        ? editingId
          ? await supabase
              .from("rental_companies")
              .update({ name: form.name.trim(), type: form.type, is_active: form.is_active })
              .eq("id", editingId)
          : await supabase
              .from("rental_companies")
              .insert({ name: form.name.trim(), type: form.type, is_active: form.is_active })
        : editingId
          ? await supabase
              .from("car_makes")
              .update({ name: form.name.trim(), is_active: form.is_active })
              .eq("id", editingId)
          : await supabase.from("car_makes").insert({ name: form.name.trim(), is_active: form.is_active });

    if (result.error) {
      setError(result.error.message);
    } else {
      setEditingId(null);
      setForm(emptyNamed);
      setError("");
      await onChanged();
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <form className="panel space-y-4 p-5" onSubmit={submit}>
        <h2 className="text-lg font-semibold text-slate-950">{editingId ? `Edit ${title}` : `Add ${title}`}</h2>
        {error ? <ErrorState message={error} /> : null}
        <Field label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
        {table === "rental_companies" ? (
          <label className="block space-y-1.5">
            <span className="label">Type</span>
            <select
              className="input"
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value as RentalCompanyType })}
            >
              <option value="traditional_rental">Traditional rental</option>
              <option value="car_sharing">Car sharing</option>
              <option value="peer_to_peer">Peer to peer</option>
            </select>
          </label>
        ) : null}
        <ActiveToggle checked={form.is_active} onChange={(value) => setForm({ ...form, is_active: value })} />
        <div className="flex gap-2">
          <button className="button-primary" type="submit">
            Save
          </button>
          {editingId ? (
            <button
              className="button-secondary"
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyNamed);
              }}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>
      <div className="panel overflow-hidden">
        <AdminTable
          headers={table === "rental_companies" ? ["Name", "Type", "Active", ""] : ["Name", "Active", ""]}
          rows={rows.map((row) => [
            row.name,
            ...(table === "rental_companies" ? [("type" in row ? row.type : "traditional_rental")] : []),
            row.is_active ? "Yes" : "No",
            <button
              className="button-secondary px-3 py-1.5"
              type="button"
              onClick={() => {
                setEditingId(row.id);
                setForm({
                  name: row.name,
                  type: "type" in row ? row.type : "traditional_rental",
                  is_active: row.is_active,
                });
              }}
            >
              <Edit className="h-4 w-4" aria-hidden="true" />
              Edit
            </button>,
          ])}
        />
      </div>
    </div>
  );
}

function ModelManager({
  makes,
  models,
  onChanged,
}: {
  makes: CarMake[];
  models: CarModel[];
  onChanged: () => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyModel);
  const [error, setError] = useState("");

  const makeById = useMemo(() => Object.fromEntries(makes.map((make) => [make.id, make.name])), [makes]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    const payload = { make_id: form.make_id, name: form.name.trim(), is_active: form.is_active };
    const result = editingId
      ? await supabase.from("car_models").update(payload).eq("id", editingId)
      : await supabase.from("car_models").insert(payload);

    if (result.error) {
      setError(result.error.message);
    } else {
      setEditingId(null);
      setForm(emptyModel);
      setError("");
      await onChanged();
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <form className="panel space-y-4 p-5" onSubmit={submit}>
        <h2 className="text-lg font-semibold text-slate-950">{editingId ? "Edit model" : "Add model"}</h2>
        {error ? <ErrorState message={error} /> : null}
        <label className="block space-y-1.5">
          <span className="label">Make</span>
          <select className="input" value={form.make_id} onChange={(event) => setForm({ ...form, make_id: event.target.value })}>
            <option value="">Choose</option>
            {makes.map((make) => (
              <option key={make.id} value={make.id}>
                {make.name}
              </option>
            ))}
          </select>
        </label>
        <Field label="Model" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
        <ActiveToggle checked={form.is_active} onChange={(value) => setForm({ ...form, is_active: value })} />
        <div className="flex gap-2">
          <button className="button-primary" type="submit">
            Save
          </button>
          {editingId ? (
            <button
              className="button-secondary"
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyModel);
              }}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>
      <div className="panel overflow-hidden">
        <AdminTable
          headers={["Make", "Model", "Active", ""]}
          rows={models.map((model) => [
            makeById[model.make_id] ?? "Unknown",
            model.name,
            model.is_active ? "Yes" : "No",
            <button
              className="button-secondary px-3 py-1.5"
              type="button"
              onClick={() => {
                setEditingId(model.id);
                setForm({ make_id: model.make_id, name: model.name, is_active: model.is_active });
              }}
            >
              <Edit className="h-4 w-4" aria-hidden="true" />
              Edit
            </button>,
          ])}
        />
      </div>
    </div>
  );
}

function ReportManager({ reports, onChanged }: { reports: MyReportRow[]; onChanged: () => Promise<void> }) {
  const [error, setError] = useState("");

  const softDelete = async (reportId: string) => {
    if (!supabase) return;
    const { error: deleteError } = await supabase
      .from("vehicle_reports")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", reportId);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      await onChanged();
    }
  };

  if (!reports.length) {
    return <EmptyState title="No reports" message="Submitted reports will appear here." />;
  }

  return (
    <div className="space-y-4">
      {error ? <ErrorState message={error} /> : null}
      <div className="panel overflow-hidden">
        <AdminTable
          headers={["Airport", "Company", "Vehicle", "Mileage", "Condition", "Observed", "Deleted", ""]}
          rows={reports.map((report) => [
            report.airports?.iata_code ?? "Unknown",
            report.rental_companies?.name ?? "Unknown",
            `${report.year ?? ""} ${report.car_makes?.name ?? "Unknown"} ${report.car_models?.name ?? ""}`.trim(),
            formatNumber(report.mileage),
            `${formatCondition(report.exterior_condition)} / ${formatCondition(report.interior_condition)}`,
            formatDate(report.observed_at),
            report.deleted_at ? formatDate(report.deleted_at) : "No",
            report.deleted_at ? (
              <span className="text-sm text-slate-400">Deleted</span>
            ) : (
              <button className="button-secondary px-3 py-1.5" type="button" onClick={() => softDelete(report.id)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Soft-delete
              </button>
            ),
          ])}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  span = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  span?: boolean;
}) {
  return (
    <label className={`block space-y-1.5 ${span ? "sm:col-span-2" : ""}`}>
      <span className="label">{label}</span>
      <input className="input" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ActiveToggle({
  checked,
  onChange,
  label = "Active",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
      <input
        className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function AdminTable({ headers, rows }: { headers: string[]; rows: Array<Array<React.ReactNode>> }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-100/70 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="transition hover:bg-teal-50/40">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
