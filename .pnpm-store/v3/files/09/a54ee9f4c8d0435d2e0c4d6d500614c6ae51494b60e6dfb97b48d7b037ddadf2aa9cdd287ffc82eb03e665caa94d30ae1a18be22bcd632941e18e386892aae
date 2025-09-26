/*
 * Source: https://github.com/mozilla/vtt.js/blob/master/dist/vtt.js
 */

import VTTCue from './vttcue';

class StringDecoder {
  decode(data: string | any, options?: Object): string | never {
    if (!data) {
      return '';
    }

    if (typeof data !== 'string') {
      throw new Error('Error - expected string data.');
    }

    return decodeURIComponent(encodeURIComponent(data));
  }
}

// Try to parse input as a time stamp.
export function parseTimeStamp(input: string) {
  function computeSeconds(h, m, s, f) {
    return (h | 0) * 3600 + (m | 0) * 60 + (s | 0) + parseFloat(f || 0);
  }

  const m = input.match(/^(?:(\d+):)?(\d{2}):(\d{2})(\.\d+)?/);
  if (!m) {
    return null;
  }

  if (parseFloat(m[2]) > 59) {
    // Timestamp takes the form of [hours]:[minutes].[milliseconds]
    // First position is hours as it's over 59.
    return computeSeconds(m[2], m[3], 0, m[4]);
  }
  // Timestamp takes the form of [hours (optional)]:[minutes]:[seconds].[milliseconds]
  return computeSeconds(m[1], m[2], m[3], m[4]);
}

// A settings object holds key/value pairs and will ignore anything but the first
// assignment to a specific key.
class Settings {
  private readonly values: { [key: string]: any } = Object.create(null);

  // Only accept the first assignment to any key.
  set(k: string, v: any) {
    if (!this.get(k) && v !== '') {
      this.values[k] = v;
    }
  }
  // Return the value for a key, or a default value.
  // If 'defaultKey' is passed then 'dflt' is assumed to be an object with
  // a number of possible default values as properties where 'defaultKey' is
  // the key of the property that will be chosen; otherwise it's assumed to be
  // a single value.
  get(k: string, dflt?: any, defaultKey?: string): any {
    if (defaultKey) {
      return this.has(k) ? this.values[k] : dflt[defaultKey];
    }

    return this.has(k) ? this.values[k] : dflt;
  }
  // Check whether we have a value for a key.
  has(k: string): boolean {
    return k in this.values;
  }
  // Accept a setting if its one of the given alternatives.
  alt(k: string, v: any, a: any[]) {
    for (let n = 0; n < a.length; ++n) {
      if (v === a[n]) {
        this.set(k, v);
        break;
      }
    }
  }
  // Accept a setting if its a valid (signed) integer.
  integer(k: string, v: any) {
    if (/^-?\d+$/.test(v)) {
      // integer
      this.set(k, parseInt(v, 10));
    }
  }
  // Accept a setting if its a valid percentage.
  percent(k: string, v: any): boolean {
    if (/^([\d]{1,3})(\.[\d]*)?%$/.test(v)) {
      const percent = parseFloat(v);
      if (percent >= 0 && percent <= 100) {
        this.set(k, percent);
        return true;
      }
    }
    return false;
  }
}

// Helper function to parse input into groups separated by 'groupDelim', and
// interpret each group as a key/value pair separated by 'keyValueDelim'.
function parseOptions(
  input: string,
  callback: (k: string, v: any) => void,
  keyValueDelim: RegExp,
  groupDelim?: RegExp,
) {
  const groups = groupDelim ? input.split(groupDelim) : [input];
  for (const i in groups) {
    if (typeof groups[i] !== 'string') {
      continue;
    }

    const kv = groups[i].split(keyValueDelim);
    if (kv.length !== 2) {
      continue;
    }

    const k = kv[0];
    const v = kv[1];
    callback(k, v);
  }
}

const defaults = new VTTCue(0, 0, '');
// 'middle' was changed to 'center' in the spec: https://github.com/w3c/webvtt/pull/244
//  Safari doesn't yet support this change, but FF and Chrome do.
const center = (defaults.align as string) === 'middle' ? 'middle' : 'center';

