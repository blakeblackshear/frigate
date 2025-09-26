/**
 * assignWithDepth Extends the functionality of {@link Object.assign} with the
 *   ability to merge arbitrary-depth objects For each key in src with path `k` (recursively)
 *   performs an Object.assign(dst[`k`], src[`k`]) with a slight change from the typical handling of
 *   undefined for dst[`k`]: instead of raising an error, dst[`k`] is auto-initialized to `{}` and
 *   effectively merged with src[`k`]<p> Additionally, dissimilar types will not clobber unless the
 *   config.clobber parameter === true. Example:
 *
 * ```
 * const config_0 = { foo: { bar: 'bar' }, bar: 'foo' };
 * const config_1 = { foo: 'foo', bar: 'bar' };
 * const result = assignWithDepth(config_0, config_1);
 * console.log(result);
 * //-> result: { foo: { bar: 'bar' }, bar: 'bar' }
 * ```
 *
 *   Traditional Object.assign would have clobbered foo in config_0 with foo in config_1. If src is a
 *   destructured array of objects and dst is not an array, assignWithDepth will apply each element
 *   of src to dst in order.
 * @param dst - The destination of the merge
 * @param src - The source object(s) to merge into destination
 * @param config -
 * * depth: depth to traverse within src and dst for merging
 * * clobber: should dissimilar types clobber
 */
declare const assignWithDepth: (dst: any, src: any, { depth, clobber }?: {
    depth?: number;
    clobber?: boolean;
}) => any;
export default assignWithDepth;
