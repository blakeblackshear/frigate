/*!
Event object based on jQuery events, MIT license

https://jquery.org/license/
https://tldrlegal.com/license/mit-license
https://github.com/jquery/jquery/blob/master/src/event.js
*/

let Event = function( src, props ){
  this.recycle( src, props );
};

function returnFalse(){
  return false;
}

function returnTrue(){
  return true;
}

// http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
Event.prototype = {
  instanceString: function(){
    return 'event';
  },

  recycle: function( src, props ){
    this.isImmediatePropagationStopped = this.isPropagationStopped = this.isDefaultPrevented = returnFalse;

    if( src != null && src.preventDefault ){ // Browser Event object
      this.type = src.type;

      // Events bubbling up the document may have been marked as prevented
      // by a handler lower down the tree; reflect the correct value.
      this.isDefaultPrevented = ( src.defaultPrevented ) ? returnTrue : returnFalse;

    } else if( src != null && src.type ){ // Plain object containing all event details
      props = src;

    } else { // Event string
      this.type = src;
    }

    // Put explicitly provided properties onto the event object
    if( props != null ){
      // more efficient to manually copy fields we use
      this.originalEvent = props.originalEvent;
      this.type = props.type != null ? props.type : this.type;
      this.cy = props.cy;
      this.target = props.target;
      this.position = props.position;
      this.renderedPosition = props.renderedPosition;
      this.namespace = props.namespace;
      this.layout = props.layout;
    }

    if( this.cy != null && this.position != null && this.renderedPosition == null ){
      // create a rendered position based on the passed position
      let pos = this.position;
      let zoom = this.cy.zoom();
      let pan = this.cy.pan();

      this.renderedPosition = {
        x: pos.x * zoom + pan.x,
        y: pos.y * zoom + pan.y
      };
    }

    // Create a timestamp if incoming event doesn't have one
    this.timeStamp = src && src.timeStamp || Date.now();
  },

  preventDefault: function(){
    this.isDefaultPrevented = returnTrue;

    let e = this.originalEvent;
    if( !e ){
      return;
    }

    // if preventDefault exists run it on the original event
    if( e.preventDefault ){
      e.preventDefault();
    }
  },

  stopPropagation: function(){
    this.isPropagationStopped = returnTrue;

    let e = this.originalEvent;
    if( !e ){
      return;
    }

    // if stopPropagation exists run it on the original event
    if( e.stopPropagation ){
      e.stopPropagation();
    }
  },

  stopImmediatePropagation: function(){
    this.isImmediatePropagationStopped = returnTrue;
    this.stopPropagation();
  },

  isDefaultPrevented: returnFalse,
  isPropagationStopped: returnFalse,
  isImmediatePropagationStopped: returnFalse
};

export default Event;
