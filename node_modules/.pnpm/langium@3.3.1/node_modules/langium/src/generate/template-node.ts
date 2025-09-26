/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { AstNode, Properties } from '../syntax-tree.js';
import { NEWLINE_REGEXP } from '../utils/regexp-utils.js';
import type { Generated, GeneratorNode, IndentNode } from './generator-node.js';
import { CompositeGeneratorNode, isGeneratorNode, traceToNode } from './generator-node.js';
import type { SourceRegion } from './generator-tracing.js';
import { findIndentation } from './template-string.js';

/**
 * A tag function that attaches the template's content to a {@link CompositeGeneratorNode}.
 *
 * This is done segment by segment, and static template portions as well as substitutions
 * are added individually to the returned {@link CompositeGeneratorNode}.
 * At that common leading indentation of all the template's static parts is trimmed,
 * whereas additional indentations of particular lines within that static parts as well as
 * any line breaks and indentation within the substitutions are kept.
 *
 * For the sake of good readability and good composability of results of this function like
 * in the following example, the subsequent rule is applied.
 *
 * ```ts
 *  expandToNode`
 *   This is the beginning of something
 *
 *   ${foo.bar ? expandToNode`
 *     bla bla bla ${foo.bar}
 *
 *   `: undefined
 *   }
 *   end of template
 *  `
 * ```
 *
 * Rule:
 * In case of a multiline template the content of the first line including its terminating
 * line break is ignored, if and only if it is empty of contains whitespace only. Futhermore,
 * in case of a multiline template the content of the last line including its preceding line break
 * (last one within the template) is ignored, if and only if it is empty of contains whitespace only.
 * Thus, the result of all of the following invocations is identical and equal to `generatedContent`.
 * ```ts
 *  expandToNode`generatedContent`
 *  expandToNode`generatedContent
 *  `
 *  expandToNode`
 *    generatedContent`
 *  expandToNode`
 *    generatedContent
 *  `
 * ```
 *
 * In addition, a second rule is applied in the handling of line breaks:
 * If a line's last substitution contributes `undefined` or an object of type {@link GeneratorNode},
 * the subsequent line break will be appended via {@link CompositeGeneratorNode.appendNewLineIfNotEmpty}.
 * Hence, if all other segments of that line contribute whitespace characters only,
 * the entire line will be omitted while rendering the desired output.
 * Otherwise, linebreaks will be added via {@link CompositeGeneratorNode.appendNewLine}.
 * That holds in particular, if the last substitution contributes an empty string. In consequence,
 * adding `${''}` to the end of a line consisting of whitespace and substitions only
 * enforces the line break to be rendered, no matter what the substitions actually contribute.
 *
 * @param staticParts the static parts of a tagged template literal
 * @param substitutions the variable parts of a tagged template literal
 * @returns a 'CompositeGeneratorNode' containing the particular aligned lines
 *             after resolving and inserting the substitutions into the given parts
 */
export function expandToNode(staticParts: TemplateStringsArray, ...substitutions: unknown[]): CompositeGeneratorNode {
    // first part: determine the common indentation of all the template lines with the substitutions being ignored
    const templateProps = findIndentationAndTemplateStructure(staticParts);

    // 2nd part: for all the static template parts: split them and inject a NEW_LINE marker where line breaks shall be a present in the final result,
    //  and create a flatten list of strings, NEW_LINE marker occurrences, and substitutions
    const splitAndMerged: GeneratedOrMarker[] = splitTemplateLinesAndMergeWithSubstitutions(staticParts, substitutions, templateProps);

    // eventually, inject indentation nodes and append the segments to final desired composite generator node
    return composeFinalGeneratorNode(splitAndMerged);
}

