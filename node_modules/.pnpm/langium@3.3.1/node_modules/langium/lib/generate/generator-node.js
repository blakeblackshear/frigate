/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { isAstNode } from '../syntax-tree.js';
import { processGeneratorNode } from './node-processor.js';
import { expandToNode, expandTracedToNode } from './template-node.js';
export const EOL = (typeof process === 'undefined') ? '\n' : (process.platform === 'win32') ? '\r\n' : '\n';
export function isGeneratorNode(node) {
    return node instanceof CompositeGeneratorNode
        || node instanceof IndentNode
        || node instanceof NewLineNode;
}
export function isNewLineNode(node) {
    return node instanceof NewLineNode;
}
/**
 * Converts instances of {@link GeneratorNode} into a `string`, defaults to {@link String String(...)} for any other `input`.
 *
 * @param defaultIndentation the indentation to be applied if no explicit indentation is configured
 *  for particular {@link IndentNode IndentNodes}, either a `string` or a `number` of repeated single spaces,
 *  defaults to 4 single spaces, see {@link processGeneratorNode} -> `Context`.
 *
 * @returns the plain `string` represented by the given input.
 */
export function toString(input, defaultIndentation) {
    if (isGeneratorNode(input))
        return processGeneratorNode(input, defaultIndentation).text;
    else
        return String(input);
}
/**
 * Converts instances of {@link GeneratorNode} into `text` accompanied by a corresponding `trace`.
 *
 * @param defaultIndentation the indentation to be applied if no explicit indentation is configured
 *  for particular {@link IndentNode IndentNodes}, either a `string` or a `number` of repeated single spaces,
 *  defaults to 4 single spaces, see {@link processGeneratorNode} -> `Context`.
 *
 * @returns an object of type `{ text: string, trace: TraceRegion }` containing the desired `text` and `trace` data
 */
export function toStringAndTrace(input, defaultIndentation) {
    return processGeneratorNode(input, defaultIndentation);
}
/**
 * Implementation of {@link GeneratorNode} serving as container for `string` segments, {@link NewLineNode newline indicators},
 * and further {@link CompositeGeneratorNode CompositeGeneratorNodes}, esp. {@link IndentNode IndentNodes}.
 *
 * See usage examples in the `append...` methods' documentations for details.
 */
