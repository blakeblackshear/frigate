import Type from './type.mjs';
import { stateSelectorMatches } from './state.mjs';
import { valCmp, boolCmp, existCmp, meta, data } from './data.mjs';

/** A lookup of `match(check, ele)` functions by `Type` int */
export const match = [];

/**
 * Returns whether the query matches for the element
 * @param query The `{ type, value, ... }` query object
 * @param ele The element to compare against
*/
export const matches = (query, ele) => {
  return query.checks.every( chk => match[chk.type](chk, ele) );
};

match[Type.GROUP] = (check, ele) => {
  let group = check.value;

  return group === '*' || group === ele.group();
};

match[Type.STATE] = (check, ele) => {
  let stateSelector = check.value;

  return stateSelectorMatches( stateSelector, ele );
};

match[Type.ID] = (check, ele) => {
  let id = check.value;

  return ele.id() === id;
};

match[Type.CLASS] = (check, ele) => {
  let cls = check.value;

  return ele.hasClass(cls);
};

match[Type.META_COMPARE] = (check, ele) => {
  let { field, operator, value } = check;

  return valCmp( meta(ele, field), operator, value );
};

match[Type.DATA_COMPARE] = (check, ele) => {
  let { field, operator, value } = check;

  return valCmp( data(ele, field), operator, value );
};

match[Type.DATA_BOOL] = (check, ele) => {
  let { field, operator } = check;

  return boolCmp( data(ele, field), operator );
};

match[Type.DATA_EXIST] = (check, ele) => {
  let { field, operator } = check;

  return existCmp( data(ele, field), operator );
};

match[Type.UNDIRECTED_EDGE] = (check, ele) => {
  let qA = check.nodes[0];
  let qB = check.nodes[1];
  let src = ele.source();
  let tgt = ele.target();

  return ( matches(qA, src) && matches(qB, tgt) ) || ( matches(qB, src) && matches(qA, tgt) );
};

match[Type.NODE_NEIGHBOR] = (check, ele) => {
  return matches(check.node, ele) && ele.neighborhood().some( n => n.isNode() && matches(check.neighbor, n) );
};

match[Type.DIRECTED_EDGE] = (check, ele) => {
  return matches(check.source, ele.source()) && matches(check.target, ele.target());
};

match[Type.NODE_SOURCE] = (check, ele) => {
  return matches(check.source, ele) && ele.outgoers().some( n => n.isNode() && matches(check.target, n) );
};

match[Type.NODE_TARGET] = (check, ele) => {
  return matches(check.target, ele) && ele.incomers().some( n => n.isNode() && matches(check.source, n) );
};

match[Type.CHILD] = (check, ele) => {
  return matches(check.child, ele) && matches(check.parent, ele.parent());
};

match[Type.PARENT] = (check, ele) => {
  return matches(check.parent, ele) && ele.children().some( c => matches(check.child, c) );
};

match[Type.DESCENDANT] = (check, ele) => {
  return matches(check.descendant, ele) && ele.ancestors().some( a => matches(check.ancestor, a) );
};

match[Type.ANCESTOR] = (check, ele) => {
  return matches(check.ancestor, ele) && ele.descendants().some( d => matches(check.descendant, d) );
};

match[Type.COMPOUND_SPLIT] = (check, ele) => {
  return matches(check.subject, ele) && matches(check.left, ele) && matches(check.right, ele);
};

match[Type.TRUE] = () => true;

match[Type.COLLECTION] = (check, ele) => {
  let collection = check.value;

  return collection.has(ele);
};

match[Type.FILTER] = (check, ele) => {
  let filter = check.value;

  return filter(ele);
};