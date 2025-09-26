import * as util from '../util/index.mjs';
import * as is from '../is.mjs';
import Promise from '../promise.mjs';

const styfn = {};

// keys for style blocks, e.g. ttfftt
const TRUE = 't';
const FALSE = 'f';

// (potentially expensive calculation)
// apply the style to the element based on
// - its bypass
// - what selectors match it
styfn.apply = function( eles ){
  let self = this;
  let _p = self._private;
  let cy = _p.cy;
  let updatedEles = cy.collection();

  for( let ie = 0; ie < eles.length; ie++ ){
    let ele = eles[ ie ];
    let cxtMeta = self.getContextMeta( ele );

    if( cxtMeta.empty ){
      continue;
    }

    let cxtStyle = self.getContextStyle( cxtMeta );
    let app = self.applyContextStyle( cxtMeta, cxtStyle, ele );

    if( ele._private.appliedInitStyle ){
      self.updateTransitions( ele, app.diffProps );
    } else {
      ele._private.appliedInitStyle = true;
    }

    let hintsDiff = self.updateStyleHints( ele );

    if( hintsDiff ){
      updatedEles.push( ele );
    }

  } // for elements

  return updatedEles;
};

styfn.getPropertiesDiff = function( oldCxtKey, newCxtKey ){
  let self = this;
  let cache = self._private.propDiffs = self._private.propDiffs || {};
  let dualCxtKey = oldCxtKey + '-' + newCxtKey;
  let cachedVal = cache[ dualCxtKey ];

  if( cachedVal ){
    return cachedVal;
  }

  let diffProps = [];
  let addedProp = {};

  for( let i = 0; i < self.length; i++ ){
    let cxt = self[ i ];
    let oldHasCxt = oldCxtKey[ i ] === TRUE;
    let newHasCxt = newCxtKey[ i ] === TRUE;
    let cxtHasDiffed = oldHasCxt !== newHasCxt;
    let cxtHasMappedProps = cxt.mappedProperties.length > 0;

    if( cxtHasDiffed || ( newHasCxt && cxtHasMappedProps )){
      let props;

      if( cxtHasDiffed && cxtHasMappedProps ){
        props = cxt.properties; // suffices b/c mappedProperties is a subset of properties
      } else if( cxtHasDiffed ){
        props = cxt.properties; // need to check them all
      } else if( cxtHasMappedProps ){
        props = cxt.mappedProperties; // only need to check mapped
      }

      for( let j = 0; j < props.length; j++ ){
        let prop = props[ j ];
        let name = prop.name;

        // if a later context overrides this property, then the fact that this context has switched/diffed doesn't matter
        // (semi expensive check since it makes this function O(n^2) on context length, but worth it since overall result
        // is cached)
        let laterCxtOverrides = false;
        for( let k = i + 1; k < self.length; k++ ){
          let laterCxt = self[ k ];
          let hasLaterCxt = newCxtKey[ k ] === TRUE;

          if( !hasLaterCxt ){ continue; } // can't override unless the context is active

          laterCxtOverrides = laterCxt.properties[ prop.name ] != null;

          if( laterCxtOverrides ){ break; } // exit early as long as one later context overrides
        }

        if( !addedProp[ name ] && !laterCxtOverrides ){
          addedProp[ name ] = true;
          diffProps.push( name );
        }
      } // for props
    } // if

  } // for contexts

  cache[ dualCxtKey ] = diffProps;
  return diffProps;
};

styfn.getContextMeta = function( ele ){
  let self = this;
  let cxtKey = '';
  let diffProps;
  let prevKey = ele._private.styleCxtKey || '';

  // get the cxt key
  for( let i = 0; i < self.length; i++ ){
    let context = self[ i ];
    let contextSelectorMatches = context.selector && context.selector.matches( ele ); // NB: context.selector may be null for 'core'

    if( contextSelectorMatches ){
      cxtKey += TRUE;
    } else {
      cxtKey += FALSE;
    }
  } // for context

  diffProps = self.getPropertiesDiff( prevKey, cxtKey );

  ele._private.styleCxtKey = cxtKey;

  return {
    key: cxtKey,
    diffPropNames: diffProps,
    empty: diffProps.length === 0
  };
};

