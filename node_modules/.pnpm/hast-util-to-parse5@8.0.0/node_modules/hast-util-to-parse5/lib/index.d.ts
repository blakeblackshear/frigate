/**
 * Transform a hast tree to a `parse5` AST.
 *
 * @param {Nodes} tree
 *   Tree to transform.
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns {Parse5Nodes}
 *   `parse5` node.
 */
export function toParse5(tree: Nodes, options?: Options | null | undefined): Parse5Nodes;
export type Comment = import('hast').Comment;
export type Doctype = import('hast').Doctype;
export type Element = import('hast').Element;
export type Nodes = import('hast').Nodes;
export type Root = import('hast').Root;
export type RootContent = import('hast').RootContent;
export type Text = import('hast').Text;
export type Parse5Document = import('parse5').DefaultTreeAdapterMap['document'];
export type Parse5Fragment = import('parse5').DefaultTreeAdapterMap['documentFragment'];
export type Parse5Element = import('parse5').DefaultTreeAdapterMap['element'];
export type Parse5Nodes = import('parse5').DefaultTreeAdapterMap['node'];
export type Parse5Doctype = import('parse5').DefaultTreeAdapterMap['documentType'];
export type Parse5Comment = import('parse5').DefaultTreeAdapterMap['commentNode'];
export type Parse5Text = import('parse5').DefaultTreeAdapterMap['textNode'];
export type Parse5Parent = import('parse5').DefaultTreeAdapterMap['parentNode'];
export type Parse5Attribute = import('parse5').Token.Attribute;
export type Schema = import('property-information').Schema;
/**
 * Configuration.
 */
export type Options = {
    /**
     * Which space the document is in (default: `'html'`).
     *
     * When an `<svg>` element is found in the HTML space, this package already
     * automatically switches to and from the SVG space when entering and exiting
     * it.
     */
    space?: Space | null | undefined;
};
export type Parse5Content = Exclude<Parse5Nodes, Parse5Document | Parse5Fragment>;
export type Space = 'html' | 'svg';
