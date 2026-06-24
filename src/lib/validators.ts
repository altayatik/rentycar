import { z } from "zod";

const requiredSelect = z.string().uuid("Choose an option");
const optionalText = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.string().trim().optional()
);
const optionalUpperText = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value.toUpperCase() : value))
);

const optionalInt = (opts: { min?: number; max?: number; message?: string } = {}) =>
  z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = Number(val);
      return Number.isNaN(num) ? undefined : num;
    },
    z
      .number()
      .int()
      .min(opts.min ?? -Infinity, opts.message)
      .max(opts.max ?? Infinity, opts.message)
      .optional()
  );

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.enum(values).optional()
  );

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, "Username is required")
    .regex(/^[a-zA-Z0-9_-]+(@rentycar\.local)?$/, "Use your username or username@rentycar.local"),
  password: z.string().min(1, "Password is required"),
});

export const reportSchema = z.object({
  airport_id: requiredSelect,
  rental_company_id: requiredSelect,
  make_id: requiredSelect,
  model_id: requiredSelect,
  year: optionalInt({ min: 1990, max: 2100, message: "Year must be between 1990 and 2100" }),
  trim: optionalEnum(["entry", "mid_tier", "high_tier"]),
  mileage: optionalInt({ min: 0, message: "Mileage cannot be negative" }),
  exterior_condition: z.enum(["excellent", "good", "fair", "poor"], {
    errorMap: () => ({ message: "Choose an exterior condition" }),
  }),
  interior_condition: z.enum(["excellent", "good", "fair", "poor"], {
    errorMap: () => ({ message: "Choose an interior condition" }),
  }),
  tire_condition: optionalEnum(["brand_new", "decent", "almost_bald"]),
  drivetrain: optionalEnum(["fwd", "rwd", "awd", "4wd"]),
  fuel_type: optionalEnum(["gasoline", "phev", "hybrid", "bev", "hydrogen", "diesel"]),
  fuel_octane: optionalEnum(["regular", "midgrade", "premium"]),
  ev_charging_speed: optionalEnum(["level_2", "dcfc_150", "dcfc_250", "dcfc_350"]),
  fuel_level_percent: optionalInt({ min: 0, max: 100 }),
  lane_centering: z.boolean().optional(),
  lane_departure_assist: z.boolean().optional(),
  adaptive_cruise_control: z.boolean().optional(),
  early_collision_prevention: z.boolean().optional(),
  license_plate: optionalUpperText,
  license_plate_state: optionalText,
  observed_at: optionalText,
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type ReportFormValues = z.infer<typeof reportSchema>;
