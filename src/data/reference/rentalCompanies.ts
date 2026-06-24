import type { RentalCompanyType } from "../../lib/types";

export interface RentalCompanyReference {
  name: string;
  type: RentalCompanyType;
  sortOrder: number;
}

export const rentalCompanies: RentalCompanyReference[] = [
  { name: "Alamo", type: "traditional_rental", sortOrder: 10 },
  { name: "Avis", type: "traditional_rental", sortOrder: 20 },
  { name: "Budget", type: "traditional_rental", sortOrder: 30 },
  { name: "Dollar", type: "traditional_rental", sortOrder: 40 },
  { name: "Enterprise", type: "traditional_rental", sortOrder: 50 },
  { name: "Hertz", type: "traditional_rental", sortOrder: 60 },
  { name: "National", type: "traditional_rental", sortOrder: 70 },
  { name: "Sixt", type: "traditional_rental", sortOrder: 80 },
  { name: "Thrifty", type: "traditional_rental", sortOrder: 90 },
  { name: "Payless", type: "traditional_rental", sortOrder: 100 },
  { name: "Fox", type: "traditional_rental", sortOrder: 110 },
  { name: "Advantage", type: "traditional_rental", sortOrder: 120 },
  { name: "ACE", type: "traditional_rental", sortOrder: 130 },
  { name: "Routes", type: "traditional_rental", sortOrder: 140 },
  { name: "Economy", type: "traditional_rental", sortOrder: 150 },
  { name: "Europcar", type: "traditional_rental", sortOrder: 160 },
  { name: "NU Car Rentals", type: "traditional_rental", sortOrder: 170 },
  { name: "NextCar", type: "traditional_rental", sortOrder: 180 },
  { name: "U-Save", type: "traditional_rental", sortOrder: 190 },
  { name: "Green Motion", type: "traditional_rental", sortOrder: 200 },
  { name: "E-Z Rent-A-Car", type: "traditional_rental", sortOrder: 210 },
  { name: "Airport Van Rental", type: "traditional_rental", sortOrder: 220 },
  { name: "Silvercar", type: "traditional_rental", sortOrder: 230 },
  { name: "Zipcar", type: "car_sharing", sortOrder: 300 },
  { name: "Turo", type: "peer_to_peer", sortOrder: 400 },
];
