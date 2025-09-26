/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { AstNode, Properties } from '../syntax-tree.js';
import { isAstNode } from '../syntax-tree.js';
import type { SourceRegion, TraceRegion, TraceSourceSpec } from './generator-tracing.js';
import { processGeneratorNode } from './node-processor.js';
import { expandToNode, expandTracedToNode } from './template-node.js';

export const EOL = (typeof process === 'undefined') ? '\n' : (process.platform === 'win32') ? '\r\n' : '\n';

/**
 * Common type of expected results of functions contributing to code generation.
 * Includes `undefined` for allowing contributing functions to explicitly contribute
 * nothing, if required, in contrast to contributing empty strings,
 * which facilitates better formatting of the desired output, for example.
 */
export type Generated = GeneratorNode | string | undefined;
export type GeneratorNode = CompositeGeneratorNode | IndentNode | NewLineNode;

export interface IndentConfig {
    indentedChildren?: Generated[] | ((indented: IndentNode) => void);
    indentation?: string | number;
    indentEmptyLines?: boolean;
    indentImmediately?: boolean;
}

export function isGeneratorNode(node: unknown): node is CompositeGeneratorNode | IndentNode | NewLineNode {
    return node instanceof CompositeGeneratorNode
        || node instanceof IndentNode
        || node instanceof NewLineNode;
}

