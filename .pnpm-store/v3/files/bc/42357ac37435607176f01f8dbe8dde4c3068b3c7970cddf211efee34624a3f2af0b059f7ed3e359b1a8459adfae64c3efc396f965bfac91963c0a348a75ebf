/* eslint-disable one-var */
const _ = require('lodash'),
  { Collection } = require('postman-collection/lib/collection/collection'),
  GraphLib = require('graphlib'),
  generateSkeletonTreeFromOpenAPI = require('./helpers/collection/generateSkeletionTreeFromOpenAPI'),
  generateCollectionFromOpenAPI = require('./helpers/collection/generateCollectionFromOpenAPI'),
  generateFolderFromOpenAPI = require('./helpers/folder/generateFolderForOpenAPI'),

  Ajv = require('ajv'),
  addFormats = require('ajv-formats'),
  async = require('async'),
  transactionSchema = require('../assets/validationRequestListSchema.json'),

  // All V1 interfaces used
  OpenApiErr = require('../lib/error'),
  { validateTransaction, getMissingSchemaEndpoints } = require('./validationUtils');

const { resolvePostmanRequest } = require('./schemaUtils');
const { generateRequestItemObject, fixPathVariablesInUrl } = require('./utils');

module.exports = {
  convertV2: function (context, cb) {
    /**
     * Start generating the Bare bone tree that should exist for the schema
     */

    let collectionTree = generateSkeletonTreeFromOpenAPI(context.openapi, context.computedOptions);

    /**
     * Do post order traversal so we get the request nodes first and generate the request object
     */

    let preOrderTraversal = GraphLib.alg.preorder(collectionTree, 'root:collection');

    let collection = {},
      extractedTypesObject = {};

    /**
     * individually start generating the folder, request, collection
     * and keep adding to the collection tree.
     */
    _.forEach(preOrderTraversal, function (nodeIdentified) {
      let node = collectionTree.node(nodeIdentified);

      switch (node.type) {
        case 'collection': {
          // dummy collection to be generated.
          const { data, variables } = generateCollectionFromOpenAPI(context, node);
          collection = new Collection(data);

          collection = collection.toJSON();

          collection.variable.push(...variables);

          // set the ref for the collection in the node.
          collectionTree.setNode(nodeIdentified,
            Object.assign(node, {
              ref: collection
            }));

          break;
        }

        case 'folder': {
          // generate the folder form the node.
          let folder = generateFolderFromOpenAPI(context, node).data || {};

          // find the parent of the folder in question / root collection.
          let parent = collectionTree.predecessors(nodeIdentified);

          // this is directed graph, and hence have only one parent.
          parent = collectionTree.node(parent && parent[0]);

          // if the item construct does not exist add and initialize it to zero
          if (!parent.ref.item) {
            parent.ref.item = [];
          }

          // push the folder in the item that is in question
          parent.ref.item.push(folder);

          // set the ref for the newly created folder in this.
          collectionTree.setNode(nodeIdentified,
            Object.assign(node, {
              ref: _.last(parent.ref.item)
            }));

          break;
        }

        case 'request': {
          // generate the request form the node
          let request = {},
            collectionVariables = [],
            requestObject = {},
            requestTypesObject = {};

          try {
            ({ request, collectionVariables, requestTypesObject } = resolvePostmanRequest(context,
              context.openapi.paths[node.meta.path],
              node.meta.path,
              node.meta.method
            ));

            requestObject = generateRequestItemObject(request);
            extractedTypesObject = Object.assign({}, extractedTypesObject, requestTypesObject);

          }
          catch (error) {
            console.error(error);
            break;
          }

          collection.variable.push(...collectionVariables);

          // find the parent of the request in question
          let parent = collectionTree.predecessors(nodeIdentified);

          // this is directed graph, and hence have only one parent.
          parent = collectionTree.node(parent && parent[0]);

          // if the item construct does not exist add and initialize it to zero
          if (!parent.ref.item) {
            parent.ref.item = [];
          }

          // push the folder in the item that is in question
          parent.ref.item.push(requestObject);

          // set the ref for the newly created request in this.
          collectionTree.setNode(nodeIdentified,
            Object.assign(node, {
              ref: _.last(parent.ref.item)
            }));

          break;
        }

        case 'webhook~folder': {
          // generate the folder form the node.
          let folder = generateFolderFromOpenAPI(context, node).data || {};

          // find the parent of the folder in question / root collection.
          let parent = collectionTree.predecessors(nodeIdentified);

          // this is directed graph, and hence have only one parent.
          parent = collectionTree.node(parent && parent[0]);

          // if the item construct does not exist add and initialize it to zero
          if (!parent.ref.item) {
            parent.ref.item = [];
          }

          // push the folder in the item that is in question
          parent.ref.item.push(folder);

          // set the ref for the newly created folder in this.
          collectionTree.setNode(nodeIdentified,
            Object.assign(node, {
              ref: _.last(parent.ref.item)
            }));

          break;
        }

        case 'webhook~request': {
          // generate the request form the node
          let request = {},
            collectionVariables = [],
            requestObject = {};

          // TODO: Figure out a proper fix for this
          if (node.meta.method === 'parameters') {
            break;
          }

          try {
            ({ request, collectionVariables } = resolvePostmanRequest(context,
              context.openapi.webhooks[node.meta.path],
              node.meta.path,
              node.meta.method
            ));

            requestObject = generateRequestItemObject(request);
          }
          catch (error) {
            console.error(error);
            break;
          }

          collection.variable.push(...collectionVariables);

          // find the parent of the request in question
          let parent = collectionTree.predecessors(nodeIdentified);

          // this is directed graph, and hence have only one parent.
          parent = collectionTree.node(parent && parent[0]);

          // if the item construct does not exist add and initialize it to zero
          if (!parent.ref.item) {
            parent.ref.item = [];
          }

          // push the folder in the item that is in question
          parent.ref.item.push(requestObject);

          // set the ref for the newly created request in this.
          collectionTree.setNode(nodeIdentified,
            Object.assign(node, {
              ref: _.last(parent.ref.item)
            }));

          break;
        }

        default: break;
      }
    });

    // Remove duplicate variables as different requests could end up creating same variables
    if (!_.isEmpty(collection.variable)) {
      collection.variable = _.uniqBy(collection.variable, 'key');
    }
    if (context.enableTypeFetching) {
      return cb(null, {
        result: true,
        output: [{
          type: 'collection',
          data: collection
        }],
        analytics: this.analytics || {},
        extractedTypes: extractedTypesObject || {}
      });
    }
    return cb(null, {
      result: true,
      output: [{
        type: 'collection',
        data: collection
      }],
      analytics: this.analytics || {}
    });
  },

  /**
   *
   * @description Takes in a request collection (transaction object) and validates it against
   * corresponding definition matching endpoint
   *
   * @param {Object} context - Required context from related SchemaPack function
   * @param {Array} transactions - Transactions to be validated
   * @param {*} callback return
   * @returns {boolean} validation
   */
  validateTransactionV2(context, transactions, callback) {
    let schema = context.openapi,
      options = context.computedOptions,
      concreteUtils = context.concreteUtils,
      componentsAndPaths = { concreteUtils },
      schemaCache = context.schemaFakerCache,
      matchedEndpoints = [];

    context.schemaCache = context.schemaCache || {};
    context.schemaFakerCache = context.schemaFakerCache || {};
    Object.assign(componentsAndPaths, concreteUtils.getRequiredData(schema));

    // create and sanitize basic spec
    schema.servers = _.isEmpty(schema.servers) ? [{ url: '/' }] : schema.servers;
    schema.securityDefs = _.get(schema, 'components.securitySchemes', {});
    schema.baseUrl = _.get(schema, 'servers.0.url', '{{baseURL}}');
    schema.baseUrlVariables = _.get(schema, 'servers.0.variables');

    // Fix {scheme} and {path} vars in the URL to :scheme and :path
    schema.baseUrl = fixPathVariablesInUrl(schema.baseUrl);

    // check validity of transactions
    try {
      // add Ajv options to support validation of OpenAPI schema.
      // For more details see https://ajv.js.org/#options
      let ajv = new Ajv({
          allErrors: true,
          strict: false
        }),
        validate,
        res;
      addFormats(ajv);
      validate = ajv.compile(transactionSchema);
      res = validate(transactions);

      if (!res) {
        return callback(new OpenApiErr('Invalid syntax provided for requestList', validate.errors));
      }
    }
    catch (e) {
      return callback(new OpenApiErr('Invalid syntax provided for requestList', e));
    }

    return async.map(transactions, (transaction, callback) => {
      return validateTransaction(context, transaction, {
        schema, options, componentsAndPaths, schemaCache, matchedEndpoints
      }, callback);
    }, (err, result) => {
      var retVal;

      if (err) {
        return callback(err);
      }

      retVal = {
        requests: _.keyBy(result, 'requestId'),
        missingEndpoints: getMissingSchemaEndpoints(context, schema, matchedEndpoints,
          componentsAndPaths, options, schemaCache)
      };

      return callback(null, retVal);
    });
  }
};
