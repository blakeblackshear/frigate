import { logger } from './logger';
import { substituteVariables } from './variable-substitution';
import type { LevelDetails } from '../loader/level-details';
import type { ParsedMultivariantPlaylist } from '../loader/m3u8-parser';

const DECIMAL_RESOLUTION_REGEX = /^(\d+)x(\d+)$/;
const ATTR_LIST_REGEX = /(.+?)=(".*?"|.*?)(?:,|$)/g;

// adapted from https://github.com/kanongil/node-m3u8parse/blob/master/attrlist.js
export class AttrList {
  [key: string]: any;

  constructor(
    attrs: string | Record<string, any>,
    parsed?: Pick<
      ParsedMultivariantPlaylist | LevelDetails,
      'variableList' | 'hasVariableRefs' | 'playlistParsingError'
    >,
  ) {
    if (typeof attrs === 'string') {
      attrs = AttrList.parseAttrList(attrs, parsed);
    }
    Object.assign(this, attrs);
  }

  get clientAttrs(): string[] {
    return Object.keys(this).filter((attr) => attr.substring(0, 2) === 'X-');
  }

  decimalInteger(attrName: string): number {
    const intValue = parseInt(this[attrName], 10);
    if (intValue > Number.MAX_SAFE_INTEGER) {
      return Infinity;
    }

    return intValue;
  }

  hexadecimalInteger(attrName: string) {
    if (this[attrName]) {
      let stringValue = (this[attrName] || '0x').slice(2);
      stringValue = (stringValue.length & 1 ? '0' : '') + stringValue;

      const value = new Uint8Array(stringValue.length / 2);
      for (let i = 0; i < stringValue.length / 2; i++) {
        value[i] = parseInt(stringValue.slice(i * 2, i * 2 + 2), 16);
      }

      return value;
    }
    return null;
  }

  hexadecimalIntegerAsNumber(attrName: string): number {
    const intValue = parseInt(this[attrName], 16);
    if (intValue > Number.MAX_SAFE_INTEGER) {
      return Infinity;
    }

    return intValue;
  }

  decimalFloatingPoint(attrName: string): number {
    return parseFloat(this[attrName]);
  }

  optionalFloat(attrName: string, defaultValue: number): number {
    const value = this[attrName];
    return value ? parseFloat(value) : defaultValue;
  }

  enumeratedString(attrName: string): string | undefined {
    return this[attrName];
  }

  enumeratedStringList<T extends { [key: string]: boolean }>(
    attrName: string,
    dict: T,
  ): { [key in keyof T]: boolean } {
    const attrValue = this[attrName];
    return (attrValue ? attrValue.split(/[ ,]+/) : []).reduce(
      (result: { [key in keyof T]: boolean }, identifier: string) => {
        result[identifier.toLowerCase() as keyof T] = true;
        return result;
      },
      dict,
    );
  }

  bool(attrName: string): boolean {
    return this[attrName] === 'YES';
  }

  decimalResolution(attrName: string):
    | {
        width: number;
        height: number;
      }
    | undefined {
    const res = DECIMAL_RESOLUTION_REGEX.exec(this[attrName]);
    if (res === null) {
      return undefined;
    }

    return {
      width: parseInt(res[1], 10),
      height: parseInt(res[2], 10),
    };
  }

  static parseAttrList(
    input: string,
    parsed?: Pick<
      ParsedMultivariantPlaylist | LevelDetails,
      'variableList' | 'hasVariableRefs' | 'playlistParsingError'
    >,
  ): Record<string, string> {
    let match: RegExpExecArray | null;
    const attrs = {};
    const quote = '"';
    ATTR_LIST_REGEX.lastIndex = 0;
    while ((match = ATTR_LIST_REGEX.exec(input)) !== null) {
      const name = match[1].trim();
      let value = match[2];
      const quotedString =
        value.indexOf(quote) === 0 &&
        value.lastIndexOf(quote) === value.length - 1;
      let hexadecimalSequence = false;
      if (quotedString) {
        value = value.slice(1, -1);
      } else {
        switch (name) {
          case 'IV':
          case 'SCTE35-CMD':
          case 'SCTE35-IN':
          case 'SCTE35-OUT':
            hexadecimalSequence = true;
        }
      }
      if (parsed && (quotedString || hexadecimalSequence)) {
        if (__USE_VARIABLE_SUBSTITUTION__) {
          value = substituteVariables(parsed, value);
        }
      } else if (!hexadecimalSequence && !quotedString) {
        switch (name) {
          case 'CLOSED-CAPTIONS':
            if (value === 'NONE') {
              break;
            }
          // falls through
          case 'ALLOWED-CPC':
          case 'CLASS':
          case 'ASSOC-LANGUAGE':
          case 'AUDIO':
          case 'BYTERANGE':
          case 'CHANNELS':
          case 'CHARACTERISTICS':
          case 'CODECS':
          case 'DATA-ID':
          case 'END-DATE':
          case 'GROUP-ID':
          case 'ID':
          case 'IMPORT':
          case 'INSTREAM-ID':
          case 'KEYFORMAT':
          case 'KEYFORMATVERSIONS':
          case 'LANGUAGE':
          case 'NAME':
          case 'PATHWAY-ID':
          case 'QUERYPARAM':
          case 'RECENTLY-REMOVED-DATERANGES':
          case 'SERVER-URI':
          case 'STABLE-RENDITION-ID':
          case 'STABLE-VARIANT-ID':
          case 'START-DATE':
          case 'SUBTITLES':
          case 'SUPPLEMENTAL-CODECS':
          case 'URI':
          case 'VALUE':
          case 'VIDEO':
          case 'X-ASSET-LIST':
          case 'X-ASSET-URI':
            // Since we are not checking tag:attribute combination, just warn rather than ignoring attribute
            logger.warn(`${input}: attribute ${name} is missing quotes`);
          // continue;
        }
      }
      attrs[name] = value;
    }
    return attrs;
  }
}