function parseCue(input: string, cue: VTTCue, regionList: Region[]) {
  // Remember the original input if we need to throw an error.
  const oInput = input;
  // 4.1 WebVTT timestamp
  function consumeTimeStamp(): number | never {
    const ts = parseTimeStamp(input);
    if (ts === null) {
      throw new Error('Malformed timestamp: ' + oInput);
    }

    // Remove time stamp from input.
    input = input.replace(/^[^\sa-zA-Z-]+/, '');
    return ts;
  }

  // 4.4.2 WebVTT cue settings
  function consumeCueSettings(input: string, cue: VTTCue) {
    const settings = new Settings();

    parseOptions(
      input,
      function (k, v) {
        let vals;
        switch (k) {
          case 'region':
            // Find the last region we parsed with the same region id.
            for (let i = regionList.length - 1; i >= 0; i--) {
              if (regionList[i].id === v) {
                settings.set(k, regionList[i].region);
                break;
              }
            }
            break;
          case 'vertical':
            settings.alt(k, v, ['rl', 'lr']);
            break;
          case 'line':
            vals = v.split(',');
            settings.integer(k, vals[0]);
            if (settings.percent(k, vals[0])) {
              settings.set('snapToLines', false);
            }

            settings.alt(k, vals[0], ['auto']);
            if (vals.length === 2) {
              settings.alt('lineAlign', vals[1], ['start', center, 'end']);
            }

            break;
          case 'position':
            vals = v.split(',');
            settings.percent(k, vals[0]);
            if (vals.length === 2) {
              settings.alt('positionAlign', vals[1], [
                'start',
                center,
                'end',
                'line-left',
                'line-right',
                'auto',
              ]);
            }

            break;
          case 'size':
            settings.percent(k, v);
            break;
          case 'align':
            settings.alt(k, v, ['start', center, 'end', 'left', 'right']);
            break;
        }
      },
      /:/,
      /\s/,
    );

    // Apply default values for any missing fields.
    cue.region = settings.get('region', null);
    cue.vertical = settings.get('vertical', '');
    let line = settings.get('line', 'auto');
    if (line === 'auto' && defaults.line === -1) {
      // set numeric line number for Safari
      line = -1;
    }
    cue.line = line;
    cue.lineAlign = settings.get('lineAlign', 'start');
    cue.snapToLines = settings.get('snapToLines', true);
    cue.size = settings.get('size', 100);
    cue.align = settings.get('align', center);
    let position = settings.get('position', 'auto');
    if (position === 'auto' && defaults.position === 50) {
      // set numeric position for Safari
      position =
        cue.align === 'start' || cue.align === 'left'
          ? 0
          : cue.align === 'end' || cue.align === 'right'
            ? 100
            : 50;
    }
    cue.position = position;
  }

  function skipWhitespace() {
    input = input.replace(/^\s+/, '');
  }

  // 4.1 WebVTT cue timings.
  skipWhitespace();
  cue.startTime = consumeTimeStamp(); // (1) collect cue start time
  skipWhitespace();
  if (input.slice(0, 3) !== '-->') {
    // (3) next characters must match '-->'
    throw new Error(
      "Malformed time stamp (time stamps must be separated by '-->'): " +
        oInput,
    );
  }
  input = input.slice(3);
  skipWhitespace();
  cue.endTime = consumeTimeStamp(); // (5) collect cue end time

  // 4.1 WebVTT cue settings list.
  skipWhitespace();
  consumeCueSettings(input, cue);
}

export function fixLineBreaks(input: string): string {
  return input.replace(/<br(?: \/)?>/gi, '\n');
}

type Region = {
  id: string;
  region: any;
};

export class VTTParser {
  private state:
    | 'INITIAL'
    | 'HEADER'
    | 'ID'
    | 'CUE'
    | 'CUETEXT'
    | 'NOTE'
    | 'BADWEBVTT'
    | 'BADCUE' = 'INITIAL';
  private buffer: string = '';
  private decoder: StringDecoder = new StringDecoder();
  private regionList: Region[] = [];
  private cue: VTTCue | null = null;
  public oncue?: (cue: VTTCue) => void;
  public onparsingerror?: (error: Error) => void;
  public onflush?: () => void;

