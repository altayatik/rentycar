export type Role = "admin" | "reporter";
export type Condition = "excellent" | "good" | "fair" | "poor";
export type CountryCode = "US" | "CA";
export type RentalCompanyType = "traditional_rental" | "car_sharing" | "peer_to_peer";

export interface Profile {
  id: string;
  username: string;
  role: Role;
  created_at: string;
}

export interface Airport {
  id: string;
  iata_code: string;
  name: string;
  city: string;
  state: string;
  country: CountryCode;
  region_code: string | null;
  region_name: string | null;
  latitude: number;
  longitude: number;
  is_commercial: boolean;
  is_active: boolean;
  created_at: string;
}

export interface RentalCompany {
  id: string;
  name: string;
  type: RentalCompanyType;
  is_active: boolean;
  created_at: string;
}

export interface CarMake {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface CarModel {
  id: string;
  make_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface VehicleReport {
  id: string;
  reporter_id: string | null;
  airport_id: string;
  rental_company_id: string;
  make_id: string;
  model_id: string;
  year: number | null;
  trim: string | null;
  mileage: number | null;
  exterior_condition: Condition;
  interior_condition: Condition;
  fuel_or_battery_level: string | null;
  notes: string | null;
  photo_url: string | null;
  observed_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PublicAirportStats {
  airport_id: string;
  iata_code: string;
  airport_name: string;
  city: string;
  state: string;
  country: CountryCode;
  region_code: string | null;
  region_name: string | null;
  latitude: number;
  longitude: number;
  report_count: number;
  rental_company_count: number;
  average_mileage: number | null;
  latest_report_date: string | null;
}

export interface PublicRecentReport {
  airport_code: string;
  airport_name: string;
  airport_city: string;
  airport_country: CountryCode;
  airport_region_code: string | null;
  airport_region_name: string | null;
  rental_company_name: string;
  rental_company_type: RentalCompanyType;
  make: string;
  model: string;
  year: number | null;
  mileage: number | null;
  exterior_condition: Condition;
  interior_condition: Condition;
  observed_date: string;
}

export interface MyReportRow extends VehicleReport {
  airports: Pick<Airport, "iata_code" | "name"> | null;
  rental_companies: Pick<RentalCompany, "name"> | null;
  car_makes: Pick<CarMake, "name"> | null;
  car_models: Pick<CarModel, "name"> | null;
}

export interface PublicRegionStats {
  country: CountryCode;
  region_code: string;
  region_name: string;
  airport_count: number;
  report_count: number;
  rental_company_count: number;
  average_mileage: number | null;
  latest_report_at: string | null;
}
