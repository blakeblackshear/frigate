import * as util from '../util/index.mjs';

// tokens in the query language
const tokens = {
  metaChar: '[\\!\\"\\#\\$\\%\\&\\\'\\(\\)\\*\\+\\,\\.\\/\\:\\;\\<\\=\\>\\?\\@\\[\\]\\^\\`\\{\\|\\}\\~]', // chars we need to escape in let names, etc
  comparatorOp: '=|\\!=|>|>=|<|<=|\\$=|\\^=|\\*=', // binary comparison op (used in data selectors)
  boolOp: '\\?|\\!|\\^', // boolean (unary) operators (used in data selectors)
  string: '"(?:\\\\"|[^"])*"' + '|' + "'(?:\\\\'|[^'])*'", // string literals (used in data selectors) -- doublequotes | singlequotes
  number: util.regex.number, // number literal (used in data selectors) --- e.g. 0.1234, 1234, 12e123
  meta: 'degree|indegree|outdegree', // allowed metadata fields (i.e. allowed functions to use from Collection)
  separator: '\\s*,\\s*', // queries are separated by commas, e.g. edge[foo = 'bar'], node.someClass
  descendant: '\\s+',
  child: '\\s+>\\s+',
  subject: '\\$',
  group: 'node|edge|\\*',
  directedEdge: '\\s+->\\s+',
  undirectedEdge: '\\s+<->\\s+'
};
tokens.variable = '(?:[\\w-.]|(?:\\\\' + tokens.metaChar + '))+'; // a variable name can have letters, numbers, dashes, and periods
tokens.className = '(?:[\\w-]|(?:\\\\' + tokens.metaChar + '))+'; // a class name has the same rules as a variable except it can't have a '.' in the name
tokens.value = tokens.string + '|' + tokens.number; // a value literal, either a string or number
tokens.id = tokens.variable; // an element id (follows variable conventions)

(function(){
  let ops, op, i;

  // add @ variants to comparatorOp
  ops = tokens.comparatorOp.split( '|' );
  for( i = 0; i < ops.length; i++ ){
    op = ops[ i ];
    tokens.comparatorOp += '|@' + op;
  }

  // add ! variants to comparatorOp
  ops = tokens.comparatorOp.split( '|' );
  for( i = 0; i < ops.length; i++ ){
    op = ops[ i ];

    if( op.indexOf( '!' ) >= 0 ){ continue; } // skip ops that explicitly contain !
    if( op === '=' ){ continue; } // skip = b/c != is explicitly defined

    tokens.comparatorOp += '|\\!' + op;
  }
})();

export default tokens;
