import useHashChange from "../hooks/useHashChange";
import Card from "../ui/Card";
import { useFeatureFlag } from "../hooks/useFeatureFlag";
import { Suspense, useReducer } from "react";
import {
  checkIsFeatureFlagWithFilters,
  checkIsFeatureFlagWithVariants,
} from "../../src/validate";
import { FilterFlagFooter, FilterFlagHeader } from "./FilterFlag";
import { VariantFlagFooter, VariantFlagHeader } from "./VariantFlag";
import { NewFlagForm } from "./NewFlagForm";
import { DeleteFlagForm } from "./DeleteFlagForm";

export default function FlagPage() {
  const flagId = useHashChange();
  const [seed, refresh] = useReducer((prev) => prev + 1, 0);
  const featureFlag = useFeatureFlag(flagId, seed);

  if (!featureFlag) {
    return (
      <>
        <Card className="md:row-[1] md:col-[2] flex-row justify-between items-center">
          <p className="font-bold">No flag selected</p>
          <p>Select a feature flag from the sidebar or create a new below.</p>
        </Card>
        <Card className="md:row-[2] md:row-end-[-1] md:col-[2] h-full overflow-y-scroll">
          <p className="font-bold">Create new Feature Flag</p>
          <NewFlagForm />
        </Card>
      </>
    );
  }

  const isFilterFlag = checkIsFeatureFlagWithFilters(featureFlag);
  const isVariantFlag = checkIsFeatureFlagWithVariants(featureFlag);

  return (
    <>
      <Card className="md:row-[1] md:col-[2] flex-row justify-between items-center">
        {isFilterFlag ? (
          <FilterFlagHeader featureFlag={featureFlag} />
        ) : isVariantFlag ? (
          <VariantFlagHeader featureFlag={featureFlag} />
        ) : (
          <span>[Unknown] {flagId}</span>
        )}

        {!flagId ? null : (
          <div className="flex gap-4 justify-end">
            <button type="button" className="cursor-pointer" onClick={refresh}>
              Refresh
            </button>
          </div>
        )}
      </Card>

      <Card className="md:row-[2] md:col-[2] h-full overflow-y-scroll">
        {featureFlag ? (
          <pre className="text-sm">{JSON.stringify(featureFlag, null, 2)}</pre>
        ) : (
          <span className="text-gray-500">
            JSON representation of the Feature Flag
          </span>
        )}
      </Card>

      <Card className="md:row-[3] md:col-[2] justify-center">
        <Suspense>
          {isFilterFlag ? (
            <FilterFlagFooter featureFlag={featureFlag} />
          ) : isVariantFlag ? (
            <VariantFlagFooter featureFlag={featureFlag} />
          ) : null}
        </Suspense>

        <DeleteFlagForm flagKey={featureFlag.id} />
      </Card>
    </>
  );
}
