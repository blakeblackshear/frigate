# json-schema-merge-allof [![Build Status](https://travis-ci.org/mokkabonna/json-schema-merge-allof.svg?branch=master)](https://travis-ci.org/mokkabonna/json-schema-merge-allof) [![Coverage Status](https://coveralls.io/repos/github/mokkabonna/json-schema-merge-allof/badge.svg?branch=master)](https://coveralls.io/github/mokkabonna/json-schema-merge-allof?branch=master)

> Merge schemas combined using allOf into a more readable composed schema free from allOf.

```bash
npm install json-schema-merge-allof --save
```

## Features

- **Real** and **safe** merging of schemas combined with **allOf**
- Takes away all allOf found in the whole schema
- Lossless in terms of validation rules, merged schema does not validate more or less than the original schema
- Results in a more readable root schema
- Removes almost all logical impossibilities
- Throws if no logical intersection is found (your schema would not validate anything from the start)
- Validates in a way not possible by regular simple meta validators
- Correctly considers additionalProperties, patternProperties and properties as a part of an whole when merging schemas containing those
- Correctly considers items and additionalItems as a whole when merging schemas containing those
- Supports merging schemas with items as array and direct schema
- Supports merging dependencies when mixed array and schema
- Supports all JSON schema core/validation keywords (v6, use custom resolvers to support other keywords)
- Option to override common impossibility like adding properties when using **additionalProperties: false**
- Pluggable keyword resolvers

## How

Since allOf require ALL schemas provided (including the parent schema) to apply, we can iterate over all the schemas, extracting all the values for say, **type**, and find the **intersection** of valid values. Here is an example:

```js
{
  type: ['object', 'null'],
  additionalProperties: {
    type: 'string',
    minLength: 5
  },
  allOf: [{
    type: ['array', 'object'],
    additionalProperties: {
      type: 'string',
      minLength: 10,
      maxLength: 20
    }
  }]
}
```

This result in the schema :
```js
{
  type: 'object',
  additionalProperties: {
    type: 'string',
    minLength: 10,
    maxLength: 20
  }
}
```

Notice that type now excludes null and array since those are not logically possible. Also minLength is raised to 10. The other properties have no conflict and are merged into the root schema with no resolving needed.

For other keywords other methods are used, here are some simple examples:

- minLength, minimum, minItems etc chooses the **highest** value of the conflicting values.
- maxLength, maximum, maxItems etc chooses the **lowest** value of the conflicting values.
- uniqueItems is true if **any** of the conflicting values are true

As you can see above the strategy is to choose the **most** restrictive of the set of values that conflict. For some keywords that is done by intersection, for others like **required** it is done by a union of all the values, since that is the most restrictive.

What you are left with is a schema completely free of allOf. Except for in a couple of values that are impossible to properly intersect/combine:

### not

When multiple conflicting **not** values are found, we also use the approach that pattern use, but instead of allOf we use anyOf. When extraction of common rules from anyOf is in place this can be further simplified.

## Options
**ignoreAdditionalProperties** default **false**

Allows you to combine schema properties even though some schemas have `additionalProperties: false` This is the most common issue people face when trying to expand schemas using allOf and a limitation of the json schema spec. Be aware though that the schema produced will allow more than the original schema. But this is useful if just want to combine schemas using allOf as if additionalProperties wasn't false during the merge process. The resulting schema will still get additionalProperties set to false.

**deep** boolean, default *true*
If false, resolves only the top-level `allOf` keyword in the schema.

If true, resolves all `allOf` keywords in the schema.


**resolvers** Object
Override any default resolver like this:

```js
mergeAllOf(schema, {
  resolvers: {
    title: function(values, path, mergeSchemas, options) {
      // choose what title you want to be used based on the conflicting values
      // resolvers MUST return a value other than undefined
    }
  }
})
```

The function is passed:

- **values** an array of the conflicting values that need to be resolved
- **path** an array of strings containing the path to the position in the schema that caused the resolver to be called (useful if you use the same resolver for multiple keywords, or want to implement specific logic for custom paths)
- **mergeSchemas** a function you can call that merges an array of schemas
- **options** the options mergeAllOf was called with


### Combined resolvers
Some keyword are dependant on other keywords, like properties, patternProperties, additionalProperties. To create a resolver for these the resolver requires this structure:

```js
mergeAllOf(schema, {
  resolvers: {
    properties:
      keywords: ['properties', 'patternProperties', 'additionalProperties'],
      resolver(values, parents, mergers, options) {

      }
    }
  }
})
```

This type of resolvers are expected to return an object containing the resolved values of all the associated keywords. The keys must be the name of the keywords. So the properties resolver need to return an object like this containing the resolved values for each keyword:

```js
{
    properties: ...,
    patternProperties: ...,
    additionalProperties: ...,
}
```

Also the resolve function is not passed **mergeSchemas**, but an object **mergers** that contains mergers for each of the related keywords. So properties get passed an object like this:

```js
const mergers = {
    properties: function mergeSchemas(schemas, childSchemaName){...},
    patternProperties: function mergeSchemas(schemas, childSchemaName){...},
    additionalProperties: function mergeSchemas(schemas){...},
}
```

Some of the mergers requires you to supply a string of the name or index of the subschema you are currently merging. This is to make sure the path passed to child resolvers are correct.

### Default resolver
You can set a default resolver that catches any unknown keyword. Let's say you want to use the same strategy as the ones for the meta keywords, to use the first value found. You can accomplish that like this:

```js
mergeJsonSchema({
  ...
}, {
  resolvers: {
    defaultResolver: mergeJsonSchema.options.resolvers.title
  }
})
```


## Resolvers

Resolvers are called whenever multiple conflicting values are found on the same position in the schemas.

You can override a resolver by supplying it in the options.

### Lossy vs lossless

All built in reducers for validation keywords are lossless, meaning that they don't remove or add anything in terms of validation.

For meta keywords like title, description, $id, $schema, default the strategy is to use the first possible value if there are conflicting ones. So the root schema is prioritized. This process possibly removes some meta information from your schema. So it's lossy. Override this by providing custom resolvers.


## $ref

If one of your schemas contain a $ref property you should resolve them using a ref resolver like [json-schema-ref-parser](https://github.com/BigstickCarpet/json-schema-ref-parser) to dereference your schema for you first. Resolving $refs is not the task of this library.


## Other libraries

There exists some libraries that claim to merge schemas combined with allOf, but they just merge schemas using a **very** basic logic. Basically just the same as lodash merge. So you risk ending up with a schema that allows more or less than the original schema would allow.


## Restrictions

We cannot merge schemas that are a logical impossibility, like:

```js
{
  type: 'object',
  allOf: [{
    type: 'array'
  }]
}
```

The library will then throw an error reporting the values that had no valid intersection. But then again, your original schema wouldn't validate anything either.


## Roadmap

- [x] Treat the interdependent validations like properties and additionalProperties as one resolver (and items additionalItems)
- [ ] Extract repeating validators from anyOf/oneOf and merge them with parent schema
- [ ] After extraction of validators from anyOf/oneOf, compare them and remove duplicates.
- [ ] If left with only one in anyOf/oneOf then merge it to the parent schema.
- [ ] Expose seperate tools for validation, extraction
- [ ] Consider adding even more logical validation (like minLength <= maxLength)

## Contributing

Create tests for new functionality and follow the eslint rules.

## License

MIT © [Martin Hansen](http://martinhansen.com)
