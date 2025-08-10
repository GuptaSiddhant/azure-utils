import { createDocument } from "zod-openapi";
import {
  openAPIPaths,
  openAPISchemas,
  openAPISecuritySchemas,
  openAPITags,
} from "../utils/openapi-utils";
import {
  CONTENT_TYPES,
  SERVICE_NAME,
  SUPPORTED_CONTENT_TYPES_MSG,
} from "../utils/constants";
import type { OpenAPIOptions } from "../utils/types";
import { responseError } from "../utils/response-utils";
import type { HttpHandler } from "@azure/functions";

export function openAPIHandler(options: OpenAPIOptions = {}): HttpHandler {
  return (request, context) => {
    const {
      title = SERVICE_NAME.toUpperCase(),
      version = process.env["NODE_ENV"] || "TEST",
      servers,
    } = options;

    context.log("Serving OpenAPI schema...");

    try {
      const openAPISpec = createDocument({
        openapi: "3.1.0",
        info: { title, version },
        security: [],
        servers,
        tags: Object.values(openAPITags),
        paths: openAPIPaths,
        components: {
          schemas: openAPISchemas,
          securitySchemes: openAPISecuritySchemas,
        },
      });

      const { searchParams } = new URL(request.url);
      const isDownloadJSON = searchParams.get("download") === "json";
      if (isDownloadJSON) {
        const headers = new Headers({
          "Content-Disposition": `attachment; filename="${title}_${version}_openapi.json"`,
        });
        return { status: 200, jsonBody: openAPISpec, headers };
      }

      const accept = request.headers.get("accept");

      if (!accept || accept.includes(CONTENT_TYPES.JSON)) {
        return { status: 200, jsonBody: openAPISpec };
      }

      if (accept.includes(CONTENT_TYPES.HTML)) {
        const html = generateSwaggerUI(title, openAPISpec);

        return {
          status: 200,
          headers: { "Content-Type": CONTENT_TYPES.HTML },
          body: html,
        };
      }

      return { status: 406, body: SUPPORTED_CONTENT_TYPES_MSG };
    } catch (error) {
      return responseError(error, context);
    }
  };
}

function generateSwaggerUI(title: string, openAPISpec: object) {
  return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${title} SwaggerUI" />
    <title>${title}</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
    <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js" crossorigin></script>
</head>
<body style="position: relative;">
  <div id="swagger-ui"></div>
  <div style="position: absolute; top: 0; right: 0; padding-right: 16px; display: flex; gap: 0.5rem;">
    <form>
      <input type="hidden" name="download" value="json" />
      <button type="submit">Download</button>
    </form>
    <button type="button" onClick="window.location.reload();">Refresh</button>
  </div>
  <script async defer>
      window.swaggerUI = SwaggerUIBundle(${JSON.stringify({
        dom_id: "#swagger-ui",
        spec: openAPISpec,
      })});
  </script>
</body>
</html>`;
}
