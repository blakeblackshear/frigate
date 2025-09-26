import { stringify } from './safe-json-stringify';
import { logger } from '../utils/logger';
import type OutputFilter from './output-filter';

/**
 *
 * This code was ported from the dash.js project at:
 *   https://github.com/Dash-Industry-Forum/dash.js/blob/development/externals/cea608-parser.js
 *   https://github.com/Dash-Industry-Forum/dash.js/commit/8269b26a761e0853bb21d78780ed945144ecdd4d#diff-71bc295a2d6b6b7093a1d3290d53a4b2
 *
 * The original copyright appears below:
 *
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2015-2016, DASH Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  1. Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  2. Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
/**
 *  Exceptions from regular ASCII. CodePoints are mapped to UTF-16 codes
 */

const specialCea608CharsCodes = {
  0x2a: 0xe1, // lowercase a, acute accent
  0x5c: 0xe9, // lowercase e, acute accent
  0x5e: 0xed, // lowercase i, acute accent
  0x5f: 0xf3, // lowercase o, acute accent
  0x60: 0xfa, // lowercase u, acute accent
  0x7b: 0xe7, // lowercase c with cedilla
  0x7c: 0xf7, // division symbol
  0x7d: 0xd1, // uppercase N tilde
  0x7e: 0xf1, // lowercase n tilde
  0x7f: 0x2588, // Full block
  // THIS BLOCK INCLUDES THE 16 EXTENDED (TWO-BYTE) LINE 21 CHARACTERS
  // THAT COME FROM HI BYTE=0x11 AND LOW BETWEEN 0x30 AND 0x3F
  // THIS MEANS THAT \x50 MUST BE ADDED TO THE VALUES
  0x80: 0xae, // Registered symbol (R)
  0x81: 0xb0, // degree sign
  0x82: 0xbd, // 1/2 symbol
  0x83: 0xbf, // Inverted (open) question mark
  0x84: 0x2122, // Trademark symbol (TM)
  0x85: 0xa2, // Cents symbol
  0x86: 0xa3, // Pounds sterling
  0x87: 0x266a, // Music 8'th note
  0x88: 0xe0, // lowercase a, grave accent
  0x89: 0x20, // transparent space (regular)
  0x8a: 0xe8, // lowercase e, grave accent
  0x8b: 0xe2, // lowercase a, circumflex accent
  0x8c: 0xea, // lowercase e, circumflex accent
  0x8d: 0xee, // lowercase i, circumflex accent
  0x8e: 0xf4, // lowercase o, circumflex accent
  0x8f: 0xfb, // lowercase u, circumflex accent
  // THIS BLOCK INCLUDES THE 32 EXTENDED (TWO-BYTE) LINE 21 CHARACTERS
  // THAT COME FROM HI BYTE=0x12 AND LOW BETWEEN 0x20 AND 0x3F
  0x90: 0xc1, // capital letter A with acute
  0x91: 0xc9, // capital letter E with acute
  0x92: 0xd3, // capital letter O with acute
  0x93: 0xda, // capital letter U with acute
  0x94: 0xdc, // capital letter U with diaresis
  0x95: 0xfc, // lowercase letter U with diaeresis
  0x96: 0x2018, // opening single quote
  0x97: 0xa1, // inverted exclamation mark
  0x98: 0x2a, // asterisk
  0x99: 0x2019, // closing single quote
  0x9a: 0x2501, // box drawings heavy horizontal
  0x9b: 0xa9, // copyright sign
  0x9c: 0x2120, // Service mark
  0x9d: 0x2022, // (round) bullet
  0x9e: 0x201c, // Left double quotation mark
  0x9f: 0x201d, // Right double quotation mark
  0xa0: 0xc0, // uppercase A, grave accent
  0xa1: 0xc2, // uppercase A, circumflex
  0xa2: 0xc7, // uppercase C with cedilla
  0xa3: 0xc8, // uppercase E, grave accent
  0xa4: 0xca, // uppercase E, circumflex
  0xa5: 0xcb, // capital letter E with diaresis
  0xa6: 0xeb, // lowercase letter e with diaresis
  0xa7: 0xce, // uppercase I, circumflex
  0xa8: 0xcf, // uppercase I, with diaresis
  0xa9: 0xef, // lowercase i, with diaresis
  0xaa: 0xd4, // uppercase O, circumflex
  0xab: 0xd9, // uppercase U, grave accent
  0xac: 0xf9, // lowercase u, grave accent
  0xad: 0xdb, // uppercase U, circumflex
  0xae: 0xab, // left-pointing double angle quotation mark
  0xaf: 0xbb, // right-pointing double angle quotation mark
  // THIS BLOCK INCLUDES THE 32 EXTENDED (TWO-BYTE) LINE 21 CHARACTERS
  // THAT COME FROM HI BYTE=0x13 AND LOW BETWEEN 0x20 AND 0x3F
  0xb0: 0xc3, // Uppercase A, tilde
  0xb1: 0xe3, // Lowercase a, tilde
  0xb2: 0xcd, // Uppercase I, acute accent
  0xb3: 0xcc, // Uppercase I, grave accent
  0xb4: 0xec, // Lowercase i, grave accent
  0xb5: 0xd2, // Uppercase O, grave accent
  0xb6: 0xf2, // Lowercase o, grave accent
  0xb7: 0xd5, // Uppercase O, tilde
  0xb8: 0xf5, // Lowercase o, tilde
  0xb9: 0x7b, // Open curly brace
  0xba: 0x7d, // Closing curly brace
  0xbb: 0x5c, // Backslash
  0xbc: 0x5e, // Caret
  0xbd: 0x5f, // Underscore
  0xbe: 0x7c, // Pipe (vertical line)
  0xbf: 0x223c, // Tilde operator
  0xc0: 0xc4, // Uppercase A, umlaut
  0xc1: 0xe4, // Lowercase A, umlaut
  0xc2: 0xd6, // Uppercase O, umlaut
  0xc3: 0xf6, // Lowercase o, umlaut
  0xc4: 0xdf, // Esszett (sharp S)
  0xc5: 0xa5, // Yen symbol
  0xc6: 0xa4, // Generic currency sign
  0xc7: 0x2503, // Box drawings heavy vertical
  0xc8: 0xc5, // Uppercase A, ring
  0xc9: 0xe5, // Lowercase A, ring
  0xca: 0xd8, // Uppercase O, stroke
  0xcb: 0xf8, // Lowercase o, strok
  0xcc: 0x250f, // Box drawings heavy down and right
  0xcd: 0x2513, // Box drawings heavy down and left
  0xce: 0x2517, // Box drawings heavy up and right
  0xcf: 0x251b, // Box drawings heavy up and left
};

