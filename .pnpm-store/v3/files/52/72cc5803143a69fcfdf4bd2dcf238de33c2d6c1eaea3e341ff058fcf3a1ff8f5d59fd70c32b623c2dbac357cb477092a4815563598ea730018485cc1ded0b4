/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React from 'react';
import clsx from 'clsx';
import {
  ThemeClassNames,
  UnlistedBannerTitle,
  UnlistedBannerMessage,
  UnlistedMetadata,
} from '@docusaurus/theme-common';
import Admonition from '@theme/Admonition';
function UnlistedBanner({className}) {
  return (
    <Admonition
      type="caution"
      title={<UnlistedBannerTitle />}
      className={clsx(className, ThemeClassNames.common.unlistedBanner)}>
      <UnlistedBannerMessage />
    </Admonition>
  );
}
export default function Unlisted(props) {
  return (
    <>
      {/*
        Unlisted metadata declared here for simplicity.
        Ensures we never forget to add the correct noindex metadata.
        Also gives a central place for user to swizzle override default metadata.
        */}
      <UnlistedMetadata />
      <UnlistedBanner {...props} />
    </>
  );
}
