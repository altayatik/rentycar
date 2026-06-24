import { airports } from "./reference/airports";
import type { PublicAirportStats } from "../lib/types";

export const fallbackAirportStats: PublicAirportStats[] = airports.map((airport) => ({
  airport_id: airport.iataCode,
  iata_code: airport.iataCode,
  airport_name: airport.name,
  city: airport.city,
  state: airport.regionCode,
  country: airport.country,
  region_code: airport.regionCode,
  region_name: airport.regionName,
  latitude: airport.latitude,
  longitude: airport.longitude,
  report_count: 0,
  rental_company_count: 0,
  average_mileage: null,
  latest_report_date: null,
}));