/**
 * Utils
 */
const getCharForByte = (byte: number) =>
  String.fromCharCode(specialCea608CharsCodes[byte] || byte);

const NR_ROWS = 15;
const NR_COLS = 100;
// Tables to look up row from PAC data
const rowsLowCh1 = {
  0x11: 1,
  0x12: 3,
  0x15: 5,
  0x16: 7,
  0x17: 9,
  0x10: 11,
  0x13: 12,
  0x14: 14,
};
const rowsHighCh1 = {
  0x11: 2,
  0x12: 4,
  0x15: 6,
  0x16: 8,
  0x17: 10,
  0x13: 13,
  0x14: 15,
};
const rowsLowCh2 = {
  0x19: 1,
  0x1a: 3,
  0x1d: 5,
  0x1e: 7,
  0x1f: 9,
  0x18: 11,
  0x1b: 12,
  0x1c: 14,
};
const rowsHighCh2 = {
  0x19: 2,
  0x1a: 4,
  0x1d: 6,
  0x1e: 8,
  0x1f: 10,
  0x1b: 13,
  0x1c: 15,
};

const backgroundColors = [
  'white',
  'green',
  'blue',
  'cyan',
  'red',
  'yellow',
  'magenta',
  'black',
  'transparent',
];

const enum VerboseLevel {
  ERROR = 0,
  TEXT = 1,
  WARNING = 2,
  INFO = 2,
  DEBUG = 3,
  DATA = 3,
}

class CaptionsLogger {
  public time: number | null = null;
  public verboseLevel: VerboseLevel = VerboseLevel.ERROR;

  log(severity: VerboseLevel, msg: string | (() => string)): void {
    if (this.verboseLevel >= severity) {
      const m: string = typeof msg === 'function' ? msg() : msg;
      logger.log(`${this.time} [${severity}] ${m}`);
    }
  }
}

const numArrayToHexArray = function (numArray: number[]): string[] {
  const hexArray: string[] = [];
  for (let j = 0; j < numArray.length; j++) {
    hexArray.push(numArray[j].toString(16));
  }

  return hexArray;
};

type PenStyles = {
  foreground: string | null;
  underline: boolean;
  italics: boolean;
  background: string;
  flash: boolean;
};

class PenState {
  public foreground: string = 'white';
  public underline: boolean = false;
  public italics: boolean = false;
  public background: string = 'black';
  public flash: boolean = false;

  reset() {
    this.foreground = 'white';
    this.underline = false;
    this.italics = false;
    this.background = 'black';
    this.flash = false;
  }

  setStyles(styles: Partial<PenStyles>) {
    const attribs = [
      'foreground',
      'underline',
      'italics',
      'background',
      'flash',
    ];
    for (let i = 0; i < attribs.length; i++) {
      const style = attribs[i];
      if (styles.hasOwnProperty(style)) {
        this[style] = styles[style];
      }
    }
  }

  isDefault() {
    return (
      this.foreground === 'white' &&
      !this.underline &&
      !this.italics &&
      this.background === 'black' &&
      !this.flash
    );
  }

  equals(other: PenState) {
    return (
      this.foreground === other.foreground &&
      this.underline === other.underline &&
      this.italics === other.italics &&
      this.background === other.background &&
      this.flash === other.flash
    );
  }

  copy(newPenState: PenState) {
    this.foreground = newPenState.foreground;
    this.underline = newPenState.underline;
    this.italics = newPenState.italics;
    this.background = newPenState.background;
    this.flash = newPenState.flash;
  }

  toString(): string {
    return (
      'color=' +
      this.foreground +
      ', underline=' +
      this.underline +
      ', italics=' +
      this.italics +
      ', background=' +
      this.background +
      ', flash=' +
      this.flash
    );
  }
}

/**
 * Unicode character with styling and background.
 * @constructor
 */
