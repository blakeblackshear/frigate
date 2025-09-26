/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import React from "react";

import FormItem from "@theme/ApiExplorer/FormItem";
import FormSelect from "@theme/ApiExplorer/FormSelect";
import { useTypedDispatch, useTypedSelector } from "@theme/ApiItem/hooks";

import { setAccept } from "./slice";

function Accept() {
  const value = useTypedSelector((state: any) => state.accept.value);
  const options = useTypedSelector((state: any) => state.accept.options);
  const dispatch = useTypedDispatch();

  if (options.length <= 1) {
    return null;
  }

  return (
    <FormItem label="Accept">
      <FormSelect
        value={value}
        options={options}
        onChange={(e: any) => dispatch(setAccept(e.target.value))}
      />
    </FormItem>
  );
}

export default Accept;
