sort-by [![travis ci](https://travis-ci.org/kvnneff/sort-by.svg)](https://travis-ci.org/kvnneff/sort-by)
=====================


A utility to create comparator functions for the native `Array.sort()` in both node and the browser.  Allows for sorting by multiple properties.

Inspired by [this StackOverflow answer][1].

----------


Example
---------

    var sortBy = require('sort-by'),
        users = [];

    users = [{
        id: 7,
        name: 'Foo',
        age: '34',
        email: { primary: 'foo@email.com' }
    }, {
        id: 3,
        name: 'Baz',
        age: '67',
        email: { primary: 'baz@email.com' }
    }, {
        id: 4,
        name: 'Bar',
        age: '67',
        email: { primary: 'bar@email.com' }
    }];

    users.sort(sortBy('name', 'age'));

    /**
    *   result:
    *       [{id: 4, name: 'Bar', age: '67', email: { primary: 'bar@email.com' }},
    *       {id: 3, name: 'Baz', age: '67', email: { primary: 'baz@email.com' }},
    *       {id: 7, name: 'Foo', age: '34', email: { primary: 'foo@email.com' }}]
    */

    /**
    * Use `-` to reverse the sort order
    */

    users.sort(sortBy('-id', 'name'));

    /*
    *   result:
    *       [{id: 7, name: 'Foo', age: '34', email: { primary: 'foo@email.com' }},
    *       {id: 4, name: 'Bar', age: '67', email: { primary: 'bar@email.com' }},
    *       {id: 3, name: 'Baz', age: '67', email: { primary: 'baz@email.com' }}]
    */

    /**
    * Use `.` notation to traverse nested properties. See [object-path](https://www.npmjs.org/package/object-path) npm module for support.
    */

    users.sort(sortBy('age', 'email.primary'));

    /*
    *   result:
    *       [{id: 7, name: 'Foo', age: '34', email: { primary: 'foo@email.com' }},
    *       {id: 4, name: 'Bar', age: '67', email: { primary: 'bar@email.com' }},
    *       {id: 3, name: 'Baz', age: '67', email: { primary: 'baz@email.com' }}]
    */

Test in node
---
    git clone https://github.com/staygrimm/sort-by.git
    cd sort-by && make test-node


Test in the browser
---
    git clone https://github.com/staygrimm/sort-by.git
    cd sort-by && make test

License
---
(The MIT License)

Copyright (c) 2013 Kevin Neff kvnneff@gmail.com

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


  [1]: http://stackoverflow.com/a/4760279