class StyledUnicodeChar {
  uchar: string = ' ';
  penState: PenState = new PenState();

  reset() {
    this.uchar = ' ';
    this.penState.reset();
  }

  setChar(uchar: string, newPenState: PenState) {
    this.uchar = uchar;
    this.penState.copy(newPenState);
  }

  setPenState(newPenState: PenState) {
    this.penState.copy(newPenState);
  }

  equals(other: StyledUnicodeChar) {
    return this.uchar === other.uchar && this.penState.equals(other.penState);
  }

  copy(newChar: StyledUnicodeChar) {
    this.uchar = newChar.uchar;
    this.penState.copy(newChar.penState);
  }

  isEmpty(): boolean {
    return this.uchar === ' ' && this.penState.isDefault();
  }
}

/**
 * CEA-608 row consisting of NR_COLS instances of StyledUnicodeChar.
 * @constructor
 */
export class Row {
  public chars: StyledUnicodeChar[] = [];
  public pos: number = 0;
  public currPenState: PenState = new PenState();
  public cueStartTime: number | null = null;
  private logger: CaptionsLogger;

  constructor(logger: CaptionsLogger) {
    for (let i = 0; i < NR_COLS; i++) {
      this.chars.push(new StyledUnicodeChar());
    }
    this.logger = logger;
  }

  equals(other: Row) {
    for (let i = 0; i < NR_COLS; i++) {
      if (!this.chars[i].equals(other.chars[i])) {
        return false;
      }
    }
    return true;
  }

  copy(other: Row) {
    for (let i = 0; i < NR_COLS; i++) {
      this.chars[i].copy(other.chars[i]);
    }
  }

  isEmpty(): boolean {
    let empty = true;
    for (let i = 0; i < NR_COLS; i++) {
      if (!this.chars[i].isEmpty()) {
        empty = false;
        break;
      }
    }
    return empty;
  }

  /**
   *  Set the cursor to a valid column.
   */
  setCursor(absPos: number) {
    if (this.pos !== absPos) {
      this.pos = absPos;
    }

    if (this.pos < 0) {
      this.logger.log(
        VerboseLevel.DEBUG,
        'Negative cursor position ' + this.pos,
      );
      this.pos = 0;
    } else if (this.pos > NR_COLS) {
      this.logger.log(
        VerboseLevel.DEBUG,
        'Too large cursor position ' + this.pos,
      );
      this.pos = NR_COLS;
    }
  }

  /**
   * Move the cursor relative to current position.
   */
  moveCursor(relPos: number) {
    const newPos = this.pos + relPos;
    if (relPos > 1) {
      for (let i = this.pos + 1; i < newPos + 1; i++) {
        this.chars[i].setPenState(this.currPenState);
      }
    }
    this.setCursor(newPos);
  }

  /**
   * Backspace, move one step back and clear character.
   */
  backSpace() {
    this.moveCursor(-1);
    this.chars[this.pos].setChar(' ', this.currPenState);
  }

  insertChar(byte: number) {
    if (byte >= 0x90) {
      // Extended char
      this.backSpace();
    }
    const char = getCharForByte(byte);
    if (this.pos >= NR_COLS) {
      this.logger.log(
        VerboseLevel.ERROR,
        () =>
          'Cannot insert ' +
          byte.toString(16) +
          ' (' +
          char +
          ') at position ' +
          this.pos +
          '. Skipping it!',
      );
      return;
    }
    this.chars[this.pos].setChar(char, this.currPenState);
    this.moveCursor(1);
  }

  clearFromPos(startPos: number) {
    let i: number;
    for (i = startPos; i < NR_COLS; i++) {
      this.chars[i].reset();
    }
  }

  clear() {
    this.clearFromPos(0);
    this.pos = 0;
    this.currPenState.reset();
  }

  clearToEndOfRow() {
    this.clearFromPos(this.pos);
  }

  getTextString() {
    const chars: string[] = [];
    let empty = true;
    for (let i = 0; i < NR_COLS; i++) {
      const char = this.chars[i].uchar;
      if (char !== ' ') {
        empty = false;
      }

      chars.push(char);
    }
    if (empty) {
      return '';
    } else {
      return chars.join('');
    }
  }

  setPenStyles(styles: Partial<PenStyles>) {
    this.currPenState.setStyles(styles);
    const currChar = this.chars[this.pos];
    currChar.setPenState(this.currPenState);
  }
}

/**
 * Keep a CEA-608 screen of 32x15 styled characters
 * @constructor
 */
export class CaptionScreen {
  rows: Row[] = [];
  currRow: number = NR_ROWS - 1;
  nrRollUpRows: number | null = null;
  lastOutputScreen: CaptionScreen | null = null;
  logger: CaptionsLogger;

  constructor(logger: CaptionsLogger) {
    for (let i = 0; i < NR_ROWS; i++) {
      this.rows.push(new Row(logger));
    }
    this.logger = logger;
  }

  reset() {
    for (let i = 0; i < NR_ROWS; i++) {
      this.rows[i].clear();
    }
    this.currRow = NR_ROWS - 1;
  }

  equals(other: CaptionScreen): boolean {
    let equal = true;
    for (let i = 0; i < NR_ROWS; i++) {
      if (!this.rows[i].equals(other.rows[i])) {
        equal = false;
        break;
      }
    }
    return equal;
  }

