import { useActionState } from "react";
import { useFeatureFlagService, useRerenderAppContext } from "../contexts";
import Button from "../ui/Button";

export function DeleteFlagForm({ flagKey }: { flagKey: string }) {
  const refresh = useRerenderAppContext();
  const service = useFeatureFlagService();

  const [, action, isPending] = useActionState(async () => {
    const confirmed = window.confirm(
      `You are about to delete the feature flag '${flagKey}'. Are you sure?`
    );
    if (!confirmed) return;

    const deleted = await service.delete(flagKey);
    if (deleted) {
      window.location.hash = "";
      refresh();
    }
  }, null);

  return (
    <form action={action}>
      <Button className="w-max" disabled={isPending}>
        - Delete flag
      </Button>
    </form>
  );
}
