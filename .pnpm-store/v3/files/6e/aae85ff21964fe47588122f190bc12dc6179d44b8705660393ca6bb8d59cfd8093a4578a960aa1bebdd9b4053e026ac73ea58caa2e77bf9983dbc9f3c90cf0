strftime
========

strftime for JavaScript. Works in (at least) node.js and browsers. Supports localization and timezones. Most standard specifiers from C are supported as well as some other extensions from Ruby.

[![version 0.10.3 on npm](https://img.shields.io/badge/npm-0.10.3-brightgreen.svg?style=flat)](https://www.npmjs.com/package/strftime) [![node version 0.2 and up](https://img.shields.io/badge/node->=0.2-brightgreen.svg?style=flat)](https://nodejs.org) [![MIT License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat)](https://sjs.mit-license.org)

Installation
============

[node](https://nodejs.org):

    npm install strftime

[bower](http://bower.io):

    bower install strftime

[component](https://github.com/componentjs/component):

    component install samsonjs/strftime

[yarn](https://yarnpkg.com):

    yarn add strftime

Or you can copy [strftime.js](https://github.com/samsonjs/strftime/blob/master/strftime.js) wherever you want to use it, whether that's with a &lt;script&gt; tag or `require` or anything else.

Changelog
=========

[View the changelog](https://github.com/samsonjs/strftime/blob/master/Changelog.md).

Usage
=====

```JavaScript
    var strftime = require('strftime') // not required in browsers
    console.log(strftime('%B %d, %Y %H:%M:%S')) // => April 28, 2011 18:21:08
    console.log(strftime('%F %T', new Date(1307472705067))) // => 2011-06-07 18:51:45
```


If you want to localize it:

```JavaScript
    var strftime = require('strftime') // not required in browsers
    var it_IT = {
        identifier: 'it-IT',
        days: ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'],
        shortDays: ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'],
        months: ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
        shortMonths: ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'],
        AM: 'AM',
        PM: 'PM',
        am: 'am',
        pm: 'pm',
        formats: {
            D: '%m/%d/%y',
            F: '%Y-%m-%d',
            R: '%H:%M',
            X: '%T',
            c: '%a %b %d %X %Y',
            r: '%I:%M:%S %p',
            T: '%H:%M:%S',
            v: '%e-%b-%Y',
            x: '%D'
        }
    }
    var strftimeIT = strftime.localize(it_IT)
    console.log(strftimeIT('%B %d, %Y %H:%M:%S')) // => aprile 28, 2011 18:21:08
    console.log(strftimeIT('%B %d, %Y %H:%M:%S', new Date(1307472705067))) // => giugno 7, 2011 18:51:45
```

Some locales are bundled and can be used like so:

```JavaScript
    var strftime = require('strftime') // not required in browsers
    var strftimeIT = strftime.localizeByIdentifier('it_IT')
    console.log(strftimeIT('%B %d, %Y %H:%M:%S')) // => aprile 28, 2011 18:21:08
    console.log(strftimeIT('%B %d, %Y %H:%M:%S', new Date(1307472705067))) // => giugno 7, 2011 18:51:45
```

_The [full list of bundled locales](#locales) is below._

Time zones can be passed in as an offset from GMT in minutes.

```JavaScript
    var strftime = require('strftime') // not required in browsers
    var strftimePDT = strftime.timezone(-420)
    var strftimeCEST = strftime.timezone(120)
    console.log(strftimePDT('%B %d, %y %H:%M:%S', new Date(1307472705067))) // => June 07, 11 11:51:45
    console.log(strftimeCEST('%F %T', new Date(1307472705067))) // => 2011-06-07 20:51:45
```

Alternatively you can use the timezone format used by ISO 8601, `+HHMM` or `-HHMM`.

```JavaScript
    var strftime = require('strftime') // not required in browsers
    var strftimePDT = strftime.timezone('-0700')
    var strftimeCEST = strftime.timezone('+0200')
    console.log(strftimePDT('%F %T', new Date(1307472705067))) // => 2011-06-07 11:51:45
    console.log(strftimeCEST('%F %T', new Date(1307472705067))) // => 2011-06-07 20:51:45
```

Supported Specifiers
====================

Extensions from Ruby are noted in the following list.

Unsupported specifiers are rendered without the percent sign.
e.g. `%q` becomes `q`. Use `%%` to get a literal `%` sign.

- A: full weekday name
- a: abbreviated weekday name
- B: full month name
- b: abbreviated month name
- C: AD century (year / 100), padded to 2 digits
- c: equivalent to `%a %b %d %X %Y %Z` in en_US (based on locale)
- D: equivalent to `%m/%d/%y` in en_US (based on locale)
- d: day of the month, padded to 2 digits (01-31)
- e: day of the month, padded with a leading space for single digit values (1-31)
- F: equivalent to `%Y-%m-%d` in en_US (based on locale)
- H: the hour (24-hour clock), padded to 2 digits (00-23)
- h: the same as %b (abbreviated month name)
- I: the hour (12-hour clock), padded to 2 digits (01-12)
- j: day of the year, padded to 3 digits (001-366)
- k: the hour (24-hour clock), padded with a leading space for single digit values (0-23)
- L: the milliseconds, padded to 3 digits [Ruby extension]
- l: the hour (12-hour clock), padded with a leading space for single digit values (1-12)
- M: the minute, padded to 2 digits (00-59)
- m: the month, padded to 2 digits (01-12)
- n: newline character
- o: day of the month as an ordinal (without padding), e.g. 1st, 2nd, 3rd, 4th, ...
- P: "am" or "pm" in lowercase (Ruby extension, based on locale)
- p: "AM" or "PM" (based on locale)
- R: equivalent to `%H:%M` in en_US (based on locale)
- r: equivalent to `%I:%M:%S %p` in en_US (based on locale)
- S: the second, padded to 2 digits (00-60)
- s: the number of seconds since the Epoch, UTC
- T: equivalent to `%H:%M:%S` in en_US (based on locale)
- t: tab character
- U: week number of the year, Sunday as the first day of the week, padded to 2 digits (00-53)
- u: the weekday, Monday as the first day of the week (1-7)
- v: equivalent to `%e-%b-%Y` in en_US (based on locale)
- W: week number of the year, Monday as the first day of the week, padded to 2 digits (00-53)
- w: the weekday, Sunday as the first day of the week (0-6)
- X: equivalent to `%T` or `%r` in en_US (based on locale)
- x: equivalent to `%D` in en_US (based on locale)
- Y: the year with the century
- y: the year without the century, padded to 2 digits (00-99)
- Z: the time zone name, replaced with an empty string if it is not found
- z: the time zone offset from UTC, with a leading plus sign for UTC and zones east
     of UTC and a minus sign for those west of UTC, hours and minutes follow each
     padded to 2 digits and with no delimiter between them

For more detail see `man 3 strftime` as the format specifiers should behave identically. If behaviour differs please [file a bug](https://github.com/samsonjs/strftime/issues/new).

Any specifier can be modified with `-`, `_`, `0`, or `:` as well, as in Ruby. Using `%-` will omit any leading zeroes or spaces, `%_` will force spaces for padding instead of the default, and `%0` will force zeroes for padding. There's some redundancy here as `%-d` and `%e` have the same result, but it solves some awkwardness with formats like `%l`. Using `%:` for time zone offset, as in `%:z` will insert a colon as a delimiter.

<a name="locales"></a>
Bundled Locales
===============

  - de\_DE
  - en\_CA
  - en\_US
  - es\_MX
  - fr\_FR
  - it\_IT
  - nl\_NL
  - pt\_BR
  - ru\_RU
  - tr\_TR
  - zh\_CN

Contributors
============

* [Alexandr Nikitin](https://github.com/alexandrnikitin)
* [Andrew Pirondini](https://github.com/andrewjpiro) of [iFixit](https://github.com/iFixit)
* [Andrew Schaaf](https://github.com/andrewschaaf)
* [Aryan Arora](https://github.com/aryan-debug)
* [Ayman Nedjmeddine](https://github.com/IOAyman)
* [Cory Heslip](https://github.com/cheslip)
* [Douglas de Espindola](https://github.com/douglasep)
* [Forbes Lindesay](https://github.com/ForbesLindesay)
* [John Zwinck](https://github.com/jzwinck)
* [Joost Hietbrink](https://github.com/joost)
* [Kevin Jin](https://github.com/Kevin-Jin)
* [Maximilian Herold](https://github.com/mherold)
* [Michael J.](https://github.com/michaeljayt)
* [@mogando668](https://github.com/mogando668)
* [Peter deHaan](https://github.com/pdehaan)
* [Rob Colburn](https://github.com/robcolburn)
* [Ryan Regalado](https://github.com/d48)
* [Ryan Stafford](https://github.com/ryanstafford)
* [Sami Samhuri](https://github.com/samsonjs)
* [Stian Grytøyr](https://github.com/stiang)
* [TJ Holowaychuk](https://github.com/tj)
* [@w0den](https://github.com/w0den)
* [Yusuke Kawasaki](https://github.com/kawanet)

License
=======

Copyright 2010 - 2024 Sami Samhuri sami@samhuri.net

[MIT license](https://sjs.mit-license.org)