  copy(other: CaptionScreen) {
    for (let i = 0; i < NR_ROWS; i++) {
      this.rows[i].copy(other.rows[i]);
    }
  }

  isEmpty(): boolean {
    let empty = true;
    for (let i = 0; i < NR_ROWS; i++) {
      if (!this.rows[i].isEmpty()) {
        empty = false;
        break;
      }
    }
    return empty;
  }

  backSpace() {
    const row = this.rows[this.currRow];
    row.backSpace();
  }

  clearToEndOfRow() {
    const row = this.rows[this.currRow];
    row.clearToEndOfRow();
  }

  /**
   * Insert a character (without styling) in the current row.
   */
  insertChar(char: number) {
    const row = this.rows[this.currRow];
    row.insertChar(char);
  }

  setPen(styles: Partial<PenStyles>) {
    const row = this.rows[this.currRow];
    row.setPenStyles(styles);
  }

  moveCursor(relPos: number) {
    const row = this.rows[this.currRow];
    row.moveCursor(relPos);
  }

  setCursor(absPos: number) {
    this.logger.log(VerboseLevel.INFO, 'setCursor: ' + absPos);
    const row = this.rows[this.currRow];
    row.setCursor(absPos);
  }

  setPAC(pacData: PACData) {
    this.logger.log(VerboseLevel.INFO, () => 'pacData = ' + stringify(pacData));
    let newRow = pacData.row - 1;
    if (this.nrRollUpRows && newRow < this.nrRollUpRows - 1) {
      newRow = this.nrRollUpRows - 1;
    }

    // Make sure this only affects Roll-up Captions by checking this.nrRollUpRows
    if (this.nrRollUpRows && this.currRow !== newRow) {
      // clear all rows first
      for (let i = 0; i < NR_ROWS; i++) {
        this.rows[i].clear();
      }

      // Copy this.nrRollUpRows rows from lastOutputScreen and place it in the newRow location
      // topRowIndex - the start of rows to copy (inclusive index)
      const topRowIndex = this.currRow + 1 - this.nrRollUpRows;
      // We only copy if the last position was already shown.
      // We use the cueStartTime value to check this.
      const lastOutputScreen = this.lastOutputScreen;
      if (lastOutputScreen) {
        const prevLineTime = lastOutputScreen.rows[topRowIndex].cueStartTime;
        const time = this.logger.time;
        if (prevLineTime !== null && time !== null && prevLineTime < time) {
          for (let i = 0; i < this.nrRollUpRows; i++) {
            this.rows[newRow - this.nrRollUpRows + i + 1].copy(
              lastOutputScreen.rows[topRowIndex + i],
            );
          }
        }
      }
    }

    this.currRow = newRow;
    const row = this.rows[this.currRow];
    if (pacData.indent !== null) {
      const indent = pacData.indent;
      const prevPos = Math.max(indent - 1, 0);
      row.setCursor(pacData.indent);
      pacData.color = row.chars[prevPos].penState.foreground;
    }
    const styles: PenStyles = {
      foreground: pacData.color,
      underline: pacData.underline,
      italics: pacData.italics,
      background: 'black',
      flash: false,
    };
    this.setPen(styles);
  }

  /**
   * Set background/extra foreground, but first do back_space, and then insert space (backwards compatibility).
   */
  setBkgData(bkgData: Partial<PenStyles>) {
    this.logger.log(VerboseLevel.INFO, () => 'bkgData = ' + stringify(bkgData));
    this.backSpace();
    this.setPen(bkgData);
    this.insertChar(0x20); // Space
  }

  setRollUpRows(nrRows: number | null) {
    this.nrRollUpRows = nrRows;
  }

  rollUp() {
    if (this.nrRollUpRows === null) {
      this.logger.log(
        VerboseLevel.DEBUG,
        'roll_up but nrRollUpRows not set yet',
      );
      return; // Not properly setup
    }
    this.logger.log(VerboseLevel.TEXT, () => this.getDisplayText());
    const topRowIndex = this.currRow + 1 - this.nrRollUpRows;
    const topRow = this.rows.splice(topRowIndex, 1)[0];
    topRow.clear();
    this.rows.splice(this.currRow, 0, topRow);
    this.logger.log(VerboseLevel.INFO, 'Rolling up');
    // this.logger.log(VerboseLevel.TEXT, this.get_display_text())
  }

  /**
   * Get all non-empty rows with as unicode text.
   */
  getDisplayText(asOneRow?: boolean) {
    asOneRow = asOneRow || false;
    const displayText: string[] = [];
    let text = '';
    let rowNr = -1;
    for (let i = 0; i < NR_ROWS; i++) {
      const rowText = this.rows[i].getTextString();
      if (rowText) {
        rowNr = i + 1;
        if (asOneRow) {
          displayText.push('Row ' + rowNr + ": '" + rowText + "'");
        } else {
          displayText.push(rowText.trim());
        }
      }
    }
    if (displayText.length > 0) {
      if (asOneRow) {
        text = '[' + displayText.join(' | ') + ']';
      } else {
        text = displayText.join('\n');
      }
    }
    return text;
  }

