/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React from 'react';
import {TitleFormatterProvider} from '@docusaurus/theme-common/internal';
const formatter = (params) => {
  // Add your own title formatting logic here!
  return params.defaultFormatter(params);
};
export default function ThemeProviderTitleFormatter({children}) {
  return (
    <TitleFormatterProvider formatter={formatter}>
      {children}
    </TitleFormatterProvider>
  );
}
