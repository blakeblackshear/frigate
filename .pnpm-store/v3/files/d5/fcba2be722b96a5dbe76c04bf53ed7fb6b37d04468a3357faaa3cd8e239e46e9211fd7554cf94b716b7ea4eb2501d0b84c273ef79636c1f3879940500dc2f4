import StyleToObject from 'style-to-object';

import { camelCase, CamelCaseOptions } from './utilities';

type StyleObject = Record<string, string>;

interface StyleToJSOptions extends CamelCaseOptions {}

/**
 * Parses CSS inline style to JavaScript object (camelCased).
 */
function StyleToJS(style: string, options?: StyleToJSOptions): StyleObject {
  const output: StyleObject = {};

  if (!style || typeof style !== 'string') {
    return output;
  }

  StyleToObject(style, (property, value) => {
    // skip CSS comment
    if (property && value) {
      output[camelCase(property, options)] = value;
    }
  });

  return output;
}

StyleToJS.default = StyleToJS;

export = StyleToJS;