  getTextAndFormat() {
    return this.rows;
  }
}

// var modes = ['MODE_ROLL-UP', 'MODE_POP-ON', 'MODE_PAINT-ON', 'MODE_TEXT'];

type CaptionModes =
  | 'MODE_ROLL-UP'
  | 'MODE_POP-ON'
  | 'MODE_PAINT-ON'
  | 'MODE_TEXT'
  | null;

class Cea608Channel {
  chNr: number;
  outputFilter: OutputFilter;
  mode: CaptionModes;
  verbose: number;
  displayedMemory: CaptionScreen;
  nonDisplayedMemory: CaptionScreen;
  lastOutputScreen: CaptionScreen;
  currRollUpRow: Row;
  writeScreen: CaptionScreen;
  cueStartTime: number | null;
  logger: CaptionsLogger;

  constructor(
    channelNumber: number,
    outputFilter: OutputFilter,
    logger: CaptionsLogger,
  ) {
    this.chNr = channelNumber;
    this.outputFilter = outputFilter;
    this.mode = null;
    this.verbose = 0;
    this.displayedMemory = new CaptionScreen(logger);
    this.nonDisplayedMemory = new CaptionScreen(logger);
    this.lastOutputScreen = new CaptionScreen(logger);
    this.currRollUpRow = this.displayedMemory.rows[NR_ROWS - 1];
    this.writeScreen = this.displayedMemory;
    this.mode = null;
    this.cueStartTime = null; // Keeps track of where a cue started.
    this.logger = logger;
  }

  reset() {
    this.mode = null;
    this.displayedMemory.reset();
    this.nonDisplayedMemory.reset();
    this.lastOutputScreen.reset();
    this.outputFilter.reset();
    this.currRollUpRow = this.displayedMemory.rows[NR_ROWS - 1];
    this.writeScreen = this.displayedMemory;
    this.mode = null;
    this.cueStartTime = null;
  }

  getHandler(): OutputFilter {
    return this.outputFilter;
  }

  setHandler(newHandler: OutputFilter) {
    this.outputFilter = newHandler;
  }

  setPAC(pacData: PACData) {
    this.writeScreen.setPAC(pacData);
  }

  setBkgData(bkgData: Partial<PenStyles>) {
    this.writeScreen.setBkgData(bkgData);
  }

  setMode(newMode: CaptionModes) {
    if (newMode === this.mode) {
      return;
    }

    this.mode = newMode;
    this.logger.log(VerboseLevel.INFO, () => 'MODE=' + newMode);
    if (this.mode === 'MODE_POP-ON') {
      this.writeScreen = this.nonDisplayedMemory;
    } else {
      this.writeScreen = this.displayedMemory;
      this.writeScreen.reset();
    }
    if (this.mode !== 'MODE_ROLL-UP') {
      this.displayedMemory.nrRollUpRows = null;
      this.nonDisplayedMemory.nrRollUpRows = null;
    }
    this.mode = newMode;
  }

  insertChars(chars: number[]) {
    for (let i = 0; i < chars.length; i++) {
      this.writeScreen.insertChar(chars[i]);
    }

    const screen =
      this.writeScreen === this.displayedMemory ? 'DISP' : 'NON_DISP';
    this.logger.log(
      VerboseLevel.INFO,
      () => screen + ': ' + this.writeScreen.getDisplayText(true),
    );
    if (this.mode === 'MODE_PAINT-ON' || this.mode === 'MODE_ROLL-UP') {
      this.logger.log(
        VerboseLevel.TEXT,
        () => 'DISPLAYED: ' + this.displayedMemory.getDisplayText(true),
      );
      this.outputDataUpdate();
    }
  }

  ccRCL() {
    // Resume Caption Loading (switch mode to Pop On)
    this.logger.log(VerboseLevel.INFO, 'RCL - Resume Caption Loading');
    this.setMode('MODE_POP-ON');
  }

  ccBS() {
    // BackSpace
    this.logger.log(VerboseLevel.INFO, 'BS - BackSpace');
    if (this.mode === 'MODE_TEXT') {
      return;
    }

    this.writeScreen.backSpace();
    if (this.writeScreen === this.displayedMemory) {
      this.outputDataUpdate();
    }
  }

  ccAOF() {
    // Reserved (formerly Alarm Off)
  }

  ccAON() {
    // Reserved (formerly Alarm On)
  }

  ccDER() {
    // Delete to End of Row
    this.logger.log(VerboseLevel.INFO, 'DER- Delete to End of Row');
    this.writeScreen.clearToEndOfRow();
    this.outputDataUpdate();
  }

  ccRU(nrRows: number | null) {
    // Roll-Up Captions-2,3,or 4 Rows
    this.logger.log(VerboseLevel.INFO, 'RU(' + nrRows + ') - Roll Up');
    this.writeScreen = this.displayedMemory;
    this.setMode('MODE_ROLL-UP');
    this.writeScreen.setRollUpRows(nrRows);
  }

  ccFON() {
    // Flash On
    this.logger.log(VerboseLevel.INFO, 'FON - Flash On');
    this.writeScreen.setPen({ flash: true });
  }

  ccRDC() {
    // Resume Direct Captioning (switch mode to PaintOn)
    this.logger.log(VerboseLevel.INFO, 'RDC - Resume Direct Captioning');
    this.setMode('MODE_PAINT-ON');
  }

