# path-data-parser

I know there are a bunch of SVG path parsers out there, but here's one that I have been using for a few years now. It's small, tree-shakable and provides four simple functions that I have needed in several graphics projects.

## Install

From npm

```
npm install --save path-data-parser
```

The code is shipped as ES6 modules. 

## Methods

The module exposes 4 methods

### pasrePath(d: string): Segment[]

This is the main method that parses the SVG path data. You pass in the path string and it returns an array of `Segments`. A segment has a `key` which is the commands, e.g. `M` or `h` or `C`; and `data` which is an array of numbers used by the command

```javascript
Segment {
  key: string;
  data: number[];
}
```

example:

```javascript
import { parsePath } from 'path-data-parser';
const segments = parsePath('M10 10 h 80 v 80 h -80 C Z');
```

### serialize(segments: Segment[]): string

This is essentially the opposite of the `parsePath` command. It outputs a path string from an array of `Segment` objects.

```javascript
import { parsePath, serialize, absolutize } from 'path-data-parser';

const segments = parsePath('M10 10 h 80 v 80 h -80 Z');
const absoluteSegments = absolutize(segments); // Turns relative commands to absolute
const outputPath = serialize(absoluteSegments);
console.log(outputPath); // M 10 10 H 90 V 90 H 10 Z
```

### absolutize(segments: Segment[]): Segment[]

Translates relative commands to absolute commands. i.e. all commands that use relative positions (lower-case ones), turns into absolute position commands (upper-case ones).
See the `serialize` example above. 

### normalize(segments: Segment[]): Segment[]

Normalize takes a list of _absolute segments_ and outputs a list of segments with only four commands: `M, L, C, Z`. So every segment is described as move, line, or a bezier curve (cubic). 

This is useful when translating SVG paths to non SVG mediums - Canvas, or some other graphics platform. Most such platforms will support lines and bezier curves. It also simplifies the cases to consider when modifying these segments.

```javascript
import { parsePath, serialize, absolutize, normalize } from 'path-data-parser';
 
const segments = parsePath(' M 10 80 Q 52.5 10, 95 80 T 180 80');
const absoluteSegments = absolutize(segments);
const normalizedSegments = normalize(absoluteSegments);
// M 10 80 C 38.33 33.33, 66.67 33.33, 95 80 C 123.33 126.67, 151.67 126.67, 180 80
 
```

## License
[MIT License](https://github.com/pshihn/path-data-parser/blob/master/LICENSE)
