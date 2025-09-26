/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import React, { useEffect, useState } from "react";

import { ErrorMessage } from "@hookform/error-message";
import { nanoid } from "@reduxjs/toolkit";
import FormSelect from "@theme/ApiExplorer/FormSelect";
import FormTextInput from "@theme/ApiExplorer/FormTextInput";
import { Param, setParam } from "@theme/ApiExplorer/ParamOptions/slice";
import { useTypedDispatch } from "@theme/ApiItem/hooks";
import { Controller, useFormContext } from "react-hook-form";

export interface ParamProps {
  param: Param;
}

function ArrayItem({
  param,
  onChange,
  initialValue,
}: ParamProps & { onChange(value?: string): any; initialValue?: string }) {
  const [value, setValue] = useState(initialValue || "");

  if (param.schema?.items?.type === "boolean") {
    return (
      <FormSelect
        options={["---", "true", "false"]}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const val = e.target.value;
          onChange(val === "---" ? undefined : val);
        }}
      />
    );
  }

  return (
    <FormTextInput
      placeholder={param.description || param.name}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
        onChange(e.target.value);
      }}
    />
  );
}

export default function ParamArrayFormItem({ param }: ParamProps) {
  const [items, setItems] = useState<{ id: string; value?: string }[]>([]);
  const dispatch = useTypedDispatch();

  const {
    control,
    formState: { errors },
  } = useFormContext();

  const showErrorMessage = errors?.paramArray?.message;

  function handleAddItem(e: any) {
    e.preventDefault(); // prevent form from submitting
    setItems((i) => [
      ...i,
      {
        id: nanoid(),
      },
    ]);
  }

  useEffect(() => {
    const values = items
      .map((item) => item.value)
      .filter((item): item is string => !!item);

    dispatch(
      setParam({
        ...param,
        value: values.length > 0 ? values : undefined,
      })
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  useEffect(() => {
    if (param.schema?.example?.length > 0) {
      const examplesWithIds = param.schema.example.map((item: any) => ({
        id: nanoid(),
        value: item.toString(),
      }));

      setItems(examplesWithIds);
    }
  }, [param.schema.example, param.schema.length]);

  function handleDeleteItem(itemToDelete: { id: string }) {
    return () => {
      const newItems = items.filter((i) => i.id !== itemToDelete.id);
      setItems(newItems);
    };
  }

  function handleChangeItem(itemToUpdate: { id: string }, onChange: any) {
    return (value: string) => {
      const newItems = items.map((i) => {
        if (i.id === itemToUpdate.id) {
          return { ...i, value: value };
        }
        return i;
      });
      setItems(newItems);
      onChange(newItems);
    };
  }

  return (
    <>
      <Controller
        control={control}
        rules={{ required: param.required ? "This field is required" : false }}
        name="paramArray"
        render={({ field: { onChange, name } }) => (
          <>
            {items.map((item) => (
              <div key={item.id} style={{ display: "flex" }}>
                <ArrayItem
                  param={param}
                  onChange={handleChangeItem(item, onChange)}
                  initialValue={item.value}
                />
                <button
                  className="openapi-explorer__delete-btn"
                  onClick={handleDeleteItem(item)}
                >
                  <svg
                    focusable="false"
                    preserveAspectRatio="xMidYMid meet"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    width="16"
                    height="16"
                    viewBox="0 0 32 32"
                    aria-hidden="true"
                  >
                    <path d="M24 9.4L22.6 8 16 14.6 9.4 8 8 9.4 14.6 16 8 22.6 9.4 24 16 17.4 22.6 24 24 22.6 17.4 16 24 9.4z"></path>
                    <title>Delete</title>
                  </svg>
                </button>
              </div>
            ))}
            <button
              className="openapi-explorer__thin-btn"
              onClick={handleAddItem}
            >
              Add item
            </button>
          </>
        )}
      />
      {showErrorMessage && (
        <ErrorMessage
          errors={errors}
          name="paramArray"
          render={({ message }) => (
            <div className="openapi-explorer__input-error">{message}</div>
          )}
        />
      )}
    </>
  );
}