  ccTR() {
    // Text Restart in text mode (not supported, however)
    this.logger.log(VerboseLevel.INFO, 'TR');
    this.setMode('MODE_TEXT');
  }

  ccRTD() {
    // Resume Text Display in Text mode (not supported, however)
    this.logger.log(VerboseLevel.INFO, 'RTD');
    this.setMode('MODE_TEXT');
  }

  ccEDM() {
    // Erase Displayed Memory
    this.logger.log(VerboseLevel.INFO, 'EDM - Erase Displayed Memory');
    this.displayedMemory.reset();
    this.outputDataUpdate(true);
  }

  ccCR() {
    // Carriage Return
    this.logger.log(VerboseLevel.INFO, 'CR - Carriage Return');
    this.writeScreen.rollUp();
    this.outputDataUpdate(true);
  }

  ccENM() {
    // Erase Non-Displayed Memory
    this.logger.log(VerboseLevel.INFO, 'ENM - Erase Non-displayed Memory');
    this.nonDisplayedMemory.reset();
  }

  ccEOC() {
    // End of Caption (Flip Memories)
    this.logger.log(VerboseLevel.INFO, 'EOC - End Of Caption');
    if (this.mode === 'MODE_POP-ON') {
      const tmp = this.displayedMemory;
      this.displayedMemory = this.nonDisplayedMemory;
      this.nonDisplayedMemory = tmp;
      this.writeScreen = this.nonDisplayedMemory;
      this.logger.log(
        VerboseLevel.TEXT,
        () => 'DISP: ' + this.displayedMemory.getDisplayText(),
      );
    }
    this.outputDataUpdate(true);
  }

  ccTO(nrCols: number) {
    // Tab Offset 1,2, or 3 columns
    this.logger.log(VerboseLevel.INFO, 'TO(' + nrCols + ') - Tab Offset');
    this.writeScreen.moveCursor(nrCols);
  }

  ccMIDROW(secondByte: number) {
    // Parse MIDROW command
    const styles: Partial<PenStyles> = { flash: false };
    styles.underline = secondByte % 2 === 1;
    styles.italics = secondByte >= 0x2e;
    if (!styles.italics) {
      const colorIndex = Math.floor(secondByte / 2) - 0x10;
      const colors = [
        'white',
        'green',
        'blue',
        'cyan',
        'red',
        'yellow',
        'magenta',
      ];
      styles.foreground = colors[colorIndex];
    } else {
      styles.foreground = 'white';
    }
    this.logger.log(VerboseLevel.INFO, 'MIDROW: ' + stringify(styles));
    this.writeScreen.setPen(styles);
  }

  outputDataUpdate(dispatch: boolean = false) {
    const time = this.logger.time;
    if (time === null) {
      return;
    }

    if (this.outputFilter) {
      if (this.cueStartTime === null && !this.displayedMemory.isEmpty()) {
        // Start of a new cue
        this.cueStartTime = time;
      } else {
        if (!this.displayedMemory.equals(this.lastOutputScreen)) {
          this.outputFilter.newCue(
            this.cueStartTime!,
            time,
            this.lastOutputScreen,
          );
          if (dispatch && this.outputFilter.dispatchCue) {
            this.outputFilter.dispatchCue();
          }

          this.cueStartTime = this.displayedMemory.isEmpty() ? null : time;
        }
      }
      this.lastOutputScreen.copy(this.displayedMemory);
    }
  }

  cueSplitAtTime(t: number) {
    if (this.outputFilter) {
      if (!this.displayedMemory.isEmpty()) {
        if (this.outputFilter.newCue) {
          this.outputFilter.newCue(this.cueStartTime!, t, this.displayedMemory);
        }

        this.cueStartTime = t;
      }
    }
  }
}

interface PACData {
  row: number;
  indent: number | null;
  color: string | null;
  underline: boolean;
  italics: boolean;
}

type SupportedField = 1 | 3;

type Channels = 0 | 1 | 2; // Will be 1 or 2 when parsing captions

type CmdHistory = {
  a: number | null;
  b: number | null;
};

class Cea608Parser {
  channels: Array<Cea608Channel | null>;
  currentChannel: Channels = 0;
  cmdHistory: CmdHistory = createCmdHistory();
  logger: CaptionsLogger;

  constructor(field: SupportedField, out1: OutputFilter, out2: OutputFilter) {
    const logger = (this.logger = new CaptionsLogger());
    this.channels = [
      null,
      new Cea608Channel(field, out1, logger),
      new Cea608Channel(field + 1, out2, logger),
    ];
  }

  getHandler(channel: number) {
    return (this.channels[channel] as Cea608Channel).getHandler();
  }

  setHandler(channel: number, newHandler: OutputFilter) {
    (this.channels[channel] as Cea608Channel).setHandler(newHandler);
  }

