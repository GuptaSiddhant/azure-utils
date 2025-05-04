// @ts-check

import { defineConfig } from "vite";
import azureFunctionsVitePlugin from "../src";

export default defineConfig({
  plugins: [azureFunctionsVitePlugin()],
});
