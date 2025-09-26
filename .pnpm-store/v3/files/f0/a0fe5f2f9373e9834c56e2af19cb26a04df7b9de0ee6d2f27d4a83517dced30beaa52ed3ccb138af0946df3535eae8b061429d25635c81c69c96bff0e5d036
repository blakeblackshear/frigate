/**
 * @import {Fragment, Jsx, JsxDev} from 'hast-util-to-jsx-runtime'
 * @import {MDXComponents} from 'mdx/types.js'
 * @import {CompileOptions} from '../compile.js'
 */

/**
 * @typedef {EvaluateProcessorOptions & RunOptions} EvaluateOptions
 *   Configuration for `evaluate`.
 *
 * @typedef {Omit<CompileOptions, 'baseUrl' | 'jsx' | 'jsxImportSource' | 'jsxRuntime' | 'outputFormat' | 'pragma' | 'pragmaFrag' | 'pragmaImportSource' | 'providerImportSource'> } EvaluateProcessorOptions
 *   Compile configuration without JSX options for evaluation.
 *
 * @typedef RunOptions
 *   Configuration to run compiled code.
 *
 *   `Fragment`, `jsx`, and `jsxs` are used when the code is compiled in
 *   production mode (`development: false`).
 *   `Fragment` and `jsxDEV` are used when compiled in development mode
 *   (`development: true`).
 *   `useMDXComponents` is used when the code is compiled with
 *   `providerImportSource: '#'` (the exact value of this compile option
 *   doesn’t matter).
 * @property {URL | string | null | undefined} [baseUrl]
 *   Use this URL as `import.meta.url` and resolve `import` and `export … from`
 *   relative to it (optional, example: `import.meta.url`);
 *   this option can also be given at compile time in `CompileOptions`;
 *   you should pass this (likely at runtime), as you might get runtime errors
 *   when using `import.meta.url` / `import` / `export … from ` otherwise.
 * @property {Fragment} Fragment
 *   Symbol to use for fragments (**required**).
 * @property {Jsx | null | undefined} [jsx]
 *   Function to generate an element with static children in production mode.
 * @property {JsxDev | null | undefined} [jsxDEV]
 *   Function to generate an element in development mode.
 * @property {Jsx | null | undefined} [jsxs]
 *   Function to generate an element with dynamic children in production mode.
 * @property {UseMdxComponents | null | undefined} [useMDXComponents]
 *   Function to get components from context.
 *
 * @callback UseMdxComponents
 *   Get components from context.
 * @returns {MDXComponents}
 *   Current components.
 */

// Fix to show references to above types in VS Code.
''

/**
 * Split compiletime options from runtime options.
 *
 * @param {Readonly<EvaluateOptions> | null | undefined} options
 *   Configuration.
 * @returns {{compiletime: CompileOptions, runtime: RunOptions}}
 *   Split options.
 */
export function resolveEvaluateOptions(options) {
  const {
    Fragment,
    baseUrl,
    development,
    jsx,
    jsxDEV,
    jsxs,
    useMDXComponents,
    ...rest
  } = options || {}

  if (!Fragment) throw new Error('Expected `Fragment` given to `evaluate`')
  if (development) {
    if (!jsxDEV) throw new Error('Expected `jsxDEV` given to `evaluate`')
  } else {
    if (!jsx) throw new Error('Expected `jsx` given to `evaluate`')
    if (!jsxs) throw new Error('Expected `jsxs` given to `evaluate`')
  }

  return {
    compiletime: {
      ...rest,
      development,
      outputFormat: 'function-body',
      providerImportSource: useMDXComponents ? '#' : undefined
    },
    runtime: {Fragment, baseUrl, jsx, jsxDEV, jsxs, useMDXComponents}
  }
}
