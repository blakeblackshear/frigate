# codegen-http

> Converts Postman-SDK Request into code snippet for RAW HTTP request.

#### Prerequisites
To run Code-Gen, ensure that you have NodeJS >= v8. A copy of the NodeJS installable can be downloaded from 

## Using the Module
The module will expose an object which will have property `convert` which is the function for converting the Postman-SDK request to HTTP spec and `getOptions` function which returns an array of supported options.

### convert function
Convert function takes three parameters

* `request` - Postman-SDK Request Object

* `options` - options is an object which has following properties
    * `trimRequestBody` - Trim request body fields

* `callback` - callback function with first parameter as error and second parameter as string for code snippet

##### Example:
```js
var request = new sdk.Request('www.google.com'),  //using postman sdk to create request  
    options = {
        indentCount: 3,
        indentType: 'Space',
        requestTimeout: 200,
        trimRequestBody: true,
        multiLine: true,
        followRedirect: true,
        longFormat: true
    };
convert(request, options, function(error, snippet) {
    if (error) {
        //  handle error
    }
    //  handle snippet
});
```
### getOptions function

This function returns a list of options supported by this codegen.

#### Example
```js
var options = getOptions();

console.log(options);
// output
// [
//    {
//      name: 'Trim request body fields',
//      id: 'trimRequestBody',
//      type: 'boolean',
//      default: false,
//      description: 'Remove white space and additional lines that may affect the server\'s response'
//    }
// ]
```
### Guidelines for using generated snippet

* Since Postman-SDK Request object doesn't provide complete path of the file, it needs to be manually inserted in case of uploading a file.

* This module doesn't support cookies.
