# allof-merge
<img alt="npm" src="https://img.shields.io/npm/v/allof-merge"> <img alt="npm" src="https://img.shields.io/npm/dm/allof-merge?label=npm"> ![GitHub Workflow Status (with event)](https://img.shields.io/github/actions/workflow/status/udamir/allof-merge/ci.yml)
 <img alt="npm type definitions" src="https://img.shields.io/npm/types/allof-merge"> ![Coveralls branch](https://img.shields.io/coverallsCoverage/github/udamir/allof-merge) <img alt="GitHub" src="https://img.shields.io/github/license/udamir/allof-merge">

Merge schemas with allOf into a more readable composed schema free from allOf.

## Features
- Safe merging of schemas combined with allOf in whole document
- Fastest implmentation - up to x3 times faster then other popular libraries
- Merged schema does not validate more or less than the original schema
- Removes almost all logical impossibilities
- Correctly merge additionalProperties, patternProperties and properties taking into account common validations
- Correctly merge items and additionalItems taking into account common validations
- Supports custom rules to merge other document types and JsonSchema versions
- Supports input with circular references (javaScript references)
- Supports $refs and circular $refs either (internal references only)
- Correctly merge of $refs with sibling content (optionally)
- Correctly merge of combinaries (anyOf, oneOf) with sibling content (optionally)
- Typescript syntax support out of the box
- No dependencies (except json-crawl), can be used in nodejs or browser

## Works perfectly with specifications:

- [JsonSchema](https://json-schema.org/draft/2020-12/json-schema-core.html)
- [OpenApi 3.x](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md)
- [GraphApi](https://github.com/udamir/graphapi)
- ~~Swagger 2.x~~ (roadmap)
- ~~AsyncApi 2.x~~ (roadmap)
- ~~AsyncApi 3.x~~ (roadmap)

## Other libraries
There are some libraries that can merge schemas combined with allOf. One of the most popular is [mokkabonna/json-schema-merge-allof](https://www.npmjs.com/package/json-schema-merge-allof), but it has some limitatons: Does not support circular $refs and no Typescript syntax out of the box.

## External $ref
If schema contains an external $ref, you should bundle it via [api-ref-bundler](https://github.com/udamir/api-ref-bundler) first.

## Installation
```SH
npm install allof-merge --save
```

## Usage

### Nodejs
```ts
import { merge } from 'allof-merge'

const data = {
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

const onMergeError = (msg) => {
  throw new Error(msg)
}

const merged = merge(data, { onMergeError })

console.log(merged)
// {
//   type: 'object',
//   additionalProperties: {
//     type: 'string',
//     minLength: 10,
//     maxLength: 20
//   }
// }

```

### Browsers

A browser version of `allof-merge` is also available via CDN:
```html
<script src="https://cdn.jsdelivr.net/npm/allof-merge@latest/browser/allof-merge.min.js"></script>
```

Reference `allof-merge.min.js` in your HTML and use the global variable `AllOfMerge`.
```HTML
<script>
  var merged = AllOfMerge.merge({ /* ... */ })
</script>
```

## Documentation

### `merge(data: any, options?: MergeOptions)`
Create a copy of `data` with merged allOf schemas:


### Merge options
```ts
interface MergeOptions {
  // source document if merging only part of it
  // (optional) default = data
  source?: any          
  
  // custom merge rules
  // (optional) default = auto select based on the input (jsonSchemaMergeRules, openApiMergeRules, graphapiMergeRules)
  rules?: MergeRules    

  // merge $ref with sibling content
  // (optional) default = false
  mergeRefSibling?: boolean  

  // merge anyOf/oneOf with sibling content
  // (optional) default = false
  mergeCombinarySibling?: boolean  

  // Merge error hook, called on any merge conflicts
  onMergeError?: (message: string, path: JsonPath, values: any[]) => void

  // Ref resolve error hook, called on broken ref
  onRefResolveError?: (message: string, path: JsonPath, ref: string) => void
}
```

### Supported rules
You can find supported rules in the src/rules directory of this repository:
- `jsonSchemaMergeRules(version: "draft-04" | "draft-06")`
- `openApiMergeRules(version: "3.0.x" | "3.1.x")`
- `graphapiMergeRules`

## Benchmark
```
allof-merge x 657 ops/sec ±2.35% (90 runs sampled)
json-schema-merge-allof x 217 ops/sec ±2.03% (86 runs sampled)
Fastest is allof-merge
```

Check yourself:
```SH
npm run benchmark
```

## Contributing
When contributing, keep in mind that it is an objective of `allof-merge` to have no additional package dependencies.

Please run the unit tests before submitting your PR: `yarn test`. Hopefully your PR includes additional unit tests to illustrate your change/modification!

## License

MIT