export function isNewLineNode(node: unknown): node is NewLineNode {
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
export function toString(input: unknown, defaultIndentation?: string | number): string {
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
export function toStringAndTrace(input: GeneratorNode, defaultIndentation?: string | number): { text: string, trace: TraceRegion } {
    return processGeneratorNode(input, defaultIndentation);
}

/**
 * Implementation of {@link GeneratorNode} serving as container for `string` segments, {@link NewLineNode newline indicators},
 * and further {@link CompositeGeneratorNode CompositeGeneratorNodes}, esp. {@link IndentNode IndentNodes}.
 *
 * See usage examples in the `append...` methods' documentations for details.
 */
export class CompositeGeneratorNode {

    readonly contents: Array<(GeneratorNode | string)> = [];

    tracedSource?: TraceSourceSpec | SourceRegion | SourceRegion[];

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
    constructor(...content: Generated[]) {
        this.append(...content);
    }

    isEmpty(): boolean {
        return this.contents.length === 0;
    }

    /**
     * Adds tracing information in form of `{astNode, property?, index: undefined}` to `this` generator node.
     * Overwrites existing trace data, if set previously.
     *
     * The given data are kept as they are, the actual resolution of text positions within the DSL text
     * is done at the final processing of `this` node as part of {@link toStringAndTrace()}.
     *
     * @param astNode the AstNode corresponding to `this` node's content
     *
     * @param property the value property name (string) corresponding to `this` node's content,
     *  e.g. if this node's content corresponds to some `string` or `number` property; is optional
     *
     * @returns `this` {@link CompositeGeneratorNode} for convenience.
     */
    trace<T extends AstNode>(astNode: T, property?: Properties<T>): this;

    /**
     * Adds tracing information in form of `{astNode, property, index}` to `this` generator node.
     * Overwrites existing trace data, if set previously.
     *
     * The given data are kept as they are, the actual resolution of text positions within the DSL text
     * is done at the final processing of `this` node as part of {@link toStringAndTrace()}.
     *
     * @param astNode the AstNode corresponding to `this` node's content
     *
     * @param property the value property name (string) corresponding to `this` node's content,
     *  e.g. if this node's content corresponds to some `string` or `number` property
     *
     * @param index the index of the value within a list property corresponding to `this` node's content,
     * if the property contains a list of elements, is ignored otherwise
     *
     * @returns `this` {@link CompositeGeneratorNode} for convenience.
     */
    trace<T extends AstNode>(astNode: T, property: Properties<T>, index: number | undefined): this;

    /**
     * Adds tracing information in form of concrete coordinates to `this` generator node. Complete coordinates
     * are provided by the {@link AstNode AstNodes}' corresponding {@link AstNode.$cstNode AstNode.$cstNodes}.
     * Overwrites existing trace data, if set previously.
     *
     * @param sourceRegion a text region within some file in form of concrete coordinates,
     *  if `undefined` no tracing will happen
     *
     * @returns `this` {@link CompositeGeneratorNode} for convenience.
     */
    trace(sourceRegion: SourceRegion | undefined): this;

    /**
     * Adds tracing information in form of a list of concrete coordinates to `this` generator node.
     * Overwrites existing trace data, if set previously.
     *
     * The list of regions in `sourceRegion` is reduced to the smallest encompassing region
     *  of all the contained source regions.
     *
     * @param sourceRegion a list of text regions within some file in form of concrete coordinates,
     *  if empty no tracing will happen
     *
     * @returns `this` {@link CompositeGeneratorNode} for convenience.
     */
    trace(sourceRegion: SourceRegion[]): this;

    trace<T extends AstNode>(source: T | undefined | SourceRegion | SourceRegion[], property?: Properties<T>, index?: number): this {
        if (isAstNode(source)) {
            this.tracedSource = <TraceSourceSpec>{ astNode: source, property, index };
            if (this.tracedSource.property === undefined && this.tracedSource.index !== undefined && this.tracedSource.index > -1) {
                throw new Error("Generation support: 'property' argument must not be 'undefined' if a non-negative value is assigned to 'index' in 'CompositeGeneratorNode.trace(...)'.");
            }
        } else {
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
    append(...content: Array<Generated | ((node: this) => void)>): this {
        for (const arg of content) {
            if (typeof arg === 'function') {
                arg(this);
            } else if (arg) {
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
    appendIf(condition: boolean, ...content: Array<Generated | ((node: CompositeGeneratorNode) => void)>): this {
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
    appendNewLine(): this {
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
    appendNewLineIf(condition: boolean): this {
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
    appendNewLineIfNotEmpty(): this {
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
    appendNewLineIfNotEmptyIf(condition: boolean): this {
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
    appendTemplate(staticParts: TemplateStringsArray, ...substitutions: unknown[]): this {
        return this.append(
            expandToNode(staticParts, ...substitutions)
        );
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
    appendTemplateIf(condition: boolean): (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => this {
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
    indent(childrenOrConfig?: Generated[] | ((indented: IndentNode) => void) | IndentConfig ): this {
        const { indentedChildren, indentation, indentEmptyLines, indentImmediately }: IndentConfig =
            Array.isArray(childrenOrConfig) || typeof childrenOrConfig === 'function'
                ? { indentedChildren: childrenOrConfig }
                : typeof childrenOrConfig === 'object' ? childrenOrConfig : {};

        const node = new IndentNode(indentation, indentImmediately, indentEmptyLines);
        this.contents.push(node);

        if (Array.isArray(indentedChildren)) {
            node.append(...indentedChildren);
        } else if (indentedChildren) {
            node.append(indentedChildren);
        }
        return this;
    }

    /**
     * Convenience method for appending content to `this` generator node including tracing information
     * in form of `{astNode, property?, index: undefined}`.
     *
     * This method returns a helper function that takes the desired `content` and does the processing.
     * The returned function delegates to {@link append}, with the provided `content` being
     *  wrapped by an additional {@link CompositeGeneratorNode} configured with the tracing information.
     *
     * @param astNode the AstNode corresponding to the appended content
     *
     * @param property the value property name (string) corresponding to the appended content,
     *  if e.g. the content corresponds to some `string` or `number` property of `astNode`, is optional
     *
     * @returns a function behaving as described above, which in turn returns `this` {@link CompositeGeneratorNode} for convenience.
     *
     * @example
     *   new CompositeGeneratorNode().appendTemplate
     *       `Hello World!`
     *   .appendNewLine().append('Hello ').appendTraced(entity, 'name')(entity.name)
     *   .appendNewLineIfNotEmpty()
     */
    appendTraced<T extends AstNode>(astNode: T, property?: Properties<T>): (...content: Array<Generated | ((node: CompositeGeneratorNode) => void)>) => this;

    /**
     * Convenience method for appending content to `this` generator node including tracing information
     * in form of `{astNode, property, index}`.
     *
     * This method returns a helper function that takes the desired `content` and does the processing.
     * The returned function delegates to {@link append}, with the provided `content` being
     *  wrapped by an additional {@link CompositeGeneratorNode} configured with the tracing information.
     *
     * @param astNode the AstNode corresponding to the appended content
     *
     * @param property the value property name (string) corresponding to the appended content,
     *  if e.g. the content corresponds to some `string` or `number` property of `astNode`
     *
     * @param index the index of the value within a list property corresponding to the appended content,
     *  if the property contains a list of elements, is ignored otherwise
     *
     * @returns a function behaving as described above, which in turn returns `this` {@link CompositeGeneratorNode} for convenience.
     *
     * @example
     *   new CompositeGeneratorNode().appendTemplate
     *       `Hello World!`
     *   .appendNewLine().append('Hello ').appendTraced(entity, 'name')(entity.name)
     *   .appendNewLineIfNotEmpty()
     */
    appendTraced<T extends AstNode>(astNode: T, property: Properties<T>, index: number | undefined): (...content: Array<Generated | ((node: CompositeGeneratorNode) => void)>) => this;

    /**
     * Convenience method for appending content to `this` generator node including tracing information
     * in form of concrete coordinates.
     *
     * This method returns a helper function that takes the desired `content` and does the processing.
     * The returned function delegates to {@link append}, with the provided `content` being
     *  wrapped by an additional {@link CompositeGeneratorNode} configured with the tracing information.
     *
     * @param sourceRegion a text region within some file in form of concrete coordinates,
     *  if `undefined` no tracing will happen
     *
     * @returns a function behaving as described above, which in turn returns `this` {@link CompositeGeneratorNode} for convenience.
     *
     * @example
     *   new CompositeGeneratorNode().appendTemplate
     *       `Hello World!`
     *   .appendNewLine().append('Hello ').appendTraced(findNodeForProperty(entity.$cstNode, 'name'))(entity.name)
     *   .appendNewLineIfNotEmpty()
     */
    appendTraced(sourceRegion: SourceRegion | undefined): (...content: Array<Generated | ((node: CompositeGeneratorNode) => void)>) => this;

    /**
     * Convenience method for appending content to `this` generator node including tracing information
     * in form of a list of concrete coordinates.
     *
     * This method returns a helper function that takes the desired `content` and does the processing.
     * The returned function delegates to {@link append}, with the provided `content` being
     *  wrapped by an additional {@link CompositeGeneratorNode} configured with the tracing information.
     *
     * The list of regions in `sourceRegions` will later be reduced to the smallest encompassing region
     *  of all the contained source regions.
     *
     * @param sourceRegions a list of text regions within some file in form of concrete coordinates,
     *  if empty no tracing will happen
     *
     * @returns a function behaving as described above, which in turn returns `this` {@link CompositeGeneratorNode} for convenience.
     *
     * @example
     *   new CompositeGeneratorNode().appendTemplate
     *       `Hello World!`
     *   .appendNewLine().append('Hello ').appendTraced([ findNodeForProperty(entity.$cstNode, 'name') ])(entity.name)
     *   .appendNewLineIfNotEmpty()
     */
    appendTraced(sourceRegions: SourceRegion[]): (...content: Array<Generated | ((node: CompositeGeneratorNode) => void)>) => this;

    // implementation:
    appendTraced<T extends AstNode>(source: T | undefined | SourceRegion | SourceRegion[], property?: Properties<T>, index?: number): (...content: Array<Generated | ((node: CompositeGeneratorNode) => void)>) => this {
        return content => {
            return this.append(
                new CompositeGeneratorNode().trace(source as T, property!, index).append(content)
            );
        };
    }

    /**
     * Convenience method for appending content to `this` generator node including tracing information
     *  in form of `{astNode, property?, index: undefined}`, if `condition` is equal to `true`.
     *
     * This method returns a tag function that takes the desired template and does the processing.
     *
     * If `condition` is satisfied the returned function delegates to {@link appendTraced}, otherwise it returns just `this`.
     *
     * @param condition a boolean value indicating whether to append the template content to `this`.
     *
     * @param astNode the AstNode corresponding to the appended content
     *
     * @param property the value property name (string) corresponding to the appended content,
     *  if e.g. the content corresponds to some `string` or `number` property of `astNode`, is optional
     *
     * @returns a function behaving as described above, which in turn returns `this` {@link CompositeGeneratorNode} for convenience.
     *
     * @example
     *   new CompositeGeneratorNode().appendTemplate
     *       `Hello World!`
     *   .appendNewLine().appendIf(entity !== undefined, 'Hello ').appendTracedIf(entity !== undefined, entity, 'name')(entity?.name)
     *   .appendNewLineIfNotEmpty()
     */
    appendTracedIf<T extends AstNode>(condition: boolean, astNode: T, property?: Properties<T>): (...content: Array<Generated | ((node: CompositeGeneratorNode) => void)>) => this;

    /**
     * Convenience method for appending content to `this` generator node including tracing information
     *  in form of `{astNode, property, index}`, if `condition` is equal to `true`.
     *
     * This method returns a tag function that takes the desired template and does the processing.
     *
     * If `condition` is satisfied the returned function delegates to {@link appendTraced}, otherwise it returns just `this`.
     *
     * @param condition a boolean value indicating whether to append the template content to `this`.
     *
     * @param astNode the AstNode corresponding to the appended content
     *
     * @param property the value property name (string) corresponding to the appended content,
     *  if e.g. the content corresponds to some `string` or `number` property of `astNode`
     *
     * @param index the index of the value within a list property corresponding to the appended content,
     *  if the property contains a list of elements, is ignored otherwise
     *
     * @returns a function behaving as described above, which in turn returns `this` {@link CompositeGeneratorNode} for convenience.
     *
     * @example
     *   new CompositeGeneratorNode().appendTemplate
     *       `Hello World!`
     *   .appendNewLine().appendIf(entity !== undefined, 'Hello ').appendTracedIf(entity !== undefined, entity, 'name')(entity?.name)
     *   .appendNewLineIfNotEmpty()
     */
    appendTracedIf<T extends AstNode>(condition: boolean, astNode: T, property: Properties<T>, index: number | undefined): (...content: Array<Generated | ((node: CompositeGeneratorNode) => void)>) => this;

    /**
     * Convenience method for appending content to `this` generator node including tracing information
     *  in form of concrete coordinates, if `condition` is equal to `true`.
     *
     * This method returns a tag function that takes the desired template and does the processing.
     *
     * If `condition` is satisfied the returned function delegates to {@link appendTraced}, otherwise it returns just `this`.
     *
     * If `sourceRegion` is a function supplying the corresponding region, it's only called if `condition` is satisfied.
     *
     * @param condition a boolean value indicating whether to append the template content to `this`.
     *
     * @param sourceRegion a text region within some file in form of concrete coordinates,
     *  if `undefined` no tracing will happen
     *
     * @returns a function behaving as described above, which in turn returns `this` {@link CompositeGeneratorNode} for convenience.
     *
     * @example
     *   new CompositeGeneratorNode().appendTemplate
     *       `Hello World!`
     *   .appendNewLine().appendIf(entity !== undefined, 'Hello ').appendTracedIf(entity !== undefined, () => findNodeForProperty(entity.$cstNode, 'name'))(entity?.name)
     *   .appendNewLineIfNotEmpty()
     */
    appendTracedIf(condition: boolean, sourceRegion: SourceRegion | undefined | (() => SourceRegion | undefined)): (...content: Array<Generated | ((node: CompositeGeneratorNode) => void)>) => this;

    /**
     * Convenience method for appending content to `this` generator node including tracing information
     *  in form of a list of concrete coordinates, if `condition` is equal to `true`.
     *
     * This method returns a tag function that takes the desired template and does the processing.
     *
     * If `condition` is satisfied the returned function delegates to {@link appendTraced}, otherwise it returns just `this`.
     *
     * The list of regions in `sourceRegions` will later be reduced to the smallest encompassing region
     *  of all the contained source regions.
     * If `sourceRegions` is a function supplying the corresponding regions, it's only called if `condition` is satisfied.
     *
     * @param condition a boolean value indicating whether to append the template content to `this`.
     *
     * @param sourceRegions a list of text regions within some file in form of concrete coordinates,
     *  if empty no tracing will happen
     *
     * @returns a function behaving as described above, which in turn returns `this` {@link CompositeGeneratorNode} for convenience.
     *
     * @example
     *   new CompositeGeneratorNode().appendTemplate
     *       `Hello World!`
     *   .appendNewLine().appendIf(entity !== undefined, 'Hello ').appendTracedIf(entity !== undefined, () => [ findNodeForProperty(entity.$cstNode, 'name') ])(entity?.name)
     *   .appendNewLineIfNotEmpty()
     */
    appendTracedIf(condition: boolean, sourceRegions: SourceRegion[] | (() => SourceRegion[])): (...content: Array<Generated | ((node: CompositeGeneratorNode) => void)>) => this;

    // implementation:
    appendTracedIf<T extends AstNode>(condition: boolean, source: T | undefined | SourceRegion | SourceRegion[] | (() => undefined | SourceRegion | SourceRegion[]), property?: Properties<T>, index?: number): (...content: Array<Generated | ((node: CompositeGeneratorNode) => void)>) => this {
        return condition ? this.appendTraced((typeof source === 'function' ? source() : source) as T, property!, index) : () => this;
    }

    /**
     * Convenience method for appending content in form of a template to `this` generator node including tracing
     *  information in form of `{astNode, property?, index: undefined}`.
     *
     * This method returns a tag function that takes the desired template and does the processing by delegating to
     * {@link expandTracedToNode}.
     *
     * @param astNode the AstNode corresponding to the appended content
     *
     * @param property the value property name (string) corresponding to the appended content,
     *  if e.g. the content corresponds to some `string` or `number` property of `astNode`, is optional
     *
     * @returns a tag function behaving as described above, which in turn returns `this` {@link CompositeGeneratorNode} for convenience.
     *
     * @example
     *   new CompositeGeneratorNode().appendTemplate
     *       `Hello World!`
     *   .appendNewLine().appendTracedTemplate(entity, 'name')
     *       `Hello ${entity?.name}!`
     *   .appendNewLineIfNotEmpty()
     */
    appendTracedTemplate<T extends AstNode>(astNode: T, property?: Properties<T>): (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => this;

    /**
     * Convenience method for appending content in form of a template to `this` generator node including tracing
     *  information in form of `{astNode, property, index}`.
     *
     * This method returns a tag function that takes the desired template and does the processing by delegating to
     * {@link expandTracedToNode}.
     *
     * @param astNode the AstNode corresponding to the appended content
     *
     * @param property the value property name (string) corresponding to the appended content,
     *  if e.g. the content corresponds to some `string` or `number` property of `astNode`
     *
     * @param index the index of the value within a list property corresponding to the appended content,
     *  if the property contains a list of elements, is ignored otherwise, is optinal
     *
     * @returns a tag function behaving as described above, which in turn returns `this` {@link CompositeGeneratorNode} for convenience.
     *
     * @example
     *   new CompositeGeneratorNode().appendTemplate
     *       `Hello World!`
     *   .appendNewLine().appendTracedTemplate(entity, 'name')
     *       `Hello ${entity?.name}!`
     *   .appendNewLineIfNotEmpty()
     */
    appendTracedTemplate<T extends AstNode>(astNode: T, property: Properties<T>, index: number | undefined): (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => this;

    /**
     * Convenience method for appending content in form of a template to `this` generator node including tracing
     *  information in form of concrete coordinates.
     *
     * This method returns a tag function that takes the desired template and does the processing by delegating to
     * {@link expandTracedToNode}.
     *
     * @param sourceRegion a text region within some file in form of concrete coordinates,
     *  if `undefined` no tracing will happen
     *
     * @returns a tag function behaving as described above, which in turn returns `this` {@link CompositeGeneratorNode} for convenience.
     *
     * @example
     *   new CompositeGeneratorNode().appendTemplate
     *       `Hello World!`
     *   .appendNewLine().appendTracedTemplate(findNodeForProperty(entity.$cstNode, 'name'))
     *       `Hello ${entity?.name}!`
     *   .appendNewLineIfNotEmpty()
     */
    appendTracedTemplate(sourceRegion: SourceRegion | undefined): (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => this;

    /**
     * Convenience method for appending content in form of a template to `this` generator node including tracing
     *  information in form of concrete coordinates.
     *
     * This method returns a tag function that takes the desired template and does the processing by delegating to
     * {@link expandTracedToNode}.
     *
     * The list of regions in `sourceRegions` will later be reduced to the smallest encompassing region
     *  of all the contained source regions.
     *
     * @param sourceRegions a list of text regions within some file in form of concrete coordinates,
     *  if empty no tracing will happen
     *
     * @returns a tag function behaving as described above, which in turn returns `this` {@link CompositeGeneratorNode} for convenience.
     *
     * @example
     *   new CompositeGeneratorNode().appendTemplate
     *       `Hello World!`
     *   .appendNewLine().appendTracedTemplate( findNodesForProperty(entity.$cstNode, 'name'))
     *       `Hello ${entity?.name}!`
     *   .appendNewLineIfNotEmpty()
     */
    appendTracedTemplate(sourceRegions: SourceRegion[]): (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => this;

    // implementation:
    appendTracedTemplate<T extends AstNode>(source: T | undefined | SourceRegion | SourceRegion[], property?: Properties<T>, index?: number): (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => this {
        return (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => {
            return this.append(
                expandTracedToNode(source as T, property!, index)(staticParts, ...substitutions)
            );
        };
    }

    /**
     * Convenience method for appending content in form of a template to `this` generator node including tracing information
     *  in form of `{astNode, property?, index: undefined}`, if `condition` is equal to `true`.
     *
     * This method returns a tag function that takes the desired template and does the processing.
     *
     * If `condition` is satisfied the tagged template delegates to {@link appendTracedTemplate}, otherwise it returns just `this`.
     * See also {@link expandTracedToNode} for details.
     *
     * @param condition a boolean value indicating whether to append the template content to `this`.
     *
     * @param astNode the AstNode corresponding to the appended content
     *
     * @param property the value property name (string) corresponding to the appended content,
     *  if e.g. the content corresponds to some `string` or `number` property of `astNode`, is optional
     *
     * @returns a tag function behaving as described above, which in turn returns `this` {@link CompositeGeneratorNode} for convenience.
     *
     * @example
     *   new CompositeGeneratorNode().appendTemplate
     *       `Hello World!`
     *   .appendNewLine().appendTracedTemplateIf(entity?.name !== undefined, entity)
     *       `Hello ${entity?.name}!`
     *   .appendNewLineIfNotEmpty()
     */
    appendTracedTemplateIf<T extends AstNode>(condition: boolean, astNode: T, property?: Properties<T>): (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => this;

    /**
     * Convenience method for appending content in form of a template to `this` generator node including tracing information
     *  in form of `{astNode, property, index}`, if `condition` is equal to `true`.
     *
     * This method returns a tag function that takes the desired template and does the processing.
     *
     * If `condition` is satisfied the tagged template delegates to {@link appendTracedTemplate}, otherwise it returns just `this`.
     * See also {@link expandTracedToNode} for details.
     *
     * @param condition a boolean value indicating whether to append the template content to `this`.
     *
     * @param astNode the AstNode corresponding to the appended content
     *
     * @param property the value property name (string) corresponding to the appended content,
     *  if e.g. the content corresponds to some `string` or `number` property of `astNode`
     *
     * @param index the index of the value within a list property corresponding to the appended content,
     *  if the property contains a list of elements, is ignored otherwise
     *
     * @returns a tag function behaving as described above, which in turn returns `this` {@link CompositeGeneratorNode} for convenience.
     *
     * @example
     *   new CompositeGeneratorNode().appendTemplate
     *       `Hello World!`
     *   .appendNewLine().appendTracedTemplateIf(entity?.name !== undefined, entity)
     *       `Hello ${entity?.name}!`
     *   .appendNewLineIfNotEmpty()
     */
    appendTracedTemplateIf<T extends AstNode>(condition: boolean, astNode: T, property: Properties<T>, index: number | undefined): (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => this;

    /**
     * Convenience method for appending content in form of a template to `this` generator node including tracing information
     *  in form of concrete coordinates, if `condition` is equal to `true`.
     *
     * This method returns a tag function that takes the desired template and does the processing.
     *
     * If `condition` is satisfied the tagged template delegates to {@link appendTracedTemplate}, otherwise it returns just `this`.
     * See also {@link expandTracedToNode} for details.
     *
      * If `sourceRegion` is a function supplying the corresponding region, it's only called if `condition` is satisfied.
     *
     * @param condition a boolean value indicating whether to append the template content to `this`.
     *
     * @param sourceRegion a text region within some file in form of concrete coordinates,
     *  if `undefined` no tracing will happen
     *
     * @returns a tag function behaving as described above, which in turn returns `this` {@link CompositeGeneratorNode} for convenience.
     *
     * @example
     *   new CompositeGeneratorNode().appendTemplate
     *       `Hello World!`
     *   .appendNewLine().appendTracedTemplateIf(entity?.name !== undefined, entity.$cstNode)
     *       `Hello ${entity?.name}!`
     *   .appendNewLineIfNotEmpty()
     */
    appendTracedTemplateIf(condition: boolean, sourceRegion: SourceRegion | undefined | (() => SourceRegion | undefined)): (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => this;

    /**
     * Convenience method for appending content in form of a template to `this` generator node including tracing information
     *  in form of a list of concrete coordinates, if `condition` is equal to `true`.
     *
     * This method returns a tag function that takes the desired template and does the processing.
     *
     * If `condition` is satisfied the tagged template delegates to {@link appendTracedTemplate}, otherwise it returns just `this`.
     * See also {@link expandTracedToNode} for details.
     *
     * The list of regions in `sourceRegions` will later be reduced to the smallest encompassing region
     *  of all the contained source regions.
     * If `sourceRegions` is a function supplying the corresponding regions, it's only called if `condition` is satisfied.
     *
     * @param condition a boolean value indicating whether to append the template content to `this`.
     *
     * @param sourceRegions a list of text regions within some file in form of concrete coordinates,
     *  if empty no tracing will happen
     *
     * @returns a tag function behaving as described above, which in turn returns `this` {@link CompositeGeneratorNode} for convenience.
     *
     * @example
     *   new CompositeGeneratorNode().appendTemplate
     *       `Hello World!`
     *   .appendNewLine().appendTracedTemplateIf(entity?.name !== undefined, () => [ findNodeForProperty(entity.$cstNode, 'name')! ])
     *       `Hello ${entity?.name}!`
     *   .appendNewLineIfNotEmpty()
     */
    appendTracedTemplateIf(condition: boolean, sourceRegions: SourceRegion[] | (() => SourceRegion[])): (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => this;

    // implementation:
    appendTracedTemplateIf<T extends AstNode>(condition: boolean, source: T | undefined | SourceRegion | SourceRegion[] | (() => undefined | SourceRegion | SourceRegion[]), property?: Properties<T>, index?: number): (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => this {
        return condition ? this.appendTracedTemplate((typeof source === 'function' ? source() : source) as T, property!, index) : () => this;
    }
}

/**
 * Convenience function for attaching tracing information to content of type `Generated`,
 *  in form of `{astNode, property?, index: undefined}`.
 *
 * This method returns a helper function that takes the desired `content` and does the processing.
 * The returned function will create and return a new {@link CompositeGeneratorNode} being initialized
 *  with the given tracing information and add some `content`, if provided.
 *
 * Exception: if `content` is already a {@link CompositeGeneratorNode} containing no tracing information,
 *  that node is enriched with the given tracing information and returned, and no wrapping node is created.
 *
 * @param astNode the AstNode corresponding to the appended content
 *
 * @param property the value property name (string) corresponding to the appended content,
 *  if e.g. the content corresponds to some `string` or `number` property of `astNode`, is optional
 *
 * @returns a function behaving as described above, which in turn returns a {@link CompositeGeneratorNode}.
 *
 * @example
 *   new CompositeGeneratorNode().appendTemplate
 *       `Hello World!`
 *   .appendNewLine().appendTracedTemplate(entity)
 *       `Hello ${ traceToNode(entity, 'name')(entity.name) }`
 *   .appendNewLineIfNotEmpty()
 */
export function traceToNode<T extends AstNode>(astNode: T, property?: Properties<T>): (content?: Generated | ((node: CompositeGeneratorNode) => void)) => CompositeGeneratorNode;

/**
 * Convenience function for attaching tracing information to content of type `Generated`,
 *  in form of `{astNode, property, index}`.
 *
 * This method returns a helper function that takes the desired `content` and does the processing.
 * The returned function will create and return a new {@link CompositeGeneratorNode} being initialized
 *  with the given tracing information and add some `content`, if provided.
 *
 * Exception: if `content` is already a {@link CompositeGeneratorNode} containing no tracing information,
 *  that node is enriched with the given tracing information and returned, and no wrapping node is created.
 *
 * @param astNode the AstNode corresponding to the appended content
 *
 * @param property the value property name (string) corresponding to the appended content,
 *  if e.g. the content corresponds to some `string` or `number` property of `astNode`
 *
 * @param index the index of the value within a list property corresponding to the appended content,
 *  if the property contains a list of elements, is ignored otherwise
 *
 * @returns a function behaving as described above, which in turn returns a {@link CompositeGeneratorNode}.
 *
 * @example
 *   new CompositeGeneratorNode().appendTemplate
 *       `Hello World!`
 *   .appendNewLine().appendTracedTemplate(entity)
 *       `Hello ${ traceToNode(entity, 'name')(entity.name) }`
 *   .appendNewLineIfNotEmpty()
 */
export function traceToNode<T extends AstNode>(astNode: T, property: Properties<T>, index: number | undefined): (content?: Generated | ((node: CompositeGeneratorNode) => void)) => CompositeGeneratorNode;

/**
 * Convenience function for attaching tracing information to content of type `Generated`,
 *  in form of concrete coordinates.
 *
 * This method returns a helper function that takes the desired `content` and does the processing.
 * The returned function will create and return a new {@link CompositeGeneratorNode} being initialized
 *  with the given tracing information and add some `content`, if provided.
 *
 * Exception: if `content` is already a {@link CompositeGeneratorNode} containing no tracing information,
 *  that node is enriched with the given tracing information and returned, and no wrapping node is created.
 *
 * @param sourceRegion a text region within some file in form of concrete coordinates,
 *  if `undefined` no tracing will happen
 *
 * @returns a function behaving as described above, which in turn returns a {@link CompositeGeneratorNode}.
 *
 * @example
 *   new CompositeGeneratorNode().appendTemplate
 *       `Hello World!`
 *   .appendNewLine().appendTracedTemplate(entity.$cstNode)
 *       `Hello ${ traceToNode(findNodeForProperty(entity.$cstNode, 'name'))(entity.name) }`
 *   .appendNewLineIfNotEmpty()
 */
export function traceToNode(sourceRegion: SourceRegion | undefined): (content?: Generated | ((node: CompositeGeneratorNode) => void)) => CompositeGeneratorNode;

/**
 * Convenience function for attaching tracing information to content of type `Generated`,
 *  in form of a list of concrete coordinates.
 *
 * This method returns a helper function that takes the desired `content` and does the processing.
 * The returned function will create and return a new {@link CompositeGeneratorNode} being initialized
 *  with the given tracing information and add some `content`, if provided.
 *
 * Exception: if `content` is already a {@link CompositeGeneratorNode} containing no tracing information,
 *  that node is enriched with the given tracing information and returned, and no wrapping node is created.
 *
 * The list of regions in `sourceRegions` will later be reduced to the smallest encompassing region
 *  of all the contained source regions.
 *
 * @param sourceRegions a list of text region within some file in form of concrete coordinates,
 *  if empty no tracing will happen
 *
 * @returns a function behaving as described above, which in turn returns a {@link CompositeGeneratorNode}.
 *
 * @example
 *   new CompositeGeneratorNode().appendTemplate
 *       `Hello World!`
 *   .appendNewLine().appendTracedTemplate(entity.$cstNode)
 *       `Hello ${ traceToNode(findNodesForProperty(entity.$cstNode, 'name'))(entity.name) }`
 *   .appendNewLineIfNotEmpty()
 */
export function traceToNode(sourceRegions: SourceRegion[]): (content?: Generated | ((node: CompositeGeneratorNode) => void)) => CompositeGeneratorNode;

// implementation
export function traceToNode<T extends AstNode>(astNode: T | undefined | SourceRegion | SourceRegion[], property?: Properties<T>, index?: number): (content?: Generated | ((node: CompositeGeneratorNode) => void)) => CompositeGeneratorNode {
    return content => {
        if (content instanceof CompositeGeneratorNode && content.tracedSource === undefined) {
            return (content as CompositeGeneratorNode).trace(astNode as T, property!, index);
        } else {
            // a `content !== undefined` check is skipped here on purpose in order to let this method always return a result;
            // dropping empty generator nodes is considered a post processing optimization.
            return new CompositeGeneratorNode().trace(astNode as T, property!, index).append(content);
        }
    };
}

/**
 * Convenience function for attaching tracing information to content of type `Generated`,
 *  in form of `{astNode, property?, index: undefined}`, if `condition` is equal to `true`.
 *
 * If `condition` is satisfied, this method returns a helper function that takes the desired
 * `content` and does the processing. The returned function will create and return a new
 * {@link CompositeGeneratorNode} being initialized with the given tracing information and
 * add some `content`, if provided. Otherwise, the returned function just returns `undefined`.
 *
 * Exception: if `content` is already a {@link CompositeGeneratorNode} containing no tracing information,
 *  that node is enriched with the given tracing information and returned, and no wrapping node is created.
 *
 * @param condition a boolean value indicating whether to apply the provided tracing information to the desired content.
 *
 * @param astNode the AstNode corresponding to the appended content
 *
 * @param property the value property name (string) corresponding to the appended content,
 *  if e.g. the content corresponds to some `string` or `number` property of `astNode`, is optional
 *
 * @returns a function behaving as described above, which in turn returns a {@link CompositeGeneratorNode}.
 *
 * @example
 *   new CompositeGeneratorNode().appendTemplate
 *       `Hello World!`
 *   .appendNewLine().appendTracedTemplate(entity)
 *       `Hello ${ traceToNodeIf(!!entity.name, entity, 'name')(entity.name) }`
 *   .appendNewLineIfNotEmpty()
 */
export function traceToNodeIf<T extends AstNode>(condition: boolean, astNode: T, property?: Properties<T>): (content?: Generated | ((node: CompositeGeneratorNode) => void)) => CompositeGeneratorNode | undefined;

/**
 * Convenience function for attaching tracing information to content of type `Generated`,
 *  in form of `{astNode, property, index}`, if `condition` is equal to `true`.
 *
 * If `condition` is satisfied, this method returns a helper function that takes the desired
 * `content` and does the processing. The returned function will create and return a new
 * {@link CompositeGeneratorNode} being initialized with the given tracing information and
 * add some `content`, if provided. Otherwise, the returned function just returns `undefined`.
 *
 * Exception: if `content` is already a {@link CompositeGeneratorNode} containing no tracing information,
 *  that node is enriched with the given tracing information and returned, and no wrapping node is created.
 *
 * @param condition a boolean value indicating whether to apply the provided tracing information to the desired content.
 *
 * @param astNode the AstNode corresponding to the appended content
 *
 * @param property the value property name (string) corresponding to the appended content,
 *  if e.g. the content corresponds to some `string` or `number` property of `astNode`
 *
 * @param index the index of the value within a list property corresponding to the appended content,
 *  if the property contains a list of elements, is ignored otherwise
 *
 * @returns a function behaving as described above, which in turn returns a {@link CompositeGeneratorNode}.
 *
 * @example
 *   new CompositeGeneratorNode().appendTemplate
 *       `Hello World!`
 *   .appendNewLine().appendTracedTemplate(entity)
 *       `Hello ${ traceToNodeIf(!!entity.name, entity, 'name')(entity.name) }`
 *   .appendNewLineIfNotEmpty()
 */
export function traceToNodeIf<T extends AstNode>(condition: boolean, astNode: T, property: Properties<T>, index: number | undefined): (content?: Generated | ((node: CompositeGeneratorNode) => void)) => CompositeGeneratorNode | undefined;

/**
 * Convenience function for attaching tracing information to content of type `Generated`,
 *  in form of concrete coordinates, if `condition` is equal to `true`.
 *
 * If `condition` is satisfied, this method returns a helper function that takes the desired
 * `content` and does the processing. The returned function will create and return a new
 * {@link CompositeGeneratorNode} being initialized with the given tracing information and
 * add some `content`, if provided. Otherwise, the returned function just returns `undefined`.
 *
 * Exception: if `content` is already a {@link CompositeGeneratorNode} containing no tracing information,
 *  that node is enriched with the given tracing information and returned, and no wrapping node is created.
 *
 * If `sourceRegions` is a function supplying the corresponding regions, it's only called if `condition` is satisfied.
 *
 * @param condition a boolean value indicating whether to apply the provided tracing information to the desired content.
 *
 * @param sourceRegion a text region within some file in form of concrete coordinates,
 *  if `undefined` no tracing will happen
 *
 * @returns a function behaving as described above, which in turn returns a {@link CompositeGeneratorNode}.
 *
 * @example
 *   new CompositeGeneratorNode().appendTemplate
 *       `Hello World!`
 *   .appendNewLine().appendTracedTemplate(entity.$cstNode)
 *       `Hello ${ traceToNodeIf(!!entity.name, () => findNodeForProperty(entity.$cstNode, 'name'))(entity.name) }`
 *   .appendNewLineIfNotEmpty()
 */
export function traceToNodeIf(condition: boolean, sourceRegion: SourceRegion | undefined | (() => SourceRegion | undefined)): (content?: Generated | ((node: CompositeGeneratorNode) => void)) => CompositeGeneratorNode | undefined;

/**
 * Convenience function for attaching tracing information to content of type `Generated`,
 *  in form of a list of concrete coordinates, if `condition` is equal to `true`.
 *
 * If `condition` is satisfied, this method returns a helper function that takes the desired
 * `content` and does the processing. The returned function will create and return a new
 * {@link CompositeGeneratorNode} being initialized with the given tracing information and
 * add some `content`, if provided. Otherwise, the returned function just returns `undefined`.
 *
 * Exception: if `content` is already a {@link CompositeGeneratorNode} containing no tracing information,
 *  that node is enriched with the given tracing information and returned, and no wrapping node is created.
 *
 * The list of regions in `sourceRegions` will later be reduced to the smallest encompassing region
 *  of all the contained source regions.
 * If `sourceRegions` is a function supplying the corresponding regions, it's only called if `condition` is satisfied.
 *
 * @param condition a boolean value indicating whether to apply the provided tracing information to the desired content.
 *
 * @param sourceRegions a list of text region within some file in form of concrete coordinates,
 *  if empty no tracing will happen
 *
 * @returns a function behaving as described above, which in turn returns a {@link CompositeGeneratorNode}.
 *
 * @example
 *   new CompositeGeneratorNode().appendTemplate
 *       `Hello World!`
 *   .appendNewLine().appendTracedTemplate(entity.$cstNode)
 *       `Hello ${ traceToNodeIf(!!entity.name, () => findNodesForProperty(entity.$cstNode, 'name'))(entity.name) }`
 *   .appendNewLineIfNotEmpty()
 */
export function traceToNodeIf(condition: boolean, sourceRegions: SourceRegion[] | (() => SourceRegion[])): (content?: Generated | ((node: CompositeGeneratorNode) => void)) => CompositeGeneratorNode | undefined;

// implementation
export function traceToNodeIf<T extends AstNode>(condition: boolean, source: T | undefined | SourceRegion | SourceRegion[] | (() => undefined | SourceRegion | SourceRegion[]), property?: Properties<T>, index?: number): // eslint-disable-next-line @typescript-eslint/indent
        (content?: Generated | ((node: CompositeGeneratorNode) => void)) => CompositeGeneratorNode | undefined {
    return condition ? traceToNode((typeof source === 'function' ? source() : source) as T, property!, index) : () => undefined;
}

/**
 * Implementation of @{link GeneratorNode} denoting areas within the desired generated text of common increased indentation.
 */
export class IndentNode extends CompositeGeneratorNode {

    indentation?: string;
    indentImmediately = true;
    indentEmptyLines = false;

    constructor(indentation?: string | number, indentImmediately = true, indentEmptyLines = false) {
        super();
        if (typeof (indentation) === 'string') {
            this.indentation = indentation;
        } else if (typeof (indentation) === 'number') {
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

    lineDelimiter: string;

    ifNotEmpty = false;

    constructor(lineDelimiter?: string, ifNotEmpty = false) {
        this.lineDelimiter = lineDelimiter ?? EOL;
        this.ifNotEmpty = ifNotEmpty;
    }
}

export const NL = new NewLineNode();
export const NLEmpty = new NewLineNode(undefined, true);
