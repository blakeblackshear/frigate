const SCHEMA_CONTAINERS = [
    'allOf',
    'oneOf',
    'anyOf',
    'not',
    'additionalProperties',
    'items',
    'schema'
  ],
  EXAMPLE_CONTAINERS = [
  ],
  REQUEST_BODY_CONTAINER = [
    'requestBody'
  ],
  CONTAINERS = {
    schemas: SCHEMA_CONTAINERS,
    examples: EXAMPLE_CONTAINERS,
    requestBodies: REQUEST_BODY_CONTAINER
  },
  DEFINITIONS = {
    headers: 'headers',
    responses: 'responses',
    callbacks: 'callbacks',
    properties: 'schemas',
    links: 'links',
    paths: 'pathItems',
    examples: 'examples'
  },
  INLINE = [
    'properties',
    'value',
    'example'
  ],
  ROOT_CONTAINERS_KEYS = [
    'components'
  ],
  COMPONENTS_KEYS = [
    'schemas',
    'responses',
    'parameters',
    'examples',
    'requestBodies',
    'headers',
    'securitySchemes',
    'links',
    'callbacks',
    'pathItems'
  ];

module.exports = {
  RULES_31: {
    CONTAINERS,
    DEFINITIONS,
    COMPONENTS_KEYS,
    INLINE,
    ROOT_CONTAINERS_KEYS
  }
};
