import { useActionState } from "react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { useCreateFeatureFlag } from "../hooks/useFeatureFlag";
import { useRerenderAppContext } from "../contexts";

export function NewFlagForm() {
  const refresh = useRerenderAppContext();
  const createFlag = useCreateFeatureFlag();

  const [, createAction, isCreating] = useActionState(
    async (state: string | null, formData: FormData) => {
      const result = await createFlag(formData);
      if (result) {
        window.location.hash = result;
        refresh();
      }

      return result;
    },
    null
  );

  return (
    <form action={createAction} className="flex flex-col gap-2">
      <Input label="Key" name="key" required />
      <Input label="Description" name="description" />
      <Button type="submit" disabled={isCreating} className="w-max">
        Create Feature Flag
      </Button>
    </form>
  );
}
