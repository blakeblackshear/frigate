import type {Expression, Program} from 'estree'
import type {Element, Nodes, Parents} from 'hast'
import type {
  MdxJsxFlowElementHast,
  MdxJsxTextElementHast
} from 'mdast-util-mdx-jsx'
import type {Schema} from 'property-information'

/**
 * Child.
 */
export type Child = JsxElement | string | null | undefined

/**
 * Possible components to use.
 *
 * Each key is a tag name typed in `JSX.IntrinsicElements`.
 * Each value is either a different tag name, or a component accepting the
 * corresponding props (and an optional `node` prop if `passNode` is on).
 *
 * You can access props at `JSX.IntrinsicElements`.
 * For example, to find props for `a`, use `JSX.IntrinsicElements['a']`.
 */
// Note: this type has to be in `.ts` or `.d.ts`, otherwise TSC hardcodes
// react into the `.d.ts` file.
export type Components = {
  [TagName in keyof JsxIntrinsicElements]:
    | Component<JsxIntrinsicElements[TagName] & ExtraProps>
    | keyof JsxIntrinsicElements
}

/**
 * Function or class component.
 *
 * You can access props at `JsxIntrinsicElements`.
 * For example, to find props for `a`, use `JsxIntrinsicElements['a']`.
 *
 * @typeParam ComponentProps
 *   Props type.
 */
type Component<ComponentProps> =
  | ClassComponent<ComponentProps>
  | FunctionComponent<ComponentProps>

/**
 * Create an evaluator that turns ESTree ASTs from embedded MDX into values.
 */
export type CreateEvaluater = () => Evaluater

/**
 * Create something in development or production.
 */
export type Create = (
  node: Nodes,
  type: unknown,
  props: Props,
  key: string | undefined
) => JsxElement

/**
 * Class component: given props, returns an instance.
 *
 * @typeParam ComponentProps
 *   Props type.
 * @param props
 *   Props.
 * @returns
 *   Instance.
 */
type ClassComponent<ComponentProps> = new (
  props: ComponentProps
) => JsxElementClass

/**
 * Casing to use for attribute names.
 *
 * HTML casing is for example `class`, `stroke-linecap`, `xml:lang`.
 * React casing is for example `className`, `strokeLinecap`, `xmlLang`.
 */
export type ElementAttributeNameCase = 'html' | 'react'

/**
 * Turn an MDX expression into a value.
 */
export type EvaluateExpression = (expression: Expression) => unknown
/**
 * Turn an MDX program (export/import statements) into a value.
 */
export type EvaluateProgram = (expression: Program) => unknown

/**
 * Evaluator that turns ESTree ASTs from embedded MDX into values.
 */
export interface Evaluater {
  /**
   * Evaluate an expression.
   */
  evaluateExpression: EvaluateExpression
  /**
   * Evaluate a program.
   */
  evaluateProgram: EvaluateProgram
}

/**
 * Extra fields we pass.
 */
export interface ExtraProps {
  /**
   * Node (hast),
   * passed when `passNode` is on.
   */
  node?: Element | undefined
}

/**
 * Property field.
 */
export type Field = [string, Value]

/**
 * Represent the children, typically a symbol.
 */
export type Fragment = unknown

/**
 * Basic functional component: given props, returns an element.
 *
 * @typeParam ComponentProps
 *   Props type.
 * @param props
 *   Props.
 * @returns
 *   Result.
 */
type FunctionComponent<ComponentProps> = (
  props: ComponentProps
) => JsxElement | string | null | undefined

/**
 * Conditional type for a class.
 */
// @ts-ignore: conditionally defined;
// it used to be possible to detect that with `any extends X ? X : Y`
// but no longer.
export type JsxElementClass = JSX.ElementClass

/**
 * Conditional type for a node object.
 */
// @ts-ignore: conditionally defined;
// it used to be possible to detect that with `any extends X ? X : Y`
// but no longer.
export type JsxElement = JSX.Element

/**
 * Conditional type for a record of tag names to corresponding props.
 */
// @ts-ignore: conditionally defined;
// it used to be possible to detect that with `any extends X ? X : Y`
// but no longer.
export type JsxIntrinsicElements = JSX.IntrinsicElements

/**
 * Create a development element.
 */
export type JsxDev = (
  // `any` because runtimes often have complex framework-specific types here.
  // type-coverage:ignore-next-line
  type: any,
  props: Props,
  key: string | undefined,
  isStaticChildren: boolean,
  source: Source,
  self: undefined
) => JsxElement

/**
 * Create a production element.
 */
export type Jsx = (
  // `any` because runtimes often have complex framework-specific types here.
  // type-coverage:ignore-next-line
  type: any,
  props: Props,
  key?: string | undefined
) => JsxElement

/**
 * Configuration.
 */
