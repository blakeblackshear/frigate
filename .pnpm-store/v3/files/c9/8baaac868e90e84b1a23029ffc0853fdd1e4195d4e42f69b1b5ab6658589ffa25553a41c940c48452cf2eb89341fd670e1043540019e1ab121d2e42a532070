const parse = require('./parse.js'),
  traverseUtility = require('neotraverse/legacy'),
  BROWSER = 'browser',
  { DFS } = require('./dfs'),
  { isExtRef, removeLocalReferenceFromPath } = require('./jsonPointer');
let path = require('path'),
  pathBrowserify = require('path-browserify');

/**
   * Locates a referenced node from the data input by path
   * @param {string} path1 - path1 to compare
   * @param {string} path2 - path2 to compare
   * @returns {boolean} - wheter is the same path
   */
function comparePaths(path1, path2) {
  return path1 === path2;
}

/**
   * Calculates the path relative to parent
   * @param {string} parentFileName - parent file name of the current node
   * @param {string} referencePath - value of the $ref property
   * @returns {object} - Detect root files result object
   */
function calculatePath(parentFileName, referencePath) {
  if (path.isAbsolute(referencePath)) {
    return referencePath;
  }
  let currentDirName = path.dirname(parentFileName),
    refDirName = path.join(currentDirName, referencePath);
  return refDirName;
}

/**
   * Calculates the path relative to parent
   * @param {string} parentFileName - parent file name of the current node
   * @param {string} referencePath - value of the $ref property
   * @returns {object} - Detect root files result object
   */
function calculatePathMissing(parentFileName, referencePath) {
  let currentDirName = path.dirname(parentFileName),
    refDirName = path.join(currentDirName, referencePath);
  if (refDirName.startsWith('..' + path.sep)) {
    return { path: undefined, $ref: referencePath };
  }
  else if (path.isAbsolute(parentFileName) && !path.isAbsolute(referencePath)) {
    let relativeToRoot = path.join(currentDirName.replace(path.sep, ''), referencePath);
    if (relativeToRoot.startsWith('..' + path.sep)) {
      return { path: undefined, $ref: referencePath };
    }
  }
  return { path: refDirName, $ref: undefined };
}

/**
   * Locates a referenced node from the data input by path
   * @param {string} referencePath - value from the $ref property
   * @param {Array} allData -  array of { path, content} objects
   * @returns {object} - Detect root files result object
   */
function findNodeFromPath(referencePath, allData) {
  return allData.find((node) => {
    return comparePaths(node.fileName, referencePath);
  });
}

/**
   * verifies if the path has been added to the result
   * @param {string} path - path to find
   * @param {Array} referencesInNode - Array with the already added paths
   * @returns {boolean} - wheter a node with the same path has been added
   */
function added(path, referencesInNode) {
  return referencesInNode.find((reference) => { return reference.path === path; }) !== undefined;
}

/**
   * Gets all the $refs from an object
   * @param {object} currentNode - current node in process
   * @param {Function} refTypeResolver - function to resolve the ref according to type (local, external, web etc)
   * @param {Function} pathSolver - function to resolve the Path
   * @returns {object} - {path : $ref value}
   */
function getReferences (currentNode, refTypeResolver, pathSolver) {
  let referencesInNode = [];
  traverseUtility(currentNode).forEach((property) => {
    if (property) {
      let hasReferenceTypeKey;
      hasReferenceTypeKey = Object.keys(property)
        .find(
          (key) => {
            return refTypeResolver(property, key);
          }
        );
      if (hasReferenceTypeKey) {
        if (!added(property.$ref, referencesInNode)) {
          referencesInNode.push({ path: pathSolver(property) });
        }
      }
    }
  });
  return referencesInNode;
}

/**
   * Maps the output from get root files to detect root files
   * @param {object} currentNode - current { path, content} object
   * @param {Array} allData -  array of { path, content} objects
   * @param {object} specRoot - root file information
   * @returns {object} - Detect root files result object
   */
function getAdjacentAndMissing (currentNode, allData, specRoot) {
  let currentNodeReferences,
    currentContent = currentNode.content,
    graphAdj = [],
    missingNodes = [],
    OASObject;
  if (currentNode.parsed) {
    OASObject = currentNode.parsed;
  }
  else {
    OASObject = parse.getOasObject(currentContent);
  }
  currentNodeReferences = getReferences(OASObject, isExtRef, removeLocalReferenceFromPath);

  currentNodeReferences.forEach((reference) => {
    let referencePath = reference.path,
      adjacentNode = findNodeFromPath(calculatePath(currentNode.fileName, referencePath), allData);
    if (adjacentNode) {
      graphAdj.push(adjacentNode);
    }
    else if (!comparePaths(referencePath, specRoot.fileName)) {
      let calculatedPathForMissing = calculatePathMissing(currentNode.fileName, referencePath);
      if (!calculatedPathForMissing.$ref) {
        missingNodes.push({ path: calculatedPathForMissing.path });
      }
      else {
        missingNodes.push({ $ref: calculatedPathForMissing.$ref, path: null });
      }
    }
  });
  return { graphAdj, missingNodes };
}

module.exports = {

  /**
   * Maps the output from get root files to detect root files
   * @param {object} specRoot - root file information
   * @param {Array} allData -  array of { path, content} objects
   * @param {Array} origin - process origin (BROWSER or node)
   * @returns {object} - Detect root files result object
   */
  getRelatedFiles: function (specRoot, allData, origin) {
    if (origin === BROWSER) {
      path = pathBrowserify;
    }
    let algorithm = new DFS(),
      { traverseOrder, missing } =
        algorithm.traverse(specRoot, (currentNode) => {
          return getAdjacentAndMissing(currentNode, allData, specRoot);
        }),
      outputRelatedFiles = traverseOrder.slice(1).map((relatedFile) => {
        return {
          path: relatedFile.fileName
        };
      });
    return { relatedFiles: outputRelatedFiles, missingRelatedFiles: missing };
  },
  getReferences,
  getAdjacentAndMissing,
  calculatePath,
  calculatePathMissing,
  removeLocalReferenceFromPath
};
