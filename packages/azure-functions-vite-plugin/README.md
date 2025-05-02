# Azure Functions Vite Plugin

> Only works with V4 functions written in typescript.

A modern and faster way to build Azure Function app written in TypeScript. The plugin also runs a verification function to check which functions are actually registered.

[![NPM](https://img.shields.io/npm/v/@azure-utils/functions-vite-plugin)](https://www.npmjs.com/package/@azure-utils/functions-vite-plugin)
[![JSR](https://jsr.io/badges/@azure-utils/functions-vite-plugin)](https://jsr.io/badges/@azure-utils/functions-vite-plugin)

## Install

### NPM

```sh
npm i -D @azure-utils/functions-vite-plugin
```

```sh
yarn add -D @azure-utils/functions-vite-plugin
```

```sh
bun add -D @azure-utils/functions-vite-plugin
```

### JSR

```sh
npx jsr add -D @azure-utils/functions-vite-plugin
```

```sh
deno add -D @azure-utils/functions-vite-plugin
```

## Plugin

The plugin needs to be added to Vite config plugin list.

```ts
// vite.config.js

import { defineConfig } from "vite/config";
import azureFunctionVitePlugin from "@azure-utils/functions-vite-plugin";

export default defineConfig({
  plugins: [azureFunctionVitePlugin()],
});
```

### Plugin options

The plugin accepts an options object to override the default plugin behavior.

```ts
type AzureFunctionsPluginOptions = {
  /**
   * Root path of the package. Defaults to `cwd()`.
   */
  rootPath?: string;
  /**
   * Input src dir path. Defaults to `./src`
   */
  inputDirname?: string;
  /**
   * Output src dir path. Defaults to `./dist`
   */
  outputDirname?: string;
  /**
   * Option to generate source maps. @default true
   */
  sourceMap?: boolean;
  /**
   * Option to check TS types. @default true
   */
  typecheck?: boolean;
  /**
   * Option to verify build output. @default true
   */
  verify?: boolean;
};
```

## License

MIT © 2025 Siddhant Gupta (@GuptaSiddhant)
