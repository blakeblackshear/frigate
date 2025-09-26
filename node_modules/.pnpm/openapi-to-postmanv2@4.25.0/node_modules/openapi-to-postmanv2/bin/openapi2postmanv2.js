#!/usr/bin/env node
var _ = require('lodash'),
  program = require('commander'),
  Converter = require('../index.js'),
  fs = require('fs'),
  path = require('path'),
  availableOptions = require('../lib/options').getOptions('use', { usage: ['CONVERSION'] }),
  inputFile,
  outputFile,
  prettyPrintFlag,
  configFile,
  definedOptions,
  testFlag,
  swaggerInput,
  interfaceVersion,
  swaggerData;

/**
 * Parses comma separated options mentioned in command args and generates JSON object
 *
 * @param {String} value - User defined options value
 * @returns {Object} - Parsed option in format of JSON object
 */
function parseOptions (value) {
  let definedOptions = value.split(','),
    parsedOptions = {};

  _.forEach(definedOptions, (definedOption) => {
    let option = definedOption.split('=');

    if (option.length === 2 && _.includes(_.keys(availableOptions), option[0])) {
      try {
        // parse parsable data types (e.g. boolean, integer etc)
        parsedOptions[option[0]] = JSON.parse(option[1]);
      }
      catch (e) {
        // treat value as string if can not be parsed
        parsedOptions[option[0]] = option[1];
      }
    }
    else {
      console.warn('\x1b[33m%s\x1b[0m', 'Warning: Invalid option supplied ', option[0]);
    }
  });

  /**
   * As v2 interface uses parametersResolution instead of previous requestParametersResolution option,
   * override value of parametersResolution if it's not defined and requestParametersResolution is defined
   */
  if (_.has(parsedOptions, 'requestParametersResolution') && !_.has(parsedOptions, 'parametersResolution')) {
    parsedOptions.parametersResolution = parsedOptions.requestParametersResolution;
  }
  return parsedOptions;
}

program
  .version(require('../package.json').version, '-v, --version')
  .option('-s, --spec <spec>', 'Convert given OPENAPI 3.0.0 spec to Postman Collection v2.0')
  .option('-o, --output <output>', 'Write the collection to an output file')
  .option('-t, --test', 'Test the OPENAPI converter')
  .option('-p, --pretty', 'Pretty print the JSON file')
  .option('-i, --interface-version <interfaceVersion>', 'Interface version of convert() to be used')
  .option('-c, --options-config <optionsConfig>', 'JSON file containing Converter options')
  .option('-O, --options <options>', 'comma separated list of options', parseOptions);

program.on('--help', function() {
  /* eslint-disable */
  console.log('    Converts a given OPENAPI specification to POSTMAN Collections v2.1.0   ');
  console.log(' ');
  console.log('    Examples:');
  console.log(' 		Read spec.yaml or spec.json and store the output in output.json after conversion     ');
  console.log('	           ./openapi2postmanv2 -s spec.yaml -o output.json ');
  console.log(' ');
  console.log('	        Read spec.yaml or spec.json and print the output to the Console        ');
  console.log('                   ./openapi2postmanv2 -s spec.yaml ');
  console.log(' ');
  console.log('                Read spec.yaml or spec.json and print the prettified output to the Console');
  console.log('                  ./openapi2postmanv2 -s spec.yaml -p');
  console.log(' ');
  /* eslint-enable */
});

program.parse(process.argv);

inputFile = program.spec;
outputFile = program.output || false;
testFlag = program.test || false;
prettyPrintFlag = program.pretty || false;
interfaceVersion = program.interfaceVersion || 'v2';
configFile = program.optionsConfig || false;
definedOptions = (!(program.options instanceof Array) ? program.options : {});
swaggerInput;
swaggerData;


/**
 * Helper function for the CLI to perform file writes based on the flags
 * @param {Boolean} prettyPrintFlag - flag for pretty printing while writing the file
 * @param {String} file - Destination file to which the write is to be performed
 * @param {Object} collection - POSTMAN collection object
 * @returns {void}
 */
function writetoFile(prettyPrintFlag, file, collection) {
  if (prettyPrintFlag) {
    fs.writeFile(file, JSON.stringify(collection, null, 4), (err) => {
      if (err) { console.log('Could not write to file', err); } // eslint-disable-line no-console
      // eslint-disable-next-line no-console
      console.log('\x1b[32m%s\x1b[0m', 'Conversion successful, collection written to file');
    });
  }
  else {
    fs.writeFile(file, JSON.stringify(collection), (err) => {
      if (err) { console.log('Could not write to file', err); } // eslint-disable-line no-console
      // eslint-disable-next-line no-console
      console.log('\x1b[32m%s\x1b[0m', 'Conversion successful, collection written to file');
    });
  }
}

/**
 * Helper function for the CLI to convert swagger data input
 * @param {String} swaggerData - swagger data used for conversion input
 * @returns {void}
 */
function convert(swaggerData) {
  let options = {},
    convertFn = interfaceVersion === 'v1' ? 'convert' : 'convertV2';

  // apply options from config file if present
  if (configFile) {
    configFile = path.resolve(configFile);
    console.log('Options Config file: ', configFile); // eslint-disable-line no-console
    options = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  }

  // override options provided via cli
  if (definedOptions && !_.isEmpty(definedOptions)) {
    options = definedOptions;
  }

  Converter[convertFn]({
    type: 'string',
    data: swaggerData
  }, options, (err, status) => {
    if (err) {
      return console.error(err);
    }
    if (!status.result) {
      console.log(status.reason); // eslint-disable-line no-console
      process.exit(0);
    }
    else if (outputFile) {
      let file = path.resolve(outputFile);
      console.log('Writing to file: ', prettyPrintFlag, file, status); // eslint-disable-line no-console
      writetoFile(prettyPrintFlag, file, status.output[0].data);
    }
    else {
      console.log(status.output[0].data); // eslint-disable-line no-console
      process.exit(0);
    }
  });
}

if (testFlag) {
  swaggerData = fs.readFileSync(path.resolve(__dirname, '..', 'examples', 'sample-swagger.yaml'), 'utf8');
  convert(swaggerData);
}
else if (inputFile) {
  inputFile = path.resolve(inputFile);
  console.log('Input file: ', inputFile); // eslint-disable-line no-console
  // The last commit removed __dirname while reading inputFile
  // this will fix https://github.com/postmanlabs/openapi-to-postman/issues/4
  // inputFile should be read from the cwd, not the path of the executable
  swaggerData = fs.readFileSync(inputFile, 'utf8');
  convert(swaggerData);
}
else {
  program.emit('--help');
  process.exit(0);
}
