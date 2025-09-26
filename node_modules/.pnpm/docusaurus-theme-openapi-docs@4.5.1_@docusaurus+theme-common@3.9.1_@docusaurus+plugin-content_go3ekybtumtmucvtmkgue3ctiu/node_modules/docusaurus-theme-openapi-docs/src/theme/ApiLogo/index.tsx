/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import React from "react";

import { useColorMode } from "@docusaurus/theme-common";
import useBaseUrl from "@docusaurus/useBaseUrl";
import ThemedImage from "@theme/ThemedImage";

export default function ApiLogo(props: any): React.JSX.Element | undefined {
  const { colorMode } = useColorMode();
  const { logo, darkLogo } = props;
  const altText = () => {
    if (colorMode === "dark") {
      return darkLogo?.altText ?? logo?.altText;
    }
    return logo?.altText;
  };
  const lightLogoUrl = useBaseUrl(logo?.url);
  const darkLogoUrl = useBaseUrl(darkLogo?.url);

  if (logo && darkLogo) {
    return (
      <ThemedImage
        alt={altText()}
        sources={{
          light: lightLogoUrl,
          dark: darkLogoUrl,
        }}
        className="openapi__logo"
      />
    );
  }
  if (logo || darkLogo) {
    return (
      <ThemedImage
        alt={altText()}
        sources={{
          light: lightLogoUrl ?? darkLogoUrl,
          dark: lightLogoUrl ?? darkLogoUrl,
        }}
        className="openapi__logo"
      />
    );
  }

  return undefined;
}
