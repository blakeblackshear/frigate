import * as is from '../is.mjs';
import * as util from '../util/index.mjs';

function styleCache( key, fn, ele ){
  var _p = ele._private;
  var cache = _p.styleCache = _p.styleCache || [];
  var val;

  if( (val = cache[key]) != null ){
    return val;
  } else {
    val = cache[key] = fn( ele );

    return val;
  }
}

function cacheStyleFunction( key, fn ){
  key = util.hashString( key );

  return function cachedStyleFunction( ele ){
    return styleCache( key, fn, ele );
  };
}

function cachePrototypeStyleFunction( key, fn ){
  key = util.hashString( key );

  let selfFn = ele => fn.call( ele );

  return function cachedPrototypeStyleFunction(){
    var ele = this[0];

    if( ele ){
      return styleCache( key, selfFn, ele );
    }
  };
}

let elesfn = ({

  recalculateRenderedStyle: function( useCache ){
    let cy = this.cy();
    let renderer = cy.renderer();
    let styleEnabled = cy.styleEnabled();

    if( renderer && styleEnabled ){
      renderer.recalculateRenderedStyle( this, useCache );
    }

    return this;
  },

  dirtyStyleCache: function(){
    let cy = this.cy();
    let dirty = ele => ele._private.styleCache = null;

    if( cy.hasCompoundNodes() ){
      let eles;

      eles = this.spawnSelf()
        .merge( this.descendants() )
        .merge( this.parents() )
      ;

      eles.merge( eles.connectedEdges() );

      eles.forEach( dirty );
    } else {
      this.forEach( ele => {
        dirty( ele );

        ele.connectedEdges().forEach( dirty );
      } );
    }

    return this;
  },

  // fully updates (recalculates) the style for the elements
  updateStyle: function( notifyRenderer ){
    let cy = this._private.cy;

    if( !cy.styleEnabled() ){ return this; }

    if( cy.batching() ){
      let bEles = cy._private.batchStyleEles;

      bEles.merge( this );

      return this; // chaining and exit early when batching
    }

    let hasCompounds = cy.hasCompoundNodes();
    let updatedEles = this;

    notifyRenderer = notifyRenderer || notifyRenderer === undefined ? true : false;

    if( hasCompounds ){ // then add everything up and down for compound selector checks
      updatedEles = this.spawnSelf().merge( this.descendants() ).merge( this.parents() );
    }

    // let changedEles = style.apply( updatedEles );
    let changedEles = updatedEles;

    if( notifyRenderer ){
      changedEles.emitAndNotify( 'style' ); // let renderer know we changed style
    } else {
      changedEles.emit( 'style' ); // just fire the event
    }

    updatedEles.forEach(ele => ele._private.styleDirty = true);

    return this; // chaining
  },

  // private: clears dirty flag and recalculates style
  cleanStyle: function(){
    let cy = this.cy();

    if( !cy.styleEnabled() ){ return; }

    for( let i = 0; i < this.length; i++ ){
      let ele = this[i];

      if( ele._private.styleDirty ){
        // n.b. this flag should be set before apply() to avoid potential infinite recursion
        ele._private.styleDirty = false;

        cy.style().apply(ele);
      }
    }
  },

  // get the internal parsed style object for the specified property
  parsedStyle: function( property, includeNonDefault = true ){
    let ele = this[0];
    let cy = ele.cy();

    if( !cy.styleEnabled() ){ return; }

    if( ele ){
      // this.cleanStyle();

      // Inline the important part of cleanStyle(), for raw performance
      if( ele._private.styleDirty ){
        // n.b. this flag should be set before apply() to avoid potential infinite recursion
        ele._private.styleDirty = false;
        cy.style().apply(ele);
      }

      let overriddenStyle = ele._private.style[ property ];

      if( overriddenStyle != null ){
        return overriddenStyle;
      } else if( includeNonDefault ){
        return cy.style().getDefaultProperty( property );
      } else {
        return null;
      }
    }
  },

  numericStyle: function( property ){
    let ele = this[0];

    if( !ele.cy().styleEnabled() ){ return; }

    if( ele ){
      let pstyle = ele.pstyle( property );

      return pstyle.pfValue !== undefined ? pstyle.pfValue : pstyle.value;
    }
  },

  numericStyleUnits: function( property ){
    let ele = this[0];

    if( !ele.cy().styleEnabled() ){ return; }

    if( ele ){
      return ele.pstyle( property ).units;
    }
  },

  // get the specified css property as a rendered value (i.e. on-screen value)
  // or get the whole rendered style if no property specified (NB doesn't allow setting)
  renderedStyle: function( property ){
    let cy = this.cy();
    if( !cy.styleEnabled() ){ return this; }

    let ele = this[0];

    if( ele ){
      return cy.style().getRenderedStyle( ele, property );
    }
  },

  // read the calculated css style of the element or override the style (via a bypass)
  style: function( name, value ){
    let cy = this.cy();

    if( !cy.styleEnabled() ){ return this; }

    let updateTransitions = false;
    let style = cy.style();

    if( is.plainObject( name ) ){ // then extend the bypass
      let props = name;
      style.applyBypass( this, props, updateTransitions );

      this.emitAndNotify( 'style' ); // let the renderer know we've updated style

    } else if( is.string( name ) ){

      if( value === undefined ){ // then get the property from the style
        let ele = this[0];

        if( ele ){
          return style.getStylePropertyValue( ele, name );
        } else { // empty collection => can't get any value
          return;
        }

      } else { // then set the bypass with the property value
        style.applyBypass( this, name, value, updateTransitions );

        this.emitAndNotify( 'style' ); // let the renderer know we've updated style
      }

    } else if( name === undefined ){
      let ele = this[0];

      if( ele ){
        return style.getRawStyle( ele );
      } else { // empty collection => can't get any value
        return;
      }
    }

    return this; // chaining
  },

  removeStyle: function( names ){
    let cy = this.cy();

    if( !cy.styleEnabled() ){ return this; }

    let updateTransitions = false;
    let style = cy.style();
    let eles = this;

    if( names === undefined ){
      for( let i = 0; i < eles.length; i++ ){
        let ele = eles[ i ];

        style.removeAllBypasses( ele, updateTransitions );
      }
    } else {
      names = names.split( /\s+/ );

      for( let i = 0; i < eles.length; i++ ){
        let ele = eles[ i ];

        style.removeBypasses( ele, names, updateTransitions );
      }
    }

    this.emitAndNotify( 'style' ); // let the renderer know we've updated style

    return this; // chaining
  },

  show: function(){
    this.css( 'display', 'element' );
    return this; // chaining
  },

  hide: function(){
    this.css( 'display', 'none' );
    return this; // chaining
  },

  effectiveOpacity: function(){
    let cy = this.cy();
    if( !cy.styleEnabled() ){ return 1; }

    let hasCompoundNodes = cy.hasCompoundNodes();
    let ele = this[0];

    if( ele ){
      let _p = ele._private;
      let parentOpacity = ele.pstyle( 'opacity' ).value;

      if( !hasCompoundNodes ){ return parentOpacity; }

      let parents = !_p.data.parent ? null : ele.parents();

      if( parents ){
        for( let i = 0; i < parents.length; i++ ){
          let parent = parents[ i ];
          let opacity = parent.pstyle( 'opacity' ).value;

          parentOpacity = opacity * parentOpacity;
        }
      }

      return parentOpacity;
    }
  },

  transparent: function(){
    let cy = this.cy();
    if( !cy.styleEnabled() ){ return false; }

    let ele = this[0];
    let hasCompoundNodes = ele.cy().hasCompoundNodes();

    if( ele ){
      if( !hasCompoundNodes ){
        return ele.pstyle( 'opacity' ).value === 0;
      } else {
        return ele.effectiveOpacity() === 0;
      }
    }
  },

  backgrounding: function(){
    let cy = this.cy();
    if( !cy.styleEnabled() ){ return false; }

    let ele = this[0];

    return ele._private.backgrounding ? true : false;
  }

});

