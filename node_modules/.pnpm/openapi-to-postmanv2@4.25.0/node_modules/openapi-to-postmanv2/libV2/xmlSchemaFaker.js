/* eslint-disable */
const _ = require('lodash'),
  js2xml = require('../lib/common/js2xml');

function indentContent (content, initialIndent) {
  let contentArr = _.split(content, '\n'),
    indentedContent = _.join(_.map(contentArr, (contentElement) => { return initialIndent + contentElement; }), '\n');

  return indentedContent;
}

function convertSchemaToXML(name, schema, attribute, indentChar, indent, resolveTo) {
  var tagPrefix = '',
    cIndent = _.times(indent, _.constant(indentChar)).join(''),
    retVal = '';

  if (schema === null || typeof schema === 'undefined') {
    return retVal;
  }

  const schemaExample = typeof schema === 'object' && (schema.example);

  name = _.get(schema, 'xml.name', name || 'element');
  if (_.get(schema, 'xml.prefix')) {
    tagPrefix = schema.xml.prefix ? `${schema.xml.prefix}:` : '';
  }
  if (['integer','string', 'boolean', 'number'].includes(schema.type)) {
    if (schema.type === 'integer') {
      actualValue = '(integer)';
    }
    else if (schema.type === 'string') {
      actualValue = '(string)';
    }
    else if (schema.type === 'boolean') {
      actualValue = '(boolean)';
    }
    else if (schema.type === 'number') {
      actualValue = '(number)';
    }

    if (resolveTo === 'example' && typeof schemaExample !== 'undefined') {
      actualValue = schemaExample;
    }

    if (attribute) {
      return actualValue;
    }
    else {
      retVal = `\n${cIndent}<${tagPrefix+name}`;
      if (_.get(schema, 'xml.namespace')) {
        retVal += ` xmlns:${tagPrefix.slice(0,-1)}="${schema.xml.namespace}"`
      }
      retVal += `>${actualValue}</${tagPrefix}${name}>`;
    }
  }
  else if (schema.type === 'object') {
    // Use mentioned example in string directly as example
    if (resolveTo === 'example' && typeof schemaExample === 'string') {
      return '\n' + schemaExample;
    }
    else if (resolveTo === 'example' && typeof schemaExample === 'object') {
      const elementName = _.get(schema, 'items.xml.name', name || 'element'),
        fakedContent = js2xml({ [elementName]: schemaExample }, indentChar);

      retVal = '\n' + indentContent(fakedContent, cIndent);
    }
    else {
      // go through all properties
      var propVal, attributes = [], childNodes = '';

      retVal = '\n' + cIndent + `<${tagPrefix}${name}`;

      if (_.get(schema, 'xml.namespace')) {
        let formattedTagPrefix = tagPrefix ?
          `:${tagPrefix.slice(0,-1)}` :
          '';
        retVal += ` xmlns${formattedTagPrefix}="${schema.xml.namespace}"`
      }
      _.forOwn(schema.properties, (value, key) => {
        propVal = convertSchemaToXML(key, value, _.get(value, 'xml.attribute'), indentChar, indent + 1, resolveTo);
        if (_.get(value, 'xml.attribute')) {
          attributes.push(`${key}="${propVal}"`);
        }
        else {
          childNodes += _.isString(propVal) ? propVal : '';
        }
      });
      if (attributes.length > 0) {
        retVal += ' ' + attributes.join(' ');
      }
      retVal += '>';
      retVal += childNodes;
      retVal += `\n${cIndent}</${tagPrefix}${name}>`;
    }
  }
  else if (schema.type === 'array') {
    // schema.items must be an object
    var isWrapped = _.get(schema, 'xml.wrapped'),
      extraIndent = isWrapped ? 1 : 0,
      arrayElemName = _.get(schema, 'items.xml.name', name || 'element'),
      schemaItemsWithXmlProps = _.cloneDeep(schema.items),
      contents;

    schemaItemsWithXmlProps.xml = schema.xml;

    // Use mentioned example in string directly as example
    if (resolveTo === 'example' && typeof schemaExample === 'string') {
      return '\n' + schemaExample;
    }
    else if (resolveTo === 'example' && typeof schemaExample === 'object') {
      const fakedContent = js2xml({ [arrayElemName]: schemaExample }, indentChar);

      contents = '\n' + indentContent(fakedContent, cIndent);
    }
    else {
      let singleElementContent = convertSchemaToXML(arrayElemName, schemaItemsWithXmlProps, false, indentChar,
        indent + extraIndent, resolveTo);

      // Atleast 2 items per array will be added asame as JSON schema faker
      contents = singleElementContent + singleElementContent;
    }

    if (isWrapped) {
      return `\n${cIndent}<${tagPrefix}${name}>${contents}\n${cIndent}</${tagPrefix}${name}>`;
    }
    else {
      return contents;
    }
  }
  return retVal;
}

module.exports = function(name, schema, indentCharacter, resolveTo) {
  // substring(1) to trim the leading newline
  return convertSchemaToXML(name, schema, false, indentCharacter, 0, resolveTo).substring(1);
};
/*
a = convertSchemaToXML('Person',{
  "type": "object",
  "properties": {
    "id": {
      "type": "integer",
      "format": "int32",
      "xml": {
        "attribute": true
      }
    },
    "name": {
      "type": "string",
      "xml": {
        "namespace": "http://example.com/schema/sample",
        "prefix": "sample"
      }
    },
    "animals": {
      "type": "array",
      "items": {
        "type": "string",
        "xml": {
          "name": "animal"
        }
      },
      "xml": {
        "name": "aliens",
        "wrapped": true
      }
    }
  },
  xml: {
    namespace: "www.kane.com",
    "prefix": "M"
  }
}, false, 0);

console.log(a);
*/
