import { defineConfig, type RolldownOptions } from "rolldown";
import { globSync } from "glob";
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { generateExportFiles, getPackageExports } from "./exports-files.mjs";
import { readPackageJson } from "./package-common-utils.mjs";

const pkgJson = readPackageJson();

// Remove the dist directory if it exists
try {
  rmSync("dist", { recursive: true, force: true });
} catch {}

// Generate type declarations
execSync("tsc --emitDeclarationOnly --outDir dist", { stdio: "inherit" });

// Generate export files to support older node versions
generateExportFiles(getPackageExports(pkgJson));

const commonOptions: RolldownOptions = {
  input: globSync("src/**/*.ts", {
    ignore: ["src/**/*.spec.ts", "src/**/*.test.ts"],
  }),
  platform: "node",
  treeshake: true,
  external: Object.keys(pkgJson["peerDependencies"] || {}),
  output: { dir: "dist", sourcemap: true },
};

export default defineConfig([
  {
    ...commonOptions,
    output: {
      ...commonOptions.output,
      format: "esm",
      entryFileNames: "[name].mjs",
      chunkFileNames: "[name]-[hash].mjs",
    },
  },
  {
    ...commonOptions,
    output: {
      ...commonOptions.output,
      format: "cjs",
      entryFileNames: "[name].cjs",
      chunkFileNames: "[name]-[hash].cjs",
    },
  },
]);
