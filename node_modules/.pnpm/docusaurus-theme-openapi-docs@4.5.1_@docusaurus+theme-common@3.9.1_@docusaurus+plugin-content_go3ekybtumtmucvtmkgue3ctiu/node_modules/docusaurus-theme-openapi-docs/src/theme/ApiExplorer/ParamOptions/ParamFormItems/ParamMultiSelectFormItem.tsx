/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import React from "react";

import { ErrorMessage } from "@hookform/error-message";
import FormMultiSelect from "@theme/ApiExplorer/FormMultiSelect";
import { Param, setParam } from "@theme/ApiExplorer/ParamOptions/slice";
import { useTypedDispatch, useTypedSelector } from "@theme/ApiItem/hooks";
import { Controller, useFormContext } from "react-hook-form";

export interface ParamProps {
  param: Param;
}

export default function ParamMultiSelectFormItem({ param }: ParamProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  const showErrorMessage = errors?.paramMultiSelect;

  const dispatch = useTypedDispatch();

  const options = param.schema?.items?.enum ?? [];

  const pathParams = useTypedSelector((state: any) => state.params.path);
  const queryParams = useTypedSelector((state: any) => state.params.query);
  const cookieParams = useTypedSelector((state: any) => state.params.cookie);
  const headerParams = useTypedSelector((state: any) => state.params.header);

  const paramTypeToWatch = pathParams.length
    ? pathParams
    : queryParams.length
      ? queryParams
      : cookieParams.length
        ? cookieParams
        : headerParams;

  const handleChange = (e: any, onChange: any) => {
    const values = Array.prototype.filter
      .call(e.target.options, (o) => o.selected)
      .map((o) => o.value);

    dispatch(
      setParam({
        ...param,
        value: values.length > 0 ? values : undefined,
      })
    );

    onChange(paramTypeToWatch);
  };

  return (
    <>
      <Controller
        control={control}
        rules={{ required: param.required ? "This field is required" : false }}
        name="paramMultiSelect"
        render={({ field: { onChange, name } }) => (
          <FormMultiSelect
            options={options as string[]}
            name={name}
            onChange={(e: any) => handleChange(e, onChange)}
            showErrors={showErrorMessage}
          />
        )}
      />
      {showErrorMessage && (
        <ErrorMessage
          errors={errors}
          name="paramMultiSelect"
          render={({ message }) => (
            <div className="openapi-explorer__input-error">{message}</div>
          )}
        />
      )}
    </>
  );
}
