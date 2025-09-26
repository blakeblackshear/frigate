const _ = require('lodash'),
  mergeAllOf = require('json-schema-merge-allof'),
  { typesMap } = require('./common/schemaUtilsCommon'),
  PARAMETER_SOURCE = {
    REQUEST: 'REQUEST',
    RESPONSE: 'RESPONSE'
  },
  SCHEMA_TYPES = {
    array: 'array',
    boolean: 'boolean',
    integer: 'integer',
    number: 'number',
    object: 'object',
    string: 'string'
  },
  // All formats supported by both ajv and json-schema-faker
  SUPPORTED_FORMATS = [
    'date', 'time', 'date-time',
    'uri', 'uri-reference', 'uri-template',
    'email',
    'hostname',
    'ipv4', 'ipv6',
    'regex',
    'uuid',
    'json-pointer',
    'int64',
    'float',
    'double'
  ],
  RESOLVE_REF_DEFAULTS = {
    resolveFor: 'CONVERSION',
    resolveTo: 'schema',
    stack: 0,
    stackLimit: 10,
    isAllOf: false
  },
  DEFAULT_SCHEMA_UTILS = require('./30XUtils/schemaUtils30X'),
  traverseUtility = require('neotraverse/legacy'),
  PROPERTIES_TO_ASSIGN_ON_CASCADE = ['type', 'nullable'];

/**
   * @param {*} currentNode - the object from which you're trying to find references
   * @param {*} seenRef References that are repeated. Used to identify circular references.
   * @returns {boolean} - Whether the object has circular references
   */
function hasReference(currentNode, seenRef) {
  let hasRef = false;

  traverseUtility(currentNode).forEach(function (property) {
    if (property) {
      let hasReferenceTypeKey;
      hasReferenceTypeKey = Object.keys(property)
        .find(
          (key) => {
            return key === '$ref';
          }
        );
      if (hasReferenceTypeKey && seenRef[property.$ref]) {
        hasRef = true;
      }
    }
  });
  return hasRef;
}

