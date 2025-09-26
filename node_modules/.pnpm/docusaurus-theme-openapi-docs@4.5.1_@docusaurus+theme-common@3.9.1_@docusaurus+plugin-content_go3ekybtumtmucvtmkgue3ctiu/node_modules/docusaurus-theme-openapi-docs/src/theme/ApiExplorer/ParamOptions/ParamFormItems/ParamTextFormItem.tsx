/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import React from "react";

import FormTextInput from "@theme/ApiExplorer/FormTextInput";
import { Param, setParam } from "@theme/ApiExplorer/ParamOptions/slice";
import { useTypedDispatch } from "@theme/ApiItem/hooks";

export interface ParamProps {
  param: Param;
}

export default function ParamTextFormItem({ param }: ParamProps) {
  const dispatch = useTypedDispatch();
  return (
    <FormTextInput
      isRequired={param.required}
      paramName={param.name}
      placeholder={param.description || param.name}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        dispatch(
          setParam({
            ...param,
            value:
              param.in === "path" || param.in === "query"
                ? e.target.value.replace(/\s/g, "%20")
                : e.target.value,
          })
        )
      }
    />
  );
}
