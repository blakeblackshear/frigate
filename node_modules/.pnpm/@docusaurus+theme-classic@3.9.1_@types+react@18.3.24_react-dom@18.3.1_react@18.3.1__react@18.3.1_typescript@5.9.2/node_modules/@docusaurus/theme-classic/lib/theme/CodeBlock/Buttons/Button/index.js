/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React from 'react';
import clsx from 'clsx';
export default function CodeBlockButton({className, ...props}) {
  return (
    <button type="button" {...props} className={clsx('clean-btn', className)} />
  );
}
