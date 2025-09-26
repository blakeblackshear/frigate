# Prefer having the last statement in a test be an assertion (`prefer-ending-with-an-expect`)

<!-- end auto-generated rule header -->

Prefer ending tests with an `expect` assertion.

## Rule details

This rule triggers when a test body does not end with an `expect` call, which
can indicate an unfinished test.

Examples of **incorrect** code for this rule:

```js
it('lets me change the selected option', () => {
  const container = render(MySelect, {
    props: { options: [1, 2, 3], selected: 1 },
  });

  expect(container).toBeDefined();
  expect(container.toHTML()).toContain('<option value="1" selected>');

  container.setProp('selected', 2);
});
```

Examples of **correct** code for this rule:

```js
it('lets me change the selected option', () => {
  const container = render(MySelect, {
    props: { options: [1, 2, 3], selected: 1 },
  });

  expect(container).toBeDefined();
  expect(container.toHTML()).toContain('<option value="1" selected>');

  container.setProp('selected', 2);

  expect(container.toHTML()).not.toContain('<option value="1" selected>');
  expect(container.toHTML()).toContain('<option value="2" selected>');
});
```

## Options

```json
{
  "jest/prefer-ending-with-an-expect": [
    "error",
    {
      "assertFunctionNames": ["expect"],
      "additionalTestBlockFunctions": []
    }
  ]
}
```

### `assertFunctionNames`

This array option specifies the names of functions that should be considered to
be asserting functions. Function names can use wildcards i.e `request.*.expect`,
`request.**.expect`, `request.*.expect*`

Examples of **incorrect** code for the `{ "assertFunctionNames": ["expect"] }`
option:

```js
/* eslint jest/prefer-ending-with-an-expect: ["error", { "assertFunctionNames": ["expect"] }] */

import { expectSaga } from 'redux-saga-test-plan';
import { addSaga } from '../src/sagas';

test('returns sum', () => {
  expectSaga(addSaga, 1, 1).returns(2).run();
});
```

Examples of **correct** code for the
`{ "assertFunctionNames": ["expect", "expectSaga"] }` option:

```js
/* eslint jest/prefer-ending-with-an-expect: ["error", { "assertFunctionNames": ["expect", "expectSaga"] }] */

import { expectSaga } from 'redux-saga-test-plan';
import { addSaga } from '../src/sagas';

test('returns sum', () => {
  expectSaga(addSaga, 1, 1).returns(2).run();
});
```

Since the string is compiled into a regular expression, you'll need to escape
special characters such as `$` with a double backslash:

```js
/* eslint jest/prefer-ending-with-an-expect: ["error", { "assertFunctionNames": ["expect\\$"] }] */

it('is money-like', () => {
  expect$(1.0);
});
```

Examples of **correct** code for working with the HTTP assertions library
[SuperTest](https://www.npmjs.com/package/supertest) with the
`{ "assertFunctionNames": ["expect", "request.**.expect"] }` option:

```js
/* eslint jest/prefer-ending-with-an-expect: ["error", { "assertFunctionNames": ["expect", "request.**.expect"] }] */
const request = require('supertest');
const express = require('express');

const app = express();

describe('GET /user', function () {
  it('responds with json', function (done) {
    doSomething();

    request(app).get('/user').expect('Content-Type', /json/).expect(200, done);
  });
});
```

### `additionalTestBlockFunctions`

This array can be used to specify the names of functions that should also be
treated as test blocks:

```json
{
  "rules": {
    "jest/prefer-ending-with-an-expect": [
      "error",
      { "additionalTestBlockFunctions": ["each.test"] }
    ]
  }
}
```

The following is _correct_ when using the above configuration:

```js
each([
  [2, 3],
  [1, 3],
]).test(
  'the selection can change from %d to %d',
  (firstSelection, secondSelection) => {
    const container = render(MySelect, {
      props: { options: [1, 2, 3], selected: firstSelection },
    });

    expect(container).toBeDefined();
    expect(container.toHTML()).toContain(
      `<option value="${firstSelection}" selected>`,
    );

    container.setProp('selected', secondSelection);

    expect(container.toHTML()).not.toContain(
      `<option value="${firstSelection}" selected>`,
    );
    expect(container.toHTML()).toContain(
      `<option value="${secondSelection}" selected>`,
    );
  },
);
```
