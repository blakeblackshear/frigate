var React = require('react');

const isBoolean = data => {
  return typeof data === 'boolean' || data instanceof Boolean;
};
const isNumber = data => {
  return typeof data === 'number' || data instanceof Number;
};
const isBigInt = data => {
  return typeof data === 'bigint' || data instanceof BigInt;
};
const isDate = data => {
  return !!data && data instanceof Date;
};
const isString = data => {
  return typeof data === 'string' || data instanceof String;
};
const isArray = data => {
  return Array.isArray(data);
};
const isObject = data => {
  return typeof data === 'object' && data !== null;
};
const isFunction = data => {
  return !!data && data instanceof Object && typeof data === 'function';
};

function quoteString(value, quoted) {
  if (quoted === void 0) {
    quoted = false;
  }
  return !value || quoted ? `"${value}"` : value;
}
function quoteStringValue(value, quoted, stringify) {
  if (stringify) {
    return JSON.stringify(value);
  }
  return quoted ? `"${value}"` : value;
}
function ExpandableObject(_ref) {
  let {
    field,
    value,
    data,
    lastElement,
    openBracket,
    closeBracket,
    level,
    style,
    shouldExpandNode,
    clickToExpandNode,
    outerRef,
    beforeExpandChange
  } = _ref;
  const shouldExpandNodeCalledRef = React.useRef(false);
  const [expanded, setExpanded] = React.useState(() => shouldExpandNode(level, value, field));
  const expanderButtonRef = React.useRef(null);
  React.useEffect(() => {
    if (!shouldExpandNodeCalledRef.current) {
      shouldExpandNodeCalledRef.current = true;
    } else {
      setExpanded(shouldExpandNode(level, value, field));
    }
  }, [shouldExpandNode]);
  const contentsId = React.useId();
  if (data.length === 0) {
    return EmptyObject({
      field,
      openBracket,
      closeBracket,
      lastElement,
      style
    });
  }
  const expanderIconStyle = expanded ? style.collapseIcon : style.expandIcon;
  const ariaLabel = expanded ? style.ariaLables.collapseJson : style.ariaLables.expandJson;
  const childLevel = level + 1;
  const lastIndex = data.length - 1;
  const setExpandWithCallback = newExpandValue => {
    if (expanded !== newExpandValue && (!beforeExpandChange || beforeExpandChange({
      level,
      value,
      field,
      newExpandValue
    }))) {
      setExpanded(newExpandValue);
    }
  };
  const onKeyDown = e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setExpandWithCallback(e.key === 'ArrowRight');
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const direction = e.key === 'ArrowUp' ? -1 : 1;
      if (!outerRef.current) return;
      const buttonElements = outerRef.current.querySelectorAll('[role=button]');
      let currentIndex = -1;
      for (let i = 0; i < buttonElements.length; i++) {
        if (buttonElements[i].tabIndex === 0) {
          currentIndex = i;
          break;
        }
      }
      if (currentIndex < 0) {
        return;
      }
      const nextIndex = (currentIndex + direction + buttonElements.length) % buttonElements.length;
      buttonElements[currentIndex].tabIndex = -1;
      buttonElements[nextIndex].tabIndex = 0;
      buttonElements[nextIndex].focus();
    }
  };
  const onClick = () => {
    var _outerRef$current;
    setExpandWithCallback(!expanded);
    const buttonElement = expanderButtonRef.current;
    if (!buttonElement) return;
    const prevButtonElement = (_outerRef$current = outerRef.current) === null || _outerRef$current === void 0 ? void 0 : _outerRef$current.querySelector('[role=button][tabindex="0"]');
    if (prevButtonElement) {
      prevButtonElement.tabIndex = -1;
    }
    buttonElement.tabIndex = 0;
    buttonElement.focus();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: style.basicChildStyle,
    role: 'treeitem',
    "aria-expanded": expanded,
    "aria-selected": undefined
  }, /*#__PURE__*/React.createElement("span", {
    className: expanderIconStyle,
    onClick: onClick,
    onKeyDown: onKeyDown,
    role: 'button',
    "aria-label": ariaLabel,
    "aria-expanded": expanded,
    "aria-controls": expanded ? contentsId : undefined,
    ref: expanderButtonRef,
    tabIndex: level === 0 ? 0 : -1
  }), (field || field === '') && (clickToExpandNode ? (
  /*#__PURE__*/
  React.createElement("span", {
    className: style.clickableLabel,
    onClick: onClick,
    onKeyDown: onKeyDown
  }, quoteString(field, style.quotesForFieldNames), ":")) : (/*#__PURE__*/React.createElement("span", {
    className: style.label
  }, quoteString(field, style.quotesForFieldNames), ":"))), /*#__PURE__*/React.createElement("span", {
    className: style.punctuation
  }, openBracket), expanded ? (/*#__PURE__*/React.createElement("ul", {
    id: contentsId,
    role: 'group',
    className: style.childFieldsContainer
  }, data.map((dataElement, index) => (/*#__PURE__*/React.createElement(DataRender, {
    key: dataElement[0] || index,
    field: dataElement[0],
    value: dataElement[1],
    style: style,
    lastElement: index === lastIndex,
    level: childLevel,
    shouldExpandNode: shouldExpandNode,
    clickToExpandNode: clickToExpandNode,
    beforeExpandChange: beforeExpandChange,
    outerRef: outerRef
  }))))) : (
  /*#__PURE__*/
  React.createElement("span", {
    className: style.collapsedContent,
    onClick: onClick,
    onKeyDown: onKeyDown
  })), /*#__PURE__*/React.createElement("span", {
    className: style.punctuation
  }, closeBracket), !lastElement && /*#__PURE__*/React.createElement("span", {
    className: style.punctuation
  }, ","));
}
function EmptyObject(_ref2) {
  let {
    field,
    openBracket,
    closeBracket,
    lastElement,
    style
  } = _ref2;
  return /*#__PURE__*/React.createElement("div", {
    className: style.basicChildStyle,
    role: 'treeitem',
    "aria-selected": undefined
  }, (field || field === '') && (/*#__PURE__*/React.createElement("span", {
    className: style.label
  }, quoteString(field, style.quotesForFieldNames), ":")), /*#__PURE__*/React.createElement("span", {
    className: style.punctuation
  }, openBracket), /*#__PURE__*/React.createElement("span", {
    className: style.punctuation
  }, closeBracket), !lastElement && /*#__PURE__*/React.createElement("span", {
    className: style.punctuation
  }, ","));
}
function JsonObject(_ref3) {
  let {
    field,
    value,
    style,
    lastElement,
    shouldExpandNode,
    clickToExpandNode,
    level,
    outerRef,
    beforeExpandChange
  } = _ref3;
  return ExpandableObject({
    field,
    value,
    lastElement: lastElement || false,
    level,
    openBracket: '{',
    closeBracket: '}',
    style,
    shouldExpandNode,
    clickToExpandNode,
    data: Object.keys(value).map(key => [key, value[key]]),
    outerRef,
    beforeExpandChange
  });
}
function JsonArray(_ref4) {
  let {
    field,
    value,
    style,
    lastElement,
    level,
    shouldExpandNode,
    clickToExpandNode,
    outerRef,
    beforeExpandChange
  } = _ref4;
  return ExpandableObject({
    field,
    value,
    lastElement: lastElement || false,
    level,
    openBracket: '[',
    closeBracket: ']',
    style,
    shouldExpandNode,
    clickToExpandNode,
    data: value.map(element => [undefined, element]),
    outerRef,
    beforeExpandChange
  });
}
function JsonPrimitiveValue(_ref5) {
  let {
    field,
    value,
    style,
    lastElement
  } = _ref5;
  let stringValue;
  let valueStyle = style.otherValue;
  if (value === null) {
    stringValue = 'null';
    valueStyle = style.nullValue;
  } else if (value === undefined) {
    stringValue = 'undefined';
    valueStyle = style.undefinedValue;
  } else if (isString(value)) {
    stringValue = quoteStringValue(value, !style.noQuotesForStringValues, style.stringifyStringValues);
    valueStyle = style.stringValue;
  } else if (isBoolean(value)) {
    stringValue = value ? 'true' : 'false';
    valueStyle = style.booleanValue;
  } else if (isNumber(value)) {
    stringValue = value.toString();
    valueStyle = style.numberValue;
  } else if (isBigInt(value)) {
    stringValue = `${value.toString()}n`;
    valueStyle = style.numberValue;
  } else if (isDate(value)) {
    stringValue = value.toISOString();
  } else if (isFunction(value)) {
    stringValue = 'function() { }';
  } else {
    stringValue = value.toString();
  }
  return /*#__PURE__*/React.createElement("div", {
    className: style.basicChildStyle,
    role: 'treeitem',
    "aria-selected": undefined
  }, (field || field === '') && (/*#__PURE__*/React.createElement("span", {
    className: style.label
  }, quoteString(field, style.quotesForFieldNames), ":")), /*#__PURE__*/React.createElement("span", {
    className: valueStyle
  }, stringValue), !lastElement && /*#__PURE__*/React.createElement("span", {
    className: style.punctuation
  }, ","));
}
function DataRender(props) {
  const value = props.value;
  if (isArray(value)) {
    return /*#__PURE__*/React.createElement(JsonArray, Object.assign({}, props));
  }
  if (isObject(value) && !isDate(value) && !isFunction(value)) {
    return /*#__PURE__*/React.createElement(JsonObject, Object.assign({}, props));
  }
  return /*#__PURE__*/React.createElement(JsonPrimitiveValue, Object.assign({}, props));
}

