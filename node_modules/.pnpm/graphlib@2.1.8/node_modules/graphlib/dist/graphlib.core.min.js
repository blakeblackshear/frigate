(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.graphlib=f()}})(function(){var define,module,exports;return function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r}()({1:[function(require,module,exports){
/**
 * Copyright (c) 2014, Chris Pettitt
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors
 * may be used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
var lib=require("./lib");module.exports={Graph:lib.Graph,json:require("./lib/json"),alg:require("./lib/alg"),version:lib.version}},{"./lib":17,"./lib/alg":8,"./lib/json":18}],2:[function(require,module,exports){var _=require("../lodash");module.exports=components;function components(g){var visited={};var cmpts=[];var cmpt;function dfs(v){if(_.has(visited,v))return;visited[v]=true;cmpt.push(v);_.each(g.successors(v),dfs);_.each(g.predecessors(v),dfs)}_.each(g.nodes(),function(v){cmpt=[];dfs(v);if(cmpt.length){cmpts.push(cmpt)}});return cmpts}},{"../lodash":19}],3:[function(require,module,exports){var _=require("../lodash");module.exports=dfs;
/*
 * A helper that preforms a pre- or post-order traversal on the input graph
 * and returns the nodes in the order they were visited. If the graph is
 * undirected then this algorithm will navigate using neighbors. If the graph
 * is directed then this algorithm will navigate using successors.
 *
 * Order must be one of "pre" or "post".
 */function dfs(g,vs,order){if(!_.isArray(vs)){vs=[vs]}var navigation=(g.isDirected()?g.successors:g.neighbors).bind(g);var acc=[];var visited={};_.each(vs,function(v){if(!g.hasNode(v)){throw new Error("Graph does not have node: "+v)}doDfs(g,v,order==="post",visited,navigation,acc)});return acc}function doDfs(g,v,postorder,visited,navigation,acc){if(!_.has(visited,v)){visited[v]=true;if(!postorder){acc.push(v)}_.each(navigation(v),function(w){doDfs(g,w,postorder,visited,navigation,acc)});if(postorder){acc.push(v)}}}},{"../lodash":19}],4:[function(require,module,exports){var dijkstra=require("./dijkstra");var _=require("../lodash");module.exports=dijkstraAll;function dijkstraAll(g,weightFunc,edgeFunc){return _.transform(g.nodes(),function(acc,v){acc[v]=dijkstra(g,v,weightFunc,edgeFunc)},{})}},{"../lodash":19,"./dijkstra":5}],5:[function(require,module,exports){var _=require("../lodash");var PriorityQueue=require("../data/priority-queue");module.exports=dijkstra;var DEFAULT_WEIGHT_FUNC=_.constant(1);function dijkstra(g,source,weightFn,edgeFn){return runDijkstra(g,String(source),weightFn||DEFAULT_WEIGHT_FUNC,edgeFn||function(v){return g.outEdges(v)})}function runDijkstra(g,source,weightFn,edgeFn){var results={};var pq=new PriorityQueue;var v,vEntry;var updateNeighbors=function(edge){var w=edge.v!==v?edge.v:edge.w;var wEntry=results[w];var weight=weightFn(edge);var distance=vEntry.distance+weight;if(weight<0){throw new Error("dijkstra does not allow negative edge weights. "+"Bad edge: "+edge+" Weight: "+weight)}if(distance<wEntry.distance){wEntry.distance=distance;wEntry.predecessor=v;pq.decrease(w,distance)}};g.nodes().forEach(function(v){var distance=v===source?0:Number.POSITIVE_INFINITY;results[v]={distance:distance};pq.add(v,distance)});while(pq.size()>0){v=pq.removeMin();vEntry=results[v];if(vEntry.distance===Number.POSITIVE_INFINITY){break}edgeFn(v).forEach(updateNeighbors)}return results}},{"../data/priority-queue":15,"../lodash":19}],6:[function(require,module,exports){var _=require("../lodash");var tarjan=require("./tarjan");module.exports=findCycles;function findCycles(g){return _.filter(tarjan(g),function(cmpt){return cmpt.length>1||cmpt.length===1&&g.hasEdge(cmpt[0],cmpt[0])})}},{"../lodash":19,"./tarjan":13}],7:[function(require,module,exports){var _=require("../lodash");module.exports=floydWarshall;var DEFAULT_WEIGHT_FUNC=_.constant(1);function floydWarshall(g,weightFn,edgeFn){return runFloydWarshall(g,weightFn||DEFAULT_WEIGHT_FUNC,edgeFn||function(v){return g.outEdges(v)})}function runFloydWarshall(g,weightFn,edgeFn){var results={};var nodes=g.nodes();nodes.forEach(function(v){results[v]={};results[v][v]={distance:0};nodes.forEach(function(w){if(v!==w){results[v][w]={distance:Number.POSITIVE_INFINITY}}});edgeFn(v).forEach(function(edge){var w=edge.v===v?edge.w:edge.v;var d=weightFn(edge);results[v][w]={distance:d,predecessor:v}})});nodes.forEach(function(k){var rowK=results[k];nodes.forEach(function(i){var rowI=results[i];nodes.forEach(function(j){var ik=rowI[k];var kj=rowK[j];var ij=rowI[j];var altDistance=ik.distance+kj.distance;if(altDistance<ij.distance){ij.distance=altDistance;ij.predecessor=kj.predecessor}})})});return results}},{"../lodash":19}],8:[function(require,module,exports){module.exports={components:require("./components"),dijkstra:require("./dijkstra"),dijkstraAll:require("./dijkstra-all"),findCycles:require("./find-cycles"),floydWarshall:require("./floyd-warshall"),isAcyclic:require("./is-acyclic"),postorder:require("./postorder"),preorder:require("./preorder"),prim:require("./prim"),tarjan:require("./tarjan"),topsort:require("./topsort")}},{"./components":2,"./dijkstra":5,"./dijkstra-all":4,"./find-cycles":6,"./floyd-warshall":7,"./is-acyclic":9,"./postorder":10,"./preorder":11,"./prim":12,"./tarjan":13,"./topsort":14}],9:[function(require,module,exports){var topsort=require("./topsort");module.exports=isAcyclic;function isAcyclic(g){try{topsort(g)}catch(e){if(e instanceof topsort.CycleException){return false}throw e}return true}},{"./topsort":14}],10:[function(require,module,exports){var dfs=require("./dfs");module.exports=postorder;function postorder(g,vs){return dfs(g,vs,"post")}},{"./dfs":3}],11:[function(require,module,exports){var dfs=require("./dfs");module.exports=preorder;function preorder(g,vs){return dfs(g,vs,"pre")}},{"./dfs":3}],12:[function(require,module,exports){var _=require("../lodash");var Graph=require("../graph");var PriorityQueue=require("../data/priority-queue");module.exports=prim;function prim(g,weightFunc){var result=new Graph;var parents={};var pq=new PriorityQueue;var v;function updateNeighbors(edge){var w=edge.v===v?edge.w:edge.v;var pri=pq.priority(w);if(pri!==undefined){var edgeWeight=weightFunc(edge);if(edgeWeight<pri){parents[w]=v;pq.decrease(w,edgeWeight)}}}if(g.nodeCount()===0){return result}_.each(g.nodes(),function(v){pq.add(v,Number.POSITIVE_INFINITY);result.setNode(v)});
// Start from an arbitrary node
pq.decrease(g.nodes()[0],0);var init=false;while(pq.size()>0){v=pq.removeMin();if(_.has(parents,v)){result.setEdge(v,parents[v])}else if(init){throw new Error("Input graph is not connected: "+g)}else{init=true}g.nodeEdges(v).forEach(updateNeighbors)}return result}},{"../data/priority-queue":15,"../graph":16,"../lodash":19}],13:[function(require,module,exports){var _=require("../lodash");module.exports=tarjan;function tarjan(g){var index=0;var stack=[];var visited={};// node id -> { onStack, lowlink, index }
var results=[];function dfs(v){var entry=visited[v]={onStack:true,lowlink:index,index:index++};stack.push(v);g.successors(v).forEach(function(w){if(!_.has(visited,w)){dfs(w);entry.lowlink=Math.min(entry.lowlink,visited[w].lowlink)}else if(visited[w].onStack){entry.lowlink=Math.min(entry.lowlink,visited[w].index)}});if(entry.lowlink===entry.index){var cmpt=[];var w;do{w=stack.pop();visited[w].onStack=false;cmpt.push(w)}while(v!==w);results.push(cmpt)}}g.nodes().forEach(function(v){if(!_.has(visited,v)){dfs(v)}});return results}},{"../lodash":19}],14:[function(require,module,exports){var _=require("../lodash");module.exports=topsort;topsort.CycleException=CycleException;function topsort(g){var visited={};var stack={};var results=[];function visit(node){if(_.has(stack,node)){throw new CycleException}if(!_.has(visited,node)){stack[node]=true;visited[node]=true;_.each(g.predecessors(node),visit);delete stack[node];results.push(node)}}_.each(g.sinks(),visit);if(_.size(visited)!==g.nodeCount()){throw new CycleException}return results}function CycleException(){}CycleException.prototype=new Error;// must be an instance of Error to pass testing
},{"../lodash":19}],15:[function(require,module,exports){var _=require("../lodash");module.exports=PriorityQueue;
/**
 * A min-priority queue data structure. This algorithm is derived from Cormen,
 * et al., "Introduction to Algorithms". The basic idea of a min-priority
 * queue is that you can efficiently (in O(1) time) get the smallest key in
 * the queue. Adding and removing elements takes O(log n) time. A key can
 * have its priority decreased in O(log n) time.
 */function PriorityQueue(){this._arr=[];this._keyIndices={}}
/**
 * Returns the number of elements in the queue. Takes `O(1)` time.
 */PriorityQueue.prototype.size=function(){return this._arr.length};
/**
 * Returns the keys that are in the queue. Takes `O(n)` time.
 */PriorityQueue.prototype.keys=function(){return this._arr.map(function(x){return x.key})};
/**
 * Returns `true` if **key** is in the queue and `false` if not.
 */PriorityQueue.prototype.has=function(key){return _.has(this._keyIndices,key)};
/**
 * Returns the priority for **key**. If **key** is not present in the queue
 * then this function returns `undefined`. Takes `O(1)` time.
 *
 * @param {Object} key
 */PriorityQueue.prototype.priority=function(key){var index=this._keyIndices[key];if(index!==undefined){return this._arr[index].priority}};
/**
 * Returns the key for the minimum element in this queue. If the queue is
 * empty this function throws an Error. Takes `O(1)` time.
 */PriorityQueue.prototype.min=function(){if(this.size()===0){throw new Error("Queue underflow")}return this._arr[0].key};
/**
 * Inserts a new key into the priority queue. If the key already exists in
 * the queue this function returns `false`; otherwise it will return `true`.
 * Takes `O(n)` time.
 *
 * @param {Object} key the key to add
 * @param {Number} priority the initial priority for the key
 */PriorityQueue.prototype.add=function(key,priority){var keyIndices=this._keyIndices;key=String(key);if(!_.has(keyIndices,key)){var arr=this._arr;var index=arr.length;keyIndices[key]=index;arr.push({key:key,priority:priority});this._decrease(index);return true}return false};
/**
 * Removes and returns the smallest key in the queue. Takes `O(log n)` time.
 */PriorityQueue.prototype.removeMin=function(){this._swap(0,this._arr.length-1);var min=this._arr.pop();delete this._keyIndices[min.key];this._heapify(0);return min.key};
/**
 * Decreases the priority for **key** to **priority**. If the new priority is
 * greater than the previous priority, this function will throw an Error.
 *
 * @param {Object} key the key for which to raise priority
 * @param {Number} priority the new priority for the key
 */PriorityQueue.prototype.decrease=function(key,priority){var index=this._keyIndices[key];if(priority>this._arr[index].priority){throw new Error("New priority is greater than current priority. "+"Key: "+key+" Old: "+this._arr[index].priority+" New: "+priority)}this._arr[index].priority=priority;this._decrease(index)};PriorityQueue.prototype._heapify=function(i){var arr=this._arr;var l=2*i;var r=l+1;var largest=i;if(l<arr.length){largest=arr[l].priority<arr[largest].priority?l:largest;if(r<arr.length){largest=arr[r].priority<arr[largest].priority?r:largest}if(largest!==i){this._swap(i,largest);this._heapify(largest)}}};PriorityQueue.prototype._decrease=function(index){var arr=this._arr;var priority=arr[index].priority;var parent;while(index!==0){parent=index>>1;if(arr[parent].priority<priority){break}this._swap(index,parent);index=parent}};PriorityQueue.prototype._swap=function(i,j){var arr=this._arr;var keyIndices=this._keyIndices;var origArrI=arr[i];var origArrJ=arr[j];arr[i]=origArrJ;arr[j]=origArrI;keyIndices[origArrJ.key]=i;keyIndices[origArrI.key]=j}},{"../lodash":19}],16:[function(require,module,exports){"use strict";var _=require("./lodash");module.exports=Graph;var DEFAULT_EDGE_NAME="\0";var GRAPH_NODE="\0";var EDGE_KEY_DELIM="";
// Implementation notes:
//
//  * Node id query functions should return string ids for the nodes
//  * Edge id query functions should return an "edgeObj", edge object, that is
//    composed of enough information to uniquely identify an edge: {v, w, name}.
//  * Internally we use an "edgeId", a stringified form of the edgeObj, to
//    reference edges. This is because we need a performant way to look these
//    edges up and, object properties, which have string keys, are the closest
//    we're going to get to a performant hashtable in JavaScript.
function Graph(opts){this._isDirected=_.has(opts,"directed")?opts.directed:true;this._isMultigraph=_.has(opts,"multigraph")?opts.multigraph:false;this._isCompound=_.has(opts,"compound")?opts.compound:false;
// Label for the graph itself
this._label=undefined;
// Defaults to be set when creating a new node
this._defaultNodeLabelFn=_.constant(undefined);
// Defaults to be set when creating a new edge
this._defaultEdgeLabelFn=_.constant(undefined);
// v -> label
this._nodes={};if(this._isCompound){
// v -> parent
this._parent={};
// v -> children
this._children={};this._children[GRAPH_NODE]={}}
// v -> edgeObj
this._in={};
// u -> v -> Number
this._preds={};
// v -> edgeObj
this._out={};
// v -> w -> Number
this._sucs={};
// e -> edgeObj
this._edgeObjs={};
// e -> label
this._edgeLabels={}}
/* Number of nodes in the graph. Should only be changed by the implementation. */Graph.prototype._nodeCount=0;
/* Number of edges in the graph. Should only be changed by the implementation. */Graph.prototype._edgeCount=0;
/* === Graph functions ========= */Graph.prototype.isDirected=function(){return this._isDirected};Graph.prototype.isMultigraph=function(){return this._isMultigraph};Graph.prototype.isCompound=function(){return this._isCompound};Graph.prototype.setGraph=function(label){this._label=label;return this};Graph.prototype.graph=function(){return this._label};
/* === Node functions ========== */Graph.prototype.setDefaultNodeLabel=function(newDefault){if(!_.isFunction(newDefault)){newDefault=_.constant(newDefault)}this._defaultNodeLabelFn=newDefault;return this};Graph.prototype.nodeCount=function(){return this._nodeCount};Graph.prototype.nodes=function(){return _.keys(this._nodes)};Graph.prototype.sources=function(){var self=this;return _.filter(this.nodes(),function(v){return _.isEmpty(self._in[v])})};Graph.prototype.sinks=function(){var self=this;return _.filter(this.nodes(),function(v){return _.isEmpty(self._out[v])})};Graph.prototype.setNodes=function(vs,value){var args=arguments;var self=this;_.each(vs,function(v){if(args.length>1){self.setNode(v,value)}else{self.setNode(v)}});return this};Graph.prototype.setNode=function(v,value){if(_.has(this._nodes,v)){if(arguments.length>1){this._nodes[v]=value}return this}this._nodes[v]=arguments.length>1?value:this._defaultNodeLabelFn(v);if(this._isCompound){this._parent[v]=GRAPH_NODE;this._children[v]={};this._children[GRAPH_NODE][v]=true}this._in[v]={};this._preds[v]={};this._out[v]={};this._sucs[v]={};++this._nodeCount;return this};Graph.prototype.node=function(v){return this._nodes[v]};Graph.prototype.hasNode=function(v){return _.has(this._nodes,v)};Graph.prototype.removeNode=function(v){var self=this;if(_.has(this._nodes,v)){var removeEdge=function(e){self.removeEdge(self._edgeObjs[e])};delete this._nodes[v];if(this._isCompound){this._removeFromParentsChildList(v);delete this._parent[v];_.each(this.children(v),function(child){self.setParent(child)});delete this._children[v]}_.each(_.keys(this._in[v]),removeEdge);delete this._in[v];delete this._preds[v];_.each(_.keys(this._out[v]),removeEdge);delete this._out[v];delete this._sucs[v];--this._nodeCount}return this};Graph.prototype.setParent=function(v,parent){if(!this._isCompound){throw new Error("Cannot set parent in a non-compound graph")}if(_.isUndefined(parent)){parent=GRAPH_NODE}else{
// Coerce parent to string
parent+="";for(var ancestor=parent;!_.isUndefined(ancestor);ancestor=this.parent(ancestor)){if(ancestor===v){throw new Error("Setting "+parent+" as parent of "+v+" would create a cycle")}}this.setNode(parent)}this.setNode(v);this._removeFromParentsChildList(v);this._parent[v]=parent;this._children[parent][v]=true;return this};Graph.prototype._removeFromParentsChildList=function(v){delete this._children[this._parent[v]][v]};Graph.prototype.parent=function(v){if(this._isCompound){var parent=this._parent[v];if(parent!==GRAPH_NODE){return parent}}};Graph.prototype.children=function(v){if(_.isUndefined(v)){v=GRAPH_NODE}if(this._isCompound){var children=this._children[v];if(children){return _.keys(children)}}else if(v===GRAPH_NODE){return this.nodes()}else if(this.hasNode(v)){return[]}};Graph.prototype.predecessors=function(v){var predsV=this._preds[v];if(predsV){return _.keys(predsV)}};Graph.prototype.successors=function(v){var sucsV=this._sucs[v];if(sucsV){return _.keys(sucsV)}};Graph.prototype.neighbors=function(v){var preds=this.predecessors(v);if(preds){return _.union(preds,this.successors(v))}};Graph.prototype.isLeaf=function(v){var neighbors;if(this.isDirected()){neighbors=this.successors(v)}else{neighbors=this.neighbors(v)}return neighbors.length===0};Graph.prototype.filterNodes=function(filter){var copy=new this.constructor({directed:this._isDirected,multigraph:this._isMultigraph,compound:this._isCompound});copy.setGraph(this.graph());var self=this;_.each(this._nodes,function(value,v){if(filter(v)){copy.setNode(v,value)}});_.each(this._edgeObjs,function(e){if(copy.hasNode(e.v)&&copy.hasNode(e.w)){copy.setEdge(e,self.edge(e))}});var parents={};function findParent(v){var parent=self.parent(v);if(parent===undefined||copy.hasNode(parent)){parents[v]=parent;return parent}else if(parent in parents){return parents[parent]}else{return findParent(parent)}}if(this._isCompound){_.each(copy.nodes(),function(v){copy.setParent(v,findParent(v))})}return copy};
/* === Edge functions ========== */Graph.prototype.setDefaultEdgeLabel=function(newDefault){if(!_.isFunction(newDefault)){newDefault=_.constant(newDefault)}this._defaultEdgeLabelFn=newDefault;return this};Graph.prototype.edgeCount=function(){return this._edgeCount};Graph.prototype.edges=function(){return _.values(this._edgeObjs)};Graph.prototype.setPath=function(vs,value){var self=this;var args=arguments;_.reduce(vs,function(v,w){if(args.length>1){self.setEdge(v,w,value)}else{self.setEdge(v,w)}return w});return this};
/*
 * setEdge(v, w, [value, [name]])
 * setEdge({ v, w, [name] }, [value])
 */Graph.prototype.setEdge=function(){var v,w,name,value;var valueSpecified=false;var arg0=arguments[0];if(typeof arg0==="object"&&arg0!==null&&"v"in arg0){v=arg0.v;w=arg0.w;name=arg0.name;if(arguments.length===2){value=arguments[1];valueSpecified=true}}else{v=arg0;w=arguments[1];name=arguments[3];if(arguments.length>2){value=arguments[2];valueSpecified=true}}v=""+v;w=""+w;if(!_.isUndefined(name)){name=""+name}var e=edgeArgsToId(this._isDirected,v,w,name);if(_.has(this._edgeLabels,e)){if(valueSpecified){this._edgeLabels[e]=value}return this}if(!_.isUndefined(name)&&!this._isMultigraph){throw new Error("Cannot set a named edge when isMultigraph = false")}
// It didn't exist, so we need to create it.
// First ensure the nodes exist.
this.setNode(v);this.setNode(w);this._edgeLabels[e]=valueSpecified?value:this._defaultEdgeLabelFn(v,w,name);var edgeObj=edgeArgsToObj(this._isDirected,v,w,name);
// Ensure we add undirected edges in a consistent way.
v=edgeObj.v;w=edgeObj.w;Object.freeze(edgeObj);this._edgeObjs[e]=edgeObj;incrementOrInitEntry(this._preds[w],v);incrementOrInitEntry(this._sucs[v],w);this._in[w][e]=edgeObj;this._out[v][e]=edgeObj;this._edgeCount++;return this};Graph.prototype.edge=function(v,w,name){var e=arguments.length===1?edgeObjToId(this._isDirected,arguments[0]):edgeArgsToId(this._isDirected,v,w,name);return this._edgeLabels[e]};Graph.prototype.hasEdge=function(v,w,name){var e=arguments.length===1?edgeObjToId(this._isDirected,arguments[0]):edgeArgsToId(this._isDirected,v,w,name);return _.has(this._edgeLabels,e)};Graph.prototype.removeEdge=function(v,w,name){var e=arguments.length===1?edgeObjToId(this._isDirected,arguments[0]):edgeArgsToId(this._isDirected,v,w,name);var edge=this._edgeObjs[e];if(edge){v=edge.v;w=edge.w;delete this._edgeLabels[e];delete this._edgeObjs[e];decrementOrRemoveEntry(this._preds[w],v);decrementOrRemoveEntry(this._sucs[v],w);delete this._in[w][e];delete this._out[v][e];this._edgeCount--}return this};Graph.prototype.inEdges=function(v,u){var inV=this._in[v];if(inV){var edges=_.values(inV);if(!u){return edges}return _.filter(edges,function(edge){return edge.v===u})}};Graph.prototype.outEdges=function(v,w){var outV=this._out[v];if(outV){var edges=_.values(outV);if(!w){return edges}return _.filter(edges,function(edge){return edge.w===w})}};Graph.prototype.nodeEdges=function(v,w){var inEdges=this.inEdges(v,w);if(inEdges){return inEdges.concat(this.outEdges(v,w))}};function incrementOrInitEntry(map,k){if(map[k]){map[k]++}else{map[k]=1}}function decrementOrRemoveEntry(map,k){if(!--map[k]){delete map[k]}}function edgeArgsToId(isDirected,v_,w_,name){var v=""+v_;var w=""+w_;if(!isDirected&&v>w){var tmp=v;v=w;w=tmp}return v+EDGE_KEY_DELIM+w+EDGE_KEY_DELIM+(_.isUndefined(name)?DEFAULT_EDGE_NAME:name)}function edgeArgsToObj(isDirected,v_,w_,name){var v=""+v_;var w=""+w_;if(!isDirected&&v>w){var tmp=v;v=w;w=tmp}var edgeObj={v:v,w:w};if(name){edgeObj.name=name}return edgeObj}function edgeObjToId(isDirected,edgeObj){return edgeArgsToId(isDirected,edgeObj.v,edgeObj.w,edgeObj.name)}},{"./lodash":19}],17:[function(require,module,exports){
// Includes only the "core" of graphlib
module.exports={Graph:require("./graph"),version:require("./version")}},{"./graph":16,"./version":20}],18:[function(require,module,exports){var _=require("./lodash");var Graph=require("./graph");module.exports={write:write,read:read};function write(g){var json={options:{directed:g.isDirected(),multigraph:g.isMultigraph(),compound:g.isCompound()},nodes:writeNodes(g),edges:writeEdges(g)};if(!_.isUndefined(g.graph())){json.value=_.clone(g.graph())}return json}function writeNodes(g){return _.map(g.nodes(),function(v){var nodeValue=g.node(v);var parent=g.parent(v);var node={v:v};if(!_.isUndefined(nodeValue)){node.value=nodeValue}if(!_.isUndefined(parent)){node.parent=parent}return node})}function writeEdges(g){return _.map(g.edges(),function(e){var edgeValue=g.edge(e);var edge={v:e.v,w:e.w};if(!_.isUndefined(e.name)){edge.name=e.name}if(!_.isUndefined(edgeValue)){edge.value=edgeValue}return edge})}function read(json){var g=new Graph(json.options).setGraph(json.value);_.each(json.nodes,function(entry){g.setNode(entry.v,entry.value);if(entry.parent){g.setParent(entry.v,entry.parent)}});_.each(json.edges,function(entry){g.setEdge({v:entry.v,w:entry.w,name:entry.name},entry.value)});return g}},{"./graph":16,"./lodash":19}],19:[function(require,module,exports){
/* global window */
var lodash;if(typeof require==="function"){try{lodash={clone:require("lodash/clone"),constant:require("lodash/constant"),each:require("lodash/each"),filter:require("lodash/filter"),has:require("lodash/has"),isArray:require("lodash/isArray"),isEmpty:require("lodash/isEmpty"),isFunction:require("lodash/isFunction"),isUndefined:require("lodash/isUndefined"),keys:require("lodash/keys"),map:require("lodash/map"),reduce:require("lodash/reduce"),size:require("lodash/size"),transform:require("lodash/transform"),union:require("lodash/union"),values:require("lodash/values")}}catch(e){
// continue regardless of error
}}if(!lodash){lodash=window._}module.exports=lodash},{"lodash/clone":undefined,"lodash/constant":undefined,"lodash/each":undefined,"lodash/filter":undefined,"lodash/has":undefined,"lodash/isArray":undefined,"lodash/isEmpty":undefined,"lodash/isFunction":undefined,"lodash/isUndefined":undefined,"lodash/keys":undefined,"lodash/map":undefined,"lodash/reduce":undefined,"lodash/size":undefined,"lodash/transform":undefined,"lodash/union":undefined,"lodash/values":undefined}],20:[function(require,module,exports){module.exports="2.1.8"},{}]},{},[1])(1)});
