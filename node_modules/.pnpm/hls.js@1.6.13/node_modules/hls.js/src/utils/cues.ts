import { addCueToTrack } from './texttrack-utils';
import { fixLineBreaks } from './vttparser';
import { generateCueId } from './webvtt-parser';
import type { CaptionScreen, Row } from './cea-608-parser';

const WHITESPACE_CHAR = /\s/;

export interface CuesInterface {
  newCue(
    track: TextTrack | null,
    startTime: number,
    endTime: number,
    captionScreen: CaptionScreen,
  ): VTTCue[];
}

const Cues: CuesInterface = {
  newCue(
    track: TextTrack | null,
    startTime: number,
    endTime: number,
    captionScreen: CaptionScreen,
  ): VTTCue[] {
    const result: VTTCue[] = [];
    let row: Row;
    // the type data states this is VTTCue, but it can potentially be a TextTrackCue on old browsers
    let cue: VTTCue;
    let indenting: boolean;
    let indent: number;
    let text: string;
    const Cue = (self.VTTCue || self.TextTrackCue) as any;

    for (let r = 0; r < captionScreen.rows.length; r++) {
      row = captionScreen.rows[r];
      indenting = true;
      indent = 0;
      text = '';

      if (!row.isEmpty()) {
        for (let c = 0; c < row.chars.length; c++) {
          if (WHITESPACE_CHAR.test(row.chars[c].uchar) && indenting) {
            indent++;
          } else {
            text += row.chars[c].uchar;
            indenting = false;
          }
        }
        // To be used for cleaning-up orphaned roll-up captions
        row.cueStartTime = startTime;

        // Give a slight bump to the endTime if it's equal to startTime to avoid a SyntaxError in IE
        if (startTime === endTime) {
          endTime += 0.0001;
        }

        if (indent >= 16) {
          indent--;
        } else {
          indent++;
        }

        const cueText = fixLineBreaks(text.trim());
        const id = generateCueId(startTime, endTime, cueText);

        // If this cue already exists in the track do not push it
        if (!track?.cues?.getCueById(id)) {
          cue = new Cue(startTime, endTime, cueText);
          cue.id = id;
          cue.line = r + 1;
          cue.align = 'left';
          // Clamp the position between 10 and 80 percent (CEA-608 PAC indent code)
          // https://dvcs.w3.org/hg/text-tracks/raw-file/default/608toVTT/608toVTT.html#positioning-in-cea-608
          // Firefox throws an exception and captions break with out of bounds 0-100 values
          cue.position = 10 + Math.min(80, Math.floor((indent * 8) / 32) * 10);
          result.push(cue);
        }
      }
    }
    if (track && result.length) {
      // Sort bottom cues in reverse order so that they render in line order when overlapping in Chrome
      result.sort((cueA, cueB) => {
        if (cueA.line === 'auto' || cueB.line === 'auto') {
          return 0;
        }
        if (cueA.line > 8 && cueB.line > 8) {
          return cueB.line - cueA.line;
        }
        return cueA.line - cueB.line;
      });
      result.forEach((cue) => addCueToTrack(track, cue));
    }
    return result;
  },
};

export default Cues;
