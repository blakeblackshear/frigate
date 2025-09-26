/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React from 'react';
// Pass-through components that users can swizzle and customize
export default function CodeBlockLineToken({line, token, ...props}) {
  return <span {...props} />;
}