module.exports = {
  /**
   * @param {*} rootObject - the object from which you're trying to read a property
   * @param {*} pathArray - each element in this array a property of the previous object
   * @param {*} defValue - what to return if the required path is not found
   * @returns {*} - required property value
   * @description - this is similar to _.get(rootObject, pathArray.join('.')), but also works for cases where
   * there's a . in the property name
   */
  _getEscaped: function (rootObject, pathArray, defValue) {
    if (!(pathArray instanceof Array)) {
      return null;
    }

    if (!rootObject) {
      return defValue;
    }

    if (_.isEmpty(pathArray)) {
      return rootObject;
    }

    return this._getEscaped(rootObject[pathArray.shift()], pathArray, defValue);
  },

  /**
   * Creates a schema that's a union of all input schemas (only type: object is supported)
   *
   * @param {*} schema REQUIRED - OpenAPI defined schema object to be resolved
   * @param {string} parameterSourceOption REQUIRED tells that the schema object is of request or response
   * @param {*} components REQUIRED components in openapi spec.
   * @param {object} options - REQUIRED a list of options to indicate the type of resolution needed.
   * @param {*} options.resolveFor - resolve refs for validation/conversion (value to be one of VALIDATION/CONVERSION)
   * @param {string} options.resolveTo The desired JSON-generation mechanism (schema: prefer using the JSONschema to
     generate a fake object, example: use specified examples as-is). Default: schema
   * @param {*} options.stack counter which keeps a tab on nested schemas
   * @param {*} options.seenRef References that are repeated. Used to identify circular references.
   * @param {*} options.stackLimit Depth to which the schema should be resolved.
   * @returns {*} schema - schema that adheres to all individual schemas in schemaArr
   */
  resolveAllOf: function (schema, parameterSourceOption, components, {
    resolveFor = RESOLVE_REF_DEFAULTS.resolveFor,
    resolveTo = RESOLVE_REF_DEFAULTS.resolveTo,
    stack = RESOLVE_REF_DEFAULTS.stack,
    seenRef = {},
    stackLimit = RESOLVE_REF_DEFAULTS.stackLimit,
    analytics = {}
  }) {

    if (_.isEmpty(schema)) {
      return null;
    }

    let resolvedNonAllOfSchema = {};

    // Resolve schema excluding allOf keyword which will be further used to resolve entire schema along with allOf
    if (_.keys(schema).length > 1) {
      resolvedNonAllOfSchema = this.resolveRefs(_.omit(schema, 'allOf'), parameterSourceOption, components,
        { stack, seenRef: _.cloneDeep(seenRef), resolveFor, resolveTo, stackLimit, isAllOf: true, analytics });
    }

    try {
      return mergeAllOf(_.assign(resolvedNonAllOfSchema, {
        allOf: _.map(schema.allOf, (schema) => {
          return this.resolveRefs(schema, parameterSourceOption, components,
            { stack, seenRef: _.cloneDeep(seenRef), resolveFor, resolveTo, stackLimit, isAllOf: true, analytics });
        })
      }), {
        // below option is required to make sure schemas with additionalProperties set to false are resolved correctly
        ignoreAdditionalProperties: true,
        resolvers: {
          // for keywords in OpenAPI schema that are not standard defined JSON schema keywords, use default resolver
          defaultResolver: (compacted) => { return compacted[0]; },

          // Default resolver seems to fail for enum, so adding custom resolver that will return all unique enum values
          enum: (values) => {
            return _.uniq(_.concat(...values));
          }
        }
      });
    }
    catch (e) {
      console.warn('Error while resolving allOf schema: ', e);
      return { value: '<Error: Could not resolve allOf schema' };
    }
  },

  /**
   * Resolves references to components for a given schema.
   * @param {*} schema REQUIRED (openapi) to resolve references.
   * @param {string} parameterSourceOption REQUIRED tells that the schema object is of request or response
   * @param {*} components REQUIRED components in openapi spec.
   * @param {object} options REQUIRED a list of options to indicate the type of resolution needed
   * @param {*} options.resolveFor - resolve refs for validation/conversion (value to be one of VALIDATION/CONVERSION)
   * @param {string} options.resolveTo The desired JSON-generation mechanism (schema: prefer using the JSONschema to
    generate a fake object, example: use specified examples as-is). Default: schema
   * @param {number} options.stack counter which keeps a tab on nested schemas
   * @param {*} otions.seenRef - References that are repeated. Used to identify circular references.
   * @param {number} options.stackLimit Depth to which the schema should be resolved.
   * @param {Boolean} options.isAllOf
   * @param {object} options.analytics
    * @returns {*} schema satisfying JSON-schema-faker.
   */

  resolveRefs: function (schema, parameterSourceOption, components, {
    resolveFor = RESOLVE_REF_DEFAULTS.resolveFor,
    resolveTo = RESOLVE_REF_DEFAULTS.resolveTo,
    stack = RESOLVE_REF_DEFAULTS.stack,
    seenRef = {},
    stackLimit = RESOLVE_REF_DEFAULTS.stackLimit,
    isAllOf = RESOLVE_REF_DEFAULTS.isAllOf,
    analytics = {}
  }) {
    var resolvedSchema, prop, splitRef,
      ERR_TOO_MANY_LEVELS = '<Error: Too many levels of nesting to fake this schema>';
    let concreteUtils = components && components.hasOwnProperty('concreteUtils') ?
      components.concreteUtils :
      DEFAULT_SCHEMA_UTILS;

    if (analytics.actualStack < stack) {
      analytics.actualStack = stack;
    }

    stack++;

    if (stack > stackLimit) {
      return { value: ERR_TOO_MANY_LEVELS };
    }

    if (!schema) {
      return { value: '<Error: Schema not found>' };
    }

    if (schema.anyOf) {
      if (resolveFor === 'CONVERSION') {
        return this.resolveRefs(schema.anyOf[0], parameterSourceOption, components, {
          resolveFor,
          resolveTo,
          stack,
          seenRef: _.cloneDeep(seenRef),
          stackLimit,
          analytics
        });
      }
      return { anyOf: _.map(schema.anyOf, (schemaElement) => {
        PROPERTIES_TO_ASSIGN_ON_CASCADE.forEach((prop) => {
          if (_.isNil(schemaElement[prop]) && !_.isNil(schema[prop])) {
            schemaElement[prop] = schema[prop];
          }
        });
        return this.resolveRefs(schemaElement, parameterSourceOption, components,
          {
            resolveFor,
            resolveTo,
            stack,
            seenRef: _.cloneDeep(seenRef),
            stackLimit,
            analytics
          });
      }) };
    }
    if (schema.oneOf) {
      if (resolveFor === 'CONVERSION') {
        return this.resolveRefs(schema.oneOf[0], parameterSourceOption, components,
          {
            resolveFor,
            resolveTo,
            stack,
            seenRef: _.cloneDeep(seenRef),
            stackLimit,
            analytics
          });
      }
      return { oneOf: _.map(schema.oneOf, (schemaElement) => {
        PROPERTIES_TO_ASSIGN_ON_CASCADE.forEach((prop) => {
          if (_.isNil(schemaElement[prop]) && !_.isNil(schema[prop])) {
            schemaElement[prop] = schema[prop];
          }
        });

        return this.resolveRefs(schemaElement, parameterSourceOption, components,
          {
            resolveFor,
            resolveTo,
            stack,
            seenRef: _.cloneDeep(seenRef),
            stackLimit,
            analytics
          });
      }) };
    }
    if (schema.allOf) {
      return this.resolveAllOf(schema, parameterSourceOption, components,
        {
          resolveFor,
          resolveTo,
          stack,
          seenRef: _.cloneDeep(seenRef),
          stackLimit,
          analytics
        });
    }
    if (schema.$ref && _.isFunction(schema.$ref.split)) {
      let refKey = schema.$ref,
        outerProperties = concreteUtils.getOuterPropsIfIsSupported(schema);

      // points to an existing location
      // .split will return [#, components, schemas, schemaName]
      splitRef = refKey.split('/');

      if (splitRef.length < 4) {
        // not throwing an error. We didn't find the reference - generate a dummy value
        return { value: 'reference ' + schema.$ref + ' not found in the OpenAPI spec' };
      }

      // something like #/components/schemas/PaginationEnvelope/properties/page
      // will be resolved - we don't care about anything after the components part
      // splitRef.slice(1) will return ['components', 'schemas', 'PaginationEnvelope', 'properties', 'page']
      // not using _.get here because that fails if there's a . in the property name (Pagination.Envelope, for example)

      splitRef = splitRef.slice(1).map((elem) => {
        // https://swagger.io/docs/specification/using-ref#escape
        // since / is the default delimiter, slashes are escaped with ~1
        return decodeURIComponent(
          elem
            .replace(/~1/g, '/')
            .replace(/~0/g, '~')
        );
      });

      resolvedSchema = this._getEscaped(components, splitRef);
      // if this reference is seen before, ignore and move on.
      if (seenRef[refKey] && hasReference(resolvedSchema, seenRef)) {
        return { value: '<Circular reference to ' + refKey + ' detected>' };
      }
      // add to seen array if not encountered before.
      seenRef[refKey] = stack;
      if (outerProperties) {
        resolvedSchema = concreteUtils.addOuterPropsToRefSchemaIfIsSupported(resolvedSchema, outerProperties);
      }
      if (resolvedSchema) {
        if (schema.example) {
          resolvedSchema.example = schema.example;
        }
        let refResolvedSchema = this.resolveRefs(resolvedSchema, parameterSourceOption,
          components, {
            resolveFor,
            resolveTo,
            stack,
            seenRef: _.cloneDeep(seenRef),
            stackLimit,
            analytics
          });

        return refResolvedSchema;
      }
      return { value: 'reference ' + schema.$ref + ' not found in the OpenAPI spec' };
    }

    if (
      concreteUtils.compareTypes(schema.type, SCHEMA_TYPES.object) ||
      schema.hasOwnProperty('properties') ||
      (schema.hasOwnProperty('additionalProperties') && !schema.hasOwnProperty('type'))
    ) {
      // go through all props
      schema.type = SCHEMA_TYPES.object;

      if (_.has(schema, 'properties') || _.has(schema, 'additionalProperties')) {
        let tempSchema = _.omit(schema, ['properties', 'additionalProperties']);
        // shallow cloning schema object except properties object

        if (_.has(schema, 'additionalProperties')) {
          if (_.isBoolean(schema.additionalProperties)) {
            tempSchema.additionalProperties = schema.additionalProperties;
          }
          else {
            tempSchema.additionalProperties = this.resolveRefs(schema.additionalProperties, parameterSourceOption,
              components, {
                resolveFor,
                resolveTo,
                stack,
                seenRef: _.cloneDeep(seenRef),
                stackLimit,
                analytics
              });
          }
        }

        !_.isEmpty(schema.properties) && (tempSchema.properties = {});
        for (prop in schema.properties) {
          if (schema.properties.hasOwnProperty(prop)) {
            /* eslint-disable max-depth */
            // handling OAS readOnly and writeOnly properties in schema
            // Related Doc - https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#schemaObject
            let property = schema.properties[prop];

            if (!property) {
              continue;
            }

            if (property.readOnly && parameterSourceOption === PARAMETER_SOURCE.REQUEST) {
              // remove property from required as it'll not be present in resolved schema
              if (_.includes(tempSchema.required, prop)) {
                _.remove(tempSchema.required, _.matches(prop));
              }
              continue;
            }
            else if (property.writeOnly && parameterSourceOption === PARAMETER_SOURCE.RESPONSE) {
              // remove property from required as it'll not be present in resolved schema
              if (_.includes(tempSchema.required, prop)) {
                _.remove(tempSchema.required, _.matches(prop));
              }
              continue;
            }
            /* eslint-enable */
            tempSchema.properties[prop] = _.isEmpty(property) ?
              {} :
              this.resolveRefs(property, parameterSourceOption, components,
                {
                  resolveFor,
                  resolveTo,
                  stack,
                  seenRef: _.cloneDeep(seenRef),
                  stackLimit,
                  analytics
                });
          }
        }
        return tempSchema;
      }

      // Override deefault value to appropriate type representation for parameter resolution to schema
      if (resolveFor === 'CONVERSION' && resolveTo === 'schema') {
        schema.default = typesMap.object;
      }
    }
    else if (concreteUtils.compareTypes(schema.type, SCHEMA_TYPES.array) && schema.items) {
      /*
        For VALIDATION - keep minItems and maxItems properties defined by user in schema as is
        FOR CONVERSION -
          Json schema faker fakes exactly maxItems # of elements in array
          Hence keeping maxItems as minimum and valid as possible for schema faking (to lessen faked items)
          We have enforced limit to maxItems as 100, set by Json schema faker option
      */
      if (resolveFor === 'CONVERSION') {
        // Override minItems to default (2) if no minItems present
        if (!_.has(schema, 'minItems') && _.has(schema, 'maxItems') && schema.maxItems >= 2) {
          schema.minItems = 2;
        }

        // Override maxItems to minItems if minItems is available
        if (_.has(schema, 'minItems') && schema.minItems > 0) {
          schema.maxItems = schema.minItems;
        }

        // If no maxItems is defined than override with default (2)
        !_.has(schema, 'maxItems') && (schema.maxItems = 2);
      }
      // have to create a shallow clone of schema object,
      // so that the original schema.items object will not change
      // without this, schemas with circular references aren't faked correctly
      let tempSchema = _.omit(schema, ['items', 'additionalProperties']);

      tempSchema.items = this.resolveRefs(schema.items, parameterSourceOption,
        components, {
          resolveFor,
          resolveTo,
          stack,
          seenRef: _.cloneDeep(seenRef),
          stackLimit,
          analytics
        });
      return tempSchema;
    }
    else if (!schema.hasOwnProperty('default')) {
      if (schema.hasOwnProperty('type')) {
        // Override default value to schema for CONVERSION only for parameter resolution set to schema
        if (resolveFor === 'CONVERSION' && resolveTo === 'schema') {
          if (!schema.hasOwnProperty('format')) {
            schema.default = '<' + schema.type + '>';
          }
          else if (typesMap.hasOwnProperty(schema.type)) {
            schema.default = typesMap[schema.type][schema.format];

            // in case the format is a custom format (email, hostname etc.)
            // https://swagger.io/docs/specification/data-models/data-types/#string
            if (!schema.default && schema.format) {
              schema.default = '<' + schema.format + '>';
            }
          }
          else {
            schema.default = '<' + schema.type + (schema.format ? ('-' + schema.format) : '') + '>';
          }
        }
      }
      else if (schema.enum && schema.enum.length > 0) {
        if (resolveFor === 'CONVERSION' && resolveTo === 'schema') {
          schema.type = (typeof (schema.enum[0]));
          if (!schema.hasOwnProperty('format')) {
            schema.default = '<' + schema.type + '>';
          }
          else if (typesMap.hasOwnProperty(schema.type)) {
            schema.default = typesMap[schema.type][schema.format];
            if (!schema.default && schema.format) {
              schema.default = '<' + schema.format + '>';
            }
          }
          else {
            schema.default = '<' + schema.type + (schema.format ? ('-' + schema.format) : '') + '>';
          }
        }
        else {
          return {
            type: (typeof (schema.enum[0])),
            value: schema.enum[0]
          };
        }
      }
      else if (isAllOf) {
        return schema;
      }
      else {
        return {
          type: SCHEMA_TYPES.object
        };
      }
      if (!schema.type) {
        schema.type = SCHEMA_TYPES.string;
      }

      // Discard format if not supported by both json-schema-faker and ajv or pattern is also defined
      if (!_.includes(SUPPORTED_FORMATS, schema.format) || (schema.pattern && schema.format)) {
        return _.omit(schema, 'format');
      }
    }

    return schema;
  }
};
