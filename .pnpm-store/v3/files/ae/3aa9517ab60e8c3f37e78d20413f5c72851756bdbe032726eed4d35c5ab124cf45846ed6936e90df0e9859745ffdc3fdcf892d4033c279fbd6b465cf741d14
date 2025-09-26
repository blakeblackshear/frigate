let elesfn = ({
  isNode: function(){
    return this.group() === 'nodes';
  },

  isEdge: function(){
    return this.group() === 'edges';
  },

  isLoop: function(){
    return this.isEdge() && this.source()[0] === this.target()[0];
  },

  isSimple: function(){
    return this.isEdge() && this.source()[0] !== this.target()[0];
  },

  group: function(){
    let ele = this[0];

    if( ele ){
      return ele._private.group;
    }
  }
});


export default elesfn;
