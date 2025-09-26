# codegen-curl

> Converts Postman-SDK Request into code snippet for cURL.

#### Prerequisites
To run Code-Gen, ensure that you have NodeJS >= v8. A copy of the NodeJS installable can be downloaded from 

## Using the Module
The module will expose an object which will have property `convert` which is the function for converting the Postman-SDK request to cURL code snippet and `getOptions` function which returns an array of supported options.

### convert function
Convert function takes three parameters

* `request` - Postman-SDK Request Object

* `options` - options is an object which has following properties
    * `indentType` - String denoting type of indentation for code snippet. eg: 'Space', 'Tab'
    * `indentCount` - The number of indentation characters to add per code level
    * `trimRequestBody` - Trim request body fields
    * `followRedirect` - Boolean denoting whether to redirect a request
    * `requestTimeoutInSeconds` - Integer denoting time after which the request will bail out in seconds
    * `multiLine` - Boolean denoting whether to output code snippet with multi line breaks
    * `longFormat` - Boolean denoting whether to use longform cURL options in snippet
    * `quoteType` - String denoting the quote type to use (single or double) for URL

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
        longFormat: true,
        quoteType: 'single'
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
//       {
//         name: 'Set indentation count',
//         id: 'indentCount',
//         type: 'positiveInteger',
//         default: 2,
//         description: 'Set the number of indentation characters to add per code level'
//       },
//       ...
// ]
```
### Guidelines for using generated snippet

* Since Postman-SDK Request object doesn't provide complete path of the file, it needs to be manually inserted in case of uploading a file.

* This module doesn't support cookies.
