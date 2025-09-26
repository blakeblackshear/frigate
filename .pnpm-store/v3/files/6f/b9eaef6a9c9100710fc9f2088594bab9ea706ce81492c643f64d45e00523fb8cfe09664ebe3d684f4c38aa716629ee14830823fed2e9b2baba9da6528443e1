/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import React, { type JSX, useEffect, useState } from "react";

import { usePrismTheme } from "@docusaurus/theme-common";
import useIsBrowser from "@docusaurus/useIsBrowser";
import { ErrorMessage } from "@hookform/error-message";
import { setStringRawBody } from "@theme/ApiExplorer/Body/slice";
import clsx from "clsx";
import { Controller, useFormContext } from "react-hook-form";
import { LiveProvider, LiveEditor, withLive } from "react-live";

function Live({ onEdit, showErrors }: any) {
  const isBrowser = useIsBrowser();
  const [editorDisabled, setEditorDisabled] = useState(false);

  return (
    <div
      onClick={() => setEditorDisabled(false)}
      onBlur={() => setEditorDisabled(true)}
    >
      <LiveEditor
        key={String(isBrowser)}
        className={clsx({
          "openapi-explorer__playground-editor": true,
          "openapi-explorer__form-item-input": showErrors,
          error: showErrors,
        })}
        onChange={onEdit}
        disabled={editorDisabled}
        tabMode="focus"
      />
    </div>
  );
}

const LiveComponent = withLive(Live);

function App({
  children,
  transformCode,
  value,
  language,
  action,
  required: isRequired,
  ...props
}: any): JSX.Element {
  const prismTheme = usePrismTheme();
  const [code, setCode] = React.useState(children.replace(/\n$/, ""));

  useEffect(() => {
    action(setStringRawBody(code));
  }, [action, code]);

  const {
    control,
    formState: { errors },
  } = useFormContext();

  const showErrorMessage = errors?.requestBody;

  const handleChange = (snippet: string, onChange: any) => {
    setCode(snippet);
    onChange(snippet);
  };

  return (
    <div
      className={clsx({
        "openapi-explorer__playground-container": true,
      })}
    >
      <LiveProvider
        code={code}
        transformCode={transformCode ?? ((code) => `${code};`)}
        theme={prismTheme}
        language={language}
        {...props}
      >
        <Controller
          control={control}
          rules={{
            required: isRequired && !code ? "This field is required" : false,
          }}
          name="requestBody"
          render={({ field: { onChange, name } }) => (
            <LiveComponent
              onEdit={(e: any) => handleChange(e, onChange)}
              name={name}
              showErrors={showErrorMessage}
            />
          )}
        />
        {showErrorMessage && (
          <ErrorMessage
            errors={errors}
            name="requestBody"
            render={({ message }) => (
              <div className="openapi-explorer__input-error">{message}</div>
            )}
          />
        )}
      </LiveProvider>
    </div>
  );
}

const LiveApp = withLive(App);
export default LiveApp;
