'use strict';

var alphabet = require('./alphabet');
var random = require('./random/random-byte');
var customRandom = require('nanoid').customRandom;

function generate(number) {
    var loopCounter = 0;
    var done;

    var str = '';

    while (!done) {
        str = str + customRandom(alphabet.get(), 1, random)();
        done = number < (Math.pow(16, loopCounter + 1 ) );
        loopCounter++;
    }
    return str;
}

module.exports = generate;
