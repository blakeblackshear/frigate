
# Contributing to Postman Code Generators



  - [Getting Started Quick](#getting-started-quick)
  - [NPM Command Reference](#npm-command-reference)
  - [Repository](#repository)
  - [General Instructions](#general-instructions)
  - [Pull request guidelines](#pull-request-guidelines)
  - [Tests](#tests)
  - [Build Failures](build-failures)
  - [Security guidelines](security-guidelines)

## Getting Started Quick

Instructions on initial setup can be found in the [README](/README.md).

## NPM Command Reference

#### `npm install`

Installs all `dependencies` listed in the root `package.json` and all the codegens.

#### `npm run deepinstall`

Installs all `dependencies` of all the codegens. This runs the command `npm install --production --no-audit` in all codegens.

* `npm run deepinstall dev`: Installs all dependencies as well as devDependencies of all codegens.

#### `npm test`

The script associated with `npm test` will run all tests that ensures that your commit does not break anything in the
repository. Additional requirements to run these tests have been listed down in [ADDITIONAL_DEPENDENCIES](/ADDITIONAL_DEPENDENCIES.md)

* `npm test`: Runs structure, unit, newman and system tests for all codegens
* `npm run test <codegen-name>`: Runs tests for a particular codegen.


#### `npm run boilerplate <codegen-name>`

The command will add a new boilerplate code generator with the name <codegen-name> with basic functions and tests, along with the right `package.json` structure. The format of the codegen name preferably should be `language-variant`. Please refer the [README](https://github.com/postmanlabs/postman-code-generators/blob/master/README.md) document.

#### `npm run cirequirements`

The script associated with this command installs all the additional dependencies that are required to run the generated code snippet on travis. These are important to run the [newman tests](#tests) on travis. 

## Repository

Directory               | Summary
------------------------|-----------------------------------------------------------------------------------------------
`codegens`              | Contains modules for individual language/framework code generators
`lib`                   | Contains code needed to orchestrate conversion with individual code generation modules. This is the part that the Postman app interfaces with.
`npm`                   | All CI/build/installation scripts (triggered by NPM run-script)
`test`                  | Contains test-scripts
`test/codegen`          | Runs functional tests on the individual generation modules
`test/system`           | Checks for proper code structuring and division across the code generators

### Codegen

Every codegen has the following structure.

Directory/File          | Summary
------------------------|-----------------------------------------------------------------------------------------------
`lib`                   | Contains code needed to convert a Postman SDK request to code snippet.
`npm`                   | All CI/build/installation scripts (triggered by NPM run-script)
`test`                  | Contains unit and newman tests.
`test/newman`           | Runs [newman tests](#tests) 
`test/unit`             | Runs unit tests
`index.js`              | Exposes two functions: convert and getOptions

## General Instructions

### Types of contributions
One of the following two contributions are possible for postman-code-generators:
  - New Code Generator: To add a new code generator, create a pull request to the develop branch of postman-code-generators. Since these code-generators are bundled with the app, they follow a particular structure as mentioned above. We have created a boilerplate for you to get started quickly. Simple run:
  
  ```bash
  $ npm run boilerplate <<codegen-name>>
  ```

  - Bug fixes to existing codegens: We'd be happy to accept fixes to known issues in any of the code-generators, as long it's a filed issue on the [issue tracker](https://github.com/postmanlabs/postman-code-generators/issues). 

### Pull request guidelines

  - All pull requests should be to the develop branch. 
  - Every pull request should have associated issue(s) on our [issue tracker](https://github.com/postmanlabs/postman-code-generators/issues).
  - For any non-trivial fixes, regression tests should be added as well. For a bug, we also recommend adding a request to the `testCollection.json` found inside `test/codegen/newman/fixtures` to run the request using common newman tests.
  - For a new language to be added as a part of postman-code-generators, we will need some level of community support before we are able to accept the pull request. Feel free to add links to any sort of report/statistics from trusted sources that might help us understand the relevance and popularity of this language among users.


## Tests
The CI pipeline on travis will check for code structure across all code generators, and runs functional tests. 

### Newman Test 

Newman tests run a set of fixed collections in [Newman](https://github.com/postmanlabs/newman), and run each request through the corresponding code generator, and execute it through the relevant interpreter. The responses from Newman and the language interpreter are compared. Currently, there are a set of 3 collections, basicCollection - has a set of some basic requests that every codegen running newman tests has to run, formdataCollection - has requests relating to form-data mode of data transfer and redirectCollection - has requests with follow redirects enabled. Apart from basicCollection all other collections may be skipped for running newman tests with valid reasons.

This mechanism is present in `test/codegen/newman`. All you need to run these tests is to call the following function:

```js
var runNewmanTest = require(PATH_TO_NEWMAN_UTIL_FOLDER).runNewmanTest;

runNewmanTest(conver, options, testConfig);
```
* convert - The convert function of the codegen to be tested
* options - Options object to generate appropriate code snippet
* testConfig - These are the test configuration required to compile and run the code snippet.

#### Example for Java Okhttp: 
```js
var convert = require('../../index').convert,
  options = {
    includeBoilerplate: true
  },
  testConfig = {
    fileName: 'main.java', // The file in which the code snippet has to be saved to later compile and run
    compileScript: 'javac -cp *: main.java', // The script required to compile generated code snippet.
    runScript: 'java -cp *: main', // The script required to run the generated code snippet.
    skipCollections: [] // Collections that need to be skipped for testing for a particular codegen.
    // The collection through which newman tests are run will be found inside the `test/codegen/newman/fixtures`. 
  }
```

For some languages, it's not practical to run an interpreter for generated code. The JS-jQuery is an example. In such cases, the output of the conversion is compared against a known snippet that we know works correctly.

## Build Failures
Some common reasons for travis build failures:
- If you've added a new code generator, you might have to add some dependencies in `npm/ci-requirements` for running the code snippet on travis. We use the [xenial build](https://docs.travis-ci.com/user/reference/xenial/) of travis. If appropriate dependencies are not added, the newman tests for the codegen will fail.
- Use of `sudo` before bash commands. This is enforced by travis and not adding this will throw error.

## Security guidelines
If you've found a vulnerability, or want additional information regarding how we manage security, please send an email to security@getpostman.com. We will review it and respond to you within 24 hours. Please use our [PGP public key](https://assets.getpostman.com/getpostman/documents/publickey.txt) to encrypt your communications with us.

