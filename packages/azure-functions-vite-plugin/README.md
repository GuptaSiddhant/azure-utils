# Azure Functions Vite Plugin

> Only works with V4 functions written in typescript.

[![NPM](https://img.shields.io/npm/v/@azure-utils/functions-vite-plugin)](https://www.npmjs.com/package/@azure-utils/functions-vite-plugin)
[![JSR](https://jsr.io/badges/@azure-utils/functions-vite-plugin)](https://jsr.io/badges/@azure-utils/functions-vite-plugin)

A modern and faster way to build Azure Function app written in TypeScript. The plugin also runs a verification function to check which functions are actually registered.

The build-verification step runs a test to check if the function is registered in the Azure Functions runtime.
If the script encounters any issues, it will list them as warnings in the console along with all the functions-registered.

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
// VITE config

import { defineConfig } from "vite/config";
import azureFunctionsVitePlugin from "@azure-utils/functions-vite-plugin";

export default defineConfig({
  plugins: [azureFunctionsVitePlugin()],
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
  buildVerify?: boolean;
};
```

### Checks

Typecheck and build verification can be configured in the plugin options but that remains static.

You can also skip the checks in the CLI or via ENV for more custom scripts.

#### CLI

```sh
# Skip all checks (typecheck and build verification)
vite build -- --skip-checks

# Skip typecheck
vite build -- --skip-typecheck

# Skip build verification
vite build -- --skip-build-verify
```

#### ENV

```sh
# Skip all checks (typecheck and build verification)
CHECKS=false vite build

# Skip typecheck
TYPECHECK=false vite build

# Skip build verification
BUILD_VERIFY=false vite build
```

## License

MIT © 2025 Siddhant Gupta (@GuptaSiddhant)
