import { cwd, exit } from "node:process";
import { execPromise, exitWithError, log } from "./utils";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { glob } from "glob";
import { name } from "../package.json";

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
};

/**
 * Function to check the registered functions in the build
 */
export async function verifyBuild(
  rootPath = cwd(),
  options: AzureFunctionsPluginBuildVerifyOptions
) {
  log("info", "Verifying build...");
  const { registeredFunctionsCount, shouldIgnoreError } = options;

  const mainFiles = getMainFiles(rootPath);
  const { errors, invocations } = await executeMainFiles(
    mainFiles,
    shouldIgnoreError
  );

  listErrors(errors);
  listInvocations(invocations, registeredFunctionsCount);
}

function getMainFiles(rootPath: string) {
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
  return mainFiles;
}

async function executeMainFiles(
  mainFiles: string[],
  shouldIgnoreError: AzureFunctionsPluginBuildVerifyOptions["shouldIgnoreError"]
) {
  const invocations: Invocation[] = [];
  const errors: Array<ExecError> = [];
  const mockFilepath = getMockFilepath();

  const promises = mainFiles.map(async (file) => {
    const { stdout, error } = await execPromise(
      `node --experimental-test-module-mocks --import=${mockFilepath} ${file}`
    );

    const output = stdout.split("\n");
    output.forEach((line) => {
      if (line.startsWith('{"invocations":[')) {
        invocations.push(...JSON.parse(line).invocations);
      } else {
        if (line) log("debug", "Found log message:", line);
      }
    });

    if (error) {
      let ignored = false;
      if (shouldIgnoreError) {
        const result = shouldIgnoreError(error);
        if (result instanceof Promise) {
          ignored = await result;
        } else {
          ignored = !!result;
        }
      }

      errors.push({ file, error, ignored });
    }
  });

  await Promise.all(promises);

  return { invocations, errors };
}

type ExecError = { file: string; error: Error; ignored: boolean };
function listErrors(errors: ExecError[]) {
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
}

type Invocation = { name: string; trigger: string; [prop: string]: string };
function listInvocations(
  invocations: Invocation[],
  expectedInvocationsCount: number | undefined
) {
  if (invocations.length === 0) {
    exitWithError(
      "No function invocations found.",
      "Check that the entry point of your app is correct."
    );
  }

  const invocationsSummaryList = invocations.map(
    ({ name, trigger, ...rest }) =>
      `\n\t - [${trigger}] ${name} ${JSON.stringify(rest)}`
  );

  if (typeof expectedInvocationsCount !== "undefined") {
    if (expectedInvocationsCount !== invocations.length) {
      exitWithError(
        "The invocated functions mismatch with expected count.",
        `Expected invocations: ${expectedInvocationsCount}, Found: ${invocations.length}`,
        ...invocationsSummaryList
      );
    }
  }

  log(
    "success",
    `Build verified successfully`,
    `with following ${invocations.length} invoked functions:`,
    ...invocationsSummaryList
  );
}

function getMockFilepath() {
  let nodeModulesPath;
  let level = 0;

  while (!nodeModulesPath || level < 5) {
    const nmPath = join(cwd(), ...Array(level).fill(".."), "node_modules");
    if (existsSync(nmPath)) {
      nodeModulesPath = nmPath;
      break;
    }
    level++;
  }

  if (!nodeModulesPath) {
    throw new Error(
      "Could not find node_modules folder in current or parent directory."
    );
  }

  return join(nodeModulesPath, ...name.split("/"), "mock.mjs");
}
