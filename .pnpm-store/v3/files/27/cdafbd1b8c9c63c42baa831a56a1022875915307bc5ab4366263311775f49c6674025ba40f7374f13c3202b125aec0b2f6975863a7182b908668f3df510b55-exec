#!/usr/bin/env node

// Based on CoffeeScript by andrewschaaf on github
//
// TODO:
// - past and future dates, especially < 1900 and > 2100
// - look for edge cases

var assert = require('assert'),
    libFilename = process.argv[2] || './strftime.js',
    strftime = require(libFilename),
    strftimeUTC = strftime.utc(),
    Time = new Date(1307472705067); // Tue, 07 Jun 2011 18:51:45 GMT

assert.fn = function(value, msg) {
    assert.equal(typeof value, 'function', msg);
};

function assertFormat(time, format, expected, name, strftime) {
    var actual = strftime(format, time);
    assert.equal(actual, expected, name + '("' + format + '", ' + time + ') is ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected));
}

assert.format = function(format, expected, expectedUTC, time) {
    time = time || Time;
    if (expected) { assertFormat(time, format, expected, 'strftime', strftime); }
    assertFormat(time, format, expectedUTC || expected, 'strftime.utc()', strftimeUTC);
};

/// check exports
assert.fn(strftime.localize);
assert.fn(strftime.timezone);
assert.fn(strftime.utc);
ok('Exports');

/// time zones
if (process.env.TZ == 'America/Vancouver') {
    testTimezone('America/Vancouver');
    assert.format('%C', '01', '01', new Date(100, 0, 1));
    assert.format('%X', '11:51:45 AM', '06:51:45 PM');
    assert.format('%c', 'Tue 07 Jun 2011 11:51:45 AM Pacific Daylight Saving Time', 'Tue 07 Jun 2011 06:51:45 PM GMT');
    assert.format('%j', '097', '098', new Date(1365390736236));
    assert.format('%x', '06/07/11');
    assert.format('%U', '12', null, new Date('2017-03-25 00:00:00 +0000'));
    assert.format('%U', '12', '13', new Date('2017-03-26 00:00:00 +0000'));
    assert.format('%U', '13', null, new Date('2017-03-27 00:00:00 +0000'));
    assert.format('%U', '13', '14', new Date('2017-04-02 00:00:00 +0000'));

    // Test dates crossing a DST boundary.
    var dstStart = +new Date('2016-11-06 01:50:00');
    assert.format('%T', '01:50:00', '08:50:00', new Date(dstStart))
    assert.format('%T', '01:00:00', '09:00:00', new Date(dstStart + 10 * 60 * 1000))

    ok('Time zones (' + process.env.TZ + ')');
}
else if (process.env.TZ == 'Europe/Amsterdam') {
    testTimezone('Europe/Amsterdam');
    assert.format('%C', '01', '00', new Date(100, 0, 1));
    assert.format('%X', '08:51:45 PM', '06:51:45 PM');
    assert.format('%c', 'Tue 07 Jun 2011 08:51:45 PM Central European Summer Time', 'Tue 07 Jun 2011 06:51:45 PM GMT');
    assert.format('%j', '098', '098', new Date(1365390736236));
    assert.format('%x', '06/07/11');
    assert.format('%U', '12', null, new Date('2017-03-25 00:00:00 +0000'));
    assert.format('%U', '13', null, new Date('2017-03-26 00:00:00 +0000'));
    assert.format('%U', '13', null, new Date('2017-03-27 00:00:00 +0000'));
    assert.format('%U', '14', null, new Date('2017-04-02 00:00:00 +0000'));

    // Test dates crossing a DST boundary.
    var dstStart = +new Date('2016-10-30 02:50:00');
    assert.format('%T', '02:50:00', '00:50:00', new Date(dstStart))
    assert.format('%T', '02:00:00', '01:00:00', new Date(dstStart + 10 * 60 * 1000))

    ok('Time zones (' + process.env.TZ + ')');
}
else {
    assert(false, '(Current timezone has no tests: ' + (process.env.TZ || 'none') + ')');
}

/// check all formats in GMT, most coverage
assert.format('%A', 'Tuesday');
assert.format('%a', 'Tue');
assert.format('%B', 'June');
assert.format('%b', 'Jun');
assert.format('%C', '20');
assert.format('%D', '06/07/11');
assert.format('%d', '07');
assert.format('%-d', '7');
assert.format('%_d', ' 7');
assert.format('%0d', '07');
assert.format('%e', ' 7');
assert.format('%F', '2011-06-07');
assert.format('%H', null, '18');
assert.format('%h', 'Jun');
assert.format('%I', null, '06');
assert.format('%-I', null, '6');
assert.format('%_I', null, ' 6');
assert.format('%0I', null, '06');
assert.format('%j', null, '158');
assert.format('%k', null, '18');
assert.format('%L', '067');
assert.format('%l', null, ' 6');
assert.format('%-l', null, '6');
assert.format("%-y", "1", null, new Date('2001-02-03T04:05:06'))
assert.format("%-y", "23", null, new Date('2023-02-03T04:05:06'))
assert.format('%_l', null, ' 6');
assert.format('%0l', null, '06');
assert.format('%M', null, '51');
assert.format('%m', '06');
assert.format('%n', '\n');
assert.format('%o', '7th');
assert.format('%P', null, 'pm');
assert.format('%p', null, 'PM');
assert.format('%R', null, '18:51');
assert.format('%r', null, '06:51:45 PM');
assert.format('%S', '45');
assert.format('%s', '1307472705');
assert.format('%T', null, '18:51:45');
assert.format('%t', '\t');
assert.format('%U', '23');
assert.format('%U', '24', null, new Date(+Time + 5 * 86400000));
assert.format('%u', '2');
assert.format('%v', ' 7-Jun-2011');
assert.format('%W', '23');
assert.format('%W', '23', null, new Date(+Time + 5 * 86400000));
assert.format('%w', '2');
assert.format('%Y', '2011');
assert.format('%y', '11');
assert.format('%Z', null, 'GMT');
assert.format('%z', null, '+0000');
assert.format('%:z', null, '+00:00');
assert.format('%%', '%'); // literal percent sign
assert.format('%g', '%g'); // unrecognized directive
assert.format('%F %T', null, '1970-01-01 00:00:00', new Date(0));
assert.format('%U', null, '12', new Date('2017-03-25 00:00:00 +0000'));
assert.format('%U', null, '13', new Date('2017-03-26 00:00:00 +0000'));
assert.format('%U', null, '13', new Date('2017-03-27 00:00:00 +0000'));
assert.format('%U', null, '14', new Date('2017-04-02 00:00:00 +0000'));
ok('GMT');


/// locales

var it_IT = {
        days: words('domenica lunedi martedi mercoledi giovedi venerdi sabato'),
        shortDays: words('dom lun mar mer gio ven sab'),
        months: words('gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre'),
        shortMonths: words('gen feb mar apr mag giu lug ago set ott nov dic'),
        AM: 'it$AM',
        PM: 'it$PM',
        am: 'it$am',
        pm: 'it$pm',
        formats: {
            D: 'it$%m/%d/%y',
            F: 'it$%Y-%m-%d',
            R: 'it$%H:%M',
            T: 'it$%H:%M:%S',
            X: '%T',
            c: '%a %b %d %X %Y',
            r: 'it$%I:%M:%S %p',
            v: 'it$%e-%b-%Y',
            x: '%D'
        }
    };

var strftimeIT = strftime.localize(it_IT),
    strftimeITUTC = strftimeIT.utc();
assert.format_it = function(format, expected, expectedUTC) {
    if (expected) { assertFormat(Time, format, expected, 'strftime.localize(it_IT)', strftimeIT); }
    assertFormat(Time, format, expectedUTC || expected, 'strftime.localize(it_IT).utc()', strftimeITUTC);
};

assert.format_it('%A', 'martedi');
assert.format_it('%a', 'mar');
assert.format_it('%B', 'giugno');
assert.format_it('%b', 'giu');
assert.format_it('%c', null, 'mar giu 07 it$18:51:45 2011');
assert.format_it('%D', 'it$06/07/11');
assert.format_it('%F', 'it$2011-06-07');
assert.format_it('%p', null, 'it$PM');
assert.format_it('%P', null, 'it$pm');
assert.format_it('%R', null, 'it$18:51');
assert.format_it('%r', null, 'it$06:51:45 it$PM');
assert.format_it('%T', null, 'it$18:51:45');
assert.format_it('%v', 'it$ 7-giu-2011');
assert.format_it('%x', null, 'it$06/07/11');
assert.format_it('%X', null, 'it$18:51:45');
ok('Localization');


/// timezones

assert.formatTZ = function(format, expected, tz, time) {
    assertFormat(time || Time, format, expected, 'strftime.timezone(' + tz + ')', strftime.timezone(tz));
};

assert.formatTZ('%F %r %z', '2011-06-07 06:51:45 PM +0000', 0);
assert.formatTZ('%F %r %z', '2011-06-07 06:51:45 PM +0000', '+0000');
assert.formatTZ('%F %r %z', '2011-06-07 08:51:45 PM +0200', 120);
assert.formatTZ('%F %r %z', '2011-06-07 08:51:45 PM +0200', '+0200');
assert.formatTZ('%F %r %z', '2011-06-07 11:51:45 AM -0700', -420);
assert.formatTZ('%F %r %z', '2011-06-07 11:51:45 AM -0700', '-0700');
assert.formatTZ('%F %r %z', '2011-06-07 11:21:45 AM -0730', '-0730');
assert.formatTZ('%F %r %:z', '2011-06-07 11:21:45 AM -07:30', '-0730');
ok('Time zone offset');

/// caching
(function() {
    // this test fails when the 2 calls cross a millisecond boundary, so try a number of times
    var CacheAttempts = 10;
    var MaxFailures = 1;
    var failures = 0;
    for (var i = 0; i < CacheAttempts; ++i) {
        var expectedMillis = strftime('%L');
        var millis = strftime('%L');
        if (expectedMillis != millis) {
            ++failures;
        }
    }
    if (failures > MaxFailures) {
        assert.fail('timestamp caching appears to be broken (' + failures + ' failed attempts out of ' + CacheAttempts + ')');
    }
}());
ok('Cached timestamps');


/// helpers

function words(s) { return (s || '').split(' '); }

function ok(s) { console.log('[ \033[32mOK\033[0m ] ' + s); }

// Pass a regex or string that matches the timezone abbrev, e.g. %Z above.
// Don't pass GMT! Every date includes it and it will fail.
// Be careful if you pass a regex, it has to quack like the default one.
function testTimezone(regex) {
    regex = typeof regex === 'string' ? RegExp('\\((' + regex + ')\\)$') : regex;
    var match = Time.toString().match(regex);
    if (match) {
        var off = Time.getTimezoneOffset(),
            hourOff = off / 60,
            hourDiff = Math.floor(hourOff),
            hours = 18 - hourDiff,
            padSpace24 = hours < 10 ? ' ' : '',
            padZero24 = hours < 10 ? '0' : '',
            hour24 = String(hours),
            padSpace12 = (hours % 12) < 10 ? ' ' : '',
            padZero12 = (hours % 12) < 10 ? '0' : '',
            hour12 = String(hours % 12),
            sign = hourDiff < 0 ? '+' : '-',
            minDiff = Time.getTimezoneOffset() - (hourDiff * 60),
            mins = String(51 - minDiff),
            tz = match[1],
            ampm = hour12 == hour24 ? 'AM' : 'PM',
            R = hour24 + ':' + mins,
            r = padZero12 + hour12 + ':' + mins + ':45 ' + ampm,
            T = R + ':45';
        assert.format('%H', padZero24 + hour24, '18');
        assert.format('%I', padZero12 + hour12, '06');
        assert.format('%k', padSpace24 + hour24, '18');
        assert.format('%l', padSpace12 + hour12, ' 6');
        assert.format('%M', mins);
        assert.format('%P', ampm.toLowerCase(), 'pm');
        assert.format('%p', ampm, 'PM');
        assert.format('%R', R, '18:51');
        assert.format('%r', r, '06:51:45 PM');
        assert.format('%T', T, '18:51:45');
        assert.format('%Z', tz, 'GMT');
        assert.format('%z', sign + '0' + Math.abs(hourDiff) + '00', '+0000');
        assert.format('%:z', sign + '0' + Math.abs(hourDiff) + ':00', '+00:00');
    }
}
