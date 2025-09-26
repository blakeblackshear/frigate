import * as util from '../util/index.mjs';

export const stateSelectors = [
  {
    selector: ':selected',
    matches: function( ele ){ return ele.selected(); }
  },
  {
    selector: ':unselected',
    matches: function( ele ){ return !ele.selected(); }
  },
  {
    selector: ':selectable',
    matches: function( ele ){ return ele.selectable(); }
  },
  {
    selector: ':unselectable',
    matches: function( ele ){ return !ele.selectable(); }
  },
  {
    selector: ':locked',
    matches: function( ele ){ return ele.locked(); }
  },
  {
    selector: ':unlocked',
    matches: function( ele ){ return !ele.locked(); }
  },
  {
    selector: ':visible',
    matches: function( ele ){ return ele.visible(); }
  },
  {
    selector: ':hidden',
    matches: function( ele ){ return !ele.visible(); }
  },
  {
    selector: ':transparent',
    matches: function( ele ){ return ele.transparent(); }
  },
  {
    selector: ':grabbed',
    matches: function( ele ){ return ele.grabbed(); }
  },
  {
    selector: ':free',
    matches: function( ele ){ return !ele.grabbed(); }
  },
  {
    selector: ':removed',
    matches: function( ele ){ return ele.removed(); }
  },
  {
    selector: ':inside',
    matches: function( ele ){ return !ele.removed(); }
  },
  {
    selector: ':grabbable',
    matches: function( ele ){ return ele.grabbable(); }
  },
  {
    selector: ':ungrabbable',
    matches: function( ele ){ return !ele.grabbable(); }
  },
  {
    selector: ':animated',
    matches: function( ele ){ return ele.animated(); }
  },
  {
    selector: ':unanimated',
    matches: function( ele ){ return !ele.animated(); }
  },
  {
    selector: ':parent',
    matches: function( ele ){ return ele.isParent(); }
  },
  {
    selector: ':childless',
    matches: function( ele ){ return ele.isChildless(); }
  },
  {
    selector: ':child',
    matches: function( ele ){ return ele.isChild(); }
  },
  {
    selector: ':orphan',
    matches: function( ele ){ return ele.isOrphan(); }
  },
  {
    selector: ':nonorphan',
    matches: function( ele ){ return ele.isChild(); }
  },
  {
    selector: ':compound',
    matches: function( ele ){
      if( ele.isNode() ){
        return ele.isParent();
      } else {
        return ele.source().isParent() || ele.target().isParent();
      }
    }
  },
  {
    selector: ':loop',
    matches: function( ele ){ return ele.isLoop(); }
  },
  {
    selector: ':simple',
    matches: function( ele ){ return ele.isSimple(); }
  },
  {
    selector: ':active',
    matches: function( ele ){ return ele.active(); }
  },
  {
    selector: ':inactive',
    matches: function( ele ){ return !ele.active(); }
  },
  {
    selector: ':backgrounding',
    matches: function( ele ){ return ele.backgrounding(); }
  },
  {
    selector: ':nonbackgrounding',
    matches: function( ele ){ return !ele.backgrounding(); }
  }
].sort(function( a, b ){ // n.b. selectors that are starting substrings of others must have the longer ones first
  return util.sort.descending( a.selector, b.selector );
});

let lookup = (function(){
  let selToFn = {};
  let s;

  for( let i = 0; i < stateSelectors.length; i++ ){
    s = stateSelectors[i];

    selToFn[ s.selector ] = s.matches;
  }

  return selToFn;
})();

export const stateSelectorMatches = function( sel, ele ){
  return lookup[ sel ]( ele );
};

export const stateSelectorRegex = '(' + stateSelectors.map(s => s.selector).join('|') + ')';
