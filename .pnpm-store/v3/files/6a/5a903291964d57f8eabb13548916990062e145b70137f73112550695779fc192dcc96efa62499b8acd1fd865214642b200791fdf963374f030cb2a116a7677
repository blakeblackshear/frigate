# buffers

Various helper utilities for working with buffers and binary data in TypeScript.

## Installation

```bash
npm install @jsonjoy.com/buffers
```

## Features

This package provides high-performance utilities for working with binary data, buffers, and UTF-8 text encoding/decoding. It includes optimized implementations for both Node.js and browser environments.

## Core Classes

### Writer

A growable binary data writer with automatic buffer expansion.

```typescript
import {Writer} from '@jsonjoy.com/buffers/lib/Writer';

const writer = new Writer();
writer.u8(0x42);          // Write unsigned 8-bit integer
writer.u16(0x1234);       // Write unsigned 16-bit integer
writer.u32(0x12345678);   // Write unsigned 32-bit integer
writer.u64(0x123456789abcdefn); // Write unsigned 64-bit integer
writer.f32(3.14);         // Write 32-bit float
writer.f64(3.141592653589793); // Write 64-bit float
writer.utf8('Hello 🌍');  // Write UTF-8 string
writer.ascii('Hello');    // Write ASCII string

const data = writer.flush(); // Get written data as Uint8Array
```

### Reader

A binary data reader for parsing binary buffers.

```typescript
import {Reader} from '@jsonjoy.com/buffers/lib/Reader';

const reader = new Reader();
reader.reset(someUint8Array);

const byte = reader.u8();     // Read unsigned 8-bit integer
const word = reader.u16();    // Read unsigned 16-bit integer
const dword = reader.u32();   // Read unsigned 32-bit integer
const qword = reader.u64();   // Read unsigned 64-bit integer
const float = reader.f32();   // Read 32-bit float
const double = reader.f64();  // Read 64-bit float
const text = reader.utf8(5);  // Read UTF-8 string of 5 bytes
const ascii = reader.ascii(5); // Read ASCII string of 5 characters
```

### StreamingReader

A streaming binary reader that can handle data arriving in chunks.

```typescript
import {StreamingReader} from '@jsonjoy.com/buffers/lib/StreamingReader';

const reader = new StreamingReader();
reader.push(chunk1);
reader.push(chunk2);

// Read data as it becomes available
const value = reader.u32();
reader.consume(); // Mark consumed data for cleanup
```

### StreamingOctetReader

A specialized streaming reader for byte-oriented protocols with optional XOR masking.

```typescript
import {StreamingOctetReader} from '@jsonjoy.com/buffers/lib/StreamingOctetReader';

const reader = new StreamingOctetReader();
reader.push(dataChunk);

const byte = reader.u8();
const masked = reader.bufXor(length, [0x12, 0x34, 0x56, 0x78], 0);
```

## Utility Functions

### Buffer Operations

```typescript
// Array creation and manipulation
import {b} from '@jsonjoy.com/buffers/lib/b';
import {concat, concatList} from '@jsonjoy.com/buffers/lib/concat';
import {copy} from '@jsonjoy.com/buffers/lib/copy';

const buffer = b(0x48, 0x65, 0x6c, 0x6c, 0x6f); // Create from bytes
const combined = concat(buffer1, buffer2);         // Concatenate two buffers
const list = concatList([buf1, buf2, buf3]);      // Concatenate array of buffers
const duplicate = copy(originalBuffer);           // Copy buffer
```

### Comparison Functions

```typescript
import {cmpUint8Array} from '@jsonjoy.com/buffers/lib/cmpUint8Array';
import {cmpUint8Array2} from '@jsonjoy.com/buffers/lib/cmpUint8Array2';
import {cmpUint8Array3} from '@jsonjoy.com/buffers/lib/cmpUint8Array3';

const isEqual = cmpUint8Array(buf1, buf2);        // Returns boolean
const comparison = cmpUint8Array2(buf1, buf2);    // Returns -1, 0, or 1 (byte-first)
const comparison2 = cmpUint8Array3(buf1, buf2);   // Returns -1, 0, or 1 (length-first)
```