// gets a computed ele style object based on matched contexts
styfn.getContextStyle = function( cxtMeta ){
  let cxtKey = cxtMeta.key;
  let self = this;
  let cxtStyles = this._private.contextStyles = this._private.contextStyles || {};

  // if already computed style, returned cached copy
  if( cxtStyles[ cxtKey ] ){ return cxtStyles[ cxtKey ]; }

  let style = {
    _private: {
      key: cxtKey
    }
  };

  for( let i = 0; i < self.length; i++ ){
    let cxt = self[ i ];
    let hasCxt = cxtKey[ i ] === TRUE;

    if( !hasCxt ){ continue; }

    for( let j = 0; j < cxt.properties.length; j++ ){
      let prop = cxt.properties[ j ];

      style[ prop.name ] = prop;
    }
  }

  cxtStyles[ cxtKey ] = style;
  return style;
};

styfn.applyContextStyle = function( cxtMeta, cxtStyle, ele ){
  let self = this;
  let diffProps = cxtMeta.diffPropNames;
  let retDiffProps = {};
  let types = self.types;

  for( let i = 0; i < diffProps.length; i++ ){
    let diffPropName = diffProps[ i ];
    let cxtProp = cxtStyle[ diffPropName ];
    let eleProp = ele.pstyle( diffPropName );

    if( !cxtProp ){ // no context prop means delete
      if( !eleProp ){
        continue; // no existing prop means nothing needs to be removed
        // nb affects initial application on mapped values like control-point-distances
      } else if( eleProp.bypass ){
        cxtProp = { name: diffPropName, deleteBypassed: true };
      } else {
        cxtProp = { name: diffPropName, delete: true };
      }
    }

    // save cycles when the context prop doesn't need to be applied
    if( eleProp === cxtProp ){ continue; }

    // save cycles when a mapped context prop doesn't need to be applied
    if(
      cxtProp.mapped === types.fn // context prop is function mapper
      && eleProp != null // some props can be null even by default (e.g. a prop that overrides another one)
      && eleProp.mapping != null // ele prop is a concrete value from from a mapper
      && eleProp.mapping.value === cxtProp.value // the current prop on the ele is a flat prop value for the function mapper
    ){ // NB don't write to cxtProp, as it's shared among eles (stored in stylesheet)
      let mapping = eleProp.mapping; // can write to mapping, as it's a per-ele copy
      let fnValue = mapping.fnValue = cxtProp.value( ele ); // temporarily cache the value in case of a miss

      if( fnValue === mapping.prevFnValue ){ continue; }
    }

    let retDiffProp = retDiffProps[ diffPropName ] = {
      prev: eleProp
    };

    self.applyParsedProperty( ele, cxtProp );

    retDiffProp.next = ele.pstyle( diffPropName );

    if( retDiffProp.next && retDiffProp.next.bypass ){
      retDiffProp.next = retDiffProp.next.bypassed;
    }
  }

  return {
    diffProps: retDiffProps
  };
};

