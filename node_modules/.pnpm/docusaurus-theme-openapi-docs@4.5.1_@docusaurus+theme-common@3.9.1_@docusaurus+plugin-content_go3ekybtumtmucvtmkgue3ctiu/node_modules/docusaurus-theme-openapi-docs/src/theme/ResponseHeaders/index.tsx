/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import React from "react";

import SchemaItem from "@theme/SchemaItem";

import { getQualifierMessage, getSchemaName } from "../../markdown/schema";

interface ResponseHeadersProps {
  description?: string;
  example?: string;
  schema?: {
    type?: string;
    format?: string;
  };
}

export const ResponseHeaders: React.FC<{
  responseHeaders?: Record<string, ResponseHeadersProps>;
}> = ({ responseHeaders }) => {
  if (!responseHeaders) {
    return null;
  }

  return (
    <ul style={{ marginLeft: "1rem" }}>
      {Object.entries(responseHeaders).map(([name, schema]) => {
        return (
          <SchemaItem
            name={name}
            collapsible={false}
            schemaName={getSchemaName(schema)}
            qualifierMessage={getQualifierMessage(schema)}
            schema={schema}
            discriminator={false}
            children={null}
          />
        );
      })}
    </ul>
  );
};

export default ResponseHeaders;
