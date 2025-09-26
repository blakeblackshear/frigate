/* eslint-disable no-console */
const openapiToPostman = require('./index.js'); // Adjust path as needed
const fs = require('fs');
const yaml = require('js-yaml');

// Load an OpenAPI specification (for example, from a file)

let openapiData = yaml.load(
  fs.readFileSync('/Users/ayush.shrivastav@postman.com/Desktop/postman/openapi-to-postman/oas.yaml', 'utf8')
);

// Convert OpenAPI to Postman Collection
openapiToPostman.convertV2WithTypes({ type: 'string', data: openapiData }, { parametersResolution: 'Examples' }, (err, conversionResult) => {
  if (err) {
    console.error('Error during conversion:', err);
  }
  else if (conversionResult.result) {
    console.log('Conversion successful!');
    let opt = JSON.stringify(conversionResult.output[0].data, null, 2);
    console.log(opt);
    console.log('-----------------------------------------');
    console.log('extracted types');
    console.log(JSON.stringify(conversionResult.extractedTypes,null,2));
  }
  else {
    console.log('Conversion failed:', conversionResult.reason);
  }
});
