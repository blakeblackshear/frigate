
<a href="https://www.getpostman.com/"><img src="https://assets.getpostman.com/common-share/postman-logo-horizontal-320x132.png" /></a><br />
_Manage all of your organization's APIs in Postman, with the industry's most complete API development environment._

*Supercharge your API workflow.*  
*Modern software is built on APIs. Postman helps you develop APIs faster.*

# postman-code-generators

This module converts a [Postman SDK](https://github.com/postmanlabs/postman-collection) Request [Object](https://www.postmanlabs.com/postman-collection/Request.html) into a code snippet of chosen language.

Every code generator has two identifiers: `language` and `variant`.
* `language` of a code generator is the programming language in which the code snippet is generated.
* `variant` of a code generator is the methodology or the underlying library used by the language to send requests. 
 
List of supported code generators: 

| Language | Variant        |
|-----------|---------------|
| C | libcurl |
| C# | HttpClient |
| C# | RestSharp | 
| cURL | cURL | 
| Dart | http | 
| Go | Native | 
| HTTP | HTTP | 
| Java | OkHttp |
| Java | Unirest |
| JavaScript | Fetch | 
| JavaScript | jQuery | 
| JavaScript | XHR |
| Kotlin | OkHttp |
| NodeJs | Axios | 
| NodeJs | Native |
| NodeJs | Request |
| NodeJs | Unirest |
| Objective-C| NSURLSession|
| OCaml | Cohttp | 
| PHP | cURL |
| PHP | Guzzle |
| PHP | pecl_http |
| PHP | HTTP_Request2 |
| PowerShell | RestMethod | 
| Python | http.client |
| Python | Requests |
| R | httr |
| R | RCurl |
| Rust | Reqwest |
| Ruby | Net:HTTP |
| Shell | Httpie |
| Shell | wget |
| Swift | URLSession | 
## Table of contents 

- [postman-code-generators
  - [Table of contents](#table-of-contents)
  - [Getting Started](#getting-started)
  - [Prerequisite](#prerequisite)
  - [Usage](#usage)
    - [Using postman-code-generators as a Library](#using-postman-code-generators-as-a-library)
      - [getLanguageList](#getlanguagelist)
        - [Example:](#example)
      - [getOptions](#getoptions)
        - [Example:](#example-1)
      - [convert](#convert)
        - [Example:](#example-2)
  - [Development](#development)
    - [Installing dependencies](#installing-dependencies)
    - [Testing](#testing)
    - [Packaging](#packaging)
  - [Contributing](#contributing)
  - [License](#license)

## Getting Started
To install postman-code-generators as your dependency
```bash
$ npm install postman-code-generators
```
To get a copy on your local machine
```bash
$ git clone https://github.com/postmanlabs/postman-code-generators.git
```

## Prerequisite
To run any of the postman-code-generators, ensure that you have NodeJS >= v8. A copy of the NodeJS installable can be downloaded from https://nodejs.org/en/download/package-manager.

## Usage

### Using postman-code-generators as a Library 
There are three functions that are exposed in postman-code-generators: getLanguageList, getOptions, and convert.

#### getLanguageList
This function returns a list of supported code generators. 

##### Example:
```js
var codegen = require('postman-code-generators'), // require postman-code-generators in your project
    supportedCodegens = codegen.getLanguageList();
    console.log(supportedCodegens);
    // output:
    // [
    //   {
    //     key: 'nodejs',
    //     label: 'NodeJs',
    //     syntax_mode: 'javascript',
    //     variant: [
    //       {
    //         key: 'Requests'
    //       },
    //       {
    //         key: 'Native'
    //       },
    //       {
    //         key: 'Unirest'
    //       }
    //     ]
    //   },
    //   ...
    // ]
```

#### getOptions 

This function takes in three parameters and returns a callback  with error and supported options of that code generator.

* `language` - language key from the language list returned from getLanguageList function
* `variant` - variant key provided by getLanguageList function
* `callback` - callback function with first parameter as error and second parameter as array of options supported by the codegen.

A typical option has the following properties:
* `name` - Display name
* `id` - unique ID of the option
* `type` - Data type of the option. (Allowed data types: `boolean`, `enum`, `positiveInteger`)
* `default` - Default value. The value that is used if this option is not specified while creating code snippet
* `description` - User friendly description.

##### Example:
```js
var codegen = require('postman-code-generators'), // require postman-code-generators in your project
    language = 'nodejs',
    variant = 'Request';

    codegen.getOptions(language, variant, function (error, options) {
      if (error) {
        // handle error
      }
      console.log(options);
    });
// output: 
//     [
//     {
//       name: 'Set indentation count',
//       id: 'indentCount',
//       type: 'positiveInteger',
//       default: 2,
//       description: 'Set the number of indentation characters to add per code level'
//     },
//     {
//       name: 'Set indentation type',
//       id: 'indentType',
//       type: 'enum',
//       availableOptions: ['Tab', 'Space'],
//       default: 'Space',
//       description: 'Select the character used to indent lines of code'
//     },
//     ...
//   ];
```

#### convert 
This function takes in five parameters and returns a callback with error and generated code snippet
* `language` - lang key from the language list returned from getLanguageList function
* `variant` - variant key provided by getLanguageList function
* `request` - [Postman-SDK](https://github.com/postmanlabs/postman-collection) Request [Object](https://www.postmanlabs.com/postman-collection/Request.html)
* `options` - Options that can be used to configure generated code snippet. Defaults will be used for the unspecified attributes  
* `callback` - callback function with first parameter as error and second parameter as string for code snippet

##### Example:
```js
var codegen = require('postman-code-generators'), // require postman-code-generators in your project
    sdk = require('postman-collection'), // require postman-collection in your project
    request = new sdk.Request('https://www.google.com'),  //using postman sdk to create request 
    language = 'nodejs',
    variant = 'request',
    options = {
        indentCount: 3,
        indentType: 'Space',
        trimRequestBody: true,
        followRedirect: true
    };
codegen.convert(language, variant, request, options, function(error, snippet) {
    if (error) {
        //  handle error
    }
    //  handle snippet
});
```
## Development


### Installing dependencies
This command will install all the dependencies in production mode.
```bash
$ npm install;
```
To install dev dependencies also for all codegens run: 
```bash
$ npm run deepinstall dev; 
```
### Testing 
To run common repo test as well as tests (common structure test + individual codegen tests) for all the codegens
```bash
$ npm test; 
```
To run structure and individual tests on a single codegen
```bash
$ npm test <codegen-name>;
# Here "codege-name" is the folder name of the codegen inside codegens folder
```
### Packaging 
To create zipped package of all codegens
```bash
$ npm run package;
```
**Note:** The zipped package is created inside each codegen's folder.

To create zipped package of a single codegen
```bash
$ npm run package <codegen-name>
```

## Contributing
Please take a moment to read our [contributing guide](https://github.com/postmanlabs/postman-code-generators/blob/master/CONTRIBUTING.md) to learn about our development process.
Open an [issue](https://github.com/postmanlabs/postman-code-generators/issues) first to discuss potential changes/additions.

## License
This software is licensed under Apache-2.0. Copyright Postman, Inc. See the [LICENSE.md](LICENSE.md) file for more information.