function checkCompound( ele, parentOk ){
  let _p = ele._private;
  let parents = _p.data.parent ? ele.parents() : null;

  if( parents ){ for( let i = 0; i < parents.length; i++ ){
    let parent = parents[ i ];

    if( !parentOk( parent ) ){ return false; }
  } }

  return true;
}

function defineDerivedStateFunction( specs ){
  let ok = specs.ok;
  let edgeOkViaNode = specs.edgeOkViaNode || specs.ok;
  let parentOk = specs.parentOk || specs.ok;

  return function(){
    let cy = this.cy();
    if( !cy.styleEnabled() ){ return true; }

    let ele = this[0];
    let hasCompoundNodes = cy.hasCompoundNodes();

    if( ele ){
      let _p = ele._private;

      if( !ok( ele ) ){ return false; }

      if( ele.isNode() ){
        return !hasCompoundNodes || checkCompound( ele, parentOk );
      } else {
        let src = _p.source;
        let tgt = _p.target;

        return ( edgeOkViaNode(src) && (!hasCompoundNodes || checkCompound(src, edgeOkViaNode)) ) &&
          ( src === tgt || ( edgeOkViaNode(tgt) && (!hasCompoundNodes || checkCompound(tgt, edgeOkViaNode)) ) );
      }
    }
  };
}

