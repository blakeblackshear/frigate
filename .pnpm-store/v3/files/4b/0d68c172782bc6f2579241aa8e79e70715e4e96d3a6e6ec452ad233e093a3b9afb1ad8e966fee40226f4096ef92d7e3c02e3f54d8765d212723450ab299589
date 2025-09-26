/**
 * Class for the node of the tree containing the folders
 * @param {object} options - Contains details about the folder/collection node
 * @returns {void}
 */
function Node (options) {
  // human-readable name
  this.name = options ? options.name : '/';

  // number of requests in the sub-trie of this node
  this.requestCount = options ? options.requestCount : 0;

  this.type = options ? options.type : 'item';

  // stores all direct folder descendants of this node
  this.children = {};

  // number of direct descendants (folders / requests) of this node
  this.childCount = 0;

  this.requests = []; // request will always be an array of objects

  this.addChildren = function (child, value) {
    this.children[child] = value;
  };

  this.addMethod = function (method) {
    this.requests.push(method);
  };
}

class Trie {
  constructor(node) {
    this.root = node;
  }
}

module.exports = {
  Trie: Trie,
  Node: Node
};