### Type Checking

```typescript
import {isUint8Array} from '@jsonjoy.com/buffers/lib/isUint8Array';
import {isArrayBuffer} from '@jsonjoy.com/buffers/lib/isArrayBuffer';
import {isFloat32} from '@jsonjoy.com/buffers/lib/isFloat32';

if (isUint8Array(data)) { /* data is Uint8Array or Buffer */ }
if (isArrayBuffer(data)) { /* data is ArrayBuffer */ }
if (isFloat32(3.14)) { /* number can fit in float32 */ }
```

### Conversion Functions

```typescript
import {toUint8Array} from '@jsonjoy.com/buffers/lib/toUint8Array';
import {bufferToUint8Array} from '@jsonjoy.com/buffers/lib/bufferToUint8Array';
import {toBuf} from '@jsonjoy.com/buffers/lib/toBuf';

const uint8 = toUint8Array(data);           // Convert various types to Uint8Array
const converted = bufferToUint8Array(buf);  // Convert Buffer to Uint8Array
const encoded = toBuf('Hello 🌍');          // Convert string to UTF-8 bytes
```

### String Utilities

```typescript
import {ascii, utf8} from '@jsonjoy.com/buffers/lib/strings';

const asciiBytes = ascii`Hello World`;      // ASCII string to bytes
const utf8Bytes = utf8`Hello 🌍`;           // UTF-8 string to bytes
```

## UTF-8 Encoding/Decoding

### High-Performance UTF-8 Decoding

```typescript
import {decodeUtf8} from '@jsonjoy.com/buffers/lib/utf8/decodeUtf8';

const text = decodeUtf8(uint8Array, offset, length);
```

The package includes multiple optimized UTF-8 decoding implementations that automatically choose the best strategy based on:
- Environment (Node.js vs Browser)
- String length
- Available APIs

### UTF-8 Encoding

```typescript
import {encode} from '@jsonjoy.com/buffers/lib/utf8/encode';

const bytesWritten = encode(targetArray, 'Hello 🌍', offset, maxLength);
```

### Advanced UTF-8 Features

```typescript
import {CachedUtf8Decoder} from '@jsonjoy.com/buffers/lib/utf8/CachedUtf8Decoder';
import {isUtf8} from '@jsonjoy.com/buffers/lib/utf8/isUtf8';
import {decodeAscii} from '@jsonjoy.com/buffers/lib/utf8/decodeAscii';

const decoder = new CachedUtf8Decoder();
const text = decoder.decode(uint8Array, start, length);

const isValidUtf8 = isUtf8(uint8Array);
const asciiText = decodeAscii(uint8Array, start, length);
```

## Special Data Types

### Slice

A lightweight view into a buffer without copying data.

```typescript
import {Slice} from '@jsonjoy.com/buffers/lib/Slice';

const slice = new Slice(uint8Array, dataView, start, end);
const subarray = slice.subarray(); // Get the actual data
```

### Float16 Support

```typescript
import {decodeF16} from '@jsonjoy.com/buffers/lib/f16';

const float32Value = decodeF16(binaryF16Value);
```

## Debugging Utilities

```typescript
import {printOctets} from '@jsonjoy.com/buffers/lib/printOctets';

console.log(printOctets(uint8Array, 16)); // Print hex dump of first 16 bytes
```

## Performance

This library is designed for high performance with:

- **Optimized UTF-8 handling**: Multiple implementations that choose the fastest method for each environment
- **Minimal allocations**: Reusable readers and writers with buffer pooling
- **Zero-copy operations**: Slices and views avoid unnecessary data copying
- **Environment-specific optimizations**: Leverages Node.js Buffer APIs when available

## Browser Support

Works in all modern browsers and Node.js environments. The library automatically detects available APIs and chooses the most appropriate implementation.

## TypeScript Support

Full TypeScript support with comprehensive type definitions included.

## License

Apache-2.0

