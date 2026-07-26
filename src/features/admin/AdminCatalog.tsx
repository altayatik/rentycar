import { Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  LoadingState,
  Modal,
  SectionHeader,
  Select,
  TextInput,
  Toggle,
  useToast,
} from "../../components/ui";
import { allRegions, countryNames } from "../../data/regions";
import { supabase } from "../../lib/supabase";
import type { Airport, CarMake, CarModel, RentalCompany, RentalCompanyType } from "../../lib/types";

export type CatalogTable = "airports" | "rental_companies" | "car_makes" | "car_models";

const companyTypes: Array<{ value: RentalCompanyType; label: string }> = [
  { value: "traditional_rental", label: "Traditional rental" },
  { value: "car_sharing", label: "Car sharing" },
  { value: "peer_to_peer", label: "Peer to peer" },
];

type AnyRow = Airport | RentalCompany | CarMake | CarModel;

interface CatalogConfig {
  title: string;
  singular: string;
  orderBy: string;
}

const configs: Record<CatalogTable, CatalogConfig> = {
  airports: { title: "Airports", singular: "airport", orderBy: "iata_code" },
  rental_companies: { title: "Rental companies", singular: "company", orderBy: "name" },
  car_makes: { title: "Car makes", singular: "make", orderBy: "name" },
  car_models: { title: "Car models", singular: "model", orderBy: "name" },
};

