import { argv0, cwd, exit } from "node:process";
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
  const { errors, registrations } = await executeMainFiles(
    mainFiles,
    shouldIgnoreError
  );

  listErrors(errors);
  listRegistrations(registrations, registeredFunctionsCount);
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
  const registrationsMap = new Map<string, Registration>();
  const errors: Array<ExecError> = [];
  const mockFilepath = getMockFilepath();

  const promises = mainFiles.map(async (file) => {
    const { stdout, error } = await execPromise(
      `${argv0} --experimental-test-module-mocks --import=${mockFilepath} ${file}`
    );

    const output = stdout.split("\n");
    output.forEach((line) => {
      if (line.startsWith('{"registrations":[')) {
        const registrations: Registration[] = JSON.parse(line).registrations;
        for (const registration of registrations) {
          const key = JSON.stringify(registration);
          registrationsMap.set(key, registration);
        }
      } else {
        if (line) {
          log("debug", `${file} | ${line}`);
        }
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

  return { registrations: Array.from(registrationsMap.values()), errors };
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

type Registration = { name: string; trigger: string; [prop: string]: unknown };
function listRegistrations(
  registrations: Registration[],
  expectedRegistrationsCount: number | undefined
) {
  if (registrations.length === 0) {
    exitWithError(
      "No function registrations found.",
      "Check that the entry point of your app is correct."
    );
  }

  const registrationsSummaryList = registrations.map(summarizeRegistration);

  if (typeof expectedRegistrationsCount !== "undefined") {
    if (expectedRegistrationsCount !== registrations.length) {
      log(
        "error",
        "The registered functions mismatch with expected count.",
        `Expected registrations: ${expectedRegistrationsCount}, Found: ${registrations.length}`
      );
      console.table(registrationsSummaryList);
      exit(1);
    }
  }

  log(
    "success",
    `Build verified successfully`,
    `with following ${registrations.length} registered functions:`
  );
  console.table(registrationsSummaryList);
}

function summarizeRegistration({
  trigger,
  name,
  ...options
}: Registration): Record<string, string> {
  let triggerType = "";
  if (trigger === "http") {
    triggerType = `${trigger}-${options["method"]}`;
  } else {
    triggerType = trigger;
  }

  const summary: Record<string, string> = { name, trigger: triggerType };

  const { extraInputs, extraOutputs, method: _method, ...rest } = options;

  if (extraInputs && Array.isArray(extraInputs) && extraInputs.length > 0) {
    summary["inputs"] = extraInputs.map((input) => input.type).join(", ");
  }

  if (extraOutputs && Array.isArray(extraOutputs) && extraOutputs.length > 0) {
    summary["outputs"] = extraOutputs.map((input) => input.type).join(", ");
  }

  if (Object.keys(rest).length > 0) {
    summary["properties"] = Object.entries(rest)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" | ");
  }

  return summary;
}

function getMockFilepath() {
  let filepath;
  let level = 0;
  const name = "@azure-utils/functions-vite-plugin/mock.mjs";

  while (!filepath || level < 5) {
    const nmPath = join(
      cwd(),
      ...Array(level).fill(".."),
      "node_modules",
      ...name.split("/")
    );
    if (existsSync(nmPath)) {
      filepath = nmPath;
      break;
    }
    level++;
  }

  if (!filepath) {
    throw new Error(
      `Could not find node_modules/${name} folder in current or parent directory.`
    );
  }

  return filepath;
}