export class CompositeGeneratorNode {
    /**
     * Constructor.
     *
     * @param content a var arg mixture of `strings` and {@link GeneratorNode GeneratorNodes}
     *   describing the initial content of this {@link CompositeGeneratorNode}
     *
     * @example
     *   new CompositeGeneratorNode(
     *      'Hello World!', NL
     *   );
     */
    constructor(...content) {
        this.contents = [];
        this.append(...content);
    }
    isEmpty() {
        return this.contents.length === 0;
    }
    trace(source, property, index) {
        if (isAstNode(source)) {
            this.tracedSource = { astNode: source, property, index };
            if (this.tracedSource.property === undefined && this.tracedSource.index !== undefined && this.tracedSource.index > -1) {
                throw new Error("Generation support: 'property' argument must not be 'undefined' if a non-negative value is assigned to 'index' in 'CompositeGeneratorNode.trace(...)'.");
            }
        }
        else {
            this.tracedSource = source;
        }
        return this;
    }
    /**
     * Appends `strings` and instances of {@link GeneratorNode} to `this` generator node.
     *
     * @param content a var arg mixture of `strings`, {@link GeneratorNode GeneratorNodes}, or single param
     *  functions that are immediately called with `this` node as argument, and which may append elements themselves.
     *
     * @returns `this` {@link CompositeGeneratorNode} for convenience.
     *
     * @example
     *   new CompositeGeneratorNode().append(
     *      'Hello', ' ', `${name}!`, NL, someOtherNode, 'NL', node => generateContent(node)
     *   ).append(
     *      'The end!'
     *   );
     */
    append(...content) {
        for (const arg of content) {
            if (typeof arg === 'function') {
                arg(this);
            }
            else if (arg) {
                this.contents.push(arg);
            }
        }
        return this;
    }
    /**
     * Appends `strings` and instances of {@link GeneratorNode} to `this` generator node, if `condition` is equal to `true`.
     *
     * If `condition` is satisfied this method delegates to {@link append}, otherwise it returns just `this`.
     *
     * @param condition a boolean value indicating whether to append the elements of `args` to `this`.
     *
     * @param content a var arg mixture of `strings`, {@link GeneratorNode GeneratorNodes}, or single param
     *  functions that are immediately called with `this` node as argument, and which may append elements themselves.
     *
     * @returns `this` {@link CompositeGeneratorNode} for convenience.
     *
     * @example
     *   new CompositeGeneratorNode().append(
     *      'Hello World!'
     *   ).appendNewLine().appendIf(
     *      entity !== undefined, `Hello ${entity?.name}!`
     *   ).appendNewLineIfNotEmpty();
     */
    appendIf(condition, ...content) {
        return condition ? this.append(...content) : this;
    }
    /**
     * Appends a strict {@link NewLineNode} to `this` node.
     * Strict {@link NewLineNode}s yield mandatory linebreaks in the derived generated text.
     *
     * @returns `this` {@link CompositeGeneratorNode} for convenience.
     *
     * @example
     *   new CompositeGeneratorNode().append(
     *      'Hello World!'
     *   ).appendNewLine();
     */
    appendNewLine() {
        return this.append(NL);
    }
    /**
     * Appends a strict {@link NewLineNode} to `this` node, if `condition` is equal to `true`.
     * Strict {@link NewLineNode}s yield mandatory linebreaks in the derived generated text.
     *
     * @param condition a boolean value indicating whether to append a {@link NewLineNode} to `this`.
     *
     * @returns `this` {@link CompositeGeneratorNode} for convenience.
     *
     * @example
     *   new CompositeGeneratorNode().append(
     *      'Hello World!'
     *   ).appendNewLineIf(entity !== undefined).appendIf(
     *      entity !== undefined, `Hello ${entity?.name}!`
     *   )
     */
    appendNewLineIf(condition) {
        return condition ? this.append(NL) : this;
    }
    /**
     * Appends a soft {@link NewLineNode} to `this` node.
     * Soft {@link NewLineNode}s yield linebreaks in the derived generated text only if the preceding line is non-empty,
     * i.e. there are non-whitespace characters added to the generated text since the last linebreak.
     *
     * @returns `this` {@link CompositeGeneratorNode} for convenience.
     *
     * @example
     *   new CompositeGeneratorNode().appendIf(
     *      entity !== undefined, `Hello ${entity?.name}!`
     *   ).appendNewLineIfNotEmpty();
     */
    appendNewLineIfNotEmpty() {
        return this.append(NLEmpty);
    }
    /**
     * Appends a soft {@link NewLineNode} to `this` node, if `condition` is equal to `true`.
     * Soft {@link NewLineNode}s yield linebreaks in the derived generated text only if the preceding line is non-empty,
     * i.e. there are non-whitespace characters added to the generated text since the last linebreak.
     *
     * @param condition a boolean value indicating whether to append a {@link NewLineNode} to `this`.
     *
     * @returns `this` {@link CompositeGeneratorNode} for convenience.
     *
     * @example
     *   new CompositeGeneratorNode().append(
     *      entity.label ?? ''
     *   ).appendNewLineIfNotEmptyIf(entity.description !== undefined).append(
     *      entity.description
     *   )
     */
    appendNewLineIfNotEmptyIf(condition) {
        return condition ? this.appendNewLineIfNotEmpty() : this;
    }
    /**
     * Convenience method for appending content in form of a template to `this` generation node.
     *
     * See {@link expandToNode} for details.
     *
     * @returns `this` {@link CompositeGeneratorNode} for convenience.
     *
     * @example
     *   new CompositeGeneratorNode().appendTemplate
     *       `Hello World!`
     *   .appendNewLine()
     */
    appendTemplate(staticParts, ...substitutions) {
        return this.append(expandToNode(staticParts, ...substitutions));
    }
    /**
     * Convenience method for appending content in form of a template to `this` generator node, if `condition` is equal to `true`.
     *
     * This method returns a tag function that takes the desired template and does the processing.
     *
     * If `condition` is satisfied the tagged template delegates to {@link appendTemplate}, otherwise it returns just `this`.
     *
     * See {@link expandToNode} for details.
     *
     * @param condition a boolean value indicating whether to append the template content to `this`.
     *
     * @returns a tag function behaving as described above, which in turn returns `this` {@link CompositeGeneratorNode} for convenience.
     *
     * @example
     *   new CompositeGeneratorNode().appendTemplate
     *       `Hello World!`
     *   .appendNewLine().appendTemplateIf(entity !== undefined)
     *       `Hello ${entity?.name}!`
     *   .appendNewLineIfNotEmpty()
     */
    appendTemplateIf(condition) {
        return condition ? (staticParts, ...substitutions) => this.appendTemplate(staticParts, ...substitutions) : () => this;
    }
    /**
     * Adds an area of indented text output.
     * The content to be indented can be provided as an array consisting of strings and/or generation nodes
     * (undefined is permitted), or via a callback offering the `indentingNode` to which the content shall be appended.
     * Alternatively, an object satisfying {@link IndentConfig} can be provided taking the children as Array or via
     * a callback as described previously via the `indentedChildren` property.
     *
     * The remaining properties of {@link IndentConfig} have the following effects:
     *  - `indentation`: a specific indentation length or string, defaults to the global indentation setting if omitted, see {@link toString},
     *  - `indentEmptyLines`: apply indentation to empty lines, defaults to `false`
     *  - `indentImmediately`: apply the indentation immediately starting at the first line, defaults to `true`, might be set to `false`
     *    if preceding content is not terminated by any `newline`. If `false` the indentation is inserted only after child `newline` nodes
     *    followed by further content.
     *
     * @param childrenOrConfig an {@link Array} or callback contributing the children, or a config object satisfying {@link IndentConfig} alternatively.
     *
     * @returns `this` {@link CompositeGeneratorNode} for convenience.
     *
     * @example
     *   new CompositeGeneratorNode().append(
     *       '{'
     *   ).indent(indentingNode =>
     *       indentingNode.append(
     *           'name:', name, ','
     *       ).appendNewLine().appendIf(description !== undefined,
     *           'description:', description
     *       ).appendNewLineIfNotEmpty()
     *   ).append(
     *       '}'
     *   );
     */
    indent(childrenOrConfig) {
        const { indentedChildren, indentation, indentEmptyLines, indentImmediately } = Array.isArray(childrenOrConfig) || typeof childrenOrConfig === 'function'
            ? { indentedChildren: childrenOrConfig }
            : typeof childrenOrConfig === 'object' ? childrenOrConfig : {};
        const node = new IndentNode(indentation, indentImmediately, indentEmptyLines);
        this.contents.push(node);
        if (Array.isArray(indentedChildren)) {
            node.append(...indentedChildren);
        }
        else if (indentedChildren) {
            node.append(indentedChildren);
        }
        return this;
    }
    // implementation:
    appendTraced(source, property, index) {
        return content => {
            return this.append(new CompositeGeneratorNode().trace(source, property, index).append(content));
        };
    }
    // implementation:
    appendTracedIf(condition, source, property, index) {
        return condition ? this.appendTraced((typeof source === 'function' ? source() : source), property, index) : () => this;
    }
    // implementation:
    appendTracedTemplate(source, property, index) {
        return (staticParts, ...substitutions) => {
            return this.append(expandTracedToNode(source, property, index)(staticParts, ...substitutions));
        };
    }
    // implementation:
    appendTracedTemplateIf(condition, source, property, index) {
        return condition ? this.appendTracedTemplate((typeof source === 'function' ? source() : source), property, index) : () => this;
    }
}
// implementation
export function traceToNode(astNode, property, index) {
    return content => {
        if (content instanceof CompositeGeneratorNode && content.tracedSource === undefined) {
            return content.trace(astNode, property, index);
        }
        else {
            // a `content !== undefined` check is skipped here on purpose in order to let this method always return a result;
            // dropping empty generator nodes is considered a post processing optimization.
            return new CompositeGeneratorNode().trace(astNode, property, index).append(content);
        }
    };
}
// implementation
export function traceToNodeIf(condition, source, property, index) {
    return condition ? traceToNode((typeof source === 'function' ? source() : source), property, index) : () => undefined;
}
/**
 * Implementation of @{link GeneratorNode} denoting areas within the desired generated text of common increased indentation.
 */
export class IndentNode extends CompositeGeneratorNode {
    constructor(indentation, indentImmediately = true, indentEmptyLines = false) {
        super();
        this.indentImmediately = true;
        this.indentEmptyLines = false;
        if (typeof (indentation) === 'string') {
            this.indentation = indentation;
        }
        else if (typeof (indentation) === 'number') {
            this.indentation = ''.padStart(indentation);
        }
        this.indentImmediately = indentImmediately;
        this.indentEmptyLines = indentEmptyLines;
    }
}
/**
 * Implementation of @{link GeneratorNode} denoting linebreaks in the desired generated text.
 */
export class NewLineNode {
    constructor(lineDelimiter, ifNotEmpty = false) {
        this.ifNotEmpty = false;
        this.lineDelimiter = lineDelimiter !== null && lineDelimiter !== void 0 ? lineDelimiter : EOL;
        this.ifNotEmpty = ifNotEmpty;
    }
}
export const NL = new NewLineNode();
export const NLEmpty = new NewLineNode(undefined, true);
//# sourceMappingURL=generator-node.js.map