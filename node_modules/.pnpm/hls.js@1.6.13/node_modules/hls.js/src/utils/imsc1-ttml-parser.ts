import { utf8ArrayToStr } from '@svta/common-media-library/utils/utf8ArrayToStr';
import { findBox } from './mp4-tools';
import { toTimescaleFromScale } from './timescale-conversion';
import VTTCue from './vttcue';
import { parseTimeStamp } from './vttparser';
import { generateCueId } from './webvtt-parser';
import type { TimestampOffset } from './timescale-conversion';

export const IMSC1_CODEC = 'stpp.ttml.im1t';

// Time format: h:m:s:frames(.subframes)
const HMSF_REGEX = /^(\d{2,}):(\d{2}):(\d{2}):(\d{2})\.?(\d+)?$/;

// Time format: hours, minutes, seconds, milliseconds, frames, ticks
const TIME_UNIT_REGEX = /^(\d*(?:\.\d*)?)(h|m|s|ms|f|t)$/;

const textAlignToLineAlign: Partial<Record<string, LineAlignSetting>> = {
  left: 'start',
  center: 'center',
  right: 'end',
  start: 'start',
  end: 'end',
};

export function parseIMSC1(
  payload: ArrayBuffer,
  initPTS: TimestampOffset,
  callBack: (cues: Array<VTTCue>) => any,
  errorCallBack: (error: Error) => any,
) {
  const results = findBox(new Uint8Array(payload), ['mdat']);
  if (results.length === 0) {
    errorCallBack(new Error('Could not parse IMSC1 mdat'));
    return;
  }

  const ttmlList = results.map((mdat) => utf8ArrayToStr(mdat));

  const syncTime = toTimescaleFromScale(initPTS.baseTime, 1, initPTS.timescale);

  try {
    ttmlList.forEach((ttml) => callBack(parseTTML(ttml, syncTime)));
  } catch (error) {
    errorCallBack(error);
  }
}

function parseTTML(ttml: string, syncTime: number): Array<VTTCue> {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(ttml, 'text/xml');
  const tt = xmlDoc.getElementsByTagName('tt')[0];
  if (!tt) {
    throw new Error('Invalid ttml');
  }
  const defaultRateInfo = {
    frameRate: 30,
    subFrameRate: 1,
    frameRateMultiplier: 0,
    tickRate: 0,
  };
  const rateInfo: Object = Object.keys(defaultRateInfo).reduce(
    (result, key) => {
      result[key] = tt.getAttribute(`ttp:${key}`) || defaultRateInfo[key];
      return result;
    },
    {},
  );

  const trim = tt.getAttribute('xml:space') !== 'preserve';

  const styleElements = collectionToDictionary(
    getElementCollection(tt, 'styling', 'style'),
  );
  const regionElements = collectionToDictionary(
    getElementCollection(tt, 'layout', 'region'),
  );
  const cueElements = getElementCollection(tt, 'body', '[begin]');

  return [].map
    .call(cueElements, (cueElement) => {
      const cueText = getTextContent(cueElement, trim);

      if (!cueText || !cueElement.hasAttribute('begin')) {
        return null;
      }
      const startTime = parseTtmlTime(
        cueElement.getAttribute('begin'),
        rateInfo,
      );
      const duration = parseTtmlTime(cueElement.getAttribute('dur'), rateInfo);
      let endTime = parseTtmlTime(cueElement.getAttribute('end'), rateInfo);
      if (startTime === null) {
        throw timestampParsingError(cueElement);
      }
      if (endTime === null) {
        if (duration === null) {
          throw timestampParsingError(cueElement);
        }
        endTime = startTime + duration;
      }
      const cue = new VTTCue(startTime - syncTime, endTime - syncTime, cueText);
      cue.id = generateCueId(cue.startTime, cue.endTime, cue.text);

      const region = regionElements[cueElement.getAttribute('region')];
      const style = styleElements[cueElement.getAttribute('style')];

      // Apply styles to cue
      const styles = getTtmlStyles(region, style, styleElements);
      const { textAlign } = styles;
      if (textAlign) {
        // cue.positionAlign not settable in FF~2016
        const lineAlign = textAlignToLineAlign[textAlign];
        if (lineAlign) {
          cue.lineAlign = lineAlign;
        }
        cue.align = textAlign as AlignSetting;
      }
      Object.assign(cue, styles);

      return cue;
    })
    .filter((cue) => cue !== null);
}

