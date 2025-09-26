# Code-Gen: Postman SDK Request -> Rust Snippet Converter

This module is used to convert Postman SDK-Request object into a Rust code snippet.

#### Prerequisites
To run this repository, ensure that you have NodeJS >= v12.

## Using the Module
This module exposes two function `convert()` and `getOptions()`

### Convert
 
Convert function sanitizes the inputs, overrides options with the default ones if not provided and return the code snippet in the desired format.

It requires 3 mandatory parameters `request`, `callback` and `options`

* `request` - postman SDK-request object

* `options` is an object with the following properties

    * `indentType` : can be `Tab` or `Space` (default: 'Space')
    * `indentCount` : Integer denoting the number of tabs/spaces required for indentation, range 0-8 (default : for indentType Tab : 2, for indentType Space : 4)
    * `trimRequestBody` : Trim request body fields (default: false)
    These plugin options will be used if no options are passed to the convert function.

* `callback` : callback function with `error` and `snippet` parameters where snippet is the desired output

#### Example
```javascript
const sdk = require('postman-collection');

const request = sdk.Request('http://www.google.com'),
    options = {indentType: 'Tab', indentCount: 4, trimRequestBody: true};

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
const options = getOptions();

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

### Notes

* This module supports all request types of requests which are present in the Postman App.

* Does not handle cookies or proxies and generates a snippet for the base request.

* Snippet generated is supported for Rust 1.0+ versions.

* Does not support if the request body is passed by means of a binary file.

* User ◊needs to enter the absolute path of the file in the snippet. This just picks the relative path in case of file upload in form data body.

### Resources

* [Rust](https://www.rust-lang.org/) official documentation 
