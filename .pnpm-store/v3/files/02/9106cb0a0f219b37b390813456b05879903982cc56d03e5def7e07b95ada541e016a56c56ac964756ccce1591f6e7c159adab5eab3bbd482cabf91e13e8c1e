
> Converts Postman-SDK Request into code snippet for Dart http.

#### Prerequisites
To run Code-Gen, ensure that you have NodeJS >= v8. A copy of the NodeJS installable can be downloaded from https://nodejs.org/en/download/package-manager.

## Using the Module
The module will expose an object which will have property `convert` which is the function for converting the Postman-SDK request to Dart http code snippet.

### convert function
Convert function takes three parameters

* `request` - Postman-SDK Request Object

* `options` - options is an object which hsa following properties
    * `indentType` - String denoting type of indentation for code snippet. eg: 'Space', 'Tab'
    * `indentCount` - The number of indentation characters to add per code level
    * `trimRequestBody` - Whether or not request body fields should be trimmed
    * `includeBoilerplate` - Include class definition and import statements in snippet
    * `followRedirect` - Automatically follow HTTP redirects

* `callback` - callback function with first parameter as error and second parameter as string for code snippet

##### Example:
```js
var request = new sdk.Request('www.google.com'),  //using postman sdk to create request  
    options = {
        indentCount: 3,
        indentType: 'Space',
        requestTimeout: 200,
        trimRequestBody: true
    };
convert(request, options, function(error, snippet) {
    if (error) {
        //  handle error
    }
    //  handle snippet
});
```
### Guidelines for using generated snippet

* This module doesn't support cookies.
