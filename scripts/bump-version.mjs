// @ts-check

import { execSync } from "node:child_process";
import { exit, argv, cwd } from "node:process";
import {
  readJsrJson,
  readPackageJson,
  writeJsrJson,
} from "./package-common-utils.mjs";

const versionStrategies = ["major", "minor", "patch", "prerelease"];

const strategy = argv[2] || "patch";
if (!versionStrategies.includes(strategy)) {
  console.error("The version strategy must be one of", versionStrategies);
  exit(1);
}

/** @type {import("node:child_process").ExecSyncOptions} */
const options = { encoding: "utf-8", stdio: "inherit" };

// Install latest packages
execSync(`yarn install`, options);

// Break on failed verification
execSync(`yarn verify`, options);

// Bump package version
execSync(`yarn version ${strategy}`, options);

const workingDir = cwd();
const pkgJson = readPackageJson(workingDir);

const version = pkgJson.version;
if (!version) {
  console.error("The package does not contain a version.");
  exit(1);
}

console.log("Updating JSR version to ", version);
const jsrJson = readJsrJson(workingDir);
jsrJson.version = version;
writeJsrJson(jsrJson);

execSync(`git add package.json jsr.json`, options);
execSync(`git commit -m 'chore(${pkgJson.name}): v${version}'`, options);

console.log(`Updated version to ${version} and committed the package files.`);

exit(0);
