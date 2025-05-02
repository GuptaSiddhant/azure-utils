import { use, useMemo } from "react";
import { FeatureFlagWithFilters } from "@azure-utils/feature-flags/types";
import { validateFeatureFlagWithFilters } from "@azure-utils/feature-flags/validate";

export function FilterFlagHeader({
  featureFlag,
}: {
  featureFlag: FeatureFlagWithFilters;
}) {
  return (
    <span className="font-bold">
      [Filters] {featureFlag.displayName ?? featureFlag.id}
    </span>
  );
}

export function FilterFlagFooter({
  featureFlag,
}: {
  featureFlag: FeatureFlagWithFilters;
}) {
  const promise = useMemo(
    () => validateFeatureFlagWithFilters(featureFlag),
    [featureFlag]
  );
  const isEnabled = use(promise);

  return (
    <p>
      Enabled:{" "}
      <code className={isEnabled ? "text-green-500" : "text-red-500"}>
        {isEnabled ? "True" : "False"}
      </code>
    </p>
  );
}
