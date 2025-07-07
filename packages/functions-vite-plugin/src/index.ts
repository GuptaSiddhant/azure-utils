/**
 * @module
 * VITE Plugin to build and verify Azure functions app.
 */

import type { ConfigEnv, Plugin } from "vite";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { cwd, env as processEnv, argv } from "node:process";
import { glob } from "glob";
import {
  verifyBuild,
  type AzureFunctionsPluginBuildVerifyOptions,
} from "./verify-build";
import { execPromise, exitWithError, log } from "./utils";

export type { AzureFunctionsPluginBuildVerifyOptions };

/**
 * Options to override the default plugin behavior.
 */
export type AzureFunctionsPluginOptions = {
  /**
   * Root path of the package. Defaults to `cwd()`.
   */
  rootPath?: string;
  /**
   * Input src dir path. Defaults to `./src`
   */
  inputDirname?: string;
  /**
   * Output src dir path. Defaults to `./dist`
   */
  outputDirname?: string;
  /**
   * Option to generate source maps. @default true
   */
  sourceMap?: boolean;
  /**
   * Option to check TS types. @default true
   */
  typecheck?: boolean;
  /**
   * Option to verify build output. @default true
   */
  buildVerify?: boolean | AzureFunctionsPluginBuildVerifyOptions;
};

/**
 * Vite plugin to build and verify Azure Functions.
 */
export default function azureFunctionsVitePlugin(
  options: AzureFunctionsPluginOptions = {}
): Plugin {
  const {
    rootPath = cwd(),
    inputDirname = "src",
    outputDirname = "dist",
    sourceMap = true,
    typecheck = true,
    buildVerify = true,
  } = options;
  const inputFilesGlobs = [
    join(inputDirname, "**", "*.ts"),
    join(inputDirname, "**", "*.tsx"),
  ];
  const inputFilesGlobIgnore = [
    join(inputDirname, "**", "*.spec.ts"),
    join(inputDirname, "**", "*.spec.tsx"),
    join(inputDirname, "**", "*.test.ts"),
    join(inputDirname, "**", "*.test.tsx"),
  ];

  let isWatching = false;
  let command: ConfigEnv["command"] | undefined;
  let skipTypecheck = false;
  let skipBuildVerify = false;

  return {
    name: "vite-plugin-azure-functions",

    watchChange: () => {
      isWatching = true;
    },

    config: (config, configEnv) => {
      log("info", "Updating vite config...");
      command = configEnv.command;

      // If checks are skipped,
      const skipAllChecks =
        processEnv["CHECKS"] === "false" || argv.includes("--skip-checks");

      skipTypecheck =
        skipAllChecks ||
        processEnv["TYPECHECK"] === "false" ||
        argv.includes("--skip-typecheck") ||
        !typecheck;

      skipBuildVerify =
        skipAllChecks ||
        processEnv["BUILD_VERIFY"] === "false" ||
        argv.includes("--skip-build-verify") ||
        !buildVerify;

      // Update config
      const pkgJson = JSON.parse(
        readFileSync(join(rootPath, "package.json"), "utf-8")
      );
      const inputFiles = glob.sync(inputFilesGlobs, {
        ignore: inputFilesGlobIgnore,
      });

      // Build
      if (!config.build) {
        config.build = {};
      }
      config.build.emptyOutDir = !isWatching;
      config.build.outDir = outputDirname;
      config.build.lib = {
        name: pkgJson.name,
        entry: inputFilesGlobs,
        formats: ["cjs"],
      };
      config.build.rollupOptions = {
        input: inputFiles,
        output: {
          entryFileNames: (entry) =>
            rollupEntryFileNames(join(rootPath, inputDirname), entry),
        },
      };
      config.build.ssr = true;
      config.build.sourcemap ??= sourceMap;

      // SSR
      if (!config.ssr) {
        config.ssr = {};
      }
      config.ssr.target = "node";
      config.ssr.external ??= Object.keys(pkgJson.dependencies || {});
    },

    buildStart: async () => {
      if (!command || command !== "build" || isWatching) {
        return;
      }
      if (skipTypecheck) {
        log("warn", "Skipping type check.");
        return;
      }
      await checkTypes();
    },

    closeBundle: async () => {
      if (!command || command !== "build") {
        return;
      }
      if (skipBuildVerify) {
        log("warn", "Skipping build verification.");
        return;
      }
      await verifyBuild(
        rootPath,
        typeof buildVerify === "object" ? buildVerify : {}
      );
    },
  };
}

/**
 * Maintain the directory structure of the input files in the output directory.
 */
function rollupEntryFileNames(
  inputDirPath: string,
  entry: { name: string; facadeModuleId: string | null }
): string {
  const { name, facadeModuleId } = entry;
  const fileName = `${name}.js`;

  if (!facadeModuleId) {
    return fileName;
  }

  const relativeDir = relative(inputDirPath, dirname(facadeModuleId));

  return join(relativeDir, fileName);
}

/**
 * Type check the src using TS config.
 */
async function checkTypes() {
  log("info", "Running type check...");
  const { stdout, stderr, error } = await execPromise("tsc --noEmit");
  if (error || stderr) {
    exitWithError("Type check failed.", stderr || stdout);
  } else {
    log("success", "Type check passed.");
  }
}