export interface OptionsBase {
  /**
   * Components to use (optional).
   */
  components?: Partial<Components> | null | undefined
  /**
   * Create an evaluator that turns ESTree ASTs into values (optional).
   */
  createEvaluater?: CreateEvaluater | null | undefined
  /**
   * Specify casing to use for attribute names (default: `'react'`).
   */
  elementAttributeNameCase?: ElementAttributeNameCase | null | undefined
  /**
   * File path to the original source file (optional).
   *
   * Passed in source info to `jsxDEV` when using the automatic runtime with
   * `development: true`.
   */
  filePath?: string | null | undefined
  /**
   * Ignore invalid CSS in `style` props (default: `false`);
   * the default behavior is to throw an error.
   */
  ignoreInvalidStyle?: boolean | null | undefined
  /**
   * Generate keys to optimize frameworks that support them (default: `true`).
   *
   * > 👉 **Note**: Solid currently fails if keys are passed.
   */
  passKeys?: boolean | null | undefined
  /**
   * Pass the hast element node to components (default: `false`).
   */
  passNode?: boolean | null | undefined
  /**
   * Whether `tree` is in the `'html'` or `'svg'` space (default: `'html'`).
   *
   * When an `<svg>` element is found in the HTML space, this package already
   * automatically switches to and from the SVG space when entering and exiting
   * it.
   */
  space?: Space | null | undefined
  /**
   * Specify casing to use for property names in `style` objects (default:
   * `'dom'`).
   */
  stylePropertyNameCase?: StylePropertyNameCase | null | undefined
  /**
   * Turn obsolete `align` props on `td` and `th` into CSS `style` props
   * (default: `true`).
   */
  tableCellAlignToStyle?: boolean | null | undefined
}

/**
 * Configuration (development).
 */
export interface OptionsDevelopment extends OptionsBase {
  /**
   * Fragment.
   */
  Fragment: Fragment
  /**
   * Whether to use `jsxDEV` (when on) or `jsx` and `jsxs` (when off).
   */
  development: true
  /**
   * Development JSX.
   */
  jsxDEV: JsxDev
  /**
   * Static JSX (optional).
   */
  jsxs?: Jsx | null | undefined
  /**
   * Dynamic JSX (optional).
   */
  jsx?: Jsx | null | undefined
}

/**
 * Configuration (production).
 */
export interface OptionsProduction extends OptionsBase {
  /**
   * Fragment.
   */
  Fragment: Fragment
  /**
   * Whether to use `jsxDEV` (when on) or `jsx` and `jsxs` (when off) (optional).
   */
  development?: false | null | undefined
  /**
   * Development JSX (optional).
   */
  jsxDEV?: JsxDev | null | undefined
  /**
   * Static JSX.
   */
  jsxs: Jsx
  /**
   * Dynamic JSX.
   */
  jsx: Jsx
}

/**
 * Configuration (production or development).
 */
export interface OptionsUnknown extends OptionsBase {
  /**
   * Fragment.
   */
  Fragment: Fragment
  /**
   * Whether to use `jsxDEV` (when on) or `jsx` and `jsxs` (when off).
   */
  development: boolean
  /**
   * Dynamic JSX (optional).
   */
  jsx?: Jsx | null | undefined
  /**
   * Development JSX (optional).
   */
  jsxDEV?: JsxDev | null | undefined
  /**
   * Static JSX (optional).
   */
  jsxs?: Jsx | null | undefined
}

export type Options = OptionsDevelopment | OptionsProduction | OptionsUnknown

/**
 * Properties and children.
 */
export interface Props {
  [prop: string]:
    | Array<Child>
    | Child
    | Element
    | MdxJsxFlowElementHast
    | MdxJsxTextElementHast
    | Value
    | undefined
  children?: Array<Child> | Child
  node?: Element | MdxJsxFlowElementHast | MdxJsxTextElementHast | undefined
}

/**
 * Info about source.
 */
export interface Source {
  /**
   * Column where thing starts (0-indexed).
   */
  columnNumber: number | undefined
  /**
   * Name of source file.
   */
  fileName: string | undefined
  /**
   * Line where thing starts (1-indexed).
   */
  lineNumber: number | undefined
}

/**
 * Namespace.
 *
 * > 👉 **Note**: hast is not XML.
 * > It supports SVG as embedded in HTML.
 * > It does not support the features available in XML.
 * > Passing SVG might break but fragments of modern SVG should be fine.
 * > Use `xast` if you need to support SVG as XML.
 */
export type Space = 'html' | 'svg'

/**
 * Info passed around.
 */
export interface State {
  /**
   * Fragment symbol.
   */
  Fragment: unknown
  /**
   * Stack of parents.
   */
  ancestors: Array<Parents>
  /**
   * Components to swap.
   */
  components: Partial<Components>
  /**
   * Create something in development or production.
   */
  create: Create
  /**
   * Casing to use for attribute names.
   */
  elementAttributeNameCase: ElementAttributeNameCase
  /**
   * Evaluator that turns ESTree ASTs into values.
   */
  evaluater: Evaluater | undefined
  /**
   * File path.
   */
  filePath: string | undefined
  /**
   * Ignore invalid CSS in `style` props.
   */
  ignoreInvalidStyle: boolean
  /**
   * Generate keys to optimize frameworks that support them.
   */
  passKeys: boolean
  /**
   * Pass `node` to components.
   */
  passNode: boolean
  /**
   * Current schema.
   */
  schema: Schema
  /**
   * Casing to use for property names in `style` objects.
   */
  stylePropertyNameCase: StylePropertyNameCase
  /**
   * Turn obsolete `align` props on `td` and `th` into CSS `style` props.
   */
  tableCellAlignToStyle: boolean
}

/**
 * Casing to use for property names in `style` objects.
 *
 * CSS casing is for example `background-color` and `-webkit-line-clamp`.
 * DOM casing is for example `backgroundColor` and `WebkitLineClamp`.
 */
export type StylePropertyNameCase = 'css' | 'dom'

/**
 * Style map.
 */
type Style = Record<string, string>

/**
 * Primitive property value and `Style` map.
 */
type Value = Style | boolean | number | string
