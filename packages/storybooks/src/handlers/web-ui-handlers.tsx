import type {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { CACHE_CONTROL_PUBLIC_WEEK, urlBuilder } from "../utils/constants";
import { getStore } from "../utils/store";
import path from "node:path";
import fs from "node:fs";
import { getMimeType } from "../utils/mime-utils";

export async function rootHandler(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log("Serving SB root...");
  return { status: 303, headers: { Location: urlBuilder.allProjects() } };
}

export async function staticFileHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const { filepath = "" } = request.params;
  const { staticDirs } = getStore();
  context.log(
    "Serving static file '%s' from '%s' dirs...",
    filepath,
    staticDirs.join(",")
  );

  const staticFilepaths = staticDirs.map((dir) =>
    path.join(path.relative(process.cwd(), dir), filepath)
  );

  const staticFilepath = staticFilepaths.find(fs.existsSync);

  if (!staticFilepath) {
    return { status: 404 };
  }

  context.debug("Static file '%s' found.", staticFilepath);

  return {
    status: 200,
    body: fs.createReadStream(staticFilepath, {
      encoding: "utf8",
      autoClose: true,
    }),
    headers: {
      "Content-Type": getMimeType(staticFilepath) || "application/octet-stream",
      "Cache-Control": CACHE_CONTROL_PUBLIC_WEEK,
    },
  };
}
