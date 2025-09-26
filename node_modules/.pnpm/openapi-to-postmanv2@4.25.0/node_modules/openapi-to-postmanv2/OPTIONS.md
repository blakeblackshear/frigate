id|type|available options|default|description|usage|version
|---|---|---|---|---|---|---|
requestNameSource|enum|URL, Fallback|Fallback|Determines how the requests inside the generated collection will be named. If “Fallback” is selected, the request will be named after one of the following schema values: `summary`, `operationId`, `description`, `url`.|CONVERSION, VALIDATION|v2, v1
indentCharacter|enum|Space, Tab|Space|Option for setting indentation character.|CONVERSION|v2, v1
collapseFolders|boolean|-|true|Importing will collapse all folders that have only one child element and lack persistent folder-level data.|CONVERSION|v1
optimizeConversion|boolean|-|true|Optimizes conversion for large specification, disabling this option might affect the performance of conversion.|CONVERSION|v1
requestParametersResolution|enum|Example, Schema|Schema|Select whether to generate the request parameters based on the [schema](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#schemaObject) or the [example](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#exampleObject) in the schema.|CONVERSION|v1
exampleParametersResolution|enum|Example, Schema|Example|Select whether to generate the response parameters based on the [schema](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#schemaObject) or the [example](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#exampleObject) in the schema.|CONVERSION|v1
disabledParametersValidation|boolean|-|true|Whether disabled parameters of collection should be validated|VALIDATION|v2, v1
parametersResolution|enum|Example, Schema|Schema|Select whether to generate the request and response parameters based on the [schema](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#schemaObject) or the [example](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#exampleObject) in the schema.|CONVERSION|v2, v1
folderStrategy|enum|Paths, Tags|Paths|Select whether to create folders according to the spec’s paths or tags.|CONVERSION|v2, v1
schemaFaker|boolean|-|true|Whether or not schemas should be faked.|CONVERSION|v2, v1
stackLimit|integer|-|10|Number of nesting limit till which schema resolution will happen. Increasing this limit may result in more time to convert collection depending on complexity of specification. (To make sure this option works correctly "optimizeConversion" option needs to be disabled)|CONVERSION|v2, v1
includeAuthInfoInExample|boolean|-|true|Select whether to include authentication parameters in the example request.|CONVERSION|v2, v1
shortValidationErrors|boolean|-|false|Whether detailed error messages are required for request <> schema validation operations.|VALIDATION|v2, v1
validationPropertiesToIgnore|array|-|[]|Specific properties (parts of a request/response pair) to ignore during validation. Must be sent as an array of strings. Valid inputs in the array: PATHVARIABLE, QUERYPARAM, HEADER, BODY, RESPONSE_HEADER, RESPONSE_BODY|VALIDATION|v2, v1
showMissingInSchemaErrors|boolean|-|false|MISSING_IN_SCHEMA indicates that an extra parameter was included in the request. For most use cases, this need not be considered an error.|VALIDATION|v2, v1
detailedBlobValidation|boolean|-|false|Determines whether to show detailed mismatch information for application/json content in the request/response body.|VALIDATION|v2, v1
suggestAvailableFixes|boolean|-|false|Whether to provide fixes for patching corresponding mismatches.|VALIDATION|v2, v1
validateMetadata|boolean|-|false|Whether to show mismatches for incorrect name and description of request|VALIDATION|v2, v1
ignoreUnresolvedVariables|boolean|-|false|Whether to ignore mismatches resulting from unresolved variables in the Postman request|VALIDATION|v2, v1
strictRequestMatching|boolean|-|false|Whether requests should be strictly matched with schema operations. Setting to true will not include any matches where the URL path segments don't match exactly.|VALIDATION|v2, v1
allowUrlPathVarMatching|boolean|-|false|Whether to allow matching path variables that are available as part of URL itself in the collection request|VALIDATION|v2, v1
enableOptionalParameters|boolean|-|true|Optional parameters aren't selected in the collection. Once enabled they will be selected in the collection and request as well.|CONVERSION|v2, v1
keepImplicitHeaders|boolean|-|false|Whether to keep implicit headers from the OpenAPI specification, which are removed by default.|CONVERSION|v2, v1
includeWebhooks|boolean|-|false|Select whether to include Webhooks in the generated collection|CONVERSION|v2, v1
includeReferenceMap|boolean|-|false|Whether or not to include reference map or not as part of output|BUNDLE|v2, v1
includeDeprecated|boolean|-|true|Select whether to include deprecated operations, parameters, and properties in generated collection or not|CONVERSION, VALIDATION|v2, v1
alwaysInheritAuthentication|boolean|-|false|Whether authentication details should be included on every request, or always inherited from the collection.|CONVERSION|v2, v1
preferredRequestBodyType|enum|x-www-form-urlencoded, form-data, raw, first-listed|first-listed|When there are multiple content-types defined in the request body of OpenAPI, the conversion selects the preferred option content-type as request body.If "first-listed" is set, the first content-type defined in the OpenAPI spec will be selected.|CONVERSION|v2