/**
 * Convenience function for creating a {@link CompositeGeneratorNode} being configured with the
 *  provided tracing information in form of `{astNode, property?, index: undefined}` and appending content
 *  in form of a template.
 *
 * This function returns a tag function that takes the desired template and does the processing
 *  by delegating to {@link expandToNode} and {@link traceToNode} and finally returning the
 *  resulting generator node.
 *
 * @param astNode the AstNode corresponding to the appended content
 *
 * @param property the value property name (string) corresponding to the appended content,
 *  if e.g. the content corresponds to some `string` or `number` property of `astNode`, is optional
 *
 * @returns a tag function behaving as described above, which in turn returns a {@link CompositeGeneratorNode}.
 *
 * @example
 *   expandTracedToNode(entity)`
 *       Hello ${ traceToNode(entity, 'name')(entity.name) }
 *   `.appendNewLine()
 */
export function expandTracedToNode<T extends AstNode>(astNode: T, property?: Properties<T>): (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => CompositeGeneratorNode;

/**
 * Convenience function for creating a {@link CompositeGeneratorNode} being configured with the
 *  provided tracing information in form of `{astNode, property, index}` and appending content
 *  in form of a template.
 *
 * This function returns a tag function that takes the desired template and does the processing
 *  by delegating to {@link expandToNode} and {@link traceToNode} and finally returning the
 *  resulting generator node.
 *
 * @param astNode the AstNode corresponding to the appended content
 *
 * @param property the value property name (string) corresponding to the appended content,
 *  if e.g. the content corresponds to some `string` or `number` property of `astNode`
 *
 * @param index the index of the value within a list property corresponding to the appended content,
 *  if the property contains a list of elements, is ignored otherwise
 *
 * @returns a tag function behaving as described above, which in turn returns a {@link CompositeGeneratorNode}.
 *
 * @example
 *   expandTracedToNode(entity, 'definitions', 0)`
 *       Hello ${ traceToNode(entity, 'name')(entity.name) }
 *   `.appendNewLine()
 */
export function expandTracedToNode<T extends AstNode>(astNode: T, property: Properties<T>, index?: number | undefined): (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => CompositeGeneratorNode;

/**
 * Convenience function for creating a {@link CompositeGeneratorNode} being configured with the
 *  provided tracing information in form of concrete coordinates and appending content
 *  in form of a template. Complete coordinates are provided by the {@link AstNode AstNodes}'
 *  corresponding {@link AstNode.$cstNode AstNode.$cstNodes}.
 *
 * This function returns a tag function that takes the desired template and does the processing
 *  by delegating to {@link expandToNode} and {@link traceToNode} and finally returning the
 *  resulting generator node.
 *
 * @param sourceRegion a text region within some file in form of concrete coordinates,
 *  if `undefined` no tracing will happen
 *
 * @returns a tag function behaving as described above, which in turn returns a {@link CompositeGeneratorNode}.
 *
 * @example
 *   expandTracedToNode(entity.$cstNode)`
 *       Hello ${ traceToNode(entity, 'name')(entity.name) }
 *   `.appendNewLine()
 */
export function expandTracedToNode(sourceRegion: SourceRegion | undefined): (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => CompositeGeneratorNode;

/**
 * Convenience function for creating a {@link CompositeGeneratorNode} being configured with the
 *  provided tracing information in form of a list of concrete coordinates and appending content
 *  in form of a template. Complete coordinates are provided by the {@link AstNode AstNodes}'
 *  corresponding {@link AstNode.$cstNode AstNode.$cstNodes}.
 *
 * This function returns a tag function that takes the desired template and does the processing
 *  by delegating to {@link expandToNode} and {@link traceToNode} and finally returning the
 *  resulting generator node.
 *
 * The list of regions in `sourceRegions` will later be reduced to the smallest encompassing region
 *  of all the contained source regions.
 *
 * @param sourceRegions a list of text regions within some file in form of concrete coordinates,
 *  if empty no tracing will happen
 *
 * @returns a tag function behaving as described above, which in turn returns a {@link CompositeGeneratorNode}.
 *
 * @example
 *   expandTracedToNode([
 *      findNodeForKeyword(entity.$cstNode, '{')!,
 *      findNodeForKeyword(entity.$cstNode, '}')!
 *   ])`
 *       Hello ${ traceToNode(entity, 'name')(entity.name) }
 *   `.appendNewLine()
 */
export function expandTracedToNode(sourceRegions: SourceRegion[]): (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => CompositeGeneratorNode;

// implementation:
export function expandTracedToNode<T extends AstNode>(source: T | undefined | SourceRegion | SourceRegion[], property?: Properties<T>, index?: number): (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => CompositeGeneratorNode {
    return (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => {
        return traceToNode(source as T, property!, index)(
            expandToNode(staticParts, ...substitutions)
        );
    };
}

/**
 * Convenience function for creating a {@link CompositeGeneratorNode} being configured with the
 *  provided tracing information in form of `{astNode, property?, index: undefined}` and appending content
 *  in form of a template, if `condition` is equal to `true`.
 *
 * If `condition` is satisfied, this function returns a tag function that takes the desired template
 *  and does the processing by delegating to {@link expandToNode} and {@link traceToNode} and
 *  finally returning the resulting generator node. Otherwise, the returned function just returns `undefined`.
 *
 * @param condition a boolean value indicating whether to evaluate the provided template.
 *
 * @param astNode the AstNode corresponding to the appended content
 *
 * @param property the value property name (string) corresponding to the appended content,
 *  if e.g. the content corresponds to some `string` or `number` property of `astNode`, is optional
 *
 * @returns a tag function behaving as described above, which in turn returns a {@link CompositeGeneratorNode}.
 *
 * @example
 *   expandTracedToNodeIf(entity !== undefined, entity)`
 *       Hello ${ traceToNode(entity, 'name')(entity.name) }
 *   `.appendNewLine()
 */
export function expandTracedToNodeIf<T extends AstNode>(condition: boolean, astNode: T, property?: Properties<T>): // eslint-disable-next-line @typescript-eslint/indent
        (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => CompositeGeneratorNode | undefined;

/**
 * Convenience function for creating a {@link CompositeGeneratorNode} being configured with the
 *  provided tracing information in form of `{astNode, property, index}` and appending content
 *  in form of a template, if `condition` is equal to `true`.
 *
 * If `condition` is satisfied, this function returns a tag function that takes the desired template
 *  and does the processing by delegating to {@link expandToNode} and {@link traceToNode} and
 *  finally returning the resulting generator node. Otherwise, the returned function just returns `undefined`.
 *
 * @param condition a boolean value indicating whether to evaluate the provided template.
 *
 * @param astNode the AstNode corresponding to the appended content
 *
 * @param property the value property name (string) corresponding to the appended content,
 *  if e.g. the content corresponds to some `string` or `number` property of `astNode`
 *
 * @param index the index of the value within a list property corresponding to the appended content,
 *  if the property contains a list of elements, is ignored otherwise
 *
 * @returns a tag function behaving as described above, which in turn returns a {@link CompositeGeneratorNode}.
 *
 * @example
 *   expandTracedToNodeIf(entity !== undefined, entity, 'definitions', 0)`
 *       Hello ${ traceToNode(entity, 'name')(entity.name) }
 *   `.appendNewLine()
 */
export function expandTracedToNodeIf<T extends AstNode>(condition: boolean, astNode: T, property: Properties<T>, index: number | undefined): // eslint-disable-next-line @typescript-eslint/indent
        (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => CompositeGeneratorNode | undefined;

/**
 * Convenience function for creating a {@link CompositeGeneratorNode} being configured with the
 *  provided tracing information in form of concrete coordinates and appending content in form
 *  of a template, if `condition` is equal to `true`. Complete coordinates are provided by
 *  the {@link AstNode AstNodes}' corresponding {@link AstNode.$cstNode AstNode.$cstNodes}.
 *
 * This function returns a tag function that takes the desired template and does the processing
 *  by delegating to {@link expandToNode} and {@link traceToNode} and finally returning the
 *  resulting generator node.
 *
 * If `sourceRegion` is a function supplying the corresponding region, it's only called if `condition` is satisfied.
 *
 * @param condition a boolean value indicating whether to evaluate the provided template.
 *
 * @param sourceRegion a text region within some file in form of concrete coordinates or a supplier function,
 *  if `undefined` no tracing will happen
 *
 * @returns a tag function behaving as described above, which in turn returns a {@link CompositeGeneratorNode}.
 *
 * @example
 *   expandTracedToNodeIf(entity !== undefined, entity.$cstNode)`
 *       Hello ${ traceToNode(entity, 'name')(entity.name) }
 *   `.appendNewLine()
 */
export function expandTracedToNodeIf(condition: boolean, sourceRegion: SourceRegion | undefined | (() => SourceRegion | undefined)): // eslint-disable-next-line @typescript-eslint/indent
        (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => CompositeGeneratorNode | undefined;

/**
 * Convenience function for creating a {@link CompositeGeneratorNode} being configured with the
 *  provided tracing information in form of a list of concrete coordinates and appending content
 *  in form of a template, if `condition` is equal to `true`. Complete coordinates are provided
 *  by the {@link AstNode AstNodes}' corresponding {@link AstNode.$cstNode AstNode.$cstNodes}.
 *
 * This function returns a tag function that takes the desired template and does the processing
 *  by delegating to {@link expandToNode} and {@link traceToNode} and finally returning the
 *  resulting generator node.
 *
 * The list of regions in `sourceRegions` will later be reduced to the smallest encompassing region
 *  of all the contained source regions.
 * If `sourceRegions` is a function supplying the corresponding regions, it's only called if `condition` is satisfied.
 *
 * @param condition a boolean value indicating whether to evaluate the provided template.
 *
 * @param sourceRegions a list of text regions within some file in form of concrete coordinates,
 *  if empty no tracing will happen
 *
 * @returns a tag function behaving as described above, which in turn returns a {@link CompositeGeneratorNode}.
 *
 * @example
 *   expandTracedToNodeIf(entity !== undefined, [
 *      findNodeForKeyword(entity.$cstNode, '{')!,
 *      findNodeForKeyword(entity.$cstNode, '}')!
 *   ])`
 *       Hello ${ traceToNode(entity, 'name')(entity.name) }
 *   `.appendNewLine()
 */
export function expandTracedToNodeIf(condition: boolean, sourceRegions: SourceRegion[]): // eslint-disable-next-line @typescript-eslint/indent
        (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => CompositeGeneratorNode | undefined;

// implementation:
export function expandTracedToNodeIf<T extends AstNode>(condition: boolean, source: T | undefined | SourceRegion | SourceRegion[] | (() => undefined | SourceRegion | SourceRegion[]), property?: Properties<T>, index?: number): // eslint-disable-next-line @typescript-eslint/indent
        (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => CompositeGeneratorNode | undefined {
    return condition ? expandTracedToNode((typeof source === 'function' ? source() : source) as T, property!, index) : () => undefined;
}

type TemplateProps = {
    indentation: number;
    omitFirstLine: boolean;
    omitLastLine: boolean;
    trimLastLine?: boolean;
}

function findIndentationAndTemplateStructure(staticParts: TemplateStringsArray): TemplateProps {
    const lines = staticParts.join('_').split(NEWLINE_REGEXP);
    const omitFirstLine = lines.length > 1 && lines[0].trim().length === 0;
    const omitLastLine = omitFirstLine && lines.length > 1 && lines[lines.length - 1].trim().length === 0;

    if (lines.length === 1 || lines.length !== 0 && lines[0].trim().length !== 0 || lines.length === 2 && lines[1].trim().length === 0) {
        // for cases of non-adjusted templates like
        //   const n1 = expandToNode` `;
        //   const n2 = expandToNode` something `;
        //   const n3 = expandToNode` something
        //   `;
        // ... consider the indentation to be empty, and all the leading whitespace to be relevant, except for the last (empty) line of n3!
        return {
            indentation: 0, //''
            omitFirstLine,
            omitLastLine,
            trimLastLine: lines.length !== 1 && lines[lines.length - 1].trim().length === 0
        };
    } else {
        // otherwise:
        // for cases of non-adjusted templates like
        //   const n4 = expandToNode` abc
        //     def `;
        //   const n5 = expandToNode`<maybe with some WS here>
        //      abc
        //     def`;
        //   const n6 = expandToNode`<maybe with some WS here>
        //      abc
        //     def
        //   `;
        // ... the indentation shall be determined by the non-empty lines, excluding the last line if it contains whitespace only

        // if we have a multi-line template and the first line is empty, see n5, n6
        //  ignore the first line;
        let sliced = omitFirstLine ? lines.slice(1) : lines;

        // if there're more than one line remaining and the last one only contains WS, see n6,
        //  ignore the last line
        sliced = omitLastLine ? sliced.slice(0, sliced.length - 1) : sliced;

        // ignore empty lines during indentation calculation, as linting rules might forbid lines containing just whitespace
        sliced = sliced.filter(e => e.length !== 0);

        const indentation = findIndentation(sliced);
        return {
            indentation,
            omitFirstLine,
            // in the subsequent steps omit the last line only if it is empty or if it only contains whitespace of which the common indentation is not a valid prefix;
            //  in other words: keep the last line if it matches the common indentation (and maybe contains non-whitespace), a non-match may be due to mistaken usage of tabs and spaces
            omitLastLine: omitLastLine && (
                lines[lines.length - 1].length < indentation || !lines[lines.length - 1].startsWith(sliced[0].substring(0, indentation))
            )
        };
    }
}

function splitTemplateLinesAndMergeWithSubstitutions(
    staticParts: TemplateStringsArray, substitutions: unknown[], { indentation, omitFirstLine, omitLastLine, trimLastLine }: TemplateProps
): GeneratedOrMarker[] {
    const splitAndMerged: GeneratedOrMarker[] = [];
    staticParts.forEach((part, i) => {
        splitAndMerged.push(
            ...part.split(
                NEWLINE_REGEXP
            ).map((e, j) => j === 0 || e.length < indentation ? e : e.substring(indentation)
            ).reduce<GeneratedOrMarker[]>(
                // treat the particular (potentially multiple) lines of the <i>th template segment (part),
                //  s.t. all the effective lines are collected and separated by the NEWLINE node
                // note: different reduce functions are provided for the initial template segment vs. the remaining segments
                i === 0
                    ? (result, line, j) =>
                        // special handling of the initial template segment, which may contain line-breaks;
                        //  suppresses the injection of unintended NEWLINE indicators for templates like
                        //   expandToNode`
                        //    someText
                        //    ${something}
                        //   `
                        j === 0
                            ? (omitFirstLine                    // for templates with empty first lines like above (expandToNode`\n ...`)
                                ? []                            // skip adding the initial line
                                : [line]                        //  take the initial line if non-empty
                            )
                            : (j === 1 && result.length === 0   // when looking on the 2nd line in case the first line (in the first segment) is skipped ('result' is still empty)
                                ? [line]                        // skip the insertion of the NEWLINE marker and just return the current line
                                : result.concat(NEWLINE, line)  // otherwise append the NEWLINE marker and the current line
                            )
                    : (result, line, j) =>
                        // handling of the remaining template segments
                        j === 0 ? [line] : result.concat(NEWLINE, line) // except for the first line in the current segment prepend each line with NEWLINE
                , [] // start with an empty array
            ).filter(
                e => !(typeof e === 'string' && e.length === 0)         // drop empty strings, they don't contribute anything but might confuse subsequent processing
            ).concat(
                // append the corresponding substitution after each segment (part),
                //  note that 'substitutions[i]' will be undefined for the last segment
                isGeneratorNode(substitutions[i])
                    // if the substitution is a generator node, take it as it is
                    ? substitutions[i] as GeneratorNode
                    : substitutions[i] !== undefined
                        // if the substitution is something else, convert it to a string and wrap it;
                        //  allows us below to distinguish template strings from substitution (esp. empty) ones
                        ? { content: String(substitutions[i]) }
                        : i < substitutions.length
                            // if 'substitutions[i]' is undefined and we are treating a substitution "in the middle"
                            //   we found a substitution that is assumed to not contribute anything on purpose!
                            ? UNDEFINED_SEGMENT  // add a corresponding marker, see below for details on the rational
                            : []                 /* don't concat anything as we passed behind the last substitution, since 'i' enumerates the indices of 'staticParts',
                                                     but 'substitutions' has one entry less and 'substitutions[staticParts.length -1 ]' will always be undefined */
            )
        );
    });

    // for templates like
    //   expandToNode`
    //    someText
    //   `

    // TODO add more documentation here

    const splitAndMergedLength = splitAndMerged.length;
    const lastItem = splitAndMergedLength !== 0 ? splitAndMerged[splitAndMergedLength - 1] : undefined;

    if ((omitLastLine || trimLastLine) && typeof lastItem === 'string' && lastItem.trim().length === 0) {
        if (omitFirstLine && splitAndMergedLength !== 1 && splitAndMerged[splitAndMergedLength - 2] === NEWLINE) {
            return splitAndMerged.slice(0, splitAndMergedLength - 2);
        } else {
            return splitAndMerged.slice(0, splitAndMergedLength - 1);
        }
    } else {
        return splitAndMerged;
    }
}

type NewLineMarker = { isNewLine: true };
type UndefinedSegmentMarker = { isUndefinedSegment: true };
type SubstitutionWrapper = { content: string };

const NEWLINE = <NewLineMarker>{ isNewLine: true };
const UNDEFINED_SEGMENT = <UndefinedSegmentMarker>{ isUndefinedSegment: true };

const isNewLineMarker = (nl: unknown): nl is NewLineMarker => nl === NEWLINE;
const isUndefinedSegmentMarker = (us: unknown): us is UndefinedSegmentMarker => us === UNDEFINED_SEGMENT;
const isSubstitutionWrapper = (s: unknown): s is SubstitutionWrapper => (s as SubstitutionWrapper).content !== undefined;

type GeneratedOrMarker = Generated | NewLineMarker | UndefinedSegmentMarker | SubstitutionWrapper;

function composeFinalGeneratorNode(splitAndMerged: GeneratedOrMarker[]): CompositeGeneratorNode {
    // in order to properly handle the indentation of nested multi-line substitutions,
    //  track the length of static (string) parts per line and wrap the substitution(s) in indentation nodes, if needed
    //
    // of course, this only works nicely if a multi-line substitution is preceded by static string parts on the same line only;
    // in case of dynamic content (with a potentially unknown length) followed by a multi-line substitution
    //  the latter's indentation cannot be determined properly...
    const result = splitAndMerged.reduce<{
        node: CompositeGeneratorNode,
        indented?: IndentNode
    }>(
        (res, segment, i) => isUndefinedSegmentMarker(segment)
            // ignore all occurrences of UNDEFINED_SEGMENT, they are just in there for the below test
            //  of 'isNewLineMarker(splitAndMerged[i-1])' not to evaluate to 'truthy' in case of consecutive lines
            //  with no actual content in templates like
            //   expandToNode`
            //     Foo
            //     ${undefined} <<----- here
            //     ${undefined} <<----- and here
            //
            //     Bar
            //   `
            ? res
            : isNewLineMarker(segment)
                ? {
                    // in case of a newLine marker append an 'ifNotEmpty' newLine by default, but
                    //  append an unconditional newLine if and only if:
                    //   * the template starts with the current line break, i.e. the first line is empty
                    //   * the current newLine marker directly follows another one, i.e. the current line is empty
                    //   * the current newline marker directly follows a substitution contributing a string (or some non-GeneratorNode being converted to a string)
                    //   * the current newline marker directly follows a (template static) string that
                    //      * is the initial token of the template
                    //      * is the initial token of the line, maybe just indentation
                    //      * follows a a substitution contributing a string (or some non-GeneratorNode being converted to a string), maybe is just irrelevant trailing whitespace
                    // in particular do _not_ append an unconditional newLine if the last substitution of a line contributes 'undefined' or an instance of 'GeneratorNode'
                    //  which may be a newline itself or be empty or (transitively) contain a trailing newline itself
                    // node: i === 0
                    //     || isNewLineMarker(splitAndMerged[i - 1]) || isSubstitutionWrapper(splitAndMerged[i - 1]) /* implies: typeof content === 'string', esp. !undefined */
                    //     || typeof splitAndMerged[i - 1] === 'string' && (
                    //         i === 1 || isNewLineMarker(splitAndMerged[i - 2]) || isSubstitutionWrapper(splitAndMerged[i - 2]) /* implies: typeof content === 'string', esp. !undefined */
                    //     )
                    //     ? res.node.appendNewLine() : res.node.appendNewLineIfNotEmpty()
                    //

                    // UPDATE cs: inverting the logic leads to the following, I hope I didn't miss anything:
                    // in case of a newLine marker append an unconditional newLine by default, but
                    //  append an 'ifNotEmpty' newLine if and only if:
                    //   * the template doesn't start with a newLine marker and
                    //      * the current newline marker directly follows a substitution contributing an `undefined` or an instance of 'GeneratorNode', or
                    //      * the current newline marker directly follows a (template static) string (containing potentially unintended trailing whitespace)
                    //          that in turn directly follows a substitution contributing an `undefined` or an instance of 'GeneratorNode'
                    node: i !== 0 && (isUndefinedSegmentMarker(splitAndMerged[i - 1]) || isGeneratorNode(splitAndMerged[i - 1]))
                        || i > 1 && typeof splitAndMerged[i - 1] === 'string' && (isUndefinedSegmentMarker(splitAndMerged[i - 2]) || isGeneratorNode(splitAndMerged[i - 2]))
                        ? res.node.appendNewLineIfNotEmpty() : res.node.appendNewLine()
                } : (() => {
                    // the indentation handling is supposed to handle use cases like
                    //   bla bla bla {
                    //      ${foo(bar)}
                    //   }
                    // and
                    //   bla bla bla {
                    //      return ${foo(bar)}
                    //   }
                    // assuming that ${foo(bar)} yields a multiline result;
                    // the whitespace between 'return' and '${foo(bar)}' shall not add to the indentation of '${foo(bar)}'s result!
                    const indent: string = (i === 0 || isNewLineMarker(splitAndMerged[i - 1])) && typeof segment === 'string' && segment.length !== 0 ? ''.padStart(segment.length - segment.trimStart().length) : '';
                    const content = isSubstitutionWrapper(segment)? segment.content : segment;
                    let indented: IndentNode | undefined;
                    return {
                        node: res.indented
                            // in case an indentNode has been registered earlier for the current line,
                            //  just return 'node' without manipulation, the current segment will be added to the indentNode
                            ? res.node
                            // otherwise (no indentNode is registered by now)...
                            : indent.length !== 0
                                // in case an indentation has been identified add a non-immediate indentNode to 'node' and
                                //  add the current segment (containing its the indentation) to that indentNode,
                                //  and keep the indentNode in a local variable 'indented' for registering below,
                                //  and return 'node'
                                ? res.node.indent({ indentation: indent, indentImmediately: false, indentedChildren: ind => indented = ind.append(content) })
                                // otherwise just add the content to 'node' and return it
                                : res.node.append(content),
                        indented:
                            // if an indentNode has been created in this cycle, just register it,
                            //  otherwise check for a earlier registered indentNode and add the current segment to that one
                            indented ?? res.indented?.append(content),
                    };
                })(),
        { node: new CompositeGeneratorNode() }
    );

    return result.node;
}
