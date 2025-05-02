// @ts-check

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cwd, exit } from "node:process";

/**
 * @typedef {{
 *  name: string;
 *  version?: string;
 *  private?: boolean;
 *  exports?: Record<string, unknown>
 * }} PackageJson
 * @typedef {{
 *  name: string;
 *  version: string;
 *  exports?: Record<string, unknown>
 * }} JsrJson
 */

/** @returns {PackageJson} */
export function readPackageJson(workingDir = cwd()) {
  const filepath = join(workingDir, "package.json");
  if (!existsSync(filepath)) {
    console.error(
      "There is no 'package.json' in this directory. Run the script from dir with 'package.json' file."
    );
    exit(1);
  }

  return JSON.parse(readFileSync(filepath, { encoding: "utf-8" }));
}

/** @param {PackageJson} content */
export function writePackageJson(content, workingDir = cwd()) {
  const filepath = join(workingDir, "package.json");
  if (!existsSync(filepath)) {
    console.error(
      "There is no 'package.json' in this directory. Run the script from dir with 'package.json' file."
    );
    exit(1);
  }

  return writeFileSync(filepath, JSON.stringify(content, null, 2), {
    encoding: "utf-8",
  });
}

/** @returns {JsrJson} */
export function readJsrJson(workingDir = cwd()) {
  const filepath = join(workingDir, "jsr.json");
  if (!existsSync(filepath)) {
    console.error(
      "There is no 'jsr.json' in this directory. Run the script from dir with 'jsr.json' file."
    );
    exit(1);
  }

  return JSON.parse(readFileSync(filepath, { encoding: "utf-8" }));
}

/** @param {JsrJson} content */
export function writeJsrJson(content, workingDir = cwd()) {
  const filepath = join(workingDir, "jsr.json");
  if (!existsSync(filepath)) {
    console.error(
      "There is no 'jsr.json' in this directory. Run the script from dir with 'jsr.json' file."
    );
    exit(1);
  }

  return writeFileSync(filepath, JSON.stringify(content, null, 2), {
    encoding: "utf-8",
  });
}