var styles = {"container-base":"_GzYRV","punctuation-base":"_3eOF8","pointer":"_1MFti","expander-base":"_f10Tu _1MFti","expand-icon":"_1UmXx","collapse-icon":"_1LId0","collapsed-content-base":"_1pNG9 _1MFti","container-light":"_2IvMF _GzYRV","basic-element-style":"_2bkNM","child-fields-container":"_1BXBN","label-light":"_1MGIk","clickable-label-light":"_2YKJg _1MGIk _1MFti","punctuation-light":"_3uHL6 _3eOF8","value-null-light":"_2T6PJ","value-undefined-light":"_1Gho6","value-string-light":"_vGjyY","value-number-light":"_1bQdo","value-boolean-light":"_3zQKs","value-other-light":"_1xvuR","collapse-icon-light":"_oLqym _f10Tu _1MFti _1LId0","expand-icon-light":"_2AXVT _f10Tu _1MFti _1UmXx","collapsed-content-light":"_2KJWg _1pNG9 _1MFti","container-dark":"_11RoI _GzYRV","expand-icon-dark":"_17H2C _f10Tu _1MFti _1UmXx","collapse-icon-dark":"_3QHg2 _f10Tu _1MFti _1LId0","collapsed-content-dark":"_3fDAz _1pNG9 _1MFti","label-dark":"_2bSDX","clickable-label-dark":"_1RQEj _2bSDX _1MFti","punctuation-dark":"_gsbQL _3eOF8","value-null-dark":"_LaAZe","value-undefined-dark":"_GTKgm","value-string-dark":"_Chy1W","value-number-dark":"_2bveF","value-boolean-dark":"_2vRm-","value-other-dark":"_1prJR"};

