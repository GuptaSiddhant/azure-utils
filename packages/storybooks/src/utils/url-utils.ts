import type { FormData } from "undici";

export function urlSearchParamsToObject(
  query: URLSearchParams | FormData
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key of query.keys()) {
    const values = query.getAll(key);
    // If multiple values for the same key, return array, else single value string
    result[key] = values.length > 1 ? values : values[0];
  }

  return result;
}

export function joinUrl(...parts: string[]): string {
  if (parts.length === 0) return "";
  let protocol = "";
  let host = "";

  // Detect protocol + host in the first argument if present
  const match = parts[0]?.match(/^([a-zA-Z][a-zA-Z0-9+\-.]*:)?(\/\/[^\/?#]*)?/);
  if (match && (match[1] || match[2])) {
    protocol = match[1] || ""; // e.g. "https:"
    host = match[2] || ""; // e.g. "//example.com"
    const remainder = parts[0]?.slice((match[0] || "").length);
    parts = remainder ? [remainder, ...parts.slice(1)] : parts.slice(1);
  }

  const segments: string[] = [];
  for (const part of parts) {
    for (const seg of part.split("/")) {
      if (!seg || seg === ".") continue;
      if (seg === "..") {
        // Don't pop past the beginning
        if (segments.length > 0) {
          segments.pop();
        }
      } else {
        segments.push(seg);
      }
    }
  }

  // Build the final URL
  let result = "";
  if (protocol || host) {
    result = protocol + host;
    if (segments.length > 0) {
      // Ensure separator slash between host and path
      result +=
        segments[0]?.startsWith("?") || segments[0]?.startsWith("#")
          ? ""
          : "/" + segments.join("/");
    }
  } else {
    result = "/" + segments.join("/");
  }

  return result;
}
