// @ts-check

import { defineConfig } from "vite";
import azureFunctionsVitePlugin from "..";

export default defineConfig({
  plugins: [azureFunctionsVitePlugin()],
});
