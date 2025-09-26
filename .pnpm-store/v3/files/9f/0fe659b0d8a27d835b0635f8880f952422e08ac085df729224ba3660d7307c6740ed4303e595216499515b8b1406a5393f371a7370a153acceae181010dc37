# @date-fns/tz

The package provides `Date` extensions `TZDate` and `TZDateMini` that perform all calculations in the given time zone rather than the system time zone.

Using it makes [date-fns](https://github.com/date-fns/date-fns) operate in given time zone but can also be used without it.

Like everything else in the date-fns ecosystem, the library is build-size aware. The smallest component, `TZDateMini,` is only `916 B`.

**Need only UTC?** See [@date-fns/utc](https://github.com/date-fns/utc) that provides lighter solution.

## Installation

```bash
npm install @date-fns/tz --save
```

## Usage

`TZDate` and `TZDateMini` have API similar to `Date`, but perform all calculations in the given time zone, which might be essential when operating across different time zones, calculating dates for users in different regions, or rendering chart or calendar component:

```ts
import { TZDate } from "@date-fns/tz";
import { addHours } from "date-fns";

// Given that the system time zone is America/Los_Angeles
// where DST happens at Sunday, 13 March 2022, 02:00:00

// Using system time zone will produce 03:00 instead of 02:00 because of DST:
const date = new Date(2022, 2, 13);
addHours(date, 2).toString();
//=> 'Sun Mar 13 2022 03:00:00 GMT-0700 (Pacific Daylight Time)'

// Using Asia/Singapore will provide expected 02:00:
const tzDate = new TZDate(2022, 2, 13, "Asia/Singapore");
addHours(tzDate, 2).toString();
//=> 'Sun Mar 13 2022 02:00:00 GMT+0800 (Singapore Standard Time)'
```

### Accepted time zone formats

You can pass IANA time zone name ("Asia/Singapore", "America/New_York", etc.) or UTC offset ("+01:00", "-2359", or "+23"):

```ts
new TZDate(2022, 2, 13, "Asia/Singapore");

new TZDate(2022, 2, 13, "+08:00");

new TZDate(2022, 2, 13, "-2359");
```

### Difference between `TZDate` and `TZDateMini`

The main difference between `TZDate` and `TZDateMini` is the build footprint. The `TZDateMini` is `916 B`, and the `TZDate` is `1.2 kB`. While the difference is slight it might be essential in some environments and use cases.

Unlike `TZDateMini` which implements only getters, setters, and `getTimezoneOffset`, `TZDate` also provides formatter functions, mirroring all original `Date` functionality:

```ts
import { TZDateMini, TZDate } from "@date-fns/tz";

// TZDateMini will format date-time in the system time zone:
new TZDateMini(2022, 2, 13).toString();
//=> 'Sat Mar 12 2022 16:00:00 GMT-0800 (Pacific Standard Time)'

// TZDate will format date-time in the Singapore time zone, like expected:
new TZDate(2022, 2, 13).toString();
//=> 'Sun Mar 13 2022 00:00:00 GMT+0800 (Singapore Standard Time)'
```

Even though `TZDate` has a complete API, developers rarely use the formatter functions outside of debugging, so we recommend you pick the more lightweight `TZDateMini` for internal use. However, in environments you don't control, i.e., when you expose the date from a library, using `TZDate` will be a safer choice.

### React Native / Hermes JS Engine

Starting with [v1.3.0](https://github.com/date-fns/tz/releases/tag/v1.3.0), `@date-fns/tz` supports [Format.JS polyfills](https://formatjs.github.io/docs/polyfills/intl-datetimeformat/) that are required for [Hermes JS Engine](https://github.com/facebook/hermes/blob/main/README.md) powering React Native runtime to work correctly.

To use it, you need to import the following polyfills in your entry point:

```ts
import "@formatjs/intl-getcanonicallocales/polyfill";
import "@formatjs/intl-locale/polyfill";
import "@formatjs/intl-pluralrules/polyfill";
import "@formatjs/intl-numberformat/polyfill";
import "@formatjs/intl-numberformat/locale-data/en";
import "@formatjs/intl-datetimeformat/polyfill";
import "@formatjs/intl-datetimeformat/locale-data/en";
import "@formatjs/intl-datetimeformat/add-golden-tz"; // or: "@formatjs/intl-datetimeformat/add-all-tz"
```

[The JavaScriptCore engine](https://github.com/apple-opensource/JavaScriptCore) is also supported and tested but does not require any polyfills.

## API

- [`TZDate`](#tzdate)
- [`tz`](#tz)
- [`tzOffset`](#tzoffset)
- [`tzScan`](#tzscan)

### `TZDate`

All the `TZDate` docs are also true for `TZDateMini`.

#### Constructor

When creating `TZDate`, you can pass the time zone as the last argument:

```ts
new TZDate(2022, 2, "Asia/Singapore");

new TZDate(timestamp, "Asia/Singapore");

new TZDate("2024-09-12T00:00:00Z", "Asia/Singapore");
```

The constructor mirrors the original `Date` parameters except for the last time zone parameter.

#### `TZDate.tz`

The static `tz` function allows to construct `TZDate` instance with just a time zone:

```ts
// Create now in Singapore time zone:
TZDate.tz("Asia/Singapore");

// ❌ This will not work, as TZDate expects a date string:
new TZDate("Asia/Singapore");
//=> Invalid Date
```

Just like the constructor, the function accepts all parameters variants:

```ts
TZDate.tz("Asia/Singapore", 2022, 2);

TZDate.tz("Asia/Singapore", timestamp);

TZDate.tz("Asia/Singapore", "2024-09-12T00:00:00Z");
```

#### `timeZone`

The readonly `timeZone` property returns the time zone name assigned to the instance:

```ts
new TZDate(2022, 2, 13, "Asia/Singapore").timeZone;
// "Asia/Singapore"
```

The property might be `undefined` when created without a time zone:

```ts
new TZDate().timeZone;
// undefined
```

#### `withTimeZone`

The `withTimeZone` method allows to create a new `TZDate` instance with a different time zone:

```ts
const sg = new TZDate(2022, 2, 13, "Asia/Singapore");
const ny = sg.withTimeZone("America/New_York");

sg.toString();
//=> 'Sun Mar 13 2022 00:00:00 GMT+0800 (Singapore Standard Time)'

ny.toString();
//=> 'Sat Mar 12 2022 11:00:00 GMT-0500 (Eastern Standard Time)'
```

#### `[Symbol.for("constructDateFrom")]`

The `TZDate` instance also exposes a method to construct a `Date` instance in the same time zone:

```ts
const sg = TZDate.tz("Asia/Singapore");

// Given that the system time zone is America/Los_Angeles

const date = sg[Symbol.for("constructDateFrom")](new Date(2024, 0, 1));

date.toString();
//=> 'Mon Jan 01 2024 16:00:00 GMT+0800 (Singapore Standard Time)'
```

It's created for date-fns but can be used in any context. You can access it via `Symbol.for("constructDateFrom")` or import it from the package:

```ts
import { constructFromSymbol } from "@date-fns/tz";
```

### `tz`

The `tz` function allows to specify the context for the [date-fns] functions (**starting from date-fns@4**):

```ts
import { isSameDay } from "date-fns";
import { tz } from "@date-fns/tz";

isSameDay("2024-09-09T23:00:00-04:00", "2024-09-10T10:00:00+08:00", {
  in: tz("Europe/Prague"),
});
//=> true
```

### `tzOffset`

The `tzOffset` function allows to get the time zone UTC offset in minutes from the given time zone and a date:

```ts
import { tzOffset } from "@date-fns/tz";

const date = new Date("2020-01-15T00:00:00Z");

tzOffset("Asia/Singapore", date);
//=> 480

tzOffset("America/New_York", date);
//=> -300

// Summer time:
tzOffset("America/New_York", "2020-01-15T00:00:00Z");
//=> -240
```

Unlike `Date.prototype.getTimezoneOffset`, this function returns the value mirrored to the sign of the offset in the time zone. For Asia/Singapore (UTC+8), `tzOffset` returns 480, while `getTimezoneOffset` returns -480.

### `tzScan`

The function scans the time zone for changes in the given interval. It returns an array of objects with the date of the change, the offset change, and the new offset:

```ts
import { tzScan } from "@date-fns/tz";

tzScan("America/New_York", {
  start: new Date("2020-01-01T00:00:00Z"),
  end: new Date("2024-01-01T00:00:00Z"),
});
//=> [
//=>   { date: 2020-03-08T07:00:00.000Z, change: 60, offset: -240 },
//=>   { date: 2020-11-01T06:00:00.000Z, change: -60, offset: -300 },
//=>   { date: 2021-03-14T07:00:00.000Z, change: 60, offset: -240 },
//=>   { date: 2021-11-07T06:00:00.000Z, change: -60, offset: -300 },
//=>   { date: 2022-03-13T07:00:00.000Z, change: 60, offset: -240 },
//=>   { date: 2022-11-06T06:00:00.000Z, change: -60, offset: -300 },
//=>   { date: 2023-03-12T07:00:00.000Z, change: 60, offset: -240 },
//=>   { date: 2023-11-05T06:00:00.000Z, change: -60, offset: -300 }
//=> ]
```

### `tzName`

The function returns time zone name in human-readable format, e.g. `"Singapore Standard Time"` in the give date and time.

```ts
import { tzName } from "@date-fns/tz";

tzName("Asia/Singapore", new Date("2020-01-01T00:00:00Z"));
//=> "Singapore Standard Time"
```

It is possible to specify the format as the third argument using one of the following options:

- `"short"`e.g., `"EDT"` or "GMT+8"`.
- `"long"`: e.g., `"Eastern Daylight Time"` or `"Singapore Standard Time"`.
- `"shortGeneric"`: e.g., `"ET"` or `"Singapore Time"`.
- `"longGeneric"`: e.g., `"Eastern Time"` or `"Singapore Standard Time"`.

These options correspond to [TR35 tokens](https://www.unicode.org/reports/tr35/tr35-dates.html#dfst-zone) `z..zzz`, `zzzz`, `v`, and `vvvv` respectively.

```ts
import { tzName } from "@date-fns/tz";

const date = new Date("2020-01-01T00:00:00.000Z");

tzName("America/New_York", date, "short");
//=> "EST"

tzName("America/New_York", date, "shortGeneric");
//=> "ET"
```

## Changelog

See [the changelog](./CHANGELOG.md).

## License

[MIT © Sasha Koss](https://kossnocorp.mit-license.org/)
