'use strict';

const Crypto = require('crypto');

const Boom = require('boom');


const internals = {};


// Generate a cryptographically strong pseudo-random data

exports.randomString = function (size) {

    const buffer = exports.randomBits((size + 1) * 6);
    if (buffer instanceof Error) {
        return buffer;
    }

    const string = buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/\=/g, '');
    return string.slice(0, size);
};


// Return a random string of digits

exports.randomDigits = function (size) {

    try {
        const digits = [];

        let buffer = internals.random(size * 2);            // Provision twice the amount of bytes needed to increase chance of single pass
        let pos = 0;

        while (digits.length < size) {
            if (pos >= buffer.length) {
                buffer = internals.random(size * 2);
                pos = 0;
            }

            if (buffer[pos] < 250) {
                digits.push(buffer[pos] % 10);
            }

            ++pos;
        }

        return digits.join('');
    }
    catch (err) {
        return err;
    }
};


// Generate a buffer of random bits

exports.randomBits = function (bits) {

    if (!bits ||
        bits < 0) {

        return Boom.internal('Invalid random bits count');
    }

    const bytes = Math.ceil(bits / 8);
    try {
        return internals.random(bytes);
    }
    catch (err) {
        return err;
    }
};


// Compare two strings using fixed time algorithm (to prevent time-based analysis of MAC digest match)

exports.fixedTimeComparison = function (a, b) {

    try {
        return Crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    }
    catch (err) {
        return false;
    }
};


internals.random = function (bytes) {

    try {
        return Crypto.randomBytes(bytes);
    }
    catch (err) {
        throw Boom.internal('Failed generating random bits: ' + err.message);
    }
};
