import { exit } from "node:process";
import { exec, type ExecException } from "node:child_process";

export function execPromise(
  command: string
): Promise<{ stdout: string; stderr: string; error: ExecException | null }> {
  return new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      resolve({ stdout, stderr, error });
    });
  });
}

export function exitWithError(message: string, ...rest: unknown[]) {
  log("error", message, ...rest);
  exit(1);
}

type LogType = "info" | "success" | "error" | "debug" | "warn";
const logPrefix = "AzFn";
const colorMap: Record<
  LogType,
  { bgColorCode: number; textColorCode: number }
> = {
  debug: { bgColorCode: 100, textColorCode: 90 },
  info: { bgColorCode: 44, textColorCode: 34 },
  success: { bgColorCode: 42, textColorCode: 32 },
  error: { bgColorCode: 41, textColorCode: 31 },
  warn: { bgColorCode: 43, textColorCode: 33 },
};
export function log(type: LogType, message: string, ...rest: unknown[]) {
  const { bgColorCode, textColorCode } = colorMap[type];

  globalThis.console.log(
    `\x1b[${bgColorCode}m ${logPrefix} \x1b[0m\t\x1b[${textColorCode}m`,
    message,
    "\x1b[0m",
    rest.length > 0 ? "\n\t" : "",
    ...rest
  );
}
