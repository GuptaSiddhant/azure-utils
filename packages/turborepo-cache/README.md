# Azure Functions TurboRepo Remote Cache Utils

> Only works with V4 functions written in typescript.

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

## Plugin

The plugin needs to be added to Vite config plugin list.

```ts
// VITE config

import { defineConfig } from "vite/config";
import azureFunctionsVitePlugin from "@azure-utils/turborepo-cache";

export default defineConfig({
  plugins: [azureFunctionsVitePlugin()],
});
```

## License

MIT © 2025 Siddhant Gupta (@GuptaSiddhant)
