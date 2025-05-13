// @ts-check

import { defineConfig } from "vite";
import azureFunctionsVitePlugin from "@azure-utils/functions-vite-plugin";

export default defineConfig({
  plugins: [
    azureFunctionsVitePlugin({
      buildVerify: { registeredFunctionsCount: 8 },
    }),
  ],
});
