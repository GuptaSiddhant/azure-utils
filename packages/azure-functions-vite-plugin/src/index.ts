/**
 * @module
 * VITE Plugin to build and verify Azure functions app.
 */

import type { ConfigEnv, Plugin } from "vite";
import cp from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { cwd, exit } from "node:process";
import { glob } from "glob";

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
  verify?: boolean;
};

/**
 * Vite plugin to build and verify Azure Functions.
 */
export default function azureFunctionVitePlugin(
  options: AzureFunctionsPluginOptions = {}
): Plugin {
  const {
    rootPath = cwd(),
    inputDirname = "src",
    outputDirname = "dist",
    sourceMap = true,
    typecheck = true,
    verify = true,
  } = options;
  const inputFilesGlob = path.join(inputDirname, "**", "*.ts");
  const inputFilesGlobIgnore = [
    path.join(inputDirname, "**", "*.spec.ts"),
    path.join(inputDirname, "**", "*.test.ts"),
  ];

  let isWatching = false;
  let command: ConfigEnv["command"] | undefined;

  return {
    name: "vite-plugin-azure-functions",

    watchChange: () => {
      isWatching = true;
    },

    config: (config, env) => {
      command = env.command;
      log("info", "Updating vite config...");

      const pkgJson = JSON.parse(
        fs.readFileSync(path.join(rootPath, "package.json"), "utf-8")
      );
      const inputFiles = glob.sync(inputFilesGlob, {
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
        entry: inputFilesGlob,
        formats: ["cjs"],
      };
      config.build.rollupOptions = {
        input: inputFiles,
        output: {
          entryFileNames: (entry) =>
            rollupEntryFileNames(path.join(rootPath, inputDirname), entry),
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
      if (!command || command !== "build" || !typecheck || isWatching) {
        return;
      }
      await checkTypes();
    },

    closeBundle: async () => {
      if (!command || command !== "build" || !verify) {
        return;
      }
      await verifyBuild(rootPath);
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

  const relativeDir = path.relative(inputDirPath, path.dirname(facadeModuleId));

  return path.join(relativeDir, fileName);
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

/**
 * Function to check the registered functions in the build
 */
async function verifyBuild(rootPath = cwd()) {
  log("info", "Verifying build...");

  const pkgJsonPath = path.join(rootPath, "package.json");
  if (!fs.existsSync(pkgJsonPath)) {
    exitWithError(
      "'package.json' not found.",
      "Run this script from the root of the project."
    );
  }

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
  const mainPath = pkgJson.main;
  if (!mainPath) {
    exitWithError(
      "'main' not found in 'package.json'.",
      "Add 'main' to 'package.json' and set it to the entry point of your app."
    );
  }

  const mainFiles = glob.sync(mainPath);
  if (mainFiles.length === 0) {
    exitWithError(
      `'main' Files not found (${mainPath}).`,
      `Check that the entry point of your app is correct and app is already built.`
    );
  }

  log("debug", "Target files found: " + mainFiles.length);

  const registeredFunctions = new Set<string>();
  const regexp = /register function "(.*)" because/g;

  const promises = mainFiles.map(async (file) => {
    const { stderr, error } = await execPromise(`node ${file}`);
    if (error) {
      exitWithError(`Error in file: '${file}'.`, error);
    }

    const matches = stderr.matchAll(regexp);
    [...matches]
      .map((match) => match[1])
      .filter((name) => name !== undefined)
      .forEach((name) => registeredFunctions.add(name));
  });

  await Promise.all(promises);

  if (registeredFunctions.size === 0) {
    exitWithError(
      "No functions found.",
      "Check that the entry point of your app is correct."
    );
  }

  log(
    "success",
    `Build verified with following ${registeredFunctions.size} functions:`,
    "- " + [...registeredFunctions].join("\n\t - ")
  );
}

// Helpers

function exitWithError(message: string, ...rest: unknown[]) {
  log("error", message, ...rest);
  exit(1);
}

function log(
  type: "info" | "success" | "error" | "debug" | undefined,
  message: string,
  ...rest: unknown[]
) {
  const logPrefix = "AZ-FN";
  const bgColorCode =
    type === "info"
      ? 44
      : type === "success"
      ? 42
      : type === "error"
      ? 41
      : 100;
  const textColorCode =
    type === "info" ? 34 : type === "success" ? 32 : type === "error" ? 31 : 90;
  globalThis.console.log(
    `\x1b[${bgColorCode}m ${logPrefix} \x1b[0m\t\x1b[${textColorCode}m`,
    message,
    "\x1b[0m",
    rest.length > 0 ? "\n\t" : "",
    ...rest
  );
}

function execPromise(
  command: string
): Promise<{ stdout: string; stderr: string; error: Error | null }> {
  return new Promise((resolve) => {
    cp.exec(command, (error, stdout, stderr) => {
      resolve({ stdout, stderr, error });
    });
  });
}
