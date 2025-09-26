![XML ⇔ JS/JSON](http://nashwaan.github.io/xml-js/images/logo.svg)

Convert XML text to Javascript object / JSON text (and vice versa).

[![Build Status](https://ci.appveyor.com/api/projects/status/0ky9f115m0f0r0gf?svg=true)](https://ci.appveyor.com/project/nashwaan/xml-js)
[![Build Status](https://travis-ci.org/nashwaan/xml-js.svg?branch=master)](https://travis-ci.org/nashwaan/xml-js)
[![Build Status](https://img.shields.io/circleci/project/nashwaan/xml-js.svg)](https://circleci.com/gh/nashwaan/xml-js)
<!-- [![pipeline status](https://gitlab.com/nashwaan/xml-js/badges/master/pipeline.svg)](https://gitlab.com/nashwaan/xml-js/commits/master) -->

[![Coverage Status](https://coveralls.io/repos/github/nashwaan/xml-js/badge.svg?branch=master)](https://coveralls.io/github/nashwaan/xml-js?branch=master)
[![codecov](https://codecov.io/gh/nashwaan/xml-js/branch/master/graph/badge.svg)](https://codecov.io/gh/nashwaan/xml-js)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/f6ed5dd79a5b4041bfd2732963c4d09b)](https://www.codacy.com/app/ysf953/xml-js?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=nashwaan/xml-js&amp;utm_campaign=Badge_Grade)
[![Code Climate](https://codeclimate.com/github/nashwaan/xml-js/badges/gpa.svg)](https://codeclimate.com/github/nashwaan/xml-js)

[![npm](http://img.shields.io/npm/v/xml-js.svg)](https://www.npmjs.com/package/xml-js)
[![License](https://img.shields.io/npm/l/xml-js.svg)](LICENSE)
[![Downloads/month](https://img.shields.io/npm/dm/xml-js.svg)](http://www.npmtrends.com/xml-js)
[![Dependency Status](https://david-dm.org/nashwaan/xml-js.svg)](https://david-dm.org/nashwaan/xml-js)
[![Package Quality](http://npm.packagequality.com/shield/xml-js.svg)](http://packagequality.com/#?package=xml-js)

# Synopsis

![Convert XML ↔ JS/JSON as compact or non-compact](http://nashwaan.github.io/xml-js/images/synopsis.svg)
<!---![Convert XML ↔ JS/JSON as compact or non-compact](/synopsis.png?raw=true "Synopsis Diagram")-->

# Features

* **Maintain Order of Elements**:
Most libraries will convert `<a/><b/><a/>` to `{a:[{},{}],b:{}}` which merges any node of same name into an array. This library can create the following to preserve the order of elements:
`{"elements":[{"type":"element","name":"a"},{"type":"element","name":"b"},{"type":"element","name":"a"}]}`.

This is very important and it is the main reason why this library was created. Read also [Compact vs Non-Compact](#compact-vs-non-compact) for more info.

* **Fully XML Compliant**:
Can parse: elements, attributes, texts, comments, CData, DOCTYPE, XML declarations, and Processing Instructions.

* **Reversible**:
Whether converting xml→json or json→xml, the result can be converted back to its original form.

* **Minimal Dependencies**:
This library depends only on one external npm module.

* **Change Property Key Name**:
Usually output of XML attributes are stored in `@attr`, `_atrr`, `$attr` or `$` in order to avoid conflicting with name of sub-elements.
This library store them in `attributes`, but most importantly, you can change this to whatever you like.

* **Support Upwards Traversal**:
By setting `{addParent: true}` option, an extra property named `parent` will be generated along each element so that its parent can be referenced.
Therefore, anywhere during the traversal of an element, its children **and** its parent can be easily accessed.

* **Support Command Line**:
To quickly convert xml or json files, this module can be installed globally or locally (i.e. use it as [script](https://docs.npmjs.com/misc/scripts) in package.json).

* **Customize Processing using Callback Hooks**:
[Custom functions](#options-for-custom-processing-functions) can be supplied to do additional processing for different parts of xml or json (like cdata, comments, elements, attributes ...etc).

* **Portable Code**:
Written purely in JavaScript which means it can be used in Node environment and **browser** environment (via bundlers like browserify/JSPM/Webpack).

* **Typings Info Included**:
Support type checking and code suggestion via intellisense.
Thanks to the wonderful efforts by [DenisCarriere](https://github.com/DenisCarriere).

## Compact vs Non-Compact

Most XML to JSON converters (including online converters) convert `<a/>` to some compact output like `{"a":{}}`
instead of non-compact output like `{"elements":[{"type":"element","name":"a"}]}`.

While compact output might work in most situations, there are cases when elements of different names are mixed inside a parent element. Lets use `<a x="1"/><b x="2"/><a x="3"/>` as an example.
Most converters will produce compact output like this `{a:[{_:{x:"1"}},{_:{x:"3"}}], b:{_:{x:"2"}}}`,
which has merged both `<a>` elements into an array. If you try to convert this back to xml, you will get `<a x="1"/><a x="3"/><b x="2"/>`
which has not preserved the order of elements!

The reason behind this behavior is due to the inherent limitation in the compact representation. 
Because output like `{a:{_:{x:"1"}}, b:{_:{x:"2"}}, a:{_:{x:"3"}}}` is illegal (same property name `a` should not appear twice in an object). This leaves no option but to use array `{a:[{_:{x:"1"}},{_:{x:"3"}}]`.

The non-compact output, which is supported by this library, will produce more information and always guarantees the order of the elements as they appeared in the XML file.

Another drawback of compact output is the resultant element can be an object or an array and therefore makes the client code a little awkward in terms of the extra check needed on object type before processing.

NOTE: Although non-compact output is more accurate representation of original XML than compact version, the non-compact version is verbose and consumes more space.
This library provides both options. Use `{compact: false}` if you are not sure because it preserves everything;
otherwise use `{compact: true}` if you want to save space and you don't care about mixing elements of same name and losing their order.

Tip: You can reduce the output size by using shorter [key names](#options-for-changing-key-names).

# Usage

## Installation

```
npm install --save xml-js
```

You can also install it globally to use it as a command line convertor (see [Command Line](#command-line)).

```
npm install --global xml-js
```

## Quick start

```js
var convert = require('xml-js');
var xml =
'<?xml version="1.0" encoding="utf-8"?>' +
'<note importance="high" logged="true">' +
'    <title>Happy</title>' +
'    <todo>Work</todo>' +
'    <todo>Play</todo>' +
'</note>';
var result1 = convert.xml2json(xml, {compact: true, spaces: 4});
var result2 = convert.xml2json(xml, {compact: false, spaces: 4});
console.log(result1, '\n', result2);
```

To see the result of this code, see the output above in [Synopsis](#synopsis) section.

Or [run and edit](https://runkit.com/587874e079a2f60013c1f5ac/587874e079a2f60013c1f5ad) this code live in the browser.

## Sample Conversions

| XML | JS/JSON compact | JS/JSON non-compact |
|:----|:----------------|:--------------------|
| `<a/>` | `{"a":{}}` | `{"elements":[{"type":"element","name":"a"}]}` |
| `<a/><b/>` | `{"a":{},"b":{}}` | `{"elements":[{"type":"element","name":"a"},{"type":"element","name":"b"}]}` |
| `<a><b/></a>` | `{"a":{"b":{}}}` | `{"elements":[{"type":"element","name":"a","elements":[{"type":"element","name":"b"}]}]}` |
| `<a> Hi </a>` | `{"a":{"_text":" Hi "}}` | `{"elements":[{"type":"element","name":"a","elements":[{"type":"text","text":" Hi "}]}]}` |
| `<a x="1.234" y="It's"/>` | `{"a":{"_attributes":{"x":"1.234","y":"It's"}}}` | `{"elements":[{"type":"element","name":"a","attributes":{"x":"1.234","y":"It's"}}]}` |
| `<?xml?>` | `{"_declaration":{}}` | `{"declaration":{}}` |
| `<?go there?>` | `{"_instruction":{"go":"there"}}` | `{"elements":[{"type":"instruction","name":"go","instruction":"there"}]}` |
| `<?xml version="1.0" encoding="utf-8"?>` | `{"_declaration":{"_attributes":{"version":"1.0","encoding":"utf-8"}}}` | `{"declaration":{"attributes":{"version":"1.0","encoding":"utf-8"}}}` |
| `<!--Hello, World!-->` | `{"_comment":"Hello, World!"}` | `{"elements":[{"type":"comment","comment":"Hello, World!"}]}` |
| `<![CDATA[<foo></bar>]]>` | `{"_cdata":"<foo></bar>"}` | `{"elements":[{"type":"cdata","cdata":"<foo></bar>"}]}` |

# API Reference

This library provides 4 functions: `js2xml()`, `json2xml()`, `xml2js()`, and `xml2json()`. Here are the usages for each one (see more details in the following sections):
```js
var convert = require('xml-js');
result = convert.js2xml(js, options);     // to convert javascript object to xml text
result = convert.json2xml(json, options); // to convert json text to xml text
result = convert.xml2js(xml, options);    // to convert xml text to javascript object
result = convert.xml2json(xml, options);  // to convert xml text to json text
```

## Convert JS object / JSON → XML

To convert JavaScript object to XML text, use `js2xml()`. To convert JSON text to XML text, use `json2xml()`.

```js
var convert = require('xml-js');
var json = require('fs').readFileSync('test.json', 'utf8');
var options = {compact: true, ignoreComment: true, spaces: 4};
var result = convert.json2xml(json, options);
console.log(result);
```

### Options for Converting JS object / JSON → XML

The below options are applicable for both `js2xml()` and `json2xml()` functions.


| Option                | Default | Description |
|:----------------------|:--------|:------------|
| `spaces`              | `0`     | Number of spaces to be used for indenting XML output. Passing characters like `' '` or `'\t'` are also accepted. |
| `compact`             | `false` | Whether the *input* object is in compact form or not. By default, input is expected to be in non-compact form. |
|                       |         | IMPORTANT: Remeber to set this option `compact: true` if you are supplying normal json (which is likely equivalent to compact form). Otherwise, the function assumes your json input is non-compact form and you will not get a result if it is not in that form. See [Synopsis](#synopsis) to know the difference between the two json forms |
| `fullTagEmptyElement` | `false` | Whether to produce element without sub-elements as full tag pairs `<a></a>` rather than self closing tag `<a/>`. |
| `indentCdata`         | `false` | Whether to write CData in a new line and indent it. Will generate `<a>\n <![CDATA[foo]]></a>` instead of `<a><![CDATA[foo]]></a>`. See [discussion](https://github.com/nashwaan/xml-js/issues/14) |
| `indentAttributes`    | `false` | Whether to print attributes across multiple lines and indent them (when `spaces` is not `0`). See [example](https://github.com/nashwaan/xml-js/issues/31). |
| `ignoreDeclaration`   | `false` | Whether to ignore writing declaration directives of xml. For example, `<?xml?>` will be ignored. |
| `ignoreInstruction`   | `false` | Whether to ignore writing processing instruction of xml. For example, `<?go there?>` will be ignored. |
| `ignoreAttributes`    | `false` | Whether to ignore writing attributes of the elements. For example, `x="1"` in `<a x="1"></a>` will be ignored |
| `ignoreComment`       | `false` | Whether to ignore writing comments of the elements. That is, no `<!--  -->` will be generated. |
| `ignoreCdata`         | `false` | Whether to ignore writing CData of the elements. That is, no `<![CDATA[ ]]>` will be generated. |
| `ignoreDoctype`       | `false` | Whether to ignore writing Doctype of the elements. That is, no `<!DOCTYPE >` will be generated. |
| `ignoreText`          | `false` | Whether to ignore writing texts of the elements. For example, `hi` text in `<a>hi</a>` will be ignored. |

## Convert XML → JS object / JSON

To convert XML text to JavaScript object, use `xml2js()`. To convert XML text to JSON text, use `xml2json()`.

```js
var convert = require('xml-js');
var xml = require('fs').readFileSync('test.xml', 'utf8');
var options = {ignoreComment: true, alwaysChildren: true};
var result = convert.xml2js(xml, options); // or convert.xml2json(xml, options)
console.log(result);
```

### Options for Converting XML → JS object / JSON

The below options are applicable for both `xml2js()` and `xml2json()` functions.

| Option              | Default | Description |
|:--------------------|:--------|:------------|
| `compact`           | `false` | Whether to produce detailed object or compact object. |
| `trim`              | `false` | Whether to trim whitespace characters that may exist before and after the text. |
| `sanitize` ([Deprecated](https://github.com/nashwaan/xml-js/issues/26)) | `false` | Whether to replace `&` `<` `>` with `&amp;` `&lt;` `&gt;` respectively, in the resultant text. |
| `nativeType`        | `false` | Whether to attempt converting text of numerals or of boolean values to native type. For example, `"123"` will be `123` and `"true"` will be `true` |
| `nativeTypeAttributes` | `false` | Whether to attempt converting attributes of numerals or of boolean values to native type. See also `nativeType` above. |
| `addParent`         | `false` | Whether to add `parent` property in each element object that points to parent object. |
| `alwaysArray`       | `false` | Whether to always put sub element, even if it is one only, as an item inside an array. `<a><b/></a>` will be `a:[{b:[{}]}]` rather than `a:{b:{}}` (applicable for compact output only). If the passed value is an array, only elements with names in the passed array are always made arrays. |
| `alwaysChildren`    | `false` | Whether to always generate `elements` property even when there are no actual sub elements. `<a></a>` will be `{"elements":[{"type":"element","name":"a","elements":[]}]}` rather than `{"elements":[{"type":"element","name":"a"}]}` (applicable for non-compact output). |
| `instructionHasAttributes` | `false` | Whether to parse contents of Processing Instruction as attributes or not. `<?go to="there"?>` will be `{"_instruction":{"go":{"_attributes":{"to":"there"}}}}` rather than `{"_instruction":{"go":"to=\"there\""}}`. See [discussion](https://github.com/nashwaan/xml-js/issues/17). |
| `ignoreDeclaration` | `false` | Whether to ignore parsing declaration property. That is, no `declaration` property will be generated. |
| `ignoreInstruction` | `false` | Whether to ignore parsing processing instruction property. That is, no `instruction` property will be generated. |
| `ignoreAttributes`  | `false` | Whether to ignore parsing attributes of elements.That is, no `attributes` property will be generated. |
| `ignoreComment`     | `false` | Whether to ignore parsing comments of the elements. That is, no `comment` will be generated. |
| `ignoreCdata`       | `false` | Whether to ignore parsing CData of the elements. That is, no `cdata` will be generated. |
| `ignoreDoctype`     | `false` | Whether to ignore parsing Doctype of the elements. That is, no `doctype` will be generated. |
| `ignoreText`        | `false` | Whether to ignore parsing texts of the elements. That is, no `text` will be generated. |

The below option is applicable only for `xml2json()` function.

| Option              | Default | Description |
|:--------------------|:--------|:------------|
| `spaces`            | `0`     | Number of spaces to be used for indenting JSON output. Passing characters like `' '` or `'\t'` are also accepted. |

## Options for Changing Key Names

To change default key names in the output object or the default key names assumed in the input JavaScript object / JSON, use the following options:

| Option              | Default | Description |
|:--------------------|:--------|:------------|
| `declarationKey`    | `"declaration"` or `"_declaration"` | Name of the property key which will be used for the declaration. For example, if `declarationKey: '$declaration'` then output of `<?xml?>` will be `{"$declaration":{}}` *(in compact form)* |
| `instructionKey`    | `"instruction"` or `"_instruction"` | Name of the property key which will be used for the processing instruction. For example, if `instructionKey: '$instruction'` then output of `<?go there?>` will be `{"$instruction":{"go":"there"}}` *(in compact form)* |
| `attributesKey`     | `"attributes"` or `"_attributes"` | Name of the property key which will be used for the attributes. For example, if `attributesKey: '$attributes'` then output of `<a x="hello"/>` will be `{"a":{$attributes:{"x":"hello"}}}` *(in compact form)* |
| `textKey`           | `"text"` or `"_text"` | Name of the property key which will be used for the text. For example, if `textKey: '$text'` then output of `<a>hi</a>` will be `{"a":{"$text":"Hi"}}` *(in compact form)* |
| `cdataKey`          | `"cdata"` or `"_cdata"` | Name of the property key which will be used for the cdata. For example, if `cdataKey: '$cdata'` then output of `<![CDATA[1 is < 2]]>` will be `{"$cdata":"1 is < 2"}` *(in compact form)* |
| `doctypeKey`        | `"doctype"` or `"_doctype"` | Name of the property key which will be used for the doctype. For example, if `doctypeKey: '$doctype'` then output of `<!DOCTYPE foo>` will be `{"$doctype":" foo}` *(in compact form)* |
| `commentKey`        | `"comment"` or `"_comment"` | Name of the property key which will be used for the comment. For example, if `commentKey: '$comment'` then output of `<!--note-->` will be `{"$comment":"note"}` *(in compact form)* |
| `parentKey`         | `"parent"` or `"_parent"` | Name of the property key which will be used for the parent. For example, if `parentKey: '$parent'` then output of `<a></b></a>` will be `{"a":{"b":{$parent:_points_to_a}}}` *(in compact form)* |
| `typeKey`           | `"type"` | Name of the property key which will be used for the type. For example, if `typeKey: '$type'` then output of `<a></a>` will be `{"elements":[{"$type":"element","name":"a"}]}` *(in non-compact form)* |
| `nameKey`           | `"name"` | Name of the property key which will be used for the name. For example, if `nameKey: '$name'` then output of `<a></a>` will be `{"elements":[{"type":"element","$name":"a"}]}` *(in non-compact form)* |
| `elementsKey`       | `"elements"` | Name of the property key which will be used for the elements. For example, if `elementsKey: '$elements'` then output of `<a></a>` will be `{"$elements":[{"type":"element","name":"a"}]}` *(in non-compact form)* |

Two default values mean the first is used for *non-compact* output and the second is for *compact* output.

> **TIP**: In compact mode, you can further reduce output result by using fewer characters for key names `{textKey: '_', attributesKey: '$', commentKey: 'value'}`. This is also applicable to non-compact mode.

> **TIP**: In non-compact mode, you probably want to set `{textKey: 'value', cdataKey: 'value', commentKey: 'value'}` 
> to make it more consistent and easier for your client code to go through the contents of text, cdata, and comment.

## Options for Custom Processing Functions

For XML → JS object / JSON, following custom callback functions can be supplied:

```js
var convert = require('xml-js');
var xml = '<foo:Name>Ali</Name> <bar:Age>30</bar:Age>';
var options = {compact: true, elementNameFn: function(val) {return val.replace('foo:','').toUpperCase();}};
var result = convert.xml2json(xml, options);
console.log(result); // {"NAME":{"_text":"Ali"},"BAR:AGE":{"_text":"30"}}
```

| Option              | Signature | Description |
|:--------------------|:----------|:------------|
| `doctypeFn` | `(value, parentElement)` | To perform additional processing for DOCTYPE. For example, `{doctypeFn: function(val) {return val.toUpperCase();}}` |
| `instructionFn` | `(instructionValue, instructionName, parentElement)` | To perform additional processing for content of Processing Instruction value. For example, `{instructionFn: function(val) {return val.toUpperCase();}}`. Note: `instructionValue` will be an object if `instructionHasAttributes` is enabled. |
| `cdataFn` | `(value, parentElement)` | To perform additional processing for CData. For example, `{cdataFn: function(val) {return val.toUpperCase();}}`. |
| `commentFn` | `(value, parentElement)` | To perform additional processing for comments. For example, `{commentFn: function(val) {return val.toUpperCase();}}`. |
| `textFn` | `(value, parentElement)` | To perform additional processing for texts inside elements. For example, `{textFn: function(val) {return val.toUpperCase();}}`. |
| `instructionNameFn` | `(instructionName, instructionValue, parentElement)` | To perform additional processing for Processing Instruction name. For example, `{instructionNameFn: function(val) {return val.toUpperCase();}}`. Note: `instructionValue` will be an object if `instructionHasAttributes` is enabled. |
| `elementNameFn` | `(value, parentElement)` | To perform additional processing for element name. For example, `{elementNameFn: function(val) {return val.toUpperCase();}}`. |
| `attributeNameFn` | `(attributeName, attributeValue, parentElement)` | To perform additional processing for attribute name. For example, `{attributeNameFn: function(val) {return val.toUpperCase();}}`. |
| `attributeValueFn` | `(attributeValue, attributeName, parentElement)` | To perform additional processing for attributeValue. For example, `{attributeValueFn: function(val) {return val.toUpperCase();}}`. |
| `attributesFn` | `(value, parentElement)` | To perform additional processing for attributes object. For example, `{attributesFn: function(val) {return val.toUpperCase();}}`. |

For JS object / JSON → XML, following custom callback functions can be supplied:

```js
var convert = require('xml-js');
var json = '{"name":{"_text":"Ali"},"age":{"_text":"30"}}';
var options = {compact: true, textFn: function(val, elementName) {return elementName === 'age'? val + '';}};
var result = convert.json2xml(json, options);
console.log(result); // <foo:Name>Ali</Name> <bar:Age>30</bar:Age>
```

| Option              | Signature | Description |
|:--------------------|:----------|:------------|
| `doctypeFn` | `(value, currentElementName, currentElementObj)` | To perform additional processing for DOCTYPE. For example, `{doctypeFn: function(val) {return val.toUpperCase();}`. |
| `instructionFn` | `(instructionValue, instructionName, currentElementName, currentElementObj)` | To perform additional processing for content of Processing Instruction value. For example, `{instructionFn: function(val) {return val.toUpperCase();}}`. Note: `instructionValue` will be an object if `instructionHasAttributes` is enabled. |
| `cdataFn` | `(value, currentElementName, currentElementObj)` | To perform additional processing for CData. For example, `{cdataFn: function(val) {return val.toUpperCase();}}`. |
| `commentFn` | `(value, currentElementName, currentElementObj)` | To perform additional processing for comments. For example, `{commentFn: function(val) {return val.toUpperCase();}}`. |
| `textFn` | `(value, currentElementName, currentElementObj)` | To perform additional processing for texts inside elements. For example, `{textFn: function(val) {return val.toUpperCase();}}`. |
| `instructionNameFn` | `(instructionName, instructionValue, currentElementName, currentElementObj)` | To perform additional processing for Processing Instruction name. For example, `{instructionNameFn: function(val) {return val.toUpperCase();}}`. Note: `instructionValue` will be an object if `instructionHasAttributes` is enabled. |
| `elementNameFn` | `(value, currentElementName, currentElementObj)` | To perform additional processing for element name. For example, `{elementNameFn: function(val) {return val.toUpperCase();}}`. |
| `attributeNameFn` | `(attributeName, attributeValue, currentElementName, currentElementObj)` | To perform additional processing for attribute name. For example, `{attributeNameFn: function(val) {return val.toUpperCase();}}`. |
| `attributeValueFn` | `(attributeValue, attributeName, currentElementName, currentElementObj)` | To perform additional processing for attributeValue. For example, `{attributeValueFn: function(val) {return val.toUpperCase();}}`. |
| `attributesFn` | `(value, currentElementName, currentElementObj)` | To perform additional processing for attributes object. For example, `{attributesFn: function(val) {return val.toUpperCase();}}`. |
| `fullTagEmptyElementFn` | `(currentElementName, currentElementObj)` | Whether to generate full tag or just self closing tag for elements that has no sub elements. For example, `{fullTagEmptyElementFn: function(val) {return val === 'foo'}}`. |

# Command Line

Because any good library should support command line usage, this library is no different.

## As Globally Accessible Command

```
npm install -g xml-js                       // install this library globally
xml-js test.json --spaces 4                 // xml result will be printed on screen
xml-js test.json --spaces 4 --out test.xml  // xml result will be saved to test.xml
xml-js test.xml --spaces 4                  // json result will be printed on screen
xml-js test.xml --spaces 4 --out test.json  // json result will be saved to test.json
```

## As Locally Accessible Command

If you want to use it as script in package.json (can also be helpful in [task automation via npm scripts](http://blog.keithcirkel.co.uk/how-to-use-npm-as-a-build-tool/))

```
npm install --save xml-js   // no need to install this library globally
```

In package.json, write a script:
```json
...
  "dependencies": {
    "xml-js": "latest"
  },
  "scripts": {
    "convert": "xml-js test.json --spaces 4"
  }
```

Now in the command line, you can run this script by typing:
```
npm run convert             // task 'scripts.convert' will be executed
```

## CLI Arguments

```
Usage: xml-js src [options]

  src                  Input file that need to be converted.
                       Conversion type xml->json or json->xml will be inferred from file extension.

Options:
  --help, -h           Display this help content.
  --version, -v        Display version number of this module.
  --out                Output file where result should be written.
  --spaces             Specifies amount of space indentation in the output.
  --full-tag           XML elements will always be in <a></a> form.
  --no-decl            Declaration directive <?xml?> will be ignored.
  --no-inst            Processing instruction <?...?> will be ignored.
  --no-attr            Attributes of elements will be ignored.
  --no-text            Texts of elements will be ignored.
  --no-cdata           CData of elements will be ignored.
  --no-doctype         DOCTYPE of elements will be ignored.
  --no-comment         Comments of elements will be ignored.
  --trim               Any whitespaces surrounding texts will be trimmed.
  --compact            JSON is in compact form.
  --native-type        Numbers and boolean will be converted (coerced) to native type instead of text.
  --always-array       Every element will always be an array type (applicable if --compact is set).
  --always-children    Every element will always contain sub-elements (applicable if --compact is not set).
  --text-key           To change the default 'text' key.
  --cdata-key          To change the default 'cdata' key.
  --doctype-key        To change the default 'doctype' key.
  --comment-key        To change the default 'comment' key.
  --attributes-key     To change the default 'attributes' key.
  --declaration-key    To change the default 'declaration' key.
  --instruction-key    To change the default 'processing instruction' key.
  --type-key           To change the default 'type' key (applicable if --compact is not set).
  --name-key           To change the default 'name' key (applicable if --compact is not set).
  --elements-key       To change the default 'elements' key (applicable if --compact is not set).
```

# Contribution

## Testing

To perform tests on this project, download the full repository from GitHub (not from npm) and then do the following:

```
cd xml-js
npm install
npm test
```
For live testing, use `npm start` instead of `npm test`.

## Reporting

Use [this link](https://github.com/nashwaan/xml-js/issues) to report an issue or bug. Please include a sample code where the code is failing.

# License

[MIT](https://github.com/nashwaan/xml-js/blob/master/LICENSE)
