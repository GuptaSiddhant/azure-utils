// @ts-check

import { mock } from "node:test";
import azfn from "@azure/functions";

// Mock all methods of Azure functions library
const namedExports = { ...azfn, app: {} };
for (const key in azfn.app) {
  if (key === "hooks") {
    continue;
  }
  namedExports.app[key] = mock.fn();
}

mock.module("@azure/functions", { namedExports, defaultExport: namedExports });

process.on("exit", () => {
  /** @type {Registration[]} */
  const registrations = [];

  for (const key in namedExports.app) {
    const mockFn = namedExports.app[key];
    if (!mockFn || typeof mockFn !== "function") {
      continue;
    }

    /** @type {MockFunctionContext}  */
    const mock = mockFn.mock;

    switch (key) {
      case "setup": {
        break;
      }
      case "http": {
        mock.calls.forEach((call) => {
          const [name, { methods = ["GET"], ...options }] = call.arguments;
          methods.forEach((method) => {
            registrations.push({ trigger: "http", name, method, ...options });
          });
        });
        break;
      }
      case "get": {
        mock.calls.forEach(parseHttpCall.bind(null, registrations, "GET"));
        break;
      }
      case "post": {
        mock.calls.forEach(parseHttpCall.bind(null, registrations, "POST"));
        break;
      }
      case "put": {
        mock.calls.forEach(parseHttpCall.bind(null, registrations, "PUT"));
        break;
      }
      case "patch": {
        mock.calls.forEach(parseHttpCall.bind(null, registrations, "PATCH"));
        break;
      }
      case "deleteRequest": {
        mock.calls.forEach(parseHttpCall.bind(null, registrations, "DELETE"));
        break;
      }
      default: {
        mockFn.mock.calls.forEach(
          parseEventCall.bind(this, registrations, key)
        );
      }
    }
  }
  console.log(JSON.stringify({ registrations }));
});

/**
 * @param {Registration[]} registrations
 * @param {string} method
 * @param {MockFunctionCall} call
 */
function parseHttpCall(registrations, method, call) {
  const [name, options] = call.arguments;
  if (typeof options === "object") {
    registrations.push({ trigger: "http", name, method, ...options });
  } else {
    registrations.push({ trigger: "http", name, method });
  }
}

/**
 * @param {Registration[]} registrations
 * @param {string} trigger
 * @param {MockFunctionCall} call
 */
function parseEventCall(registrations, trigger, call) {
  const [name, { trigger: triggerObj, ...options }] = call.arguments;
  const triggerName =
    triggerObj?.type?.replace("Trigger", "") ?? (trigger || "generic");

  if (typeof options === "object") {
    registrations.push({ trigger: triggerName, name, ...options });
  } else {
    registrations.push({ trigger: triggerName, name });
  }
}

/**
 * @typedef {import( "node:test").Mock<(...args: any[])=>undefined>['mock']}  MockFunctionContext
 *
 * @typedef {import( "node:test").Mock<(...args: any[])=>undefined>['mock']['calls'][number]}  MockFunctionCall
 *
 * @typedef {{trigger: string, name:string, method?:string }} Registration
 */
