// @ts-check

import { defineConfig } from "vite";
import azureFunctionsVitePlugin from "../src";

export default defineConfig({
  plugins: [
    azureFunctionsVitePlugin({
      buildVerify: {
        registeredFunctionsCount: 9,
        shouldIgnoreError: (error) => {
          if (error.message.includes("Error: test")) {
            return true;
          }

          return false;
        },
      },
    }),
  ],
});
