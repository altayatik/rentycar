import type { Condition, Drivetrain, EvChargingSpeed, FuelOctane, FuelType, TireCondition, TrimTier } from "./types";

export const formatNumber = (value: number | null | undefined) =>
  typeof value === "number" ? new Intl.NumberFormat("en-US").format(value) : "Not reported";

export const formatMileage = (value: number | null | undefined) =>
  typeof value === "number" ? `${new Intl.NumberFormat("en-US").format(value)} mi` : "N/A";

export const formatDate = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(value))
    : "Not reported";

export const formatCondition = (value: Condition | null | undefined) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "Not reported";

const tireConditionLabels: Record<TireCondition, string> = {
  brand_new: "Brand New",
  decent: "Decent",
  almost_bald: "Almost Bald",
};

export const formatTireCondition = (value: TireCondition | null | undefined) =>
  value ? tireConditionLabels[value] : null;

const drivetrainLabels: Record<Drivetrain, string> = {
  fwd: "FWD",
  rwd: "RWD",
  awd: "AWD",
  "4wd": "4WD",
};

export const formatDrivetrain = (value: Drivetrain | null | undefined) =>
  value ? drivetrainLabels[value] : null;

const trimLabels: Record<TrimTier, string> = {
  entry: "Entry",
  mid_tier: "Mid Tier",
  high_tier: "High Tier",
};

export const formatTrim = (value: TrimTier | null | undefined) => (value ? trimLabels[value] : null);

const fuelTypeLabels: Record<FuelType, string> = {
  gasoline: "Gasoline",
  phev: "Plug-In Hybrid",
  hybrid: "Traditional Hybrid",
  bev: "Battery Electric",
  hydrogen: "Hydrogen",
  diesel: "Diesel",
};

export const formatFuelType = (value: FuelType | null | undefined) => (value ? fuelTypeLabels[value] : null);

const fuelOctaneLabels: Record<FuelOctane, string> = {
  regular: "Regular",
  midgrade: "Midgrade",
  premium: "Premium",
};

export const formatFuelOctane = (value: FuelOctane | null | undefined) => (value ? fuelOctaneLabels[value] : null);

const evChargingSpeedLabels: Record<EvChargingSpeed, string> = {
  level_2: "Level 2",
  dcfc_150: "DCFC 150kW",
  dcfc_250: "DCFC 250kW",
  dcfc_350: "DCFC 350kW",
};

export const formatEvChargingSpeed = (value: EvChargingSpeed | null | undefined) =>
  value ? evChargingSpeedLabels[value] : null;
