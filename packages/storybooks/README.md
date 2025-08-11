# Azure Functions Storybooks management Router

An easy way to deploy Storybooks management using Azure Functions. The package registers all endpoints required for upload, delete and serve storybooks.

> Only works with **V4** functions written in TypeScript/JavaScript.

[![NPM](https://img.shields.io/npm/v/@azure-utils/storybooks)](https://www.npmjs.com/package/@azure-utils/storybooks)
[![JSR](https://jsr.io/badges/@azure-utils/storybooks)](https://jsr.io/badges/@azure-utils/storybooks)

## Install

### NPM

```sh
npm i -D @azure-utils/storybooks zod
```

### JSR

```sh
deno add -D @azure-utils/storybooks npm:zod
```

## Build and deploy app

The package exports a `registerStorybooksRouter` function which registers all endpoint required.

### Register the router

Invoke the registration function is a file that is covered by Azure Functions. Normally this is the `index.js` file. The function takes an optional options argument which can be used override default settings.

```ts
// index.js
import { registerStorybooksRouter } from "@azure-utils/storybooks";

registerStorybooksRouter();
```

-- or --

```ts
// index.js
import { registerStorybooksRouter, getStore } from "@azure-utils/storybooks";

const registerRoute = registerStorybooksRouter({
   /**
   * Define the route on which all router is placed.
   *
   * @default 'storybooks/'
   */
  route?: string;

  /**
   * The function HTTP authorization level Defaults to 'anonymous' if not specified.
   */
  authLevel?: HttpTriggerOptions["authLevel"];

  /**
   * Name of the Environment variable which stores
   * the connection string to the Azure Storage resource.
   * @default 'AzureWebJobsStorage'
   */
  storageConnectionStringEnvVar?: string;

  /**
   * Modify the cron-schedule of timer function
   * which purge outdated storybooks.
   *
   * Pass `null` to disable auto-purge functionality.
   *
   * @default "0 0 0 * * *" // Every midnight
   */
  purgeScheduleCron?: string | null;
});

// Register additional routes on the service
registerRoute("account", {
  route: "account",
  methods: ["GET","POST"],
  handler: (request, context) => {
    return { statue: 200 }
  }
})

```

### Update `host.json` (optional)

Azure functions use `host.json` in app root to configure the settings for whole functions-app.

Add/update the following setting to make sure there is no (empty) prefix before routes. If left unset, then Azure Functions may add `/api` prefix to routes which is undesirable for clean routing.

```json
{
  "version": "2.0",
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  },
  "extensions": {
    "http": {
      "routePrefix": ""
    }
  }
}
```

### Deploy app

In order to deploy the app by CLI, CI or Azure plugin, you a need an Azure Functions resource in your Azure subscription.

If you are creating a new resource, select the option to create an associated Storage account, that will be used to store cache artifacts.

If your app is not connected to Storage account or you wish to override storage account, use ENV or OPTIONS to do so.

## License

MIT © 2025 Siddhant Gupta (@GuptaSiddhant)
