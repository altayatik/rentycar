import type { Condition } from "./types";

export const formatNumber = (value: number | null | undefined) =>
  typeof value === "number" ? new Intl.NumberFormat("en-US").format(value) : "Not reported";

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
