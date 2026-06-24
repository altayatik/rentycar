import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.admin", quiet: true });

const demoNote = "Demo seed report - RentyCar QA";

const demoReports = [
  ["LAX", "Hertz", "Toyota", "Camry", 2023, 18420, "good", "good"],
  ["LAX", "Avis", "Tesla", "Model 3", 2022, 31200, "good", "fair"],
  ["SFO", "National", "Toyota", "RAV4", 2023, 22100, "good", "good"],
  ["ORD", "Enterprise", "Chevrolet", "Equinox", 2021, 44800, "fair", "good"],
  ["JFK", "Budget", "Nissan", "Rogue", 2022, 37000, "good", "good"],
  ["ATL", "Hertz", "Ford", "Explorer", 2021, 52500, "fair", "good"],
  ["DFW", "Alamo", "Kia", "Telluride", 2023, 28900, "good", "excellent"],
  ["DEN", "Sixt", "BMW", "X3", 2022, 19400, "excellent", "good"],
  ["LAS", "Dollar", "Dodge", "Charger", 2020, 61000, "fair", "fair"],
  ["MIA", "Thrifty", "Jeep", "Wrangler", 2021, 47300, "good", "fair"],
  ["SEA", "Enterprise", "Subaru", "Outback", 2023, 33200, "good", "good"],
  ["BOS", "Avis", "Hyundai", "Tucson", 2022, 26800, "good", "good"],
  ["YYZ", "Enterprise", "Toyota", "Corolla", 2023, 21500, "good", "good"],
  ["YYZ", "Hertz", "Hyundai", "Elantra", 2022, 39200, "good", "fair"],
  ["YVR", "National", "Toyota", "RAV4", 2023, 24600, "excellent", "good"],
  ["YUL", "Avis", "Honda", "CR-V", 2022, 31100, "good", "good"],
  ["YYC", "Budget", "Ford", "Escape", 2021, 42900, "fair", "good"],
  ["YEG", "Enterprise", "Nissan", "Rogue", 2022, 35700, "good", "good"],
  ["YOW", "Hertz", "Kia", "Sportage", 2023, 29300, "good", "good"],
  ["YHZ", "Alamo", "Chevrolet", "Malibu", 2020, 48100, "fair", "fair"],
];

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Copy .env.admin.example to .env.admin and fill in the local-only service role key.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const reporter = await findUserByEmail("demo@rentycar.local");
if (!reporter) {
  console.error("Could not find demo@rentycar.local in Supabase Auth. Run npm run create-demo-users first.");
  process.exit(1);
}

const lookups = await loadLookups();

const { error: deleteError } = await supabase
  .from("vehicle_reports")
  .delete()
  .ilike("notes", `%${demoNote}%`);

if (deleteError) {
  throw new Error(`Failed to delete old demo reports: ${deleteError.message}`);
}

const now = Date.now();
const rows = demoReports.map(([airportCode, companyName, makeName, modelName, year, mileage, exterior, interior], index) => {
  const airport = mustGet(lookups.airports, airportCode, "airport");
  const company = mustGet(lookups.companies, companyName, "rental company");
  const make = mustGet(lookups.makes, makeName, "car make");
  const model = mustGet(lookups.models, `${make.id}:${modelName}`, "car model");

  return {
    reporter_id: reporter.id,
    airport_id: airport.id,
    rental_company_id: company.id,
    make_id: make.id,
    model_id: model.id,
    year,
    mileage,
    exterior_condition: exterior,
    interior_condition: interior,
    fuel_or_battery_level: index % 3 === 0 ? "About 3/4 full" : null,
    notes: demoNote,
    observed_at: new Date(now - index * 36 * 60 * 60 * 1000).toISOString(),
  };
});

const { error: insertError } = await supabase.from("vehicle_reports").insert(rows);
if (insertError) {
  throw new Error(`Failed to insert demo reports: ${insertError.message}`);
}

console.log("Seeded 20 demo vehicle reports.");

async function loadLookups() {
  const airportCodes = unique(demoReports.map(([airportCode]) => airportCode));
  const companyNames = unique(demoReports.map(([, companyName]) => companyName));
  const makeNames = unique(demoReports.map(([, , makeName]) => makeName));
  const modelNames = unique(demoReports.map(([, , , modelName]) => modelName));

  const [airports, companies, makes] = await Promise.all([
    selectBy("airports", "id,iata_code", "iata_code", airportCodes),
    selectBy("rental_companies", "id,name", "name", companyNames),
    selectBy("car_makes", "id,name", "name", makeNames),
  ]);

  const makeMap = mapBy(makes, "name");
  const { data: models, error: modelError } = await supabase
    .from("car_models")
    .select("id,name,make_id")
    .in("name", modelNames);

  if (modelError) {
    throw new Error(`Failed to load car models: ${modelError.message}`);
  }

  const modelMap = new Map();
  for (const report of demoReports) {
    const makeName = report[2];
    const modelName = report[3];
    const make = makeMap.get(makeName);
    if (!make) continue;
    const model = models.find((candidate) => candidate.make_id === make.id && candidate.name === modelName);
    if (model) {
      modelMap.set(`${make.id}:${modelName}`, model);
    }
  }

  return {
    airports: mapBy(airports, "iata_code"),
    companies: mapBy(companies, "name"),
    makes: makeMap,
    models: modelMap,
  };
}

async function selectBy(table, columns, column, values) {
  const { data, error } = await supabase.from(table).select(columns).in(column, values);
  if (error) {
    throw new Error(`Failed to load ${table}: ${error.message}`);
  }
  return data;
}

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Failed to list Supabase users: ${error.message}`);
    }

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

function unique(values) {
  return Array.from(new Set(values));
}

function mapBy(rows, key) {
  return new Map(rows.map((row) => [row[key], row]));
}

function mustGet(map, key, label) {
  const value = map.get(key);
  if (!value) {
    throw new Error(`Missing ${label}: ${key}. Run supabase/schema.sql and supabase/seed.sql before demo setup.`);
  }
  return value;
}
