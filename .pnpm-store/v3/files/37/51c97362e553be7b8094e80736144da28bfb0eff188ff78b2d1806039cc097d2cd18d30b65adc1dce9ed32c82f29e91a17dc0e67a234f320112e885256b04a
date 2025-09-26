/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import React, { useState, useEffect } from "react";

import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import ApiCodeBlock from "@theme/ApiExplorer/ApiCodeBlock";
import buildPostmanRequest from "@theme/ApiExplorer/buildPostmanRequest";
import CodeTabs from "@theme/ApiExplorer/CodeTabs";
import { useTypedSelector } from "@theme/ApiItem/hooks";
import cloneDeep from "lodash/cloneDeep";
import codegen from "postman-code-generators";
import * as sdk from "postman-collection";

import { CodeSample, Language } from "./code-snippets-types";
import {
  getCodeSampleSourceFromLanguage,
  mergeArraysbyLanguage,
  mergeCodeSampleLanguage,
  generateLanguageSet,
} from "./languages";

export const languageSet: Language[] = generateLanguageSet();

export interface Props {
  postman: sdk.Request;
  codeSamples: CodeSample[];
}

function CodeTab({ children, hidden, className }: any): React.JSX.Element {
  return (
    <div role="tabpanel" className={className} {...{ hidden }}>
      {children}
    </div>
  );
}

