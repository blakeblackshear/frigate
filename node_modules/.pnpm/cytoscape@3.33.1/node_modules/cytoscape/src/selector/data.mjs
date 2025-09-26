import * as is from '../is.mjs';

export const valCmp = (fieldVal, operator, value) => {
  let matches;
  let isFieldStr = is.string( fieldVal );
  let isFieldNum = is.number( fieldVal );
  let isValStr = is.string(value);
  let fieldStr, valStr;
  let caseInsensitive = false;
  let notExpr = false;
  let isIneqCmp = false;

  if( operator.indexOf( '!' ) >= 0 ){
    operator = operator.replace( '!', '' );
    notExpr = true;
  }

  if( operator.indexOf( '@' ) >= 0 ){
    operator = operator.replace( '@', '' );
    caseInsensitive = true;
  }

  if( isFieldStr || isValStr || caseInsensitive ){
    fieldStr = !isFieldStr && !isFieldNum ? '' : '' + fieldVal;
    valStr = '' + value;
  }

  // if we're doing a case insensitive comparison, then we're using a STRING comparison
  // even if we're comparing numbers
  if( caseInsensitive ){
    fieldVal = fieldStr = fieldStr.toLowerCase();
    value = valStr = valStr.toLowerCase();
  }

  switch( operator ){
  case '*=':
    matches = fieldStr.indexOf( valStr ) >= 0;
    break;
  case '$=':
    matches = fieldStr.indexOf( valStr, fieldStr.length - valStr.length ) >= 0;
    break;
  case '^=':
    matches = fieldStr.indexOf( valStr ) === 0;
    break;
  case '=':
    matches = fieldVal === value;
    break;
  case '>':
    isIneqCmp = true;
    matches = fieldVal > value;
    break;
  case '>=':
    isIneqCmp = true;
    matches = fieldVal >= value;
    break;
  case '<':
    isIneqCmp = true;
    matches = fieldVal < value;
    break;
  case '<=':
    isIneqCmp = true;
    matches = fieldVal <= value;
    break;
  default:
    matches = false;
    break;
  }

  // apply the not op, but null vals for inequalities should always stay non-matching
  if( notExpr && ( fieldVal != null || !isIneqCmp ) ){
    matches = !matches;
  }

  return matches;
};

export const boolCmp = (fieldVal, operator) => {
  switch( operator ){
  case '?':
    return fieldVal ? true : false;
  case '!':
    return fieldVal ? false : true;
  case '^':
    return fieldVal === undefined;
  }
};

export const existCmp = (fieldVal) => fieldVal !== undefined;

export const data = (ele, field) => ele.data(field);

export const meta = (ele, field) => ele[field]();