  /**
   * Add data for time t in forms of list of bytes (unsigned ints). The bytes are treated as pairs.
   */
  addData(time: number | null, byteList: number[]) {
    this.logger.time = time;
    for (let i = 0; i < byteList.length; i += 2) {
      const a = byteList[i] & 0x7f;
      const b = byteList[i + 1] & 0x7f;
      let cmdFound: boolean = false;
      let charsFound: number[] | null = null;

      if (a === 0 && b === 0) {
        continue;
      } else {
        this.logger.log(
          VerboseLevel.DATA,
          () =>
            '[' +
            numArrayToHexArray([byteList[i], byteList[i + 1]]) +
            '] -> (' +
            numArrayToHexArray([a, b]) +
            ')',
        );
      }

      const cmdHistory = this.cmdHistory;
      const isControlCode = a >= 0x10 && a <= 0x1f;
      if (isControlCode) {
        // Skip redundant control codes
        if (hasCmdRepeated(a, b, cmdHistory)) {
          setLastCmd(null, null, cmdHistory);
          this.logger.log(
            VerboseLevel.DEBUG,
            () =>
              'Repeated command (' +
              numArrayToHexArray([a, b]) +
              ') is dropped',
          );
          continue;
        }
        setLastCmd(a, b, this.cmdHistory);

        cmdFound = this.parseCmd(a, b);

        if (!cmdFound) {
          cmdFound = this.parseMidrow(a, b);
        }

        if (!cmdFound) {
          cmdFound = this.parsePAC(a, b);
        }

        if (!cmdFound) {
          cmdFound = this.parseBackgroundAttributes(a, b);
        }
      } else {
        setLastCmd(null, null, cmdHistory);
      }
      if (!cmdFound) {
        charsFound = this.parseChars(a, b);
        if (charsFound) {
          const currChNr = this.currentChannel;
          if (currChNr && currChNr > 0) {
            const channel = this.channels[currChNr] as Cea608Channel;
            channel.insertChars(charsFound);
          } else {
            this.logger.log(
              VerboseLevel.WARNING,
              'No channel found yet. TEXT-MODE?',
            );
          }
        }
      }
      if (!cmdFound && !charsFound) {
        this.logger.log(
          VerboseLevel.WARNING,
          () =>
            "Couldn't parse cleaned data " +
            numArrayToHexArray([a, b]) +
            ' orig: ' +
            numArrayToHexArray([byteList[i], byteList[i + 1]]),
        );
      }
    }
  }

  /**
   * Parse Command.
   * @returns True if a command was found
   */
  parseCmd(a: number, b: number): boolean {
    const cond1 =
      (a === 0x14 || a === 0x1c || a === 0x15 || a === 0x1d) &&
      b >= 0x20 &&
      b <= 0x2f;
    const cond2 = (a === 0x17 || a === 0x1f) && b >= 0x21 && b <= 0x23;
    if (!(cond1 || cond2)) {
      return false;
    }

    const chNr = a === 0x14 || a === 0x15 || a === 0x17 ? 1 : 2;
    const channel = this.channels[chNr] as Cea608Channel;

    if (a === 0x14 || a === 0x15 || a === 0x1c || a === 0x1d) {
      if (b === 0x20) {
        channel.ccRCL();
      } else if (b === 0x21) {
        channel.ccBS();
      } else if (b === 0x22) {
        channel.ccAOF();
      } else if (b === 0x23) {
        channel.ccAON();
      } else if (b === 0x24) {
        channel.ccDER();
      } else if (b === 0x25) {
        channel.ccRU(2);
      } else if (b === 0x26) {
        channel.ccRU(3);
      } else if (b === 0x27) {
        channel.ccRU(4);
      } else if (b === 0x28) {
        channel.ccFON();
      } else if (b === 0x29) {
        channel.ccRDC();
      } else if (b === 0x2a) {
        channel.ccTR();
      } else if (b === 0x2b) {
        channel.ccRTD();
      } else if (b === 0x2c) {
        channel.ccEDM();
      } else if (b === 0x2d) {
        channel.ccCR();
      } else if (b === 0x2e) {
        channel.ccENM();
      } else if (b === 0x2f) {
        channel.ccEOC();
      }
    } else {
      // a == 0x17 || a == 0x1F
      channel.ccTO(b - 0x20);
    }
    this.currentChannel = chNr;
    return true;
  }

  /**
   * Parse midrow styling command
   */
  parseMidrow(a: number, b: number): boolean {
    let chNr: number = 0;

    if ((a === 0x11 || a === 0x19) && b >= 0x20 && b <= 0x2f) {
      if (a === 0x11) {
        chNr = 1;
      } else {
        chNr = 2;
      }

      if (chNr !== this.currentChannel) {
        this.logger.log(
          VerboseLevel.ERROR,
          'Mismatch channel in midrow parsing',
        );
        return false;
      }
      const channel = this.channels[chNr];
      if (!channel) {
        return false;
      }
      channel.ccMIDROW(b);
      this.logger.log(
        VerboseLevel.DEBUG,
        () => 'MIDROW (' + numArrayToHexArray([a, b]) + ')',
      );
      return true;
    }
    return false;
  }