let eleTakesUpSpace = cacheStyleFunction( 'eleTakesUpSpace', function( ele ){
  return (
    ele.pstyle( 'display' ).value === 'element'
    && ele.width() !== 0
    && ( ele.isNode() ? ele.height() !== 0 : true )
  );
} );

elesfn.takesUpSpace = cachePrototypeStyleFunction( 'takesUpSpace', defineDerivedStateFunction({
  ok: eleTakesUpSpace
}) );

let eleInteractive = cacheStyleFunction( 'eleInteractive', function( ele ){
  return (
    ele.pstyle('events').value === 'yes'
    && ele.pstyle('visibility').value === 'visible'
    && eleTakesUpSpace( ele )
  );
} );

let parentInteractive = cacheStyleFunction( 'parentInteractive', function( parent ){
  return (
    parent.pstyle('visibility').value === 'visible'
    && eleTakesUpSpace( parent )
  );
} );

elesfn.interactive = cachePrototypeStyleFunction( 'interactive', defineDerivedStateFunction({
  ok: eleInteractive,
  parentOk: parentInteractive,
  edgeOkViaNode: eleTakesUpSpace
}) );

elesfn.noninteractive = function(){
  let ele = this[0];

  if( ele ){
    return !ele.interactive();
  }
};

let eleVisible = cacheStyleFunction( 'eleVisible', function( ele ){
  return (
    ele.pstyle( 'visibility' ).value === 'visible'
    && ele.pstyle( 'opacity' ).pfValue !== 0
    && eleTakesUpSpace( ele )
  );
} );

let edgeVisibleViaNode = eleTakesUpSpace;

elesfn.visible = cachePrototypeStyleFunction( 'visible', defineDerivedStateFunction({
  ok: eleVisible,
  edgeOkViaNode: edgeVisibleViaNode
}) );

elesfn.hidden = function(){
  let ele = this[0];

  if( ele ){
    return !ele.visible();
  }
};

elesfn.isBundledBezier = cachePrototypeStyleFunction('isBundledBezier', function(){
  if( !this.cy().styleEnabled() ){ return false; }

  return !this.removed() && this.pstyle('curve-style').value === 'bezier' && this.takesUpSpace();
});

elesfn.bypass = elesfn.css = elesfn.style;
elesfn.renderedCss = elesfn.renderedStyle;
elesfn.removeBypass = elesfn.removeCss = elesfn.removeStyle;
elesfn.pstyle = elesfn.parsedStyle;

export default elesfn;
