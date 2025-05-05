import { defineConfig, type RolldownOptions } from "rolldown";
import { globSync } from "glob";
import pkg from "./package.json";
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

const commonConfig: RolldownOptions = {
  input: globSync("src/**/*.ts"),
  platform: "node",
  treeshake: true,
  external: [...Object.keys(pkg.peerDependencies || {})],
  output: {
    dir: "dist",
    sourcemap: false,
  },
};

// Remove the dist directory if it exists
try {
  rmSync("dist", { recursive: true, force: true });
} catch {}

// Generate type declarations
execSync("tsc --emitDeclarationOnly --outDir dist", {
  stdio: "inherit",
});

export default defineConfig([
  {
    ...commonConfig,
    output: {
      ...commonConfig.output,
      format: "esm",
      entryFileNames: "[name].mjs",
      chunkFileNames: "[name]-[hash].mjs",
    },
  },
  {
    ...commonConfig,
    output: {
      ...commonConfig.output,
      format: "cjs",
      entryFileNames: "[name].cjs",
      chunkFileNames: "[name]-[hash].cjs",
    },
  },
]);
