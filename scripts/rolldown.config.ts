import { defineConfig, type RolldownOptions } from "rolldown";
import { globSync } from "glob";
import { exec, execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { readPackageJson } from "./package-common-utils.mjs";

const pkgJson = readPackageJson();

const isWatchMode =
  process.argv.includes("--watch") || process.argv.includes("-w");

// Remove the dist directory if it exists
try {
  if (!isWatchMode) {
    rmSync("dist", { recursive: true, force: true });
  }
} catch {}

// Generate type declarations
if (isWatchMode) {
  const p = exec(`tsc --emitDeclarationOnly --watch`);
  p.on("close", () => {
    console.log("TSC closed");
  });
} else {
  execSync(`tsc --emitDeclarationOnly`, { stdio: "inherit" });
}

const commonOptions: RolldownOptions = {
  input: globSync("src/**/*.ts", {
    ignore: ["src/**/*.spec.ts", "src/**/*.test.ts"],
  }),
  platform: "node",
  treeshake: true,
  external: [
    ...Object.keys(pkgJson["dependencies"] || {}),
    ...Object.keys(pkgJson["peerDependencies"] || {}),
  ],
  jsx: {
    jsxImportSource: "@kitajs/html",
  },
};

export default defineConfig([
  {
    ...commonOptions,
    output: {
      dir: "dist",
      sourcemap: true,
      format: "esm",
      entryFileNames: "[name].mjs",
      chunkFileNames: "[name]-[hash].mjs",
    },
  },
  {
    ...commonOptions,
    output: {
      dir: "dist",
      format: "cjs",
      entryFileNames: "[name].cjs",
      chunkFileNames: "[name]-[hash].cjs",
    },
  },
]);
