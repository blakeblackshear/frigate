/**
 * A check type enum-like object.  Uses integer values for fast match() lookup.
 * The ordering does not matter as long as the ints are unique.
 */
const Type = {
  /** E.g. node */
  GROUP: 0,

  /** A collection of elements */
  COLLECTION: 1,

  /** A filter(ele) function */
  FILTER: 2,

  /** E.g. [foo > 1] */
  DATA_COMPARE: 3,

  /** E.g. [foo] */
  DATA_EXIST: 4,

  /** E.g. [?foo] */
  DATA_BOOL: 5,

  /** E.g. [[degree > 2]] */
  META_COMPARE: 6,

  /** E.g. :selected */
  STATE: 7,

  /** E.g. #foo */
  ID: 8,

  /** E.g. .foo */
  CLASS: 9,

  /** E.g. #foo <-> #bar */
  UNDIRECTED_EDGE: 10,

  /** E.g. #foo -> #bar */
  DIRECTED_EDGE: 11,

  /** E.g. $#foo -> #bar */
  NODE_SOURCE: 12,

  /** E.g. #foo -> $#bar */
  NODE_TARGET: 13,

  /** E.g. $#foo <-> #bar */
  NODE_NEIGHBOR: 14,

  /** E.g. #foo > #bar */
  CHILD: 15,

  /** E.g. #foo #bar */
  DESCENDANT: 16,

  /** E.g. $#foo > #bar */
  PARENT: 17,

  /** E.g. $#foo #bar */
  ANCESTOR: 18,

  /** E.g. #foo > $bar > #baz */
  COMPOUND_SPLIT: 19,

  /** Always matches, useful placeholder for subject in `COMPOUND_SPLIT` */
  TRUE: 20
};

export default Type;