function getElementCollection(
  fromElement,
  parentName,
  childName,
): Array<HTMLElement> {
  const parent = fromElement.getElementsByTagName(parentName)[0];
  if (parent) {
    return [].slice.call(parent.querySelectorAll(childName));
  }
  return [];
}

function collectionToDictionary(elementsWithId: Array<HTMLElement>): {
  [id: string]: HTMLElement;
} {
  return elementsWithId.reduce((dict, element: HTMLElement) => {
    const id = element.getAttribute('xml:id');
    if (id) {
      dict[id] = element;
    }
    return dict;
  }, {});
}

function getTextContent(element, trim): string {
  return [].slice.call(element.childNodes).reduce((str, node, i) => {
    if (node.nodeName === 'br' && i) {
      return str + '\n';
    }
    if (node.childNodes?.length) {
      return getTextContent(node, trim);
    } else if (trim) {
      return str + node.textContent.trim().replace(/\s+/g, ' ');
    }
    return str + node.textContent;
  }, '');
}

function getTtmlStyles(
  region,
  style,
  styleElements,
): { [style: string]: string } {
  const ttsNs = 'http://www.w3.org/ns/ttml#styling';
  let regionStyle = null;
  const styleAttributes = [
    'displayAlign',
    'textAlign',
    'color',
    'backgroundColor',
    'fontSize',
    'fontFamily',
    // 'fontWeight',
    // 'lineHeight',
    // 'wrapOption',
    // 'fontStyle',
    // 'direction',
    // 'writingMode'
  ];

  const regionStyleName = region?.hasAttribute('style')
    ? region.getAttribute('style')
    : null;

  if (regionStyleName && styleElements.hasOwnProperty(regionStyleName)) {
    regionStyle = styleElements[regionStyleName];
  }

  return styleAttributes.reduce((styles, name) => {
    const value =
      getAttributeNS(style, ttsNs, name) ||
      getAttributeNS(region, ttsNs, name) ||
      getAttributeNS(regionStyle, ttsNs, name);
    if (value) {
      styles[name] = value;
    }
    return styles;
  }, {});
}

function getAttributeNS(element, ns, name): string | null {
  if (!element) {
    return null;
  }
  return element.hasAttributeNS(ns, name)
    ? element.getAttributeNS(ns, name)
    : null;
}

function timestampParsingError(node) {
  return new Error(`Could not parse ttml timestamp ${node}`);
}

function parseTtmlTime(timeAttributeValue, rateInfo): number | null {
  if (!timeAttributeValue) {
    return null;
  }
  let seconds: number | null = parseTimeStamp(timeAttributeValue);
  if (seconds === null) {
    if (HMSF_REGEX.test(timeAttributeValue)) {
      seconds = parseHoursMinutesSecondsFrames(timeAttributeValue, rateInfo);
    } else if (TIME_UNIT_REGEX.test(timeAttributeValue)) {
      seconds = parseTimeUnits(timeAttributeValue, rateInfo);
    }
  }
  return seconds;
}

function parseHoursMinutesSecondsFrames(timeAttributeValue, rateInfo): number {
  const m = HMSF_REGEX.exec(timeAttributeValue) as Array<any>;
  const frames = (m[4] | 0) + (m[5] | 0) / rateInfo.subFrameRate;
  return (
    (m[1] | 0) * 3600 +
    (m[2] | 0) * 60 +
    (m[3] | 0) +
    frames / rateInfo.frameRate
  );
}

function parseTimeUnits(timeAttributeValue, rateInfo): number {
  const m = TIME_UNIT_REGEX.exec(timeAttributeValue) as Array<any>;
  const value = Number(m[1]);
  const unit = m[2];
  switch (unit) {
    case 'h':
      return value * 3600;
    case 'm':
      return value * 60;
    case 'ms':
      return value * 1000;
    case 'f':
      return value / rateInfo.frameRate;
    case 't':
      return value / rateInfo.tickRate;
  }
  return value;
}
