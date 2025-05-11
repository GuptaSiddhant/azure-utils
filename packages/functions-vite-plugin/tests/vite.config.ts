// @ts-check

import { defineConfig } from "vite";
import azureFunctionsVitePlugin from "../src";

export default defineConfig({
  plugins: [
    azureFunctionsVitePlugin({
      buildVerify: {
        registeredFunctionsCount: 2,
        shouldIgnoreError: (error) => {
          if (error.message.includes('throw "test"')) {
            return true;
          }

          return false;
        },
      },
    }),
  ],
});
