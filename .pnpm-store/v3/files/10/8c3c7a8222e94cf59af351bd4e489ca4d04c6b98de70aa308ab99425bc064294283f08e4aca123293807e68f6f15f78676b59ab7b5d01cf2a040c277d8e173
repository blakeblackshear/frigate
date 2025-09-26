# [Khrôma](https://en.wiktionary.org/wiki/%CF%87%CF%81%E1%BF%B6%CE%BC%CE%B1)

A collection of functions for manipulating CSS colors, inspired by SASS.

## Features

- **Small**: the entire library weighs ~5kb (min + gzip) and has no dependencies.
- **Fast**: in our benchmark suite functions are executed at ~0.0025ms per call on a mid-2014 MBP.
- **Flexible**: All valid CSS colors are supported.
- **SASS-like**: if you're familiar with SASS you should feel right at home.

## Install

```sh
npm install --save khroma
```

## Usage

```ts
import {red, isDark, darken, change} from 'khroma';

red ( '#ffffff' ); // => 255
isDark ( 'white' ); // => false
darken ( 'hsl(0, 5%, 100%)', 50 ); // => 'hsl(0, 5%, 50%)'
change ( 'rgb(255, 255, 255)', { a: 0.5 } ); // => 'rgba(255, 255, 255, 0.5)'
```

## Functions

These are all the provided functions, for each of them below you can find a short description, its interface and examples.