styfn.updateStyleHints = function(ele){
  let _p = ele._private;
  let self = this;
  let propNames = self.propertyGroupNames;
  let propGrKeys = self.propertyGroupKeys;
  let propHash = ( ele, propNames, seedKey ) => self.getPropertiesHash( ele, propNames, seedKey );
  let oldStyleKey = _p.styleKey;

  if( ele.removed() ){ return false; }

  let isNode = _p.group === 'nodes';

  // get the style key hashes per prop group
  // but lazily -- only use non-default prop values to reduce the number of hashes
  //

  let overriddenStyles = ele._private.style;

  propNames = Object.keys( overriddenStyles );

  for( let i = 0; i < propGrKeys.length; i++ ){
    let grKey = propGrKeys[i];

    _p.styleKeys[ grKey ] = [ util.DEFAULT_HASH_SEED, util.DEFAULT_HASH_SEED_ALT ];
  }

  let updateGrKey1 = (val, grKey) => _p.styleKeys[ grKey ][0] = util.hashInt( val, _p.styleKeys[ grKey ][0] );
  let updateGrKey2 = (val, grKey) => _p.styleKeys[ grKey ][1] = util.hashIntAlt( val, _p.styleKeys[ grKey ][1] );

  let updateGrKey = (val, grKey) => {
    updateGrKey1(val, grKey);
    updateGrKey2(val, grKey);
  };

  let updateGrKeyWStr = (strVal, grKey) => {
    for( let j = 0; j < strVal.length; j++ ){
      let ch = strVal.charCodeAt(j);

      updateGrKey1(ch, grKey);
      updateGrKey2(ch, grKey);
    }
  };

  // - hashing works on 32 bit ints b/c we use bitwise ops
  // - small numbers get cut off (e.g. 0.123 is seen as 0 by the hashing function)
  // - raise up small numbers so more significant digits are seen by hashing
  // - make small numbers larger than a normal value to avoid collisions
  // - works in practice and it's relatively cheap
  let N = 2000000000;
  let cleanNum = val => (-128 < val && val < 128) && Math.floor(val) !== val ? N - ((val * 1024) | 0) : val;

  for( let i = 0; i < propNames.length; i++ ){
    let name = propNames[i];
    let parsedProp = overriddenStyles[ name ];

    if( parsedProp == null ){ continue; }

    let propInfo = this.properties[name];
    let type = propInfo.type;
    let grKey = propInfo.groupKey;
    let normalizedNumberVal;

    if( propInfo.hashOverride != null ){
      normalizedNumberVal = propInfo.hashOverride(ele, parsedProp);
    } else if( parsedProp.pfValue != null ){
      normalizedNumberVal = parsedProp.pfValue;
    }

    // might not be a number if it allows enums
    let numberVal = propInfo.enums == null ? parsedProp.value : null;
    let haveNormNum = normalizedNumberVal != null;
    let haveUnitedNum = numberVal != null;
    let haveNum = haveNormNum || haveUnitedNum;
    let units = parsedProp.units;

    // numbers are cheaper to hash than strings
    // 1 hash op vs n hash ops (for length n string)
    if( type.number && haveNum && !type.multiple ){
      let v = haveNormNum ? normalizedNumberVal : numberVal;

      updateGrKey(cleanNum(v), grKey);

      if( !haveNormNum && units != null ){
        updateGrKeyWStr(units, grKey);
      }
    } else {
      updateGrKeyWStr(parsedProp.strValue, grKey);
    }
  }

  // overall style key
  //

  let hash = [ util.DEFAULT_HASH_SEED, util.DEFAULT_HASH_SEED_ALT ];

  for( let i = 0; i < propGrKeys.length; i++ ){
    let grKey = propGrKeys[i];
    let grHash = _p.styleKeys[ grKey ];

    hash[0] = util.hashInt( grHash[0], hash[0] );
    hash[1] = util.hashIntAlt( grHash[1], hash[1] );
  }

  _p.styleKey = util.combineHashes(hash[0], hash[1]);

  // label dims
  //

  let sk = _p.styleKeys;
  
  _p.labelDimsKey = util.combineHashesArray(sk.labelDimensions);

  let labelKeys = propHash( ele, ['label'], sk.labelDimensions );
  
  _p.labelKey = util.combineHashesArray(labelKeys);
  _p.labelStyleKey = util.combineHashesArray(util.hashArrays(sk.commonLabel, labelKeys));

  if( !isNode ){
    let sourceLabelKeys = propHash( ele, ['source-label'], sk.labelDimensions );
    _p.sourceLabelKey = util.combineHashesArray(sourceLabelKeys);
    _p.sourceLabelStyleKey = util.combineHashesArray(util.hashArrays(sk.commonLabel, sourceLabelKeys));

    let targetLabelKeys = propHash( ele, ['target-label'], sk.labelDimensions );
    _p.targetLabelKey = util.combineHashesArray(targetLabelKeys);
    _p.targetLabelStyleKey = util.combineHashesArray(util.hashArrays(sk.commonLabel, targetLabelKeys));
  }

  // node
  //

  if( isNode ){
    let { nodeBody, nodeBorder, nodeOutline, backgroundImage, compound, pie, stripe } = _p.styleKeys;

    let nodeKeys = [ nodeBody, nodeBorder, nodeOutline, backgroundImage, compound, pie, stripe ].filter(k => k != null).reduce(util.hashArrays, [
      util.DEFAULT_HASH_SEED,
      util.DEFAULT_HASH_SEED_ALT
    ]);
    _p.nodeKey = util.combineHashesArray(nodeKeys);
    
    _p.hasPie = pie != null && pie[0] !== util.DEFAULT_HASH_SEED && pie[1] !== util.DEFAULT_HASH_SEED_ALT;

    _p.hasStripe = stripe != null && stripe[0] !== util.DEFAULT_HASH_SEED && stripe[1] !== util.DEFAULT_HASH_SEED_ALT;
  }

  return oldStyleKey !== _p.styleKey;
};

