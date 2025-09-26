/**
 * Copyright 2013 vtt.js Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { optionalSelf } from './global';

declare interface VTTCuePolyfill extends VTTCue {
  new (...args): VTTCuePolyfill;
  hasBeenReset: boolean;
  displayState: void;
}

export default (function () {
  if (optionalSelf?.VTTCue) {
    return self.VTTCue;
  }

  const AllowedDirections = ['', 'lr', 'rl'] as const;
  type Direction = (typeof AllowedDirections)[number];

  const AllowedAlignments = [
    'start',
    'middle',
    'end',
    'left',
    'right',
  ] as const;
  type Alignment = (typeof AllowedAlignments)[number];

  function isAllowedValue<T, A>(allowed: T, value: string): A | false {
    if (typeof value !== 'string') {
      return false;
    }
    // necessary for assuring the generic conforms to the Array interface
    if (!Array.isArray(allowed)) {
      return false;
    }
    // reset the type so that the next narrowing works well
    const lcValue = value.toLowerCase() as any;
    // use the allow list to narrow the type to a specific subset of strings
    if (~allowed.indexOf(lcValue)) {
      return lcValue;
    }

    return false;
  }

  function findDirectionSetting(value: string) {
    return isAllowedValue<typeof AllowedDirections, Direction>(
      AllowedDirections,
      value,
    );
  }

  function findAlignSetting(value: string) {
    return isAllowedValue<typeof AllowedAlignments, Alignment>(
      AllowedAlignments,
      value,
    );
  }

  function extend(obj: Record<string, any>, ...rest: Record<string, any>[]) {
    let i = 1;
    for (; i < arguments.length; i++) {
      const cobj = arguments[i];
      for (const p in cobj) {
        obj[p] = cobj[p];
      }
    }

    return obj;
  }

  function VTTCue(startTime: number, endTime: number, text: string) {
    const cue = this as VTTCuePolyfill;
    const baseObj = { enumerable: true };
    /**
     * Shim implementation specific properties. These properties are not in
     * the spec.
     */

    // Lets us know when the VTTCue's data has changed in such a way that we need
    // to recompute its display state. This lets us compute its display state
    // lazily.
    cue.hasBeenReset = false;

    /**
     * VTTCue and TextTrackCue properties
     * http://dev.w3.org/html5/webvtt/#vttcue-interface
     */

    let _id = '';
    let _pauseOnExit = false;
    let _startTime = startTime;
    let _endTime = endTime;
    let _text = text;
    let _region = null;
    let _vertical: Direction = '';
    let _snapToLines = true;
    let _line: number | 'auto' = 'auto';
    let _lineAlign: Alignment = 'start';
    let _position = 50;
    let _positionAlign: Alignment = 'middle';
    let _size = 50;
    let _align: Alignment = 'middle';

    Object.defineProperty(
      cue,
      'id',
      extend({}, baseObj, {
        get: function () {
          return _id;
        },
        set: function (value: string) {
          _id = '' + value;
        },
      }),
    );

    Object.defineProperty(
      cue,
      'pauseOnExit',
      extend({}, baseObj, {
        get: function () {
          return _pauseOnExit;
        },
        set: function (value: boolean) {
          _pauseOnExit = !!value;
        },
      }),
    );

    Object.defineProperty(
      cue,
      'startTime',
      extend({}, baseObj, {
        get: function () {
          return _startTime;
        },
        set: function (value: number) {
          if (typeof value !== 'number') {
            throw new TypeError('Start time must be set to a number.');
          }

          _startTime = value;
          this.hasBeenReset = true;
        },
      }),
    );

    Object.defineProperty(
      cue,
      'endTime',
      extend({}, baseObj, {
        get: function () {
          return _endTime;
        },
        set: function (value: number) {
          if (typeof value !== 'number') {
            throw new TypeError('End time must be set to a number.');
          }

          _endTime = value;
          this.hasBeenReset = true;
        },
      }),
    );

    Object.defineProperty(
      cue,
      'text',
      extend({}, baseObj, {
        get: function () {
          return _text;
        },
        set: function (value: string) {
          _text = '' + value;
          this.hasBeenReset = true;
        },
      }),
    );

    // todo: implement VTTRegion polyfill?
    Object.defineProperty(
      cue,
      'region',
      extend({}, baseObj, {
        get: function () {
          return _region;
        },
        set: function (value: any) {
          _region = value;
          this.hasBeenReset = true;
        },
      }),
    );

    Object.defineProperty(
      cue,
      'vertical',
      extend({}, baseObj, {
        get: function () {
          return _vertical;
        },
        set: function (value: string) {
          const setting = findDirectionSetting(value);
          // Have to check for false because the setting an be an empty string.
          if (setting === false) {
            throw new SyntaxError(
              'An invalid or illegal string was specified.',
            );
          }

          _vertical = setting;
          this.hasBeenReset = true;
        },
      }),
    );

    Object.defineProperty(
      cue,
      'snapToLines',
      extend({}, baseObj, {
        get: function () {
          return _snapToLines;
        },
        set: function (value: boolean) {
          _snapToLines = !!value;
          this.hasBeenReset = true;
        },
      }),
    );

    Object.defineProperty(
      cue,
      'line',
      extend({}, baseObj, {
        get: function () {
          return _line;
        },
        set: function (value: number | 'auto') {
          if (typeof value !== 'number' && value !== 'auto') {
            throw new SyntaxError(
              'An invalid number or illegal string was specified.',
            );
          }

          _line = value;
          this.hasBeenReset = true;
        },
      }),
    );

    Object.defineProperty(
      cue,
      'lineAlign',
      extend({}, baseObj, {
        get: function () {
          return _lineAlign;
        },
        set: function (value: string) {
          const setting = findAlignSetting(value);
          if (!setting) {
            throw new SyntaxError(
              'An invalid or illegal string was specified.',
            );
          }

          _lineAlign = setting;
          this.hasBeenReset = true;
        },
      }),
    );

    Object.defineProperty(
      cue,
      'position',
      extend({}, baseObj, {
        get: function () {
          return _position;
        },
        set: function (value: number) {
          if (value < 0 || value > 100) {
            throw new Error('Position must be between 0 and 100.');
          }

          _position = value;
          this.hasBeenReset = true;
        },
      }),
    );

    Object.defineProperty(
      cue,
      'positionAlign',
      extend({}, baseObj, {
        get: function () {
          return _positionAlign;
        },
        set: function (value: string) {
          const setting = findAlignSetting(value);
          if (!setting) {
            throw new SyntaxError(
              'An invalid or illegal string was specified.',
            );
          }

          _positionAlign = setting;
          this.hasBeenReset = true;
        },
      }),
    );

    Object.defineProperty(
      cue,
      'size',
      extend({}, baseObj, {
        get: function () {
          return _size;
        },
        set: function (value: number) {
          if (value < 0 || value > 100) {
            throw new Error('Size must be between 0 and 100.');
          }

          _size = value;
          this.hasBeenReset = true;
        },
      }),
    );

    Object.defineProperty(
      cue,
      'align',
      extend({}, baseObj, {
        get: function () {
          return _align;
        },
        set: function (value: string) {
          const setting = findAlignSetting(value);
          if (!setting) {
            throw new SyntaxError(
              'An invalid or illegal string was specified.',
            );
          }

          _align = setting;
          this.hasBeenReset = true;
        },
      }),
    );

    /**
     * Other <track> spec defined properties
     */

    // http://www.whatwg.org/specs/web-apps/current-work/multipage/the-video-element.html#text-track-cue-display-state
    cue.displayState = undefined;
  }

  /**
   * VTTCue methods
   */

  VTTCue.prototype.getCueAsHTML = function () {
    // Assume WebVTT.convertCueToDOMTree is on the global.
    const WebVTT = (self as any).WebVTT;
    return WebVTT.convertCueToDOMTree(self, this.text);
  };
  // this is a polyfill hack
  return VTTCue as any as VTTCuePolyfill;
})();
