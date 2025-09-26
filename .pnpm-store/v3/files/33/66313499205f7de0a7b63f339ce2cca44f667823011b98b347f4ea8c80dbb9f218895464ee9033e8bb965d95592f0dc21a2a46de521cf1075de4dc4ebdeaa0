/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import React, { useState } from "react";

import FormItem from "@theme/ApiExplorer/FormItem";
import ParamArrayFormItem from "@theme/ApiExplorer/ParamOptions/ParamFormItems/ParamArrayFormItem";
import ParamBooleanFormItem from "@theme/ApiExplorer/ParamOptions/ParamFormItems/ParamBooleanFormItem";
import ParamMultiSelectFormItem from "@theme/ApiExplorer/ParamOptions/ParamFormItems/ParamMultiSelectFormItem";
import ParamSelectFormItem from "@theme/ApiExplorer/ParamOptions/ParamFormItems/ParamSelectFormItem";
import ParamTextFormItem from "@theme/ApiExplorer/ParamOptions/ParamFormItems/ParamTextFormItem";
import { useTypedSelector } from "@theme/ApiItem/hooks";

import { Param } from "./slice";

export interface ParamProps {
  param: Param;
}

function ParamOption({ param }: ParamProps) {
  if (param.schema?.type === "array" && param.schema.items?.enum) {
    return <ParamMultiSelectFormItem param={param} />;
  }

  if (param.schema?.type === "array") {
    return <ParamArrayFormItem param={param} />;
  }

  if (param.schema?.enum) {
    return <ParamSelectFormItem param={param} />;
  }

  if (param.schema?.type === "boolean") {
    return <ParamBooleanFormItem param={param} />;
  }

  // integer, number, string, int32, int64, float, double, object, byte, binary,
  // date-time, date, password
  return <ParamTextFormItem param={param} />;
}

function ParamOptionWrapper({ param }: ParamProps) {
  return (
    <FormItem label={param.name} type={param.in} required={param.required}>
      <ParamOption param={param} />
    </FormItem>
  );
}

function ParamOptions() {
  const [showOptional, setShowOptional] = useState(false);

  const pathParams = useTypedSelector((state: any) => state.params.path);
  const queryParams = useTypedSelector((state: any) => state.params.query);
  const cookieParams = useTypedSelector((state: any) => state.params.cookie);
  const headerParams = useTypedSelector((state: any) => state.params.header);

  const allParams = [
    ...pathParams,
    ...queryParams,
    ...cookieParams,
    ...headerParams,
  ];

  const requiredParams = allParams.filter((p) => p.required);
  const optionalParams = allParams.filter((p) => !p.required);

  return (
    <>
      {/* Required Parameters */}
      {requiredParams.map((param) => (
        <ParamOptionWrapper key={`${param.in}-${param.name}`} param={param} />
      ))}

      {/* Optional Parameters */}
      {optionalParams.length > 0 && (
        <>
          <button
            type="button"
            className="openapi-explorer__show-more-btn"
            onClick={() => setShowOptional((prev) => !prev)}
          >
            <span
              style={{
                width: "1.5em",
                display: "inline-block",
                textAlign: "center",
              }}
            >
              <span
                className={
                  showOptional
                    ? "openapi-explorer__plus-btn--expanded"
                    : "openapi-explorer__plus-btn"
                }
              >
                <div>
                  <svg
                    style={{
                      fill: "currentColor",
                      width: "10px",
                      height: "10px",
                    }}
                    height="16"
                    viewBox="0 0 16 16"
                    width="16"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 7h6a1 1 0 0 1 0 2H9v6a1 1 0 0 1-2 0V9H1a1 1 0 1 1 0-2h6V1a1 1 0 1 1 2 0z"
                      fillRule="evenodd"
                    ></path>
                  </svg>
                </div>
              </span>
            </span>
            {showOptional
              ? "Hide optional parameters"
              : "Show optional parameters"}
          </button>

          <div
            className={
              showOptional
                ? "openapi-explorer__show-options"
                : "openapi-explorer__hide-options"
            }
          >
            {optionalParams.map((param) => (
              <ParamOptionWrapper
                key={`${param.in}-${param.name}`}
                param={param}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

export default ParamOptions;
