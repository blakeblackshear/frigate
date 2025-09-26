import { CamelCaseOptions } from './utilities';
type StyleObject = Record<string, string>;
interface StyleToJSOptions extends CamelCaseOptions {
}
/**
 * Parses CSS inline style to JavaScript object (camelCased).
 */
declare function StyleToJS(style: string, options?: StyleToJSOptions): StyleObject;
declare namespace StyleToJS {
    var _a: typeof StyleToJS;
    export { _a as default };
}
export = StyleToJS;
//# sourceMappingURL=index.d.ts.map