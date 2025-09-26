/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { AstNode, Properties } from '../syntax-tree.js';
import { CompositeGeneratorNode } from './generator-node.js';
import type { SourceRegion } from './generator-tracing.js';
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
export declare function expandToNode(staticParts: TemplateStringsArray, ...substitutions: unknown[]): CompositeGeneratorNode;
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
export declare function expandTracedToNode<T extends AstNode>(astNode: T, property?: Properties<T>): (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => CompositeGeneratorNode;
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
export declare function expandTracedToNode<T extends AstNode>(astNode: T, property: Properties<T>, index?: number | undefined): (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => CompositeGeneratorNode;
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
export declare function expandTracedToNode(sourceRegion: SourceRegion | undefined): (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => CompositeGeneratorNode;
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
export declare function expandTracedToNode(sourceRegions: SourceRegion[]): (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => CompositeGeneratorNode;
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
export declare function expandTracedToNodeIf<T extends AstNode>(condition: boolean, astNode: T, property?: Properties<T>): (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => CompositeGeneratorNode | undefined;
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
export declare function expandTracedToNodeIf<T extends AstNode>(condition: boolean, astNode: T, property: Properties<T>, index: number | undefined): (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => CompositeGeneratorNode | undefined;
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
export declare function expandTracedToNodeIf(condition: boolean, sourceRegion: SourceRegion | undefined | (() => SourceRegion | undefined)): (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => CompositeGeneratorNode | undefined;
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
export declare function expandTracedToNodeIf(condition: boolean, sourceRegions: SourceRegion[]): (staticParts: TemplateStringsArray, ...substitutions: unknown[]) => CompositeGeneratorNode | undefined;
//# sourceMappingURL=template-node.d.ts.map