  /**
   * Parse Preable Access Codes (Table 53).
   * @returns {Boolean} Tells if PAC found
   */
  parsePAC(a: number, b: number): boolean {
    let row: number;

    const case1 =
      ((a >= 0x11 && a <= 0x17) || (a >= 0x19 && a <= 0x1f)) &&
      b >= 0x40 &&
      b <= 0x7f;
    const case2 = (a === 0x10 || a === 0x18) && b >= 0x40 && b <= 0x5f;
    if (!(case1 || case2)) {
      return false;
    }

    const chNr: Channels = a <= 0x17 ? 1 : 2;

    if (b >= 0x40 && b <= 0x5f) {
      row = chNr === 1 ? rowsLowCh1[a] : rowsLowCh2[a];
    } else {
      // 0x60 <= b <= 0x7F
      row = chNr === 1 ? rowsHighCh1[a] : rowsHighCh2[a];
    }
    const channel = this.channels[chNr];
    if (!channel) {
      return false;
    }
    channel.setPAC(this.interpretPAC(row, b));
    this.currentChannel = chNr;
    return true;
  }

  /**
   * Interpret the second byte of the pac, and return the information.
   * @returns pacData with style parameters
   */
  interpretPAC(row: number, byte: number): PACData {
    let pacIndex;
    const pacData: PACData = {
      color: null,
      italics: false,
      indent: null,
      underline: false,
      row: row,
    };

    if (byte > 0x5f) {
      pacIndex = byte - 0x60;
    } else {
      pacIndex = byte - 0x40;
    }

    pacData.underline = (pacIndex & 1) === 1;
    if (pacIndex <= 0xd) {
      pacData.color = [
        'white',
        'green',
        'blue',
        'cyan',
        'red',
        'yellow',
        'magenta',
        'white',
      ][Math.floor(pacIndex / 2)];
    } else if (pacIndex <= 0xf) {
      pacData.italics = true;
      pacData.color = 'white';
    } else {
      pacData.indent = Math.floor((pacIndex - 0x10) / 2) * 4;
    }
    return pacData; // Note that row has zero offset. The spec uses 1.
  }

  /**
   * Parse characters.
   * @returns An array with 1 to 2 codes corresponding to chars, if found. null otherwise.
   */
  parseChars(a: number, b: number): number[] | null {
    let channelNr: Channels;
    let charCodes: number[] | null = null;
    let charCode1: number | null = null;

    if (a >= 0x19) {
      channelNr = 2;
      charCode1 = a - 8;
    } else {
      channelNr = 1;
      charCode1 = a;
    }
    if (charCode1 >= 0x11 && charCode1 <= 0x13) {
      // Special character
      let oneCode;
      if (charCode1 === 0x11) {
        oneCode = b + 0x50;
      } else if (charCode1 === 0x12) {
        oneCode = b + 0x70;
      } else {
        oneCode = b + 0x90;
      }

      this.logger.log(
        VerboseLevel.INFO,
        () =>
          "Special char '" +
          getCharForByte(oneCode) +
          "' in channel " +
          channelNr,
      );
      charCodes = [oneCode];
    } else if (a >= 0x20 && a <= 0x7f) {
      charCodes = b === 0 ? [a] : [a, b];
    }
    if (charCodes) {
      this.logger.log(
        VerboseLevel.DEBUG,
        () => 'Char codes =  ' + numArrayToHexArray(charCodes).join(','),
      );
    }
    return charCodes;
  }

  /**
   * Parse extended background attributes as well as new foreground color black.
   * @returns True if background attributes are found
   */
  parseBackgroundAttributes(a: number, b: number): boolean {
    const case1 = (a === 0x10 || a === 0x18) && b >= 0x20 && b <= 0x2f;
    const case2 = (a === 0x17 || a === 0x1f) && b >= 0x2d && b <= 0x2f;
    if (!(case1 || case2)) {
      return false;
    }
    let index: number;
    const bkgData: Partial<PenStyles> = {};
    if (a === 0x10 || a === 0x18) {
      index = Math.floor((b - 0x20) / 2);
      bkgData.background = backgroundColors[index];
      if (b % 2 === 1) {
        bkgData.background = bkgData.background + '_semi';
      }
    } else if (b === 0x2d) {
      bkgData.background = 'transparent';
    } else {
      bkgData.foreground = 'black';
      if (b === 0x2f) {
        bkgData.underline = true;
      }
    }
    const chNr: Channels = a <= 0x17 ? 1 : 2;
    const channel: Cea608Channel = this.channels[chNr] as Cea608Channel;
    channel.setBkgData(bkgData);
    return true;
  }

  /**
   * Reset state of parser and its channels.
   */
  reset() {
    for (let i = 0; i < Object.keys(this.channels).length; i++) {
      const channel = this.channels[i];
      if (channel) {
        channel.reset();
      }
    }
    setLastCmd(null, null, this.cmdHistory);
  }

  /**
   * Trigger the generation of a cue, and the start of a new one if displayScreens are not empty.
   */
  cueSplitAtTime(t: number) {
    for (let i = 0; i < this.channels.length; i++) {
      const channel = this.channels[i];
      if (channel) {
        channel.cueSplitAtTime(t);
      }
    }
  }
}

function setLastCmd(
  a: number | null,
  b: number | null,
  cmdHistory: CmdHistory,
) {
  cmdHistory.a = a;
  cmdHistory.b = b;
}

function hasCmdRepeated(a: number, b: number, cmdHistory: CmdHistory) {
  return cmdHistory.a === a && cmdHistory.b === b;
}

function createCmdHistory(): CmdHistory {
  return {
    a: null,
    b: null,
  };
}

export default Cea608Parser;