const defaultAriaLables = {
  collapseJson: 'collapse JSON',
  expandJson: 'expand JSON'
};
const defaultStyles = {
  container: styles['container-light'],
  basicChildStyle: styles['basic-element-style'],
  childFieldsContainer: styles['child-fields-container'],
  label: styles['label-light'],
  clickableLabel: styles['clickable-label-light'],
  nullValue: styles['value-null-light'],
  undefinedValue: styles['value-undefined-light'],
  stringValue: styles['value-string-light'],
  booleanValue: styles['value-boolean-light'],
  numberValue: styles['value-number-light'],
  otherValue: styles['value-other-light'],
  punctuation: styles['punctuation-light'],
  collapseIcon: styles['collapse-icon-light'],
  expandIcon: styles['expand-icon-light'],
  collapsedContent: styles['collapsed-content-light'],
  noQuotesForStringValues: false,
  quotesForFieldNames: false,
  ariaLables: defaultAriaLables,
  stringifyStringValues: false
};
const darkStyles = {
  container: styles['container-dark'],
  basicChildStyle: styles['basic-element-style'],
  childFieldsContainer: styles['child-fields-container'],
  label: styles['label-dark'],
  clickableLabel: styles['clickable-label-dark'],
  nullValue: styles['value-null-dark'],
  undefinedValue: styles['value-undefined-dark'],
  stringValue: styles['value-string-dark'],
  booleanValue: styles['value-boolean-dark'],
  numberValue: styles['value-number-dark'],
  otherValue: styles['value-other-dark'],
  punctuation: styles['punctuation-dark'],
  collapseIcon: styles['collapse-icon-dark'],
  expandIcon: styles['expand-icon-dark'],
  collapsedContent: styles['collapsed-content-dark'],
  noQuotesForStringValues: false,
  quotesForFieldNames: false,
  ariaLables: defaultAriaLables,
  stringifyStringValues: false
};
const allExpanded = () => true;
const collapseAllNested = level => level < 1;
const JsonView = _ref => {
  let {
    data,
    style = defaultStyles,
    shouldExpandNode = allExpanded,
    clickToExpandNode = false,
    beforeExpandChange,
    compactTopLevel,
    ...ariaAttrs
  } = _ref;
  const outerRef = React.useRef(null);
  return /*#__PURE__*/React.createElement("div", Object.assign({
    "aria-label": 'JSON view'
  }, ariaAttrs, {
    className: style.container,
    ref: outerRef,
    role: 'tree'
  }), compactTopLevel && isObject(data) ? Object.entries(data).map(_ref2 => {
    let [key, value] = _ref2;
    return /*#__PURE__*/React.createElement(DataRender, {
      key: key,
      field: key,
      value: value,
      style: {
        ...defaultStyles,
        ...style
      },
      lastElement: true,
      level: 1,
      shouldExpandNode: shouldExpandNode,
      clickToExpandNode: clickToExpandNode,
      beforeExpandChange: beforeExpandChange,
      outerRef: outerRef
    });
  }) : (/*#__PURE__*/React.createElement(DataRender, {
    value: data,
    style: {
      ...defaultStyles,
      ...style
    },
    lastElement: true,
    level: 0,
    shouldExpandNode: shouldExpandNode,
    clickToExpandNode: clickToExpandNode,
    outerRef: outerRef,
    beforeExpandChange: beforeExpandChange
  })));
};

exports.JsonView = JsonView;
exports.allExpanded = allExpanded;
exports.collapseAllNested = collapseAllNested;
exports.darkStyles = darkStyles;
exports.defaultStyles = defaultStyles;
//# sourceMappingURL=index.js.map
