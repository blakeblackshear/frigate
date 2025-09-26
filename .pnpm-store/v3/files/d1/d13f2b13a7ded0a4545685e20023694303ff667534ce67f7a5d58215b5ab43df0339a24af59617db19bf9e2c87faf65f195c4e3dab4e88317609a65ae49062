const _ = require('lodash');

module.exports = function (openapi, node) {
  return {
    data: {
      name: node.type === 'webhook~folder' ? 'Webhooks' : _.get(node, 'meta.name', 'FOLDER'),
      description: _.get(node, 'meta.description', ''),
      item: []
    }
  };
};
