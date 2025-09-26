require=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

/**
 * @typedef {Object} ParsingOptions
 *  @property {function(node)} filter Returns false to exclude a node. Default is true.
 */

/**
 * Parse the given XML string into an object.
 *
 * @param {String} xml
 * @param {ParsingOptions} [options]
 * @return {Object}
 * @api public
 */
function parse(xml) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  options.filter = options.filter || function () {
    return true;
  };

  function nextChild() {
    return tag() || content() || comment() || cdata();
  }

  function nextRootChild() {
    match(/\s*/);
    return tag(true) || comment() || doctype() || processingInstruction(false);
  }

  function document() {
    var decl = declaration();
    var children = [];
    var documentRootNode;
    var child = nextRootChild();

    while (child) {
      if (child.node.type === 'Element') {
        if (documentRootNode) {
          throw new Error('Found multiple root nodes');
        }

        documentRootNode = child.node;
      }

      if (!child.excluded) {
        children.push(child.node);
      }

      child = nextRootChild();
    }

    if (!documentRootNode) {
      throw new Error('Failed to parse XML');
    }

    return {
      declaration: decl ? decl.node : null,
      root: documentRootNode,
      children: children
    };
  }

  function declaration() {
    return processingInstruction(true);
  }

  function processingInstruction(matchDeclaration) {
    var m = matchDeclaration ? match(/^<\?(xml)\s*/) : match(/^<\?([\w-:.]+)\s*/);
    if (!m) return; // tag

    var node = {
      name: m[1],
      type: 'ProcessingInstruction',
      attributes: {}
    }; // attributes

    while (!(eos() || is('?>'))) {
      var attr = attribute();
      if (!attr) return node;
      node.attributes[attr.name] = attr.value;
    }

    match(/\?>/);
    return {
      excluded: matchDeclaration ? false : options.filter(node) === false,
      node: node
    };
  }

  function tag(matchRoot) {
    var m = match(/^<([\w-:.]+)\s*/);
    if (!m) return; // name

    var node = {
      type: 'Element',
      name: m[1],
      attributes: {},
      children: []
    }; // attributes

    while (!(eos() || is('>') || is('?>') || is('/>'))) {
      var attr = attribute();
      if (!attr) return node;
      node.attributes[attr.name] = attr.value;
    }

    var excluded = matchRoot ? false : options.filter(node) === false; // self closing tag

    if (match(/^\s*\/>/)) {
      node.children = null;
      return {
        excluded: excluded,
        node: node
      };
    }

    match(/\??>/);

    if (!excluded) {
      // children
      var child = nextChild();

      while (child) {
        if (!child.excluded) {
          node.children.push(child.node);
        }

        child = nextChild();
      }
    } // closing


    match(/^<\/[\w-:.]+>/);
    return {
      excluded: excluded,
      node: node
    };
  }

  function doctype() {
    var m = match(/^<!DOCTYPE\s+[^>]*>/);

    if (m) {
      var node = {
        type: 'DocumentType',
        content: m[0]
      };
      return {
        excluded: options.filter(node) === false,
        node: node
      };
    }
  }

  function cdata() {
    if (xml.startsWith('<![CDATA[')) {
      var endPositionStart = xml.indexOf(']]>');

      if (endPositionStart > -1) {
        var endPositionFinish = endPositionStart + 3;
        var node = {
          type: 'CDATA',
          content: xml.substring(0, endPositionFinish)
        };
        xml = xml.slice(endPositionFinish);
        return {
          excluded: options.filter(node) === false,
          node: node
        };
      }
    }
  }

  function comment() {
    var m = match(/^<!--[\s\S]*?-->/);

    if (m) {
      var node = {
        type: 'Comment',
        content: m[0]
      };
      return {
        excluded: options.filter(node) === false,
        node: node
      };
    }
  }

  function content() {
    var m = match(/^([^<]+)/);

    if (m) {
      var node = {
        type: 'Text',
        content: m[1]
      };
      return {
        excluded: options.filter(node) === false,
        node: node
      };
    }
  }

  function attribute() {
    var m = match(/([\w-:.]+)\s*=\s*("[^"]*"|'[^']*'|\w+)\s*/);
    if (!m) return;
    return {
      name: m[1],
      value: strip(m[2])
    };
  }
  /**
   * Strip quotes from `val`.
   */


  function strip(val) {
    return val.replace(/^['"]|['"]$/g, '');
  }
  /**
   * Match `re` and advance the string.
   */


  function match(re) {
    var m = xml.match(re);
    if (!m) return;
    xml = xml.slice(m[0].length);
    return m;
  }
  /**
   * End-of-source.
   */


  function eos() {
    return 0 === xml.length;
  }
  /**
   * Check for `prefix`.
   */


  function is(prefix) {
    return 0 === xml.indexOf(prefix);
  }

  xml = xml.trim();
  return document();
}

module.exports = parse;

},{}],"xml-formatter":[function(require,module,exports){
"use strict";

/**
 * @typedef {Object} XMLFormatterOptions
 *  @property {String} [indentation='    '] The value used for indentation
 *  @property {function(node): boolean} [filter] Return false to exclude the node.
 *  @property {Boolean} [collapseContent=false] True to keep content in the same line as the element. Only works if element contains at least one text node
 *  @property {String} [lineSeparator='\r\n'] The line separator to use
 *  @property {String} [whiteSpaceAtEndOfSelfclosingTag=false] to either end ad self closing tag with `<tag/>` or `<tag />`
 */

/**
 * @typedef {Object} XMLFormatterState
 * @param {String} content
 * @param {Number} level
 * @param {XMLFormatterOptions} options
 */

/**
 * @param {XMLFormatterState} state
 * @return {void}
 */
function newLine(state) {
  if (!state.options.indentation && !state.options.lineSeparator) return;
  state.content += state.options.lineSeparator;
  var i;

  for (i = 0; i < state.level; i++) {
    state.content += state.options.indentation;
  }
}
/**
 * @param {XMLFormatterState} state
 * @param {String} content
 * @return {void}
 */


function appendContent(state, content) {
  state.content += content;
}
/**
 * @param {Object} node
 * @param {XMLFormatterState} state
 * @param {Boolean} preserveSpace
 * @return {void}
 */


function processNode(node, state, preserveSpace) {
  if (typeof node.content === 'string') {
    processContentNode(node, state, preserveSpace);
  } else if (node.type === 'Element') {
    processElementNode(node, state, preserveSpace);
  } else if (node.type === 'ProcessingInstruction') {
    processProcessingIntruction(node, state, preserveSpace);
  } else {
    throw new Error('Unknown node type: ' + node.type);
  }
}
/**
 * @param {Object} node
 * @param {XMLFormatterState} state
 * @param {Boolean} preserveSpace
 * @return {void}
 */


function processContentNode(node, state, preserveSpace) {
  if (!preserveSpace) {
    node.content = node.content.trim();
  }

  if (node.content.length > 0) {
    if (!preserveSpace && state.content.length > 0) {
      newLine(state);
    }

    appendContent(state, node.content);
  }
}
/**
 * @param {Object} node
 * @param {XMLFormatterState} state
 * @param {Boolean} preserveSpace
 * @return {void}
 */


function processElementNode(node, state, preserveSpace) {
  if (!preserveSpace && state.content.length > 0) {
    newLine(state);
  }

  appendContent(state, '<' + node.name);
  processAttributes(state, node.attributes);

  if (node.children === null) {
    var selfClosingNodeClosingTag = state.options.whiteSpaceAtEndOfSelfclosingTag ? ' />' : '/>'; // self-closing node

    appendContent(state, selfClosingNodeClosingTag);
  } else if (node.children.length === 0) {
    // empty node
    appendContent(state, '></' + node.name + '>');
  } else {
    appendContent(state, '>');
    state.level++;
    var nodePreserveSpace = node.attributes['xml:space'] === 'preserve';

    if (!nodePreserveSpace && state.options.collapseContent) {
      var containsTextNodes = false;
      var containsTextNodesWithLineBreaks = false;
      var containsNonTextNodes = false;
      node.children.forEach(function (child, index) {
        if (child.type === 'Text') {
          if (child.content.includes('\n')) {
            containsTextNodesWithLineBreaks = true;
            child.content = child.content.trim();
          } else if (index === 0 || index === node.children.length - 1) {
            if (child.content.trim().length === 0) {
              // If the text node is at the start or end and is empty, it should be ignored when formatting
              child.content = '';
            }
          }

          if (child.content.length > 0) {
            containsTextNodes = true;
          }
        } else if (child.type === 'CDATA') {
          containsTextNodes = true;
        } else {
          containsNonTextNodes = true;
        }
      });

      if (containsTextNodes && (!containsNonTextNodes || !containsTextNodesWithLineBreaks)) {
        nodePreserveSpace = true;
      }
    }

    node.children.forEach(function (child) {
      processNode(child, state, preserveSpace || nodePreserveSpace, state.options);
    });
    state.level--;

    if (!preserveSpace && !nodePreserveSpace) {
      newLine(state);
    }

    appendContent(state, '</' + node.name + '>');
  }
}
/**
 * @param {XMLFormatterState} state
 * @param {Record<String, String>} attributes
 * @return {void}
 */


function processAttributes(state, attributes) {
  Object.keys(attributes).forEach(function (attr) {
    var escaped = attributes[attr].replace(/"/g, '&quot;');
    appendContent(state, ' ' + attr + '="' + escaped + '"');
  });
}
/**
 * @param {Object} node
 * @param {XMLFormatterState} state
 * @return {void}
 */


function processProcessingIntruction(node, state) {
  if (state.content.length > 0) {
    newLine(state);
  }

  appendContent(state, '<?' + node.name);
  processAttributes(state, node.attributes);
  appendContent(state, '?>');
}
/**
 * Converts the given XML into human readable format.
 *
 * @param {String} xml
 * @param {XMLFormatterOptions} options
 * @returns {string}
 */


function format(xml) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  options.indentation = 'indentation' in options ? options.indentation : '    ';
  options.collapseContent = options.collapseContent === true;
  options.lineSeparator = 'lineSeparator' in options ? options.lineSeparator : '\r\n';
  options.whiteSpaceAtEndOfSelfclosingTag = !!options.whiteSpaceAtEndOfSelfclosingTag;

  var parser = require('xml-parser-xo');

  var parsedXml = parser(xml, {
    filter: options.filter
  });
  var state = {
    content: '',
    level: 0,
    options: options
  };

  if (parsedXml.declaration) {
    processProcessingIntruction(parsedXml.declaration, state);
  }

  parsedXml.children.forEach(function (child) {
    processNode(child, state, false);
  });
  return state.content.replace(/\r\n/g, '\n').replace(/\n/g, options.lineSeparator);
}

module.exports = format;

},{"xml-parser-xo":1}]},{},[]);
