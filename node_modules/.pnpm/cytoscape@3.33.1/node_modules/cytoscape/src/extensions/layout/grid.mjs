import * as util from '../../util/index.mjs';
import * as math from '../../math.mjs';

let defaults = {
  fit: true, // whether to fit the viewport to the graph
  padding: 30, // padding used on fit
  boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
  avoidOverlap: true, // prevents node overlap, may overflow boundingBox if not enough space
  avoidOverlapPadding: 10, // extra spacing around nodes when avoidOverlap: true
  nodeDimensionsIncludeLabels: false, // Excludes the label when calculating node bounding boxes for the layout algorithm
  spacingFactor: undefined, // Applies a multiplicative factor (>0) to expand or compress the overall area that the nodes take up
  condense: false, // uses all available space on false, uses minimal space on true
  rows: undefined, // force num of rows in the grid
  cols: undefined, // force num of columns in the grid
  position: function( node ){}, // returns { row, col } for element
  sort: undefined, // a sorting function to order the nodes; e.g. function(a, b){ return a.data('weight') - b.data('weight') }
  animate: false, // whether to transition the node positions
  animationDuration: 500, // duration of animation in ms if enabled
  animationEasing: undefined, // easing of animation if enabled
  animateFilter: function ( node, i ){ return true; }, // a function that determines whether the node should be animated.  All nodes animated by default on animate enabled.  Non-animated nodes are positioned immediately when the layout starts
  ready: undefined, // callback on layoutready
  stop: undefined, // callback on layoutstop
  transform: function (node, position ){ return position; } // transform a given node position. Useful for changing flow direction in discrete layouts 
};

function GridLayout( options ){
  this.options = util.extend( {}, defaults, options );
}

GridLayout.prototype.run = function(){
  let params = this.options;
  let options = params;

  let cy = params.cy;
  let eles = options.eles;
  let nodes = eles.nodes().not( ':parent' );

  if( options.sort ){
    nodes = nodes.sort( options.sort );
  }

  let bb = math.makeBoundingBox( options.boundingBox ? options.boundingBox : {
    x1: 0, y1: 0, w: cy.width(), h: cy.height()
  } );

  if( bb.h === 0 || bb.w === 0 ){
    eles.nodes().layoutPositions( this, options, function( ele ){
      return { x: bb.x1, y: bb.y1 };
    } );

  } else {

    // width/height * splits^2 = cells where splits is number of times to split width
    let cells = nodes.size();
    let splits = Math.sqrt( cells * bb.h / bb.w );
    let rows = Math.round( splits );
    let cols = Math.round( bb.w / bb.h * splits );

    let small = function( val ){
      if( val == null ){
        return Math.min( rows, cols );
      } else {
        let min = Math.min( rows, cols );
        if( min == rows ){
          rows = val;
        } else {
          cols = val;
        }
      }
    };

    let large = function( val ){
      if( val == null ){
        return Math.max( rows, cols );
      } else {
        let max = Math.max( rows, cols );
        if( max == rows ){
          rows = val;
        } else {
          cols = val;
        }
      }
    };

    let oRows = options.rows;
    let oCols = options.cols != null ? options.cols : options.columns;

    // if rows or columns were set in options, use those values
    if( oRows != null && oCols != null ){
      rows = oRows;
      cols = oCols;
    } else if( oRows != null && oCols == null ){
      rows = oRows;
      cols = Math.ceil( cells / rows );
    } else if( oRows == null && oCols != null ){
      cols = oCols;
      rows = Math.ceil( cells / cols );
    }

    // otherwise use the automatic values and adjust accordingly

    // if rounding was up, see if we can reduce rows or columns
    else if( cols * rows > cells ){
      let sm = small();
      let lg = large();

      // reducing the small side takes away the most cells, so try it first
      if( (sm - 1) * lg >= cells ){
        small( sm - 1 );
      } else if( (lg - 1) * sm >= cells ){
        large( lg - 1 );
      }
    } else {

      // if rounding was too low, add rows or columns
      while( cols * rows < cells ){
        let sm = small();
        let lg = large();

        // try to add to larger side first (adds less in multiplication)
        if( (lg + 1) * sm >= cells ){
          large( lg + 1 );
        } else {
          small( sm + 1 );
        }
      }
    }

    let cellWidth = bb.w / cols;
    let cellHeight = bb.h / rows;

    if( options.condense ){
      cellWidth = 0;
      cellHeight = 0;
    }

    if( options.avoidOverlap ){
      for( let i = 0; i < nodes.length; i++ ){
        let node = nodes[ i ];
        let pos = node._private.position;

        if( pos.x == null || pos.y == null ){ // for bb
          pos.x = 0;
          pos.y = 0;
        }

        let nbb = node.layoutDimensions( options );
        let p = options.avoidOverlapPadding;

        let w = nbb.w + p;
        let h = nbb.h + p;

        cellWidth = Math.max( cellWidth, w );
        cellHeight = Math.max( cellHeight, h );
      }
    }

    let cellUsed = {}; // e.g. 'c-0-2' => true

    let used = function( row, col ){
      return cellUsed[ 'c-' + row + '-' + col ] ? true : false;
    };

    let use = function( row, col ){
      cellUsed[ 'c-' + row + '-' + col ] = true;
    };

    // to keep track of current cell position
    let row = 0;
    let col = 0;
    let moveToNextCell = function(){
      col++;
      if( col >= cols ){
        col = 0;
        row++;
      }
    };

    // get a cache of all the manual positions
    let id2manPos = {};
    for( let i = 0; i < nodes.length; i++ ){
      let node = nodes[ i ];
      let rcPos = options.position( node );

      if( rcPos && (rcPos.row !== undefined || rcPos.col !== undefined) ){ // must have at least row or col def'd
        let pos = {
          row: rcPos.row,
          col: rcPos.col
        };

        if( pos.col === undefined ){ // find unused col
          pos.col = 0;

          while( used( pos.row, pos.col ) ){
            pos.col++;
          }
        } else if( pos.row === undefined ){ // find unused row
          pos.row = 0;

          while( used( pos.row, pos.col ) ){
            pos.row++;
          }
        }

        id2manPos[ node.id() ] = pos;
        use( pos.row, pos.col );
      }
    }

    let getPos = function( element, i ){
      let x, y;

      if( element.locked() || element.isParent() ){
        return false;
      }

      // see if we have a manual position set
      let rcPos = id2manPos[ element.id() ];
      if( rcPos ){
        x = rcPos.col * cellWidth + cellWidth / 2 + bb.x1;
        y = rcPos.row * cellHeight + cellHeight / 2 + bb.y1;

      } else { // otherwise set automatically

        while( used( row, col ) ){
          moveToNextCell();
        }

        x = col * cellWidth + cellWidth / 2 + bb.x1;
        y = row * cellHeight + cellHeight / 2 + bb.y1;
        use( row, col );

        moveToNextCell();
      }

      return { x: x, y: y };

    };

    nodes.layoutPositions( this, options, getPos );
  }

  return this; // chaining

};

export default GridLayout;
