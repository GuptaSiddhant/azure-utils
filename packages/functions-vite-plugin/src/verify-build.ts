import { cwd, exit } from "node:process";
import { execPromise, exitWithError, log } from "./utils";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { glob } from "glob";

/**
 * Options for Azure functions build verification
 */
export type AzureFunctionsPluginBuildVerifyOptions = {
  /**
   * Match the number of functions registered in Azure Functions app.
   * If the number does not match, the plugin will fail.
   */
  registeredFunctionsCount?: number;
  /**
   * If verification encounters some error, this callback can
   * be used to confirm or deny whether the error should be ignored.
   *
   * Return `true` or `Promise<true>` to ignore the error.
   */
  shouldIgnoreError?: (error: Error) => boolean | Promise<boolean>;

  /**
   * A string of options passed to `node` cmd while executing the files
   *
   * @example
   * `--trace-uncaught` => `node --trace-uncaught index.js`
   *
   * If left undefined, the file be executed with bare `node` (`node index.js`).
   */
  nodeOptions?: string;
};

/**
 * Function to check the registered functions in the build
 */
export async function verifyBuild(
  rootPath = cwd(),
  options: AzureFunctionsPluginBuildVerifyOptions
) {
  log("info", "Verifying build...");
  const {
    registeredFunctionsCount: expectedRegisteredFunctionsCount,
    shouldIgnoreError,
    nodeOptions,
  } = options;

  const pkgJsonPath = join(rootPath, "package.json");
  if (!existsSync(pkgJsonPath)) {
    exitWithError(
      "'package.json' not found.",
      "Run this script from the root of the project."
    );
  }

  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
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
  const errors: Array<{ file: string; error: Error; ignored: boolean }> = [];

  const promises = mainFiles.map(async (file) => {
    const { stderr, error } = await execPromise(
      `node ${nodeOptions || ""} ${file}`
    );

    if (error) {
      let ignored = false;
      if (shouldIgnoreError) {
        const result = shouldIgnoreError(error);
        if (typeof result === "boolean") {
          ignored = result;
        } else {
          ignored = await result;
        }
      }

      errors.push({ file, error, ignored });
    }

    const matches = stderr.matchAll(regexp);
    [...matches]
      .map((match) => match[1])
      .filter((name) => name !== undefined)
      .forEach((name) => registeredFunctions.add(name));
  });

  await Promise.all(promises);

  const ignoredErrors = errors.filter((err) => err.ignored);
  if (ignoredErrors.length > 0) {
    log("warn", "Following errors were ignored:");
    globalThis.console.group();
    ignoredErrors.forEach((e) => {
      globalThis.console.log(`\t - ${e.file}: ${e.error.name}`);
    });
    globalThis.console.groupEnd();
  }

  const nonIgnoredErrors = errors.filter((err) => !err.ignored);
  if (nonIgnoredErrors.length > 0) {
    log("error", "Found errors in the following files:");
    globalThis.console.group();
    nonIgnoredErrors.forEach((e) => {
      globalThis.console.log("-\x1b[33m", e.file, "\x1b[0m");
      globalThis.console.group();
      globalThis.console.log(
        `\x1b[31m[${e.error.name}]`,
        e.error.message,
        "\x1b[0m"
      );
      globalThis.console.groupEnd();
    });
    globalThis.console.groupEnd();
    exit(1);
  }

  if (registeredFunctions.size === 0) {
    exitWithError(
      "No functions found.",
      "Check that the entry point of your app is correct."
    );
  }
  if (typeof expectedRegisteredFunctionsCount !== "undefined") {
    if (expectedRegisteredFunctionsCount !== registeredFunctions.size) {
      exitWithError(
        "The registered functions mismatch with expected count.",
        `Expected functions: ${expectedRegisteredFunctionsCount}, Found: ${registeredFunctions.size}`,
        "\n\t - " + [...registeredFunctions].join("\n\t - ")
      );
    }
  }

  log(
    "success",
    `Build verified with following ${registeredFunctions.size} functions:`,
    "- " + [...registeredFunctions].join("\n\t - ")
  );
}
