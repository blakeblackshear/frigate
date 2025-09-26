# codegen-shell-httpie

>Converts Postman-SDK Request into code snippet for shell-httpie

#### Prerequisites
To run Code-Gen, ensure that you have NodeJS >= v8. A copy of the NodeJS installable can be downloaded from https://nodejs.org/en/download/package-manager.

## Using the Module
The module will expose an object which will have property `convert` which is the function for converting the Postman-SDK request to shell-httpie code snippet and `getOptions` function which returns an array of supported options.

### convert function
Convert function takes three parameters

* `request` - Postman-SDK Request Object

* `options` - options is an object which has following properties
    * `followRedirect` - Boolean denoting whether to redirect a request
    * `requestTimeout` - Integer denoting time after which the request will bail out in milli-seconds

* `callback` - callback function with first parameter as error and second parameter as string for code snippet

##### Example:
```js
var request = new sdk.Request('www.google.com'),  //using postman sdk to create request  
    options = {
        requestTimeout: 200,
        followRedirect: true
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