export function AdminCatalog({ table }: { table: CatalogTable }) {
  const toast = useToast();
  const config = configs[table];

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [makes, setMakes] = useState<CarMake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AnyRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AnyRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const client = supabase;
    if (!client) return;
    setLoading(true);

    const rowsResult = await client.from(table).select("*").order(config.orderBy);

    if (rowsResult.error) {
      setError(rowsResult.error.message);
      setLoading(false);
      return;
    }

    setError("");
    setRows((rowsResult.data ?? []) as AnyRow[]);

    // Models need their parent makes resolved for the table and the picker.
    if (table === "car_models") {
      const makesResult = await client.from("car_makes").select("*").order("name");
      if (!makesResult.error) setMakes((makesResult.data ?? []) as CarMake[]);
    }

    setLoading(false);
  }, [table, config.orderBy]);

  useEffect(() => {
    setSearch("");
    void load();
  }, [load]);

  const makeNameById = useMemo(
    () => new Map(makes.map((make) => [make.id, make.name])),
    [makes],
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query));
  }, [rows, search]);

  const handleSave = async (payload: Record<string, unknown>) => {
    if (!supabase) return;
    setBusy(true);

    const { data, error: writeError } = editing
      ? await supabase.from(table).update(payload).eq("id", (editing as { id: string }).id).select("id")
      : await supabase.from(table).insert(payload).select("id");

    setBusy(false);

    if (writeError) {
      toast.push(writeError.message, "error");
      return;
    }

    // A policy-blocked write returns no error and no rows.
    if (!data || data.length === 0) {
      toast.push("Nothing was saved — your account may not have admin rights in the database.", "error");
      return;
    }

    toast.push(editing ? `${config.singular} updated.` : `${config.singular} added.`);
    setEditing(null);
    setCreating(false);
    void load();
  };

  const handleDelete = async () => {
    if (!supabase || !deleting) return;
    setBusy(true);

    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq("id", (deleting as { id: string }).id);

    setBusy(false);

    if (deleteError) {
      const friendly = deleteError.message.includes("foreign key")
        ? `This ${config.singular} is referenced by existing reports, so it can't be deleted. Mark it inactive instead.`
        : deleteError.message;
      toast.push(friendly, "error");
      return;
    }

    toast.push(`${config.singular} deleted.`);
    setDeleting(null);
    void load();
  };

  const open = editing !== null || creating;

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Catalog"
        title={config.title}
        description={`${rows.length} total. Inactive entries stay in old reports but disappear from the dropdowns.`}
        action={
          <>
            <Button size="sm" variant="ghost" onClick={load} icon={<RefreshCw className="h-3.5 w-3.5" />}>
              Refresh
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setCreating(true)}
              icon={<Plus className="h-3.5 w-3.5" />}
            >
              Add {config.singular}
            </Button>
          </>
        }
      />

      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4"
          aria-hidden="true"
        />
        <TextInput
          className="pl-9"
          placeholder={`Search ${config.title.toLowerCase()}`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label={`Search ${config.title}`}
        />
      </div>

      {error ? (
        <ErrorState title={`Could not load ${config.title.toLowerCase()}`} message={error} />
      ) : loading ? (
        <LoadingState label={`Loading ${config.title.toLowerCase()}`} rows={4} />
      ) : visible.length === 0 ? (
        <EmptyState
          title={search ? "No matches" : `No ${config.title.toLowerCase()} yet`}
          message={search ? "Try a different search." : `Add your first ${config.singular}.`}
          action={
            !search ? (
              <Button size="sm" variant="primary" onClick={() => setCreating(true)} icon={<Plus className="h-3.5 w-3.5" />}>
                Add {config.singular}
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {table === "airports" ? (
                  <>
                    <th>Code</th>
                    <th>Name</th>
                    <th>City</th>
                    <th>Region</th>
                    <th>Country</th>
                  </>
                ) : table === "car_models" ? (
                  <>
                    <th>Model</th>
                    <th>Make</th>
                  </>
                ) : (
                  <>
                    <th>Name</th>
                    {table === "rental_companies" ? <th>Type</th> : null}
                  </>
                )}
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const record = row as unknown as Record<string, unknown>;
                return (
                  <tr key={String(record.id)}>
                    {table === "airports" ? (
                      <>
                        <td className="font-extrabold text-ink">{String(record.iata_code)}</td>
                        <td className="max-w-[16rem] truncate">{String(record.name)}</td>
                        <td>{String(record.city)}</td>
                        <td>{String(record.region_name ?? record.state ?? "—")}</td>
                        <td>
                          <Badge tone={record.country === "CA" ? "lavender" : "sky"}>
                            {String(record.country)}
                          </Badge>
                        </td>
                      </>
                    ) : table === "car_models" ? (
                      <>
                        <td className="font-bold text-ink">{String(record.name)}</td>
                        <td>{makeNameById.get(String(record.make_id)) ?? "—"}</td>
                      </>
                    ) : (
                      <>
                        <td className="font-bold text-ink">{String(record.name)}</td>
                        {table === "rental_companies" ? (
                          <td>
                            {companyTypes.find((type) => type.value === record.type)?.label ?? "—"}
                          </td>
                        ) : null}
                      </>
                    )}
                    <td>
                      <Badge tone={record.is_active ? "mint" : "neutral"}>
                        {record.is_active ? "active" : "inactive"}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <IconButton
                          label={`Edit ${config.singular}`}
                          icon={<Pencil className="h-3.5 w-3.5" />}
                          onClick={() => setEditing(row)}
                        />
                        <IconButton
                          label={`Delete ${config.singular}`}
                          icon={<Trash2 className="h-3.5 w-3.5" />}
                          onClick={() => setDeleting(row)}
                          style={{ color: "var(--danger)" }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {open ? (
        <CatalogForm
          table={table}
          makes={makes}
          initial={editing as unknown as Record<string, unknown> | null}
          busy={busy}
          onCancel={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={handleSave}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={busy}
        destructive
        title={`Delete this ${config.singular}?`}
        message="If any report references it, the delete is refused and you should mark it inactive instead."
        confirmLabel="Delete"
      />
    </div>
  );
}

function CatalogForm({
  table,
  makes,
  initial,
  busy,
  onCancel,
  onSave,
}: {
  table: CatalogTable;
  makes: CarMake[];
  initial: Record<string, unknown> | null;
  busy: boolean;
  onCancel: () => void;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const config = configs[table];
  const [values, setValues] = useState<Record<string, string>>(() => ({
    iata_code: String(initial?.iata_code ?? ""),
    name: String(initial?.name ?? ""),
    city: String(initial?.city ?? ""),
    country: String(initial?.country ?? "US"),
    region_code: String(initial?.region_code ?? initial?.state ?? ""),
    latitude: initial?.latitude != null ? String(initial.latitude) : "",
    longitude: initial?.longitude != null ? String(initial.longitude) : "",
    type: String(initial?.type ?? "traditional_rental"),
    make_id: String(initial?.make_id ?? ""),
  }));
  const [isActive, setIsActive] = useState(initial ? Boolean(initial.is_active) : true);
  const [isCommercial, setIsCommercial] = useState(initial ? Boolean(initial.is_commercial) : true);
  const [formError, setFormError] = useState("");

  const set = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));

  const regionOptions = useMemo(
    () => allRegions.filter((region) => region.country === values.country),
    [values.country],
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError("");

    if (table === "airports") {
      const code = values.iata_code.trim().toUpperCase();
      if (!/^[A-Z]{3,4}$/.test(code)) {
        setFormError("IATA code should be 3 or 4 letters.");
        return;
      }
      if (!values.name.trim() || !values.city.trim() || !values.region_code) {
        setFormError("Name, city, and region are required.");
        return;
      }

      const latitude = Number(values.latitude);
      const longitude = Number(values.longitude);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
        setFormError("Latitude must be between -90 and 90.");
        return;
      }
      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        setFormError("Longitude must be between -180 and 180.");
        return;
      }

      const region = allRegions.find(
        (item) => item.country === values.country && item.code === values.region_code,
      );

      onSave({
        iata_code: code,
        name: values.name.trim(),
        city: values.city.trim(),
        country: values.country,
        state: values.region_code,
        region_code: values.region_code,
        region_name: region?.name ?? values.region_code,
        latitude,
        longitude,
        is_commercial: isCommercial,
        is_active: isActive,
      });
      return;
    }

    if (!values.name.trim()) {
      setFormError("Name is required.");
      return;
    }

    if (table === "car_models") {
      if (!values.make_id) {
        setFormError("Choose which make this model belongs to.");
        return;
      }
      onSave({ name: values.name.trim(), make_id: values.make_id, is_active: isActive });
      return;
    }

    if (table === "rental_companies") {
      onSave({ name: values.name.trim(), type: values.type, is_active: isActive });
      return;
    }

    onSave({ name: values.name.trim(), is_active: isActive });
  };

  return (
    <Modal
      open
      onClose={onCancel}
      title={`${initial ? "Edit" : "Add"} ${config.singular}`}
      width="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={busy}>
            {initial ? "Save changes" : `Add ${config.singular}`}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {formError ? <ErrorState title="Check the form" message={formError} /> : null}

        {table === "airports" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
              <Field label="IATA code" required>
                {(id) => (
                  <TextInput
                    id={id}
                    className="uppercase"
                    value={values.iata_code}
                    onChange={(event) => set("iata_code", event.target.value)}
                    placeholder="SEA"
                    maxLength={4}
                  />
                )}
              </Field>
              <Field label="Airport name" required>
                {(id) => (
                  <TextInput
                    id={id}
                    value={values.name}
                    onChange={(event) => set("name", event.target.value)}
                    placeholder="Seattle-Tacoma International"
                  />
                )}
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="City" required>
                {(id) => (
                  <TextInput id={id} value={values.city} onChange={(event) => set("city", event.target.value)} />
                )}
              </Field>
              <Field label="Country" required>
                {(id) => (
                  <Select
                    id={id}
                    value={values.country}
                    onChange={(event) => {
                      set("country", event.target.value);
                      set("region_code", "");
                    }}
                  >
                    <option value="US">{countryNames.US}</option>
                    <option value="CA">{countryNames.CA}</option>
                  </Select>
                )}
              </Field>
              <Field label="State / province" required>
                {(id) => (
                  <Select
                    id={id}
                    value={values.region_code}
                    onChange={(event) => set("region_code", event.target.value)}
                  >
                    <option value="">Choose…</option>
                    {regionOptions.map((region) => (
                      <option key={region.code} value={region.code}>
                        {region.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Latitude" required hint="-90 to 90">
                {(id) => (
                  <TextInput
                    id={id}
                    type="number"
                    step="any"
                    value={values.latitude}
                    onChange={(event) => set("latitude", event.target.value)}
                    placeholder="47.4502"
                  />
                )}
              </Field>
              <Field label="Longitude" required hint="-180 to 180">
                {(id) => (
                  <TextInput
                    id={id}
                    type="number"
                    step="any"
                    value={values.longitude}
                    onChange={(event) => set("longitude", event.target.value)}
                    placeholder="-122.3088"
                  />
                )}
              </Field>
            </div>

            <Toggle
              label="Commercial airport"
              description="Uncheck for private or cargo fields."
              checked={isCommercial}
              onChange={setIsCommercial}
            />
          </>
        ) : (
          <>
            <Field label="Name" required>
              {(id) => (
                <TextInput
                  id={id}
                  value={values.name}
                  onChange={(event) => set("name", event.target.value)}
                  placeholder={table === "car_makes" ? "Toyota" : table === "car_models" ? "Camry" : "Hertz"}
                />
              )}
            </Field>

            {table === "rental_companies" ? (
              <Field label="Type" required>
                {(id) => (
                  <Select id={id} value={values.type} onChange={(event) => set("type", event.target.value)}>
                    {companyTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ) : null}

            {table === "car_models" ? (
              <Field label="Make" required>
                {(id) => (
                  <Select
                    id={id}
                    value={values.make_id}
                    onChange={(event) => set("make_id", event.target.value)}
                  >
                    <option value="">Choose a make…</option>
                    {makes.map((make) => (
                      <option key={make.id} value={make.id}>
                        {make.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ) : null}
          </>
        )}

        <Toggle
          label="Active"
          description="Inactive entries stay on old reports but disappear from dropdowns."
          checked={isActive}
          onChange={setIsActive}
        />
      </form>
    </Modal>
  );
}