  parse(data?: string): VTTParser {
    const _this = this;

    // If there is no data then we won't decode it, but will just try to parse
    // whatever is in buffer already. This may occur in circumstances, for
    // example when flush() is called.
    if (data) {
      // Try to decode the data that we received.
      _this.buffer += _this.decoder.decode(data, { stream: true });
    }

    function collectNextLine(): string {
      let buffer: string = _this.buffer;
      let pos = 0;

      buffer = fixLineBreaks(buffer);

      while (
        pos < buffer.length &&
        buffer[pos] !== '\r' &&
        buffer[pos] !== '\n'
      ) {
        ++pos;
      }

      const line: string = buffer.slice(0, pos);
      // Advance the buffer early in case we fail below.
      if (buffer[pos] === '\r') {
        ++pos;
      }

      if (buffer[pos] === '\n') {
        ++pos;
      }

      _this.buffer = buffer.slice(pos);
      return line;
    }

    // 3.2 WebVTT metadata header syntax
    function parseHeader(input) {
      parseOptions(
        input,
        function (k, v) {
          // switch (k) {
          // case 'region':
          // 3.3 WebVTT region metadata header syntax
          // console.log('parse region', v);
          // parseRegion(v);
          // break;
          // }
        },
        /:/,
      );
    }

    // 5.1 WebVTT file parsing.
    try {
      let line: string = '';
      if (_this.state === 'INITIAL') {
        // We can't start parsing until we have the first line.
        if (!/\r\n|\n/.test(_this.buffer)) {
          return this;
        }

        line = collectNextLine();
        // strip of UTF-8 BOM if any
        // https://en.wikipedia.org/wiki/Byte_order_mark#UTF-8
        const m = line.match(/^(ï»¿)?WEBVTT([ \t].*)?$/);
        if (!m?.[0]) {
          throw new Error('Malformed WebVTT signature.');
        }

        _this.state = 'HEADER';
      }

      let alreadyCollectedLine = false;
      while (_this.buffer) {
        // We can't parse a line until we have the full line.
        if (!/\r\n|\n/.test(_this.buffer)) {
          return this;
        }

        if (!alreadyCollectedLine) {
          line = collectNextLine();
        } else {
          alreadyCollectedLine = false;
        }

        switch (_this.state) {
          case 'HEADER':
            // 13-18 - Allow a header (metadata) under the WEBVTT line.
            if (/:/.test(line)) {
              parseHeader(line);
            } else if (!line) {
              // An empty line terminates the header and starts the body (cues).
              _this.state = 'ID';
            }
            continue;
          case 'NOTE':
            // Ignore NOTE blocks.
            if (!line) {
              _this.state = 'ID';
            }

            continue;
          case 'ID':
            // Check for the start of NOTE blocks.
            if (/^NOTE($|[ \t])/.test(line)) {
              _this.state = 'NOTE';
              break;
            }
            // 19-29 - Allow any number of line terminators, then initialize new cue values.
            if (!line) {
              continue;
            }

            _this.cue = new VTTCue(0, 0, '');
            _this.state = 'CUE';
            // 30-39 - Check if self line contains an optional identifier or timing data.
            if (line.indexOf('-->') === -1) {
              _this.cue.id = line;
              continue;
            }
          // Process line as start of a cue.
          /* falls through */
          case 'CUE':
            // 40 - Collect cue timings and settings.
            if (!_this.cue) {
              _this.state = 'BADCUE';
              continue;
            }
            try {
              parseCue(line, _this.cue, _this.regionList);
            } catch (e) {
              // In case of an error ignore rest of the cue.
              _this.cue = null;
              _this.state = 'BADCUE';
              continue;
            }
            _this.state = 'CUETEXT';
            continue;
          case 'CUETEXT':
            {
              const hasSubstring = line.indexOf('-->') !== -1;
              // 34 - If we have an empty line then report the cue.
              // 35 - If we have the special substring '-->' then report the cue,
              // but do not collect the line as we need to process the current
              // one as a new cue.
              if (!line || (hasSubstring && (alreadyCollectedLine = true))) {
                // We are done parsing self cue.
                if (_this.oncue && _this.cue) {
                  _this.oncue(_this.cue);
                }

                _this.cue = null;
                _this.state = 'ID';
                continue;
              }
              if (_this.cue === null) {
                continue;
              }

              if (_this.cue.text) {
                _this.cue.text += '\n';
              }
              _this.cue.text += line;
            }
            continue;
          case 'BADCUE':
            // 54-62 - Collect and discard the remaining cue.
            if (!line) {
              _this.state = 'ID';
            }
        }
      }
    } catch (e) {
      // If we are currently parsing a cue, report what we have.
      if (_this.state === 'CUETEXT' && _this.cue && _this.oncue) {
        _this.oncue(_this.cue);
      }

      _this.cue = null;
      // Enter BADWEBVTT state if header was not parsed correctly otherwise
      // another exception occurred so enter BADCUE state.
      _this.state = _this.state === 'INITIAL' ? 'BADWEBVTT' : 'BADCUE';
    }
    return this;
  }

  flush(): VTTParser {
    const _this = this;
    try {
      // Finish decoding the stream.
      // _this.buffer += _this.decoder.decode();
      // Synthesize the end of the current cue or region.
      if (_this.cue || _this.state === 'HEADER') {
        _this.buffer += '\n\n';
        _this.parse();
      }
      // If we've flushed, parsed, and we're still on the INITIAL state then
      // that means we don't have enough of the stream to parse the first
      // line.
      if (_this.state === 'INITIAL' || _this.state === 'BADWEBVTT') {
        throw new Error('Malformed WebVTT signature.');
      }
    } catch (e) {
      if (_this.onparsingerror) {
        _this.onparsingerror(e);
      }
    }
    if (_this.onflush) {
      _this.onflush();
    }

    return this;
  }
}