styfn.clearStyleHints = function(ele){
  let _p = ele._private;

  _p.styleCxtKey = '';
  _p.styleKeys = {};
  _p.styleKey = null;
  _p.labelKey = null;
  _p.labelStyleKey = null;
  _p.sourceLabelKey = null;
  _p.sourceLabelStyleKey = null;
  _p.targetLabelKey = null;
  _p.targetLabelStyleKey = null;
  _p.nodeKey = null;
  _p.hasPie = null;
  _p.hasStripe = null;
};

// apply a property to the style (for internal use)
// returns whether application was successful
//
// now, this function flattens the property, and here's how:
//
// for parsedProp:{ bypass: true, deleteBypass: true }
// no property is generated, instead the bypass property in the
// element's style is replaced by what's pointed to by the `bypassed`
// field in the bypass property (i.e. restoring the property the
// bypass was overriding)
//
// for parsedProp:{ mapped: truthy }
// the generated flattenedProp:{ mapping: prop }
//
// for parsedProp:{ bypass: true }
// the generated flattenedProp:{ bypassed: parsedProp }
styfn.applyParsedProperty = function( ele, parsedProp ){
  let self = this;
  let prop = parsedProp;
  let style = ele._private.style;
  let flatProp;
  let types = self.types;
  let type = self.properties[ prop.name ].type;
  let propIsBypass = prop.bypass;
  let origProp = style[ prop.name ];
  let origPropIsBypass = origProp && origProp.bypass;
  let _p = ele._private;
  let flatPropMapping = 'mapping';

  let getVal = p => {
    if( p == null ){
      return null;
    } else if( p.pfValue != null ){
      return p.pfValue;
    } else {
      return p.value;
    }
  };

  let checkTriggers = () => {
    let fromVal = getVal(origProp);
    let toVal = getVal(prop);

    self.checkTriggers( ele, prop.name, fromVal, toVal );
  };

  // edge sanity checks to prevent the client from making serious mistakes
  if(
    parsedProp.name === 'curve-style'
    && ele.isEdge()
    && (
      ( // loops must be bundled beziers
        parsedProp.value !== 'bezier'
        && ele.isLoop()
      ) || ( // edges connected to compound nodes can not be haystacks
        parsedProp.value === 'haystack'
        && ( ele.source().isParent() || ele.target().isParent() )
      )
    )
  ){
    prop = parsedProp = this.parse( parsedProp.name, 'bezier', propIsBypass );
  }

  if( prop.delete ){ // delete the property and use the default value on falsey value
    style[ prop.name ] = undefined;

    checkTriggers();

    return true;
  }

  if( prop.deleteBypassed ){ // delete the property that the
    if( !origProp ){
      checkTriggers();

      return true; // can't delete if no prop

    } else if( origProp.bypass ){ // delete bypassed
      origProp.bypassed = undefined;

      checkTriggers();

      return true;

    } else {
      return false; // we're unsuccessful deleting the bypassed
    }
  }

  // check if we need to delete the current bypass
  if( prop.deleteBypass ){ // then this property is just here to indicate we need to delete
    if( !origProp ){
      checkTriggers();

      return true; // property is already not defined

    } else if( origProp.bypass ){ // then replace the bypass property with the original
      // because the bypassed property was already applied (and therefore parsed), we can just replace it (no reapplying necessary)
      style[ prop.name ] = origProp.bypassed;

      checkTriggers();

      return true;

    } else {
      return false; // we're unsuccessful deleting the bypass
    }
  }

  let printMappingErr = function(){
    util.warn( 'Do not assign mappings to elements without corresponding data (i.e. ele `' + ele.id() + '` has no mapping for property `' + prop.name + '` with data field `' + prop.field + '`); try a `[' + prop.field + ']` selector to limit scope to elements with `' + prop.field + '` defined' );
  };

  // put the property in the style objects
  switch( prop.mapped ){ // flatten the property if mapped
  case types.mapData: {
    // flatten the field (e.g. data.foo.bar)
    let fields = prop.field.split( '.' );
    let fieldVal = _p.data;

    for( let i = 0; i < fields.length && fieldVal; i++ ){
      let field = fields[ i ];
      fieldVal = fieldVal[ field ];
    }

    if( fieldVal == null ){
      printMappingErr();
      return false;
    }

    let percent;
    if( !is.number( fieldVal ) ){ // then don't apply and fall back on the existing style
      util.warn('Do not use continuous mappers without specifying numeric data (i.e. `' + prop.field + ': ' + fieldVal + '` for `' + ele.id() + '` is non-numeric)');
      return false;
    } else {
      let fieldWidth = prop.fieldMax - prop.fieldMin;

      if( fieldWidth === 0 ){ // safety check -- not strictly necessary as no props of zero range should be passed here
        percent = 0;
      } else {
        percent = (fieldVal - prop.fieldMin) / fieldWidth;
      }
    }

    // make sure to bound percent value
    if( percent < 0 ){
      percent = 0;
    } else if( percent > 1 ){
      percent = 1;
    }

    if( type.color ){
      let r1 = prop.valueMin[0];
      let r2 = prop.valueMax[0];
      let g1 = prop.valueMin[1];
      let g2 = prop.valueMax[1];
      let b1 = prop.valueMin[2];
      let b2 = prop.valueMax[2];
      let a1 = prop.valueMin[3] == null ? 1 : prop.valueMin[3];
      let a2 = prop.valueMax[3] == null ? 1 : prop.valueMax[3];

      let clr = [
        Math.round( r1 + (r2 - r1) * percent ),
        Math.round( g1 + (g2 - g1) * percent ),
        Math.round( b1 + (b2 - b1) * percent ),
        Math.round( a1 + (a2 - a1) * percent )
      ];

      flatProp = { // colours are simple, so just create the flat property instead of expensive string parsing
        bypass: prop.bypass, // we're a bypass if the mapping property is a bypass
        name: prop.name,
        value: clr,
        strValue: 'rgb(' + clr[0] + ', ' + clr[1] + ', ' + clr[2] + ')'
      };

    } else if( type.number ){
      let calcValue = prop.valueMin + (prop.valueMax - prop.valueMin) * percent;
      flatProp = this.parse( prop.name, calcValue, prop.bypass, flatPropMapping );

    } else {
      return false; // can only map to colours and numbers
    }

    if( !flatProp ){ // if we can't flatten the property, then don't apply the property and fall back on the existing style
      printMappingErr();
      return false;
    }

    flatProp.mapping = prop; // keep a reference to the mapping
    prop = flatProp; // the flattened (mapped) property is the one we want

    break;
  }

  // direct mapping
  case types.data: {
    // flatten the field (e.g. data.foo.bar)
    let fields = prop.field.split( '.' );
    let fieldVal = _p.data;

    for( let i = 0; i < fields.length && fieldVal; i++ ){
      let field = fields[ i ];
      fieldVal = fieldVal[ field ];
    }

    if( fieldVal != null ){
      flatProp = this.parse( prop.name, fieldVal, prop.bypass, flatPropMapping );
    }

    if( !flatProp ){ // if we can't flatten the property, then don't apply and fall back on the existing style
      printMappingErr();
      return false;
    }

    flatProp.mapping = prop; // keep a reference to the mapping
    prop = flatProp; // the flattened (mapped) property is the one we want

    break;
  }

  case types.fn: {
    let fn = prop.value;
    let fnRetVal = prop.fnValue != null ? prop.fnValue : fn( ele ); // check for cached value before calling function

    prop.prevFnValue = fnRetVal;

    if( fnRetVal == null ){
      util.warn('Custom function mappers may not return null (i.e. `' + prop.name + '` for ele `' + ele.id() + '` is null)');
      return false;
    }

    flatProp = this.parse( prop.name, fnRetVal, prop.bypass, flatPropMapping );

    if( !flatProp ){
      util.warn('Custom function mappers may not return invalid values for the property type (i.e. `' + prop.name + '` for ele `' + ele.id() + '` is invalid)');
      return false;
    }

    flatProp.mapping = util.copy( prop ); // keep a reference to the mapping
    prop = flatProp; // the flattened (mapped) property is the one we want

    break;
  }

  case undefined:
    break; // just set the property

  default:
    return false; // not a valid mapping
  }

  // if the property is a bypass property, then link the resultant property to the original one
  if( propIsBypass ){
    if( origPropIsBypass ){ // then this bypass overrides the existing one
      prop.bypassed = origProp.bypassed; // steal bypassed prop from old bypass
    } else { // then link the orig prop to the new bypass
      prop.bypassed = origProp;
    }

    style[ prop.name ] = prop; // and set

  } else { // prop is not bypass
    if( origPropIsBypass ){ // then keep the orig prop (since it's a bypass) and link to the new prop
      origProp.bypassed = prop;
    } else { // then just replace the old prop with the new one
      style[ prop.name ] = prop;
    }
  }

  checkTriggers();

  return true;
};

