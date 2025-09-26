import type {Options as BuildJsxOptions} from 'estree-util-build-jsx'

export interface Options extends BuildJsxOptions {
  /**
   * Automatically handled;
   * not needed to pass in `recma-build-jsx`
   */
  filePath?: never
}

export {default} from './lib/index.js'
