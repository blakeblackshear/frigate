v0.10.3 on 2024-06-11
---------------------

- Stop using `let` to avoid breaking backwards compatibility with ES5. Thanks to [Maximilian Herold](https://github.com/mherold) for the report #87

- Drop '份' suffix from Chinese month names. Thanks to [@mogando668](https://github.com/mogando668) for the report #88

v0.10.2 on 2023-05-24
---------------------

- Fix test case for %c in current versions of node.js

- Fix %-y so it omits the leading zero

Thanks to [Aryan Arora](https://github.com/aryan-debug) for both fixes!

v0.10.1 on 2021-12-12
---------------------

- Fix it_IT shortMonths locale
  Thanks to [Douglas de Espindola](https://github.com/douglasep)

- Try to get a short time zone name for %Z, falling back to the long one. This attempts to work around a change to Date.toString in v8 (node v10+, Chrome 66+). Unfortunately sometimes Date.toLocaleString returns a time zone like GMT+2 and we fall back to the long name in that case.

v0.10.0 on 2016-12-28
---------------------

- Remove the old API deprecated in v0.9.

- Bundle some locales that you can use with `strftime.localizeByIdentifier('nl_NL')`. Full list available in the [readme](https://github.com/samsonjs/strftime/blob/master/Readme.md).
  Thanks to [Andrew Pirondini](https://github.com/andrewjpiro) of [iFixit](https://ifixit.com)

- Add instructions to install with Yarn.
  Thanks to [Ayman Nedjmeddine](https://github.com/IOAyman)

- Unrecognized format specifiers preserve the % sign, e.g. `strftime('%K') => "%K"`.
  Thanks to [Kevin Jin](https://github.com/Kevin-Jin)

- Make `strftime` work with dates that have been extended by [DateJS](http://www.datejs.com).
  Thanks to [Stian Grytøyr](https://github.com/stiang)

- Add instructions to install with Yarn.
  Thanks to [Ayman Nedjmeddine](https://github.com/IOAyman)

- Fix UTC formatting of dates that cross a DST boundary.
  Thanks to [ray007](https://github.com/ray007)

- Allow localizing ordinals.
  Thanks to [Simon Liétar](https://github.com/Sim9760)

v0.9.2 on 2015-05-29
--------------------

- fix a caching bug, which was a regression in 0.9.0 ([issue #63](https://github.com/samsonjs/strftime/issues/63))

- update license attribute in package.json as required by npm
  Thanks to [Peter deHaan](https://github.com/pdehaan)

- construct GMT times used in tests in a more robust way

- fix a bug calculating week numbers ([issue #56](https://github.com/samsonjs/strftime/issues/56))
  Thanks to [Alexandr Nikitin](https://github.com/alexandrnikitin)

- warn about possible misuse of %:: or %::: modifiers

v0.9.1 on 2015-03-16
--------------------

- re-fix [issue #38](https://github.com/samsonjs/strftime/pull/38) which was lost in the v0.9 merge

- add this changelog

v0.9.0 on 2015-03-15
--------------------

This release marks the final run up to v1.0, which should be released by March 2016.

The headline feature is a huge performance boost resulting from [this contest](http://hola.org/challenge_js). [Alexandr Nikitin](https://github.com/alexandrnikitin) has essentially [rewritten](https://github.com/samsonjs/strftime/pull/41) the code and [the results](http://jsperf.com/strftime-optimization/2) speak for themselves.

Along with this the API has been unified and cleaned up. `strftimeTZ`, `strftimeUTC`, and `localizedStrftime` have all been deprecated in favour of the following functions: `timezone(tz)`, `utc()`, and `localize(locale)`. You use them like so:

```JavaScript
    var strftime = require('strftime'); // not required in web browsers

    var strftimeIT = strftime.localize(anItalianLocale);
    var strftimePST = strftime.timezone('-0800');
    var strftimeUTC = strftime.utc();

    // You can combine them
    var strftimeIT_PST = strftimeIT.timezone('-0800');

    // And chain them all at once
    var strftimeIT_PST = strftime.localize(anItalianLocale).timezone('-0800');
```

The previous API is deprecated and will be removed for v1.0. The good news is that the previous API is supported by adapting the new API, so you get most of the performance benefits before you even update your code to use the new API.

The new API does not support passing in a custom timezone or locale on each call to `strftime`. This is a regression so if you really need this use case [let us know](https://github.com/samsonjs/strftime/issues/new) and we'll figure something out.

Thanks to all contributors that have helped to improve this library over the past 4 years.

v0.8.4 on 2015-03-05
--------------------

- fix conversion of dates to UTC
  Thanks to [Alexandr Nikitin](https://github.com/alexandrnikitin)

- extend `%z` with a colon separator in timezone offsets, `"[+-]HH:MM"`
  Thanks to [Cory Heslip](https://github.com/cheslip)

- ignore irrelevant files in bower.json

v0.8.3 on 2015-02-08
--------------------

First release for [Bower](http://bower.io), and only released for Bower.

v0.8.2 on 2014-08-08
--------------------

- fix `%e` which is supposed to be padded with a space

v0.8.1 on 2014-06-17
--------------------

- fix `%Z` when the timezone contains spaces
  Thanks to [w0den](https://github.com/w0den)

- fix examples using `%Y` in the readme
  Thanks to [Ryan Regalado](https://github.com/d48)

- fix a bug when specifying minutes in the timezone
  Thanks to [Alexandr Nikitin](https://github.com/alexandrnikitin)

v0.8.0 on 2014-01-29
--------------------

- allow timezones to be specified as strings of the form `"+0100"` or `"-0800"` (`[+-]HHMM`)

- fix a bug running tests where the environment variable `TZ` is empty and the system timezone is not PST/PDT

v0.7.0 on 2013-11-08
--------------------

- add support for passing in explicit timezones with `strftimeTZ` which accepts numeric offsets from GMT, in minutes

v0.6.2 on 2013-08-29
--------------------

- expose `strftimeUTC` and `localizedStrftime` properly in browsers

v0.6.1 on 2013-06-13
--------------------

- fix a bug where `RequiredDateMethods` was created as a global

v0.6.0 on 2013-05-15
--------------------

- add `%o` to get the day of the month as an ordinal (in English)

v0.5.2 on 2013-04-07
--------------------

- add some Ruby extension prefixes: `-`, `_`, and `0`, and they work like so:
  `strftime('%-d') // => "7"`
  `strftime('%_d') // => " 7"`
  `strftime('%0d') // => "07"`

- fix padding the day-of-year in `%j`

- add a minified version of the code to the repo for easy distribution with some package managers

v0.5.1 on 2013-03-07
--------------------

- remove deprecated `getLocalizedStrftime` function

- make `%C` pad the century with spaces, like C

- list all supported specifiers in the readme, it's no longer fair to say "look at `man 3 strftime`"

- use fixed dates in the readme instead of "now", so people can execute the examples and see the same results
  Thanks to [John Zwinck](https://github.com/jzwinck)

- fix `%z` for timezones greater than GMT

- support any `Date`-like objects instead of checking for actual instances of `Date`

v0.5.0 on 2013-01-05
--------------------

- add week numbers `%U` and `%W`

- add support for [component](https://github.com/componentjs/component)
  Thanks to [TJ Holowaychuk](https://github.com/tj)

v0.4.8 on 2012-11-13
--------------------

- add `%j` and `%C`, thanks to [Ryan Stafford](https://github.com/ryanstafford)

v0.4.7 on 2012-06-08
--------------------

- add `%P` which is "am" or "pm", like `%p` but lowercase
  (this makes no sense, and I am sorry for propagating this madness)
  Thanks to [Rob Colburn](https://github.com/robcolburn)

- export the `strftime` function directly in [node](https://nodejs.org) so you can write `strftime = require('strftime')` instead of `strftime = require('strftime').strftime`

- added contributors to the readme and package.json

v0.4.6 on 2011-06-13
--------------------

- rename `getLocalizedStrftime(locale)` to `localizedStrftime(locale)`
  The old name is deprecated and will stick around until v0.5 or v0.6.

- add tests for locales

v0.4.5 on 2011-06-08
--------------------

- fix the sign of `%z`, which is something like "+0100" or "-0800" (`[+-]HHMM`)

- improve test coverage

v0.4.4 on 2011-06-07
--------------------

- fix `%L` for values < 100

- convert tests from CoffeeScript to JavaScript
  (nothing personal, just keeping the dependencies trim)

v0.4.3 on 2011-06-05
--------------------

This release was all [Andrew Schaaf](https://github.com/andrewschaaf).

- add some tests

- fix `%s` which is seconds since the Unix epoch, but was in milliseconds

- add `%L` for 3-digit milliseconds

v0.4.2 on 2011-06-05
--------------------

- add `strftimeUTC` for ignoring timezones
  Thanks to [Andrew Schaaf](https://github.com/andrewschaaf)

- support exporting to the top level object in ES5 strict mode

v0.4.1 on 2011-06-02
--------------------

- fix `%y` for years outside the range [1900, 2099]

v0.4.0 on 2011-04-28
--------------------

- add support for localization

v0.3.0 on 2010-12-17
--------------------

- fix export for browsers

v0.2.3 on 2010-12-15
--------------------

- set required [node](https://nodejs.org) version to 0.2 instead of 0.3 in package.json

v0.2.2 on 2010-11-14
--------------------

- fix module export

v0.2.1 on 2010-11-11
--------------------

- bug fix for recursive formats

v0.2.0 on 2010-11-11
--------------------

- use `String.prototype.replace` instead of a `for` loop

v0.1.0 on 2010-11-11
--------------------

Initial release.