styfn.cleanElements = function( eles, keepBypasses ){
  for( let i = 0; i < eles.length; i++ ){
    let ele = eles[i];

    this.clearStyleHints(ele);

    ele.dirtyCompoundBoundsCache();
    ele.dirtyBoundingBoxCache();

    if( !keepBypasses ){
      ele._private.style = {};
    } else {
      let style = ele._private.style;
      let propNames = Object.keys(style);

      for( let j = 0; j < propNames.length; j++ ){
        let propName = propNames[j];
        let eleProp = style[ propName ];

        if( eleProp != null ){
          if( eleProp.bypass ){
            eleProp.bypassed = null;
          } else {
            style[ propName ] = null;
          }
        }
      }
    }
  }
};

// updates the visual style for all elements (useful for manual style modification after init)
styfn.update = function(){
  let cy = this._private.cy;
  let eles = cy.mutableElements();

  eles.updateStyle();
};

// diffProps : { name => { prev, next } }
styfn.updateTransitions = function( ele, diffProps ){
  let self = this;
  let _p = ele._private;
  let props = ele.pstyle( 'transition-property' ).value;
  let duration = ele.pstyle( 'transition-duration' ).pfValue;
  let delay = ele.pstyle( 'transition-delay' ).pfValue;

  if( props.length > 0 && duration > 0 ){

    let style = {};

    // build up the style to animate towards
    let anyPrev = false;
    for( let i = 0; i < props.length; i++ ){
      let prop = props[ i ];
      let styProp = ele.pstyle( prop );
      let diffProp = diffProps[ prop ];

      if( !diffProp ){ continue; }

      let prevProp = diffProp.prev;
      let fromProp = prevProp;
      let toProp = diffProp.next != null ? diffProp.next : styProp;
      let diff = false;
      let initVal;
      let initDt = 0.000001; // delta time % value for initVal (allows animating out of init zero opacity)

      if( !fromProp ){ continue; }

      // consider px values
      if( is.number( fromProp.pfValue ) && is.number( toProp.pfValue ) ){
        diff = toProp.pfValue - fromProp.pfValue; // nonzero is truthy
        initVal = fromProp.pfValue + initDt * diff;

      // consider numerical values
      } else if( is.number( fromProp.value ) && is.number( toProp.value ) ){
        diff = toProp.value - fromProp.value; // nonzero is truthy
        initVal = fromProp.value + initDt * diff;

      // consider colour values
      } else if( is.array( fromProp.value ) && is.array( toProp.value ) ){
        diff = fromProp.value[0] !== toProp.value[0]
          || fromProp.value[1] !== toProp.value[1]
          || fromProp.value[2] !== toProp.value[2]
        ;

        initVal = fromProp.strValue;
      }

      // the previous value is good for an animation only if it's different
      if( diff ){
        style[ prop ] = toProp.strValue; // to val
        this.applyBypass( ele, prop, initVal ); // from val
        anyPrev = true;
      }

    } // end if props allow ani

    // can't transition if there's nothing previous to transition from
    if( !anyPrev ){ return; }

    _p.transitioning = true;

    ( new Promise(function( resolve ){
      if( delay > 0 ){
        ele.delayAnimation( delay ).play().promise().then( resolve );
      } else {
        resolve();
      }
    }) ).then(function(){
      return ele.animation( {
        style: style,
        duration: duration,
        easing: ele.pstyle( 'transition-timing-function' ).value,
        queue: false
      } ).play().promise();
    }).then(function(){
      // if( !isBypass ){
        self.removeBypasses( ele, props );
        ele.emitAndNotify('style');
      // }

      _p.transitioning = false;
    });

  } else if( _p.transitioning ){
    this.removeBypasses( ele, props );
    ele.emitAndNotify('style');

    _p.transitioning = false;
  }
};