| Create        | Convert                 | Get <sub>channel</sub>    | Get <sub>more</sub>             | Edit <sub>channel</sub>           | Edit <sub>more</sub> |
| ------------- | ----------------------- | ------------------------- | ------------------------------- | --------------------------------- | -------------------- |
| [hex](#hex)   | [toKeyword](#tokeyword) | [channel](#channel)       | [contrast](#contrast)           | [saturate](#saturate)             | [adjust](#adjust)    |
| [rgb](#rgb)   | [toHex](#tohex)         | [red](#red)               | [luminance](#luminance)         | [desaturate](#desaturate)         | [change](#change)    |
| [rgba](#rgba) | [toRgba](#torgba)       | [green](#green)           | [isDark](#isdark)               | [lighten](#lighten)               | [invert](#invert)    |
| [hsl](#hsl)   | [toHsla](#tohsla)       | [blue](#blue)             | [isLight](#islight)             | [darken](#darken)                 | [mix](#mix)          |
| [hsla](#hsla) |                         | [hue](#hue)               | [isTransparent](#istransparent) | [opacify](#opacify)               | [scale](#scale)      |
|               |                         | [saturation](#saturation) | [isValid](#isvalid)             | [fadeIn](#fadein)                 |                      |
|               |                         | [lightness](#lightness)   |                                 | [transparentize](#transparentize) |                      |
|               |                         | [alpha](#alpha)           |                                 | [fadeOut](#fadeout)               |                      |
|               |                         | [opacity](#opacity)       |                                 | [rgba](#rgba-alt) (alt)           |                      |
|               |                         |                           |                                 | [complement](#complement)         |                      |
|               |                         |                           |                                 | [grayscale](#grayscale)           |                      |

### Create

These functions create a new color given the provided channels.

#### `hex`

Alias for [`rgba`](#rgba).

#### `rgb`

Alias for [`rgba`](#rgba).

#### `rgba`

Creates a new color given its rgba channels, the alpha channel is optional.

```ts
function rgba ( r: string, g: number, b: number, a: number = 1 ): string;
```

```ts
rgba ( 255, 204, 0 ); // => '#ffcc00'
rgba ( 255, 204, 0, 0.5 ); // => 'rgba(255, 204, 0, 0.5)'
```

#### `hsl`

Alias for [`hsla`](#hsla).

#### `hsla`

Creates a new color given its hsla channels, the alpha channel is optional.

```ts
function hsla ( h: number, s: number, l: number, a: number = 1 ): string;
```

```ts
hsla ( 0, 50, 100 ); // => 'hsl(0, 50%, 100%)'
hsla ( 10, 50, 100, 0.5 ); // => 'hsla(10, 50%, 100%, 0.5)'
```

### Convert

These functions convert supported colors to a specific format.

#### `toKeyword`

Convert a color to the keyword format, when possible.

```ts
function toKeyword ( color: string ): string | undefined;
```

```ts
toKeyword ( '#ff0000' ); // => 'red'
toKeyword ( '#ffcc00' ); // => undefined
```

#### `toHex`

Convert a color to the HEX format.

```ts
function toHex ( color: string ): string;
```

```ts
toHex ( 'red' ); // => '#ff0000'
toHex ( '#ff0000' ); // => '#ff0000'
```

#### `toRgba`

Convert a color to the RGBA format.

```ts
function toRgba ( color: string ): string;
```

```ts
toRgba ( 'red' ); // => 'rgb(255, 0, 0)'
toRgba ( '#ff0000' ); // => 'rgb(255, 0, 0)'
toRgba ( '#00000088' ); // => 'rgba(0, 0, 0, 0.5333333333)'
```

#### `toHsla`

Convert a color to the HSLA format.

```ts
function toHsla ( color: string ): string;
```

```ts
toHsla ( 'red' ); // => 'hsl(0, 100%, 50%)'
toHsla ( '#ff0000' ); // => 'hsl(0, 100%, 50%)'
toHsla ( 'rgb(255, 0, 0)' ); // => 'hsl(0, 100%, 50%)'
```

### Get <sub>channel</sub>

These functions get a single channel from the provided color.

#### `channel`

Gets any single channel of the color.

```ts
function channel ( color: string, channel: 'r' | 'g' | 'b' | 'h' | 's' | 'l' | 'a' ): number;
```

```ts
channel ( '#ffcc00', 'r' ); // => 255
channel ( '#ffcc00', 'h' ); // => 48
channel ( '#ffcc00', 'a' ); // => 1
```

#### `red`

Gets the red channel of the color.

```ts
function red ( color: string ): number;
```

```ts
red ( '#ffcc00' ); // => 255
```

#### `green`

Gets the green channel of the color.

```ts
function green ( color: string ): number;
```

```ts
green ( '#ffcc00' ); // => 204
```

#### `blue`

Gets the blue channel of the color.

```ts
function blue ( color: string ): number;
```

```ts
blue ( '#ffcc00' ); // => 0
```

#### `hue`

Gets the hue channel of the color.

```ts
function hue ( color: string ): number;
```

```ts
hue ( 'hsl(0, 50%, 100%)' ); // => 0
```

#### `saturation`

Gets the saturation channel of the color.

```ts
function saturation ( color: string ): number;
```

```ts
saturation ( 'hsl(0, 50%, 100%)' ); // => 50
```

#### `lightness`

Gets the lightness channel of the color.

```ts
function lightness ( color: string ): number;
```

```ts
lightness ( 'hsl(0, 50%, 100%)' ); // => 100
```

#### `alpha`

Gets the alpha channel of the color.

```ts
function alpha ( color: string ): number;
```

```ts
alpha ( '#ffcc00' ); // => 1
alpha ( 'rgba(255, 205, 0, 0.5)' ); // => 0.5
```

#### `opacity`

Alias for [`alpha`](#alpha).

### Get <sub>more</sub>

These functions get some other information from the provided color.

#### `contrast`

Gets the contrast in luminance between two colors.

Contrast values go between 1 and 10. 1 means same color, >= 4 means decent contrast, >= 7 means great contrast, 10 means great contrast.

```ts
function contrast ( color1: string, color2: string ): number;
```

```ts
contrast ( '#000000', '#000000' ); // => 1
contrast ( '#000000', '#ffffff' ); // => 10
contrast ( '#888888', '#ffffff' ); // => 4.0617165366
```

#### `luminance`

Gets the [relative luminance](https://en.wikipedia.org/wiki/Relative_luminance) of the color.

```ts
function luminance ( color: string ): number;
```

```ts
luminance ( 'black' ); // => 0
luminance ( 'white' ); // => 1
luminance ( '#ffcc00' ); // => 0.6444573127
```

#### `isDark`

Checks if the provided color is a dark color.

```ts
function isDark ( color: string ): number;
```

```ts
isDark ( 'black' ); // => true
isDark ( 'white' ); // => false
isDark ( '#ffcc00' ); // => false
```

#### `isLight`

Checks if the provided color is a light color.

```ts
function isLight ( color: string ): number;
```

```ts
isLight ( 'black' ); // => false
isLight ( 'white' ); // => true
isLight ( '#ffcc00' ); // => true
```

#### `isTransparent`

Checks if the provided color is a transparent color.

```ts
function isTransparent ( color: string ): boolean;
```

```ts
isTransparent ( 'transparent' ); // => true
isTransparent ( '#ffcc0000' ); // => true
isTransparent ( '#ffcc00' ); // => false
```

#### `isValid`

Checks if the provided color is a valid color.

```ts
function isLight ( color: string ): boolean;
```

```ts
isValid ( 'black' ); // => true
isValid ( '#ffcc00' ); // => true
isValid ( '#wtf' ); // => false
```

### Edit <sub>channel</sub>

These functions change a single channel of the provided color.

#### `saturate`

Increases the saturation channel of the color.

```ts
function saturate ( color: string, amount: number ): string;
```

```ts
saturate ( 'hsl(0, 50%, 50%)', 25 ); // => 'hsl(0, 75%, 50%)'
```

#### `desaturate`

Decreases the saturation channel of the color.

```ts
function desaturate ( color: string, amount: number ): string;
```

```ts
desaturate ( 'hsl(0, 50%, 50%)', 25 ); // => 'hsl(0, 25%, 50%)'
```

#### `lighten`

Increases the lightness channel of the color.

```ts
function lighten ( color: string, amount: number ): string;
```

```ts
lighten ( 'hsl(0, 50%, 50%)', 25 ); // => 'hsl(0, 50%, 75%)'
```

#### `darken`

Decreases the lightness channel of the color.

```ts
function darken ( color: string, amount: number ): string;
```

```ts
darken ( 'hsl(0, 50%, 50%)', 25 ); // => 'hsl(0, 50%, 25%)'
```

#### `opacify`

Increases the opacity channel of the color.

```ts
function opacify ( color: string, amount: number ): string;
```

```ts
opacify ( 'rgba(255, 204, 0, 0.5)', 0.25 ); // => 'rgba(255, 204, 0, 0.75)'
```

#### `fadeIn`

Alias for [`opacify`](#opacify).

#### `transparentize`

Decreases the opacity channel of the color.

```ts
function transparentize ( color: string, amount: number ): string;
```

```ts
transparentize ( 'rgba(255, 204, 0, 0.5)', 0.25 ); // => 'rgba(255, 204, 0, 0.25)'
```

#### `fadeOut`

Alias for [`transparentize`](#transparentize).

#### `rgba` (alt)

Sets a new value for the opacity channel.

```ts
function rgba ( color: string, amount: number ): string;
```

```ts
rgba ( 'rgba(255, 204, 0, 0.5)', 0.1 ); // => 'rgba(255, 204, 0, 0.1)'
```

#### `complement`

Gets the complement of the color, rotating its hue channel by 180 degrees.

```ts
function complement ( color: string ): string;
```

```ts
complement ( '#ffcc00' ); // => 'hsl(228, 100%, 50%)'
```

#### `grayscale`

Gets the grayscale version of the color, setting its saturation to 0.

```ts
function grayscale ( color: string ): string;
```

```ts
grayscale ( '#ffcc00' ); // => 'hsl(48, 0%, 50%)'
```

### Edit <sub>more</sub>

These functions can/will change more than a single channel at once of the provided color.

#### `adjust`

Increases or decreases the value of any channel of the color.

```ts
function adjust ( color: string, channels: Record<'r' | 'g' | 'b' | 'h' | 's' | 'l' | 'a', number> ): string;
```

```ts
adjust ( '#ffcc00', { r: -10, g: 200 } ); // => '#f5ff00'
adjust ( '#ffcc00', { a: -0.5 } ); // => 'rgba(255, 204, 0, 0.5)'
adjust ( '#ffcc00', { h: 50, l: -30 } ); // => 'hsl(98, 100%, 20%)'
```

#### `change`

Sets a new value for any channel of the color.

```ts
function change ( color: string, channels: Record<'r' | 'g' | 'b' | 'h' | 's' | 'l' | 'a', number> ): string;
```

```ts
change ( '#ffcc00', { r: 10, g: 200 } ); // => '#0ac800'
change ( '#ffcc00', { a: 0.5 } ); // => 'rgba(255, 204, 0, 0.5)'
change ( '#ffcc00', { h: 50, l: 30 } ); // => 'hsl(50, 100%, 30%)'
```

#### `invert`

Gets the inverse of the color.

```ts
function invert ( color: string, weight: number = 100 ): string;
```

```ts
invert ( '#ffcc00' ); // => '#0033ff'
invert ( '#ffcc00', 50 ); // => '#808080'
```

#### `mix`

Mixes two colors together.

```ts
function mix ( color1: string, color2: string, weight: number = 50 ): string;
```

```ts
mix ( 'red', 'blue' ); // => '#800080'
mix ( 'red', 'blue', 15 ); // => '#2600d9'
```

#### `scale`

Scales any channel of the color.

```ts
function scale ( color: string, channels: Record<'r' | 'g' | 'b' | 'h' | 's' | 'l' | 'a', number> ): string;
```

```ts
scale ( '#ffcc00', { r: -50, b: 10 } ); // => '#80cc1a'
```

## License

MIT © Fabio Spampinato, Andrew Maney
