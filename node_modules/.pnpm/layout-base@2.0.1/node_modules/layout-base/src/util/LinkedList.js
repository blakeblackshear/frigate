const nodeFrom = value => ({ value, next: null, prev: null });

const add = ( prev, node, next, list ) => {
  if( prev !== null ){
    prev.next = node;
  } else {
    list.head = node;
  }

  if( next !== null ){
    next.prev = node;
  } else {
    list.tail = node;
  }

  node.prev = prev;
  node.next = next;

  list.length++;

  return node;
};

const remove = ( node, list ) => {
  let { prev, next } = node;

  if( prev !== null ){
    prev.next = next;
  } else {
    list.head = next;
  }

  if( next !== null ){
    next.prev = prev;
  } else {
    list.tail = prev;
  }

  node.prev = node.next = null;

  list.length--;

  return node;
};

class LinkedList {
  constructor( vals ){
    this.length = 0;
    this.head = null;
    this.tail = null;

    if( vals != null ){
      vals.forEach( v => this.push(v) );
    }
  }

  size(){
    return this.length;
  }

  insertBefore( val, otherNode ){
    return add( otherNode.prev, nodeFrom(val), otherNode, this );
  }

  insertAfter( val, otherNode ){
    return add( otherNode, nodeFrom(val), otherNode.next, this );
  }

  insertNodeBefore( newNode, otherNode ){
    return add( otherNode.prev, newNode, otherNode, this );
  }

  insertNodeAfter( newNode, otherNode ){
    return add( otherNode, newNode, otherNode.next, this );
  }

  push( val ){
    return add( this.tail, nodeFrom(val), null, this );
  }

  unshift( val ){
    return add( null, nodeFrom(val), this.head, this );
  }

  remove( node ){
    return remove( node, this );
  }

  pop(){
    return remove( this.tail, this ).value;
  }

  popNode(){
     return remove( this.tail, this );
  }

  shift(){
    return remove( this.head, this ).value;
  }

  shiftNode(){
    return remove( this.head, this );
  }

  get_object_at( index ){
    if(index <= this.length()){
      var i = 1;
      var current = this.head;
      while(i < index){
        current = current.next;
        i++;
      }
      return current.value;
    }
  }

  set_object_at( index, value){
    if(index <= this.length()) {
      var i = 1;
      var current = this.head;
      while (i < index) {
        current = current.next;
        i++;
      }
      current.value = value;
    }
  }
}

module.exports = LinkedList;
