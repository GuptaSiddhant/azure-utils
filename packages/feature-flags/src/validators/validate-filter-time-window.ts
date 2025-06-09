import type {
  FeatureFlagClientFilter,
  FeatureFlagTimeWindowFilter,
} from "../types.js";

export function checkIsTimeWindowClientFilter(
  filter: FeatureFlagClientFilter
): filter is FeatureFlagTimeWindowFilter {
  const parameters =
    filter?.name === "Microsoft.TimeWindow" && filter.parameters;
  if (typeof parameters !== "object") return false;

  const { Start, End } = parameters;
  if (!Start && !End) return false;

  if (
    (Start && typeof Start === "string") ||
    (End && typeof End === "string")
  ) {
    return true;
  }

  return false;
}

export function validateFeatureFlagTimeWindowFilter(
  filter: FeatureFlagTimeWindowFilter,
  currentDate: Date = new Date()
): boolean {
  const { End, Start } = filter.parameters;
  const time = currentDate.valueOf();
  if (
    (End && new Date(End).valueOf() < time) ||
    (Start && new Date(Start).valueOf() > time)
  ) {
    return false;
  }

  return true;
}
