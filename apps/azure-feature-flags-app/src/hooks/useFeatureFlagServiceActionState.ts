import * as React from "react";
import { FeatureFlagService } from "@azure-utils/feature-flags";
import { AppConfigurationClientLite } from "@azure-utils/feature-flags/client";

export default function useFeatureFlagServiceActionState() {
  return React.useActionState(async (_prev: unknown, formData: FormData) => {
    const connectionString = formData.get("connectionString")?.toString();
    if (!connectionString) {
      return "No connectionString provided.";
    }

    if (
      !connectionString.includes("Endpoint=") ||
      !connectionString.includes("Secret=") ||
      !connectionString.includes("Id=")
    ) {
      return "The connectionString is not in correct format";
    }

    try {
      const client = new AppConfigurationClientLite(connectionString);

      return new FeatureFlagService(client);
    } catch (error) {
      console.error(error);
      return "An error occurred while connecting! Try again.";
    }
  }, undefined);
}
