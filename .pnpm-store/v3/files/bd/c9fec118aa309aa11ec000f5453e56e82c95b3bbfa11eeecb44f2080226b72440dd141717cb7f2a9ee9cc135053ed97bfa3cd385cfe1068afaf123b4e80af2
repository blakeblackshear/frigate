/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React from 'react';
import {JsonView, defaultStyles} from 'react-json-view-lite';
import styles from './styles.module.css';
const paraisoStyles = {
  clickableLabel: defaultStyles.clickableLabel,
  noQuotesForStringValues: false,
  container: styles.containerParaiso,
  basicChildStyle: styles.basicElementParaiso,
  label: styles.labelParaiso,
  nullValue: styles.nullValueParaiso,
  undefinedValue: styles.undefinedValueParaiso,
  stringValue: styles.stringValueParaiso,
  booleanValue: styles.booleanValueParaiso,
  numberValue: styles.numberValueParaiso,
  otherValue: styles.otherValueParaiso,
  punctuation: styles.punctuationParaiso,
  collapseIcon: styles.collapseIconParaiso,
  expandIcon: styles.expandIconParaiso,
  collapsedContent: styles.collapseContentParaiso,
  childFieldsContainer: styles.childFieldsContainerParaiso,
};
export default function DebugJsonView({src, collapseDepth}) {
  return (
    <JsonView
      data={src}
      shouldExpandNode={(idx, value) => {
        if (Array.isArray(value)) {
          return value.length < 5;
        }
        return collapseDepth !== undefined && idx < collapseDepth;
      }}
      style={paraisoStyles}
    />
  );
}
