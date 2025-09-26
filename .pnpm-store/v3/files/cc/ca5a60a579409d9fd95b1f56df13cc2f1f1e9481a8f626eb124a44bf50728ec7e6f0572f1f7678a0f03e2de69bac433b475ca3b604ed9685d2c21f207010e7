import { JscTarget, Options, ParserConfig } from "@swc/core";
import { Plugin } from "vite";

//#region src/index.d.ts
type Options$1 = {
  /**
  * Control where the JSX factory is imported from.
  * @default "react"
  */
  jsxImportSource?: string;
  /**
  * Enable TypeScript decorators. Requires experimentalDecorators in tsconfig.
  * @default false
  */
  tsDecorators?: boolean;
  /**
  * Use SWC plugins. Enable SWC at build time.
  * @default undefined
  */
  plugins?: [string, Record<string, any>][];
  /**
  * Set the target for SWC in dev. This can avoid to down-transpile private class method for example.
  * For production target, see https://vite.dev/config/build-options.html#build-target
  * @default "es2020"
  */
  devTarget?: JscTarget;
  /**
  * Override the default include list (.ts, .tsx, .mts, .jsx, .mdx).
  * This requires to redefine the config for any file you want to be included.
  * If you want to trigger fast refresh on compiled JS, use `jsx: true`.
  * Exclusion of node_modules should be handled by the function if needed.
  */
  parserConfig?: (id: string) => ParserConfig | undefined;
  /**
  * React Fast Refresh runtime URL prefix.
  * Useful in a module federation context to enable HMR by specifying
  * the host application URL in a Vite config of a remote application.
  * @example
  * reactRefreshHost: 'http://localhost:3000'
  */
  reactRefreshHost?: string;
  /**
  * The future of Vite is with OXC, and from the beginning this was a design choice
  * to not exposed too many specialties from SWC so that Vite React users can move to
  * another transformer later.
  * Also debugging why some specific version of decorators with some other unstable/legacy
  * feature doesn't work is not fun, so we won't provide support for it, hence the name `useAtYourOwnRisk`
  */
  useAtYourOwnRisk_mutateSwcOptions?: (options: Options) => void;
  /**
  * If set, disables the recommendation to use `@vitejs/plugin-react-oxc`
  */
  disableOxcRecommendation?: boolean;
};
declare const react: (_options?: Options$1) => Plugin[];
//#endregion
export { react as default };