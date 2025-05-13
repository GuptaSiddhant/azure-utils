# Azure Functions TurboRepo Remote Cache Router

An easy way to deploy TurboRepo remote cache using Azure Functions. The package registers all endpoints required for TurboRepo to sync with remote cache as per the spec.

Refer [TurboRepo Cache Spec](https://turborepo.com/docs/openapi)

> Only works with **V4** functions written in TypeScript/JavaScript.

[![NPM](https://img.shields.io/npm/v/@azure-utils/turborepo-cache)](https://www.npmjs.com/package/@azure-utils/turborepo-cache)
[![JSR](https://jsr.io/badges/@azure-utils/turborepo-cache)](https://jsr.io/badges/@azure-utils/turborepo-cache)

## Install

### NPM

```sh
npm i -D @azure-utils/turborepo-cache
```

```sh
yarn add -D @azure-utils/turborepo-cache
```

```sh
bun add -D @azure-utils/turborepo-cache
```

### JSR

```sh
npx jsr add -D @azure-utils/turborepo-cache
```

```sh
deno add -D @azure-utils/turborepo-cache
```

## Build and deploy app

The package exports a `registerCacheRouter` function which registers all endpoint required to work with TurboRepo remote cache.

### 1. Register the router

Invoke the registration function is a file that is covered by Azure Functions. Normally this is the `index.ts` file. The function takes an optional options argument which can be used override default settings.

```ts
// src/index.ts
import { registerCacheRouter } from "@azure-utils/turborepo-cache";

registerCacheRouter();
```

-- or --

```ts
// src/index.ts
import { registerCacheRouter } from "@azure-utils/turborepo-cache";

registerCacheRouter({
  // Token used for authentication. Defaults to `env['TURBO_TOKEN']`.
  turboToken: "",
  // Azure Storage Connection String. Defaults to `env['AzureWebJobsStorage']`.
  connectionString: "",
  // Azure Storage Blob Container name. Defaults to `env['CONTAINER_NAME']` or `turborepocache`.
  containerName: "",
  // Enable/disable health check route
  healthCheck: true,
});
```

### 2. Update `host.json`

Azure functions use `host.json` in app root to configure the settings for whole functions-app.

Add/update the following setting to make sure there is no (empty) prefix before routes. If left unset, then Azure Functions may add `/api` prefix to routes which is incompatible with Turborepo cache spec.

```json
{
  "extensions": {
    "http": {
      "routePrefix": ""
    }
  }
}
```

### 3. Build app

If you are using TypeScript, you can use any bundler to build the functions-app. The official template used `tsc`.

If you wish to use Vite and add verification step (for peace of mind), checkout [Azure Functions Vite plugin](https://www.npmjs.com/package/@azure-utils/functions-vite-plugin).

> The vite plugin should output something similar following to confirm the endpoints are discoverable
>
> | Type        | Name                  | Options                          |
> | ----------- | --------------------- | -------------------------------- |
> | [http-GET]  | health-check          | {"route":"/"}                    |
> | [http-GET]  | check-service-status  | {"route":"/v8/artifacts/status"} |
> | [http-GET]  | download-artifact     | {"route":"/v8/artifacts/{hash}"} |
> | [http-GET]  | openapi-spec          | {"route":"/v8/openapi"}          |
> | [http-PUT]  | upload-artifact       | {"route":"/v8/artifacts/{hash}"} |
> | [http-POST] | query-artifacts-info  | {"route":"/v8/artifacts"}        |
> | [http-POST] | record-usage-events   | {"route":"/v8/artifacts/events"} |
> | [http-HEAD] | check-artifact-exists | {"route":"/v8/artifacts/{hash}"} |

### 4. Deploy app

In order to deploy the app by CLI, CI or Azure plugin, you a need an Azure Functions resource in your Azure subscription.

If you are creating a new resource, select the option to create an associated Storage account, that will be used to store cache artifacts.

If your app is not connected to Storage account or you wish to override storage account, use ENV or OPTIONS to do so.

## License

MIT © 2025 Siddhant Gupta (@GuptaSiddhant)