styfn.checkTrigger = function( ele, name, fromValue, toValue, getTrigger, onTrigger ){
  let prop = this.properties[ name ];
  let triggerCheck = getTrigger( prop );

  if (ele.removed()) { return; }

  if( triggerCheck != null && triggerCheck( fromValue, toValue, ele ) ){
    onTrigger(prop);
  }
};

styfn.checkZOrderTrigger = function( ele, name, fromValue, toValue ){
  this.checkTrigger( ele, name, fromValue, toValue, prop => prop.triggersZOrder, () => {
    this._private.cy.notify('zorder', ele);
  });
};

styfn.checkBoundsTrigger = function( ele, name, fromValue, toValue ){
  this.checkTrigger( ele, name, fromValue, toValue, prop => prop.triggersBounds, prop => {
    ele.dirtyCompoundBoundsCache();
    ele.dirtyBoundingBoxCache();
  });
};

styfn.checkConnectedEdgesBoundsTrigger = function( ele, name, fromValue, toValue ){
  this.checkTrigger( ele, name, fromValue, toValue, prop => prop.triggersBoundsOfConnectedEdges, prop => {
    ele.connectedEdges().forEach(edge => {
      edge.dirtyBoundingBoxCache();
    });
  });
};

styfn.checkParallelEdgesBoundsTrigger = function( ele, name, fromValue, toValue ){
  this.checkTrigger( ele, name, fromValue, toValue, prop => prop.triggersBoundsOfParallelEdges, prop => {
    ele.parallelEdges().forEach(pllEdge => {
      pllEdge.dirtyBoundingBoxCache();
    });
  });
};

styfn.checkTriggers = function( ele, name, fromValue, toValue ){
  ele.dirtyStyleCache();

  this.checkZOrderTrigger( ele, name, fromValue, toValue );
  this.checkBoundsTrigger( ele, name, fromValue, toValue );
  this.checkConnectedEdgesBoundsTrigger( ele, name, fromValue, toValue );
  this.checkParallelEdgesBoundsTrigger( ele, name, fromValue, toValue );
};

export default styfn;
