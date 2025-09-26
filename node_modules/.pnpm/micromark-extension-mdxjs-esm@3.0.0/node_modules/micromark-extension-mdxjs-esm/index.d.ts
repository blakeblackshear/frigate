import type {Program} from 'estree'

export {mdxjsEsm, type Options} from './lib/syntax.js'

declare module 'micromark-util-types' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Token {
    estree?: Program
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface TokenTypeMap {
    mdxjsEsm: 'mdxjsEsm'
    mdxjsEsmData: 'mdxjsEsmData'
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface ParseContext {
    definedModuleSpecifiers?: string[]
  }
}
