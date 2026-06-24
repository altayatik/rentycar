import { z } from "zod";

const requiredSelect = z.string().uuid("Choose an option");
const optionalText = z.string().trim().optional().or(z.literal(""));

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
  year: z.coerce
    .number()
    .int()
    .min(1990, "Year must be 1990 or newer")
    .max(2100, "Year is too far in the future"),
  trim: optionalText,
  mileage: z.coerce.number().int().min(0, "Mileage cannot be negative"),
  exterior_condition: z.enum(["excellent", "good", "fair", "poor"]),
  interior_condition: z.enum(["excellent", "good", "fair", "poor"]),
  fuel_or_battery_level: optionalText,
  notes: optionalText,
  photo_url: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
  observed_at: z.string().min(1, "Observation date is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type ReportFormValues = z.infer<typeof reportSchema>;
