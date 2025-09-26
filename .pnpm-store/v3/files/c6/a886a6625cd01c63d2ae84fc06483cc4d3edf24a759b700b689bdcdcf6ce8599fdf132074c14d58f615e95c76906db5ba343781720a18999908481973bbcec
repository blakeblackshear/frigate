import * as is from '../../is.mjs';
import { defaults } from '../../util/index.mjs';

const hierholzerDefaults = defaults({
  root: undefined,
  directed: false
});

let elesfn = ({
  hierholzer: function( options ){
    if (!is.plainObject(options)) {
      let args = arguments;
      options = { root: args[0],   directed: args[1] };
    }
    let { root, directed } = hierholzerDefaults(options);
    let eles = this;
    let dflag = false;
    let oddIn;
    let oddOut;
    let startVertex;
    if (root) startVertex = is.string(root) ? this.filter(root)[0].id() : root[0].id();
    let nodes = {};
    let edges = {};

    if (directed) {
      eles.forEach(function(ele){
        let id = ele.id();
        if(ele.isNode()) {
          let ind = ele.indegree(true);
          let outd = ele.outdegree(true);
          let d1 = ind - outd;
          let d2 = outd - ind;
          if (d1 == 1) {
            if (oddIn) dflag = true;
            else oddIn = id;
          } else if (d2 == 1) {
            if (oddOut) dflag = true;
            else oddOut = id;
          } else if ((d2 > 1) || (d1 > 1)) {
            dflag = true;
          }
          nodes[id] = [];
          ele.outgoers().forEach(e => {
            if (e.isEdge()) nodes[id].push(e.id());
          });
        } else {
          edges[id] = [undefined, ele.target().id()];
        }
      });
    } else {
      eles.forEach(function(ele){
        let id = ele.id();
        if(ele.isNode()) {
          let d = ele.degree(true);
          if (d%2) {
            if (!oddIn) oddIn = id;
            else if (!oddOut) oddOut = id;
            else dflag = true;
          }
          nodes[id] = [];
          ele.connectedEdges().forEach(e => nodes[id].push(e.id()));
        } else {
          edges[id] = [ele.source().id(), ele.target().id()];
        }
      });
    }

    let result = {
      found: false,
      trail: undefined
    };

    if (dflag) return result;
    else if (oddOut && oddIn) {
      if (directed) {
        if (startVertex && (oddOut != startVertex)) {
          return result;
        }
        startVertex = oddOut;
      } else {
        if (startVertex && (oddOut != startVertex) && (oddIn != startVertex)) {
          return result;
        } else if (!startVertex) {
          startVertex = oddOut;
        }
      }
    } else {
      if (!startVertex) startVertex = eles[0].id();
    }

    const walk = (v) => {
      let currentNode = v;
      let subtour = [v];
      let adj, adjTail, adjHead;
      while (nodes[currentNode].length) {
        adj = nodes[currentNode].shift();
        adjTail = edges[adj][0];
        adjHead = edges[adj][1];
        if (currentNode != adjHead) {
          nodes[adjHead] = nodes[adjHead].filter(e => e != adj);
          currentNode = adjHead;
        } else if (!directed && (currentNode != adjTail)) {
          nodes[adjTail] = nodes[adjTail].filter(e => e != adj);
          currentNode = adjTail;
        }
        subtour.unshift(adj);
        subtour.unshift(currentNode);
      }
      return subtour;
    };

    let trail = [];
    let subtour = [];
    subtour = walk(startVertex);
    while (subtour.length != 1) {
      if (nodes[subtour[0]].length == 0) {
        trail.unshift(eles.getElementById(subtour.shift()));
        trail.unshift(eles.getElementById(subtour.shift()));
      } else {
        subtour = walk(subtour.shift()).concat(subtour);
      }
    }
    trail.unshift(eles.getElementById(subtour.shift())); // final node

    for (let d in nodes) {
      if (nodes[d].length) {
        return result;
      }
    }
    result.found = true;
    result.trail = this.spawn( trail, true );
    return result;
  },
});

export default elesfn;