function CodeSnippets({ postman, codeSamples }: Props) {
  const { siteConfig } = useDocusaurusContext();

  const contentType = useTypedSelector((state: any) => state.contentType.value);
  const accept = useTypedSelector((state: any) => state.accept.value);
  const server = useTypedSelector((state: any) => state.server.value);
  const body = useTypedSelector((state: any) => state.body);

  const pathParams = useTypedSelector((state: any) => state.params.path);
  const queryParams = useTypedSelector((state: any) => state.params.query);
  const cookieParams = useTypedSelector((state: any) => state.params.cookie);
  const headerParams = useTypedSelector((state: any) => state.params.header);

  const auth = useTypedSelector((state: any) => state.auth);
  const clonedAuth = cloneDeep(auth);
  let placeholder: string;

  function cleanCredentials(obj: any) {
    for (const key in obj) {
      if (typeof obj[key] === "object" && obj[key] !== null) {
        // use name as placeholder if exists
        const comboAuthId = Object.keys(obj).join(" and ");
        const authOptions =
          clonedAuth?.options?.[key] ?? clonedAuth?.options?.[comboAuthId];
        placeholder = authOptions?.[0]?.name;
        obj[key] = cleanCredentials(obj[key]);
      } else {
        obj[key] = `<${placeholder ?? key}>`;
      }
    }

    return obj;
  }

  // scrub credentials from code snippets
  const cleanedAuth = {
    ...clonedAuth,
    data: cleanCredentials(clonedAuth.data),
  };

  // Create a Postman request object using cleanedAuth
  const cleanedPostmanRequest = buildPostmanRequest(postman, {
    queryParams,
    pathParams,
    cookieParams,
    contentType,
    accept,
    headerParams,
    body,
    server,
    auth: cleanedAuth,
  });

  // User-defined languages array
  // Can override languageSet, change order of langs, override options and variants
  const userDefinedLanguageSet =
    (siteConfig?.themeConfig?.languageTabs as Language[] | undefined) ??
    languageSet;

  // Filter languageSet by user-defined langs
  const filteredLanguageSet = languageSet.filter((ls) => {
    return userDefinedLanguageSet?.some((lang) => {
      return lang.language === ls.language;
    });
  });

  // Merge user-defined langs into languageSet
  const mergedLangs = mergeCodeSampleLanguage(
    mergeArraysbyLanguage(userDefinedLanguageSet, filteredLanguageSet),
    codeSamples
  );

  // Read defaultLang from localStorage
  const defaultLang: Language[] = mergedLangs.filter(
    (lang) =>
      lang.language === localStorage.getItem("docusaurus.tab.code-samples")
  );
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>();
  const [selectedSample, setSelectedSample] = useState<string | undefined>();
  const [language, setLanguage] = useState(() => {
    // Return first index if only 1 user-defined language exists
    if (mergedLangs.length === 1) {
      return mergedLangs[0];
    }
    // Fall back to language in localStorage or first user-defined language
    return defaultLang[0] ?? mergedLangs[0];
  });
  const [codeText, setCodeText] = useState<string>("");
  const [codeSampleCodeText, setCodeSampleCodeText] = useState<
    string | (() => string)
  >(() => getCodeSampleSourceFromLanguage(language));

  useEffect(() => {
    if (language && !!language.sample) {
      setCodeSampleCodeText(getCodeSampleSourceFromLanguage(language));
    }

    if (language && !!language.options) {
      codegen.convert(
        language.language,
        language.variant,
        cleanedPostmanRequest,
        language.options,
        (error: any, snippet: string) => {
          if (error) {
            return;
          }
          setCodeText(snippet);
        }
      );
    } else if (language && !language.options) {
      const langSource = mergedLangs.filter(
        (lang) => lang.language === language.language
      );

      // Merges user-defined language with default languageSet
      // This allows users to define only the minimal properties necessary in languageTabs
      // User-defined properties should override languageSet properties
      const mergedLanguage = { ...langSource[0], ...language };
      codegen.convert(
        mergedLanguage.language,
        mergedLanguage.variant,
        cleanedPostmanRequest,
        mergedLanguage.options,
        (error: any, snippet: string) => {
          if (error) {
            return;
          }
          setCodeText(snippet);
        }
      );
    } else {
      setCodeText("");
    }
  }, [
    accept,
    body,
    contentType,
    cookieParams,
    headerParams,
    language,
    pathParams,
    postman,
    queryParams,
    server,
    cleanedPostmanRequest,
    mergedLangs,
  ]);
  // no dependencies was intentionally set for this particular hook. it's safe as long as if conditions are set
  useEffect(function onSelectedVariantUpdate() {
    if (selectedVariant && selectedVariant !== language?.variant) {
      codegen.convert(
        language.language,
        selectedVariant,
        cleanedPostmanRequest,
        language.options,
        (error: any, snippet: string) => {
          if (error) {
            return;
          }
          setCodeText(snippet);
        }
      );
    }
  });

  // no dependencies was intentionally set for this particular hook. it's safe as long as if conditions are set
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(function onSelectedSampleUpdate() {
    if (
      language &&
      language.samples &&
      language.samplesSources &&
      selectedSample &&
      selectedSample !== language.sample
    ) {
      const sampleIndex = language.samples.findIndex(
        (smp) => smp === selectedSample
      );
      setCodeSampleCodeText(language.samplesSources[sampleIndex]);
    }
  });

  if (language === undefined) {
    return null;
  }

  return (
    <>
      {/* Outer language tabs */}
      <CodeTabs
        groupId="code-samples"
        action={{
          setLanguage: setLanguage,
          setSelectedVariant: setSelectedVariant,
          setSelectedSample: setSelectedSample,
        }}
        languageSet={mergedLangs}
        defaultValue={defaultLang[0]?.language ?? mergedLangs[0].language}
        lazy
      >
        {mergedLangs.map((lang) => {
          return (
            <CodeTab
              value={lang.language}
              label={lang.language}
              key={lang.language}
              attributes={{
                className: `openapi-tabs__code-item--${lang.logoClass}`,
              }}
            >
              {/* Inner x-codeSamples tabs */}
              {lang.samples && (
                <CodeTabs
                  className="openapi-tabs__code-container-inner"
                  action={{
                    setLanguage: setLanguage,
                    setSelectedSample: setSelectedSample,
                  }}
                  includeSample={true}
                  currentLanguage={lang.language}
                  defaultValue={selectedSample}
                  languageSet={mergedLangs}
                  lazy
                >
                  {lang.samples.map((sample, index) => {
                    return (
                      <CodeTab
                        value={sample}
                        label={
                          lang.samplesLabels
                            ? lang.samplesLabels[index]
                            : sample
                        }
                        key={`${lang.language}-${lang.sample}`}
                        attributes={{
                          className: `openapi-tabs__code-item--sample`,
                        }}
                      >
                        {/* @ts-ignore */}
                        <ApiCodeBlock
                          language={lang.highlight}
                          className="openapi-explorer__code-block"
                          showLineNumbers={true}
                        >
                          {codeSampleCodeText}
                        </ApiCodeBlock>
                      </CodeTab>
                    );
                  })}
                </CodeTabs>
              )}

              {/* Inner generated code snippets */}
              <CodeTabs
                className="openapi-tabs__code-container-inner"
                action={{
                  setLanguage: setLanguage,
                  setSelectedVariant: setSelectedVariant,
                }}
                includeVariant={true}
                currentLanguage={lang.language}
                defaultValue={selectedVariant}
                languageSet={mergedLangs}
                lazy
              >
                {lang.variants.map((variant, index) => {
                  return (
                    <CodeTab
                      value={variant.toLowerCase()}
                      label={variant.toUpperCase()}
                      key={`${lang.language}-${lang.variant}`}
                      attributes={{
                        className: `openapi-tabs__code-item--variant`,
                      }}
                    >
                      {/* @ts-ignore */}
                      <ApiCodeBlock
                        language={lang.highlight}
                        className="openapi-explorer__code-block"
                        showLineNumbers={true}
                      >
                        {codeText}
                      </ApiCodeBlock>
                    </CodeTab>
                  );
                })}
              </CodeTabs>
            </CodeTab>
          );
        })}
      </CodeTabs>
    </>
  );
}

export default CodeSnippets;
