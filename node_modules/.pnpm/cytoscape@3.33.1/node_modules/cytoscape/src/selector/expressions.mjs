import tokens from './tokens.mjs';
import * as util from '../util/index.mjs';
import newQuery from './new-query.mjs';
import Type from './type.mjs';
import { stateSelectorRegex } from './state.mjs';

// when a token like a variable has escaped meta characters, we need to clean the backslashes out
// so that values get compared properly in Selector.filter()
const cleanMetaChars = function( str ){
  return str.replace( new RegExp( '\\\\(' + tokens.metaChar + ')', 'g' ), function( match, $1 ){
    return $1;
  } );
};

const replaceLastQuery = ( selector, examiningQuery, replacementQuery ) => {
  selector[ selector.length - 1 ] = replacementQuery;
};

// NOTE: add new expression syntax here to have it recognised by the parser;
// - a query contains all adjacent (i.e. no separator in between) expressions;
// - the current query is stored in selector[i]
// - you need to check the query objects in match() for it actually filter properly, but that's pretty straight forward
let exprs = [
  {
    name: 'group', // just used for identifying when debugging
    query: true,
    regex: '(' + tokens.group + ')',
    populate: function( selector, query, [ group ] ){
      query.checks.push({
        type: Type.GROUP,
        value: group === '*' ? group : group + 's'
      });
    }
  },

  {
    name: 'state',
    query: true,
    regex: stateSelectorRegex,
    populate: function( selector, query, [ state ] ){
      query.checks.push({
        type: Type.STATE,
        value: state
      });
    }
  },

  {
    name: 'id',
    query: true,
    regex: '\\#(' + tokens.id + ')',
    populate: function( selector, query,[ id ] ){
      query.checks.push({
        type: Type.ID,
        value: cleanMetaChars( id )
      });
    }
  },

  {
    name: 'className',
    query: true,
    regex: '\\.(' + tokens.className + ')',
    populate: function( selector, query, [ className ] ){
      query.checks.push({
        type: Type.CLASS,
        value: cleanMetaChars( className )
      });
    }
  },

  {
    name: 'dataExists',
    query: true,
    regex: '\\[\\s*(' + tokens.variable + ')\\s*\\]',
    populate: function( selector, query, [ variable ] ){
      query.checks.push( {
        type: Type.DATA_EXIST,
        field: cleanMetaChars( variable )
      } );
    }
  },

  {
    name: 'dataCompare',
    query: true,
    regex: '\\[\\s*(' + tokens.variable + ')\\s*(' + tokens.comparatorOp + ')\\s*(' + tokens.value + ')\\s*\\]',
    populate: function( selector, query, [ variable, comparatorOp, value ] ){
      let valueIsString = new RegExp( '^' + tokens.string + '$' ).exec( value ) != null;

      if( valueIsString ){
        value = value.substring( 1, value.length - 1 );
      } else {
        value = parseFloat( value );
      }

      query.checks.push( {
        type: Type.DATA_COMPARE,
        field: cleanMetaChars( variable ),
        operator: comparatorOp,
        value: value
      } );
    }
  },

  {
    name: 'dataBool',
    query: true,
    regex: '\\[\\s*(' + tokens.boolOp + ')\\s*(' + tokens.variable + ')\\s*\\]',
    populate: function( selector, query, [ boolOp, variable ] ){
      query.checks.push( {
        type: Type.DATA_BOOL,
        field: cleanMetaChars( variable ),
        operator: boolOp
      } );
    }
  },

  {
    name: 'metaCompare',
    query: true,
    regex: '\\[\\[\\s*(' + tokens.meta + ')\\s*(' + tokens.comparatorOp + ')\\s*(' + tokens.number + ')\\s*\\]\\]',
    populate: function( selector, query, [ meta, comparatorOp, number ] ){
      query.checks.push( {
        type: Type.META_COMPARE,
        field: cleanMetaChars( meta ),
        operator: comparatorOp,
        value: parseFloat( number )
      } );
    }
  },

  {
    name: 'nextQuery',
    separator: true,
    regex: tokens.separator,
    populate: function( selector, query ){
      let currentSubject = selector.currentSubject;
      let edgeCount = selector.edgeCount;
      let compoundCount = selector.compoundCount;
      let lastQ = selector[ selector.length - 1 ];

      if( currentSubject != null ){
        lastQ.subject = currentSubject;
        selector.currentSubject = null;
      }

      lastQ.edgeCount = edgeCount;
      lastQ.compoundCount = compoundCount;

      selector.edgeCount = 0;
      selector.compoundCount = 0;

      // go on to next query
      let nextQuery = selector[ selector.length++ ] = newQuery();

      return nextQuery; // this is the new query to be filled by the following exprs
    }
  },

  {
    name: 'directedEdge',
    separator: true,
    regex: tokens.directedEdge,
    populate: function( selector, query ){
      if( selector.currentSubject == null ){ // undirected edge
        let edgeQuery = newQuery();
        let source = query;
        let target = newQuery();

        edgeQuery.checks.push({ type: Type.DIRECTED_EDGE, source, target });

        // the query in the selector should be the edge rather than the source
        replaceLastQuery( selector, query, edgeQuery );

        selector.edgeCount++;

        // we're now populating the target query with expressions that follow
        return target;
      } else { // source/target
        let srcTgtQ = newQuery();
        let source = query;
        let target = newQuery();

        srcTgtQ.checks.push({ type: Type.NODE_SOURCE, source, target });

        // the query in the selector should be the neighbourhood rather than the node
        replaceLastQuery( selector, query, srcTgtQ );

        selector.edgeCount++;

        return target; // now populating the target with the following expressions
      }
    }
  },

  {
    name: 'undirectedEdge',
    separator: true,
    regex: tokens.undirectedEdge,
    populate: function( selector, query ){
      if( selector.currentSubject == null ){ // undirected edge
        let edgeQuery = newQuery();
        let source = query;
        let target = newQuery();

        edgeQuery.checks.push({ type: Type.UNDIRECTED_EDGE, nodes: [ source, target ] });

        // the query in the selector should be the edge rather than the source
        replaceLastQuery( selector, query, edgeQuery );

        selector.edgeCount++;

        // we're now populating the target query with expressions that follow
        return target;
      } else { // neighbourhood
        let nhoodQ = newQuery();
        let node = query;
        let neighbor = newQuery();

        nhoodQ.checks.push({ type: Type.NODE_NEIGHBOR, node, neighbor });

        // the query in the selector should be the neighbourhood rather than the node
        replaceLastQuery( selector, query, nhoodQ );

        return neighbor; // now populating the neighbor with following expressions
      }
    }
  },

  {
    name: 'child',
    separator: true,
    regex: tokens.child,
    populate: function( selector, query ){
      if( selector.currentSubject == null ){ // default: child query
        let parentChildQuery = newQuery();
        let child = newQuery();
        let parent = selector[selector.length - 1];

        parentChildQuery.checks.push({ type: Type.CHILD, parent, child });

        // the query in the selector should be the '>' itself
        replaceLastQuery( selector, query, parentChildQuery );

        selector.compoundCount++;

        // we're now populating the child query with expressions that follow
        return child;
      } else if( selector.currentSubject === query ){ // compound split query
        let compound = newQuery();
        let left = selector[ selector.length - 1 ];
        let right = newQuery();
        let subject = newQuery();
        let child = newQuery();
        let parent = newQuery();

        // set up the root compound q
        compound.checks.push({ type: Type.COMPOUND_SPLIT, left, right, subject });

        // populate the subject and replace the q at the old spot (within left) with TRUE
        subject.checks = query.checks; // take the checks from the left
        query.checks = [ { type: Type.TRUE } ]; // checks under left refs the subject implicitly

        // set up the right q
        parent.checks.push({ type: Type.TRUE }); // parent implicitly refs the subject
        right.checks.push({
          type: Type.PARENT, // type is swapped on right side queries
          parent,
          child // empty for now
        });

        replaceLastQuery( selector, left, compound );

        // update the ref since we moved things around for `query`
        selector.currentSubject = subject;

        selector.compoundCount++;

        return child; // now populating the right side's child
      } else { // parent query
        // info for parent query
        let parent = newQuery();
        let child = newQuery();
        let pcQChecks = [ { type: Type.PARENT, parent, child } ];

        // the parent-child query takes the place of the query previously being populated
        parent.checks = query.checks; // the previous query contains the checks for the parent
        query.checks = pcQChecks; // pc query takes over

        selector.compoundCount++;

        return child; // we're now populating the child
      }
    }
  },

  {
    name: 'descendant',
    separator: true,
    regex: tokens.descendant,
    populate: function( selector, query ){
      if( selector.currentSubject == null ){ // default: descendant query
        let ancChQuery = newQuery();
        let descendant = newQuery();
        let ancestor = selector[selector.length - 1];

        ancChQuery.checks.push({ type: Type.DESCENDANT, ancestor, descendant });

        // the query in the selector should be the '>' itself
        replaceLastQuery( selector, query, ancChQuery );

        selector.compoundCount++;

        // we're now populating the descendant query with expressions that follow
        return descendant;
      } else if( selector.currentSubject === query ){ // compound split query
        let compound = newQuery();
        let left = selector[ selector.length - 1 ];
        let right = newQuery();
        let subject = newQuery();
        let descendant = newQuery();
        let ancestor = newQuery();

        // set up the root compound q
        compound.checks.push({ type: Type.COMPOUND_SPLIT, left, right, subject });

        // populate the subject and replace the q at the old spot (within left) with TRUE
        subject.checks = query.checks; // take the checks from the left
        query.checks = [ { type: Type.TRUE } ]; // checks under left refs the subject implicitly

        // set up the right q
        ancestor.checks.push({ type: Type.TRUE }); // ancestor implicitly refs the subject
        right.checks.push({
          type: Type.ANCESTOR, // type is swapped on right side queries
          ancestor,
          descendant // empty for now
        });

        replaceLastQuery( selector, left, compound );

        // update the ref since we moved things around for `query`
        selector.currentSubject = subject;

        selector.compoundCount++;

        return descendant; // now populating the right side's descendant
      } else { // ancestor query
        // info for parent query
        let ancestor = newQuery();
        let descendant = newQuery();
        let adQChecks = [ { type: Type.ANCESTOR, ancestor, descendant } ];

        // the parent-child query takes the place of the query previously being populated
        ancestor.checks = query.checks; // the previous query contains the checks for the parent
        query.checks = adQChecks; // pc query takes over

        selector.compoundCount++;

        return descendant; // we're now populating the child
      }
    }
  },

  {
    name: 'subject',
    modifier: true,
    regex: tokens.subject,
    populate: function( selector, query ){
      if( selector.currentSubject != null && selector.currentSubject !== query ){
        util.warn( 'Redefinition of subject in selector `' + selector.toString() + '`' );
        return false;
      }

      selector.currentSubject = query;

      let topQ = selector[selector.length - 1];
      let topChk = topQ.checks[0];
      let topType = topChk == null ? null : topChk.type;

      if( topType === Type.DIRECTED_EDGE ){
        // directed edge with subject on the target

        // change to target node check
        topChk.type = Type.NODE_TARGET;

      } else if( topType === Type.UNDIRECTED_EDGE ){
        // undirected edge with subject on the second node

        // change to neighbor check
        topChk.type = Type.NODE_NEIGHBOR;
        topChk.node = topChk.nodes[1]; // second node is subject
        topChk.neighbor = topChk.nodes[0];

        // clean up unused fields for new type
        topChk.nodes = null;
      }
    }
  }
];

exprs.forEach( e => e.regexObj = new RegExp( '^' + e.regex ) );

export default exprs;
