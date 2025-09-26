# Code-Gen: Postman SDK Request -> Shell-Wget Snippet Converter

This module is used to convert Postman SDK-Request object in Shell-wget variant snippet

#### Prerequisites
To run this repository, ensure that you have NodeJS >= v4. A copy of the NodeJS installable can be downloaded from https://nodejs.org/en/download/package-manager.

## Using the Module
This module exposes two function `convert()` and `getOptions()`

### Convert
 
Convert function sanitizes the inputs, overrides options with the default ones if not provided and return the code snippet in the desired format.

It requires 3 mandatory parameters `request`, `callback` and `options`

* `request` - postman SDK-request object

* `options` is an object with the following properties

    * `indentType` : can be `Tab` or `Space` (default: 'Space')
    * `indentCount` : Integer denoting the number of tabs/spaces required for indentation, range 0-8 (default : for indentType Tab : 2, for indentType Space : 4)
    * `requestTimeout` : Integer denoting time after which the request will bail out in milli-seconds (default: 0 -> never bail out)
    * `trimRequestBody` : Trim request body fields (default: false)
    * `followRedirect` : Boolean denoting whether to redirect a request (default: true)

    These plugin options will be used if no options are passed to the convert function.

* `callback` : callback function with `error` and `snippet` parameters where snippet is the desired output

#### Example
```javascript
sdk = require('postman-collection');

var request = sdk.Request('http://www.google.com'),
    options = {indentType: 'Tab', indentCount: 4, followRediredirect: false, trimRequestBody: true};

convert(request, options, function (err, snippet) {
    if (err) {
        // perform desired action of logging the error
    }
    // perform action with the snippet
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
