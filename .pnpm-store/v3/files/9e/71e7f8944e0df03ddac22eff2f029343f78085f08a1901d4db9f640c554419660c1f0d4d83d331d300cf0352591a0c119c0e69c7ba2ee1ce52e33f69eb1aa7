import Set from '../set.mjs';
import * as is from '../is.mjs';

let elesfn = ({
  classes: function( classes ){
    let self = this;

    if( classes === undefined ){
      let ret = [];

      self[0]._private.classes.forEach(cls => ret.push(cls));

      return ret;
    } else if( !is.array( classes ) ){
      // extract classes from string
      classes = ( classes || '' ).match( /\S+/g ) || [];
    }

    let changed = [];
    let classesSet = new Set( classes );

    // check and update each ele
    for( let j = 0; j < self.length; j++ ){
      let ele = self[ j ];
      let _p = ele._private;
      let eleClasses = _p.classes;
      let changedEle = false;

      // check if ele has all of the passed classes
      for( let i = 0; i < classes.length; i++ ){
        let cls = classes[i];
        let eleHasClass = eleClasses.has(cls);

        if( !eleHasClass ){
          changedEle = true;
          break;
        }
      }

      // check if ele has classes outside of those passed
      if( !changedEle ){
        changedEle = eleClasses.size !== classes.length;
      }

      if( changedEle ){
        _p.classes = classesSet;

        changed.push( ele );
      }
    }

    // trigger update style on those eles that had class changes
    if( changed.length > 0 ){
      this.spawn( changed )
        .updateStyle()
        .emit( 'class' )
      ;
    }

    return self;
  },

  addClass: function( classes ){
    return this.toggleClass( classes, true );
  },

  hasClass: function( className ){
    let ele = this[0];
    return ( ele != null && ele._private.classes.has(className) );
  },

  toggleClass: function( classes, toggle ){
    if( !is.array( classes ) ){
      // extract classes from string
      classes = classes.match( /\S+/g ) || [];
    }
    let self = this;
    let toggleUndefd = toggle === undefined;
    let changed = []; // eles who had classes changed

    for( let i = 0, il = self.length; i < il; i++ ){
      let ele = self[ i ];
      let eleClasses = ele._private.classes;
      let changedEle = false;

      for( let j = 0; j < classes.length; j++ ){
        let cls = classes[ j ];
        let hasClass = eleClasses.has(cls);
        let changedNow = false;

        if( toggle || (toggleUndefd && !hasClass) ){
          eleClasses.add(cls);
          changedNow = true;
        } else if( !toggle || (toggleUndefd && hasClass) ){
          eleClasses.delete(cls);
          changedNow = true;
        }

        if( !changedEle && changedNow ){
          changed.push( ele );
          changedEle = true;
        }

      } // for j classes
    } // for i eles

    // trigger update style on those eles that had class changes
    if( changed.length > 0 ){
      this.spawn( changed )
        .updateStyle()
        .emit( 'class' )
      ;
    }

    return self;
  },

  removeClass: function( classes ){
    return this.toggleClass( classes, false );
  },

  flashClass: function( classes, duration ){
    let self = this;

    if( duration == null ){
      duration = 250;
    } else if( duration === 0 ){
      return self; // nothing to do really
    }

    self.addClass( classes );
    setTimeout( function(){
      self.removeClass( classes );
    }, duration );

    return self;
  }
});

elesfn.className = elesfn.classNames = elesfn.classes;

export default elesfn;
