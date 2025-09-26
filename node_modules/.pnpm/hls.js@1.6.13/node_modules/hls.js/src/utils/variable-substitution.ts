import type { AttrList } from './attr-list';
import type { LevelDetails } from '../loader/level-details';
import type { ParsedMultivariantPlaylist } from '../loader/m3u8-parser';
import type { VariableMap } from '../types/level';

const VARIABLE_REPLACEMENT_REGEX = /\{\$([a-zA-Z0-9-_]+)\}/g;

export function hasVariableReferences(str: string): boolean {
  return VARIABLE_REPLACEMENT_REGEX.test(str);
}

export function substituteVariables(
  parsed: Pick<
    ParsedMultivariantPlaylist | LevelDetails,
    'variableList' | 'hasVariableRefs' | 'playlistParsingError'
  >,
  value: string,
): string {
  if (parsed.variableList !== null || parsed.hasVariableRefs) {
    const variableList = parsed.variableList;
    return value.replace(
      VARIABLE_REPLACEMENT_REGEX,
      (variableReference: string) => {
        const variableName = variableReference.substring(
          2,
          variableReference.length - 1,
        );
        const variableValue = variableList?.[variableName];
        if (variableValue === undefined) {
          parsed.playlistParsingError ||= new Error(
            `Missing preceding EXT-X-DEFINE tag for Variable Reference: "${variableName}"`,
          );
          return variableReference;
        }
        return variableValue;
      },
    );
  }
  return value;
}

export function addVariableDefinition(
  parsed: Pick<
    ParsedMultivariantPlaylist | LevelDetails,
    'variableList' | 'playlistParsingError'
  >,
  attr: AttrList,
  parentUrl: string,
) {
  let variableList = parsed.variableList;
  if (!variableList) {
    parsed.variableList = variableList = {};
  }
  let NAME: string;
  let VALUE;
  if ('QUERYPARAM' in attr) {
    NAME = attr.QUERYPARAM;
    try {
      const searchParams = new self.URL(parentUrl).searchParams;
      if (searchParams.has(NAME)) {
        VALUE = searchParams.get(NAME);
      } else {
        throw new Error(
          `"${NAME}" does not match any query parameter in URI: "${parentUrl}"`,
        );
      }
    } catch (error) {
      parsed.playlistParsingError ||= new Error(
        `EXT-X-DEFINE QUERYPARAM: ${error.message}`,
      );
    }
  } else {
    NAME = attr.NAME;
    VALUE = attr.VALUE;
  }
  if (NAME in variableList) {
    parsed.playlistParsingError ||= new Error(
      `EXT-X-DEFINE duplicate Variable Name declarations: "${NAME}"`,
    );
  } else {
    variableList[NAME] = VALUE || '';
  }
}

export function importVariableDefinition(
  parsed: Pick<
    ParsedMultivariantPlaylist | LevelDetails,
    'variableList' | 'playlistParsingError'
  >,
  attr: AttrList,
  sourceVariableList: VariableMap | null,
) {
  const IMPORT = attr.IMPORT;
  if (sourceVariableList && IMPORT in sourceVariableList) {
    let variableList = parsed.variableList;
    if (!variableList) {
      parsed.variableList = variableList = {};
    }
    variableList[IMPORT] = sourceVariableList[IMPORT];
  } else {
    parsed.playlistParsingError ||= new Error(
      `EXT-X-DEFINE IMPORT attribute not found in Multivariant Playlist: "${IMPORT}"`,
    );
  }
}
