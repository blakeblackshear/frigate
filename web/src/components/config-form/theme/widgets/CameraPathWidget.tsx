import type { WidgetProps } from "@rjsf/utils";
import useSWR from "swr";
import { useMemo, useState, type FocusEvent } from "react";
import { useTranslation } from "react-i18next";
import { LuEye, LuEyeOff } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ConfigFormContext } from "@/types/configForm";
import { cn } from "@/lib/utils";
import { getSizedFieldClassName } from "../utils";

type RawPathsResponse = {
  cameras?: Record<
    string,
    {
      ffmpeg?: {
        inputs?: Array<{
          path?: string;
        }>;
      };
    }
  >;
};

const MASKED_AUTH_PATTERN = /:\/\/\*:\*@/i;
const MASKED_QUERY_PATTERN = /(?:[?&])user=\*&password=\*/i;

const getInputIndexFromWidgetId = (id: string): number | undefined => {
  const match = id.match(/_inputs_(\d+)_path$/);
  if (!match) {
    return undefined;
  }

  const index = Number(match[1]);
  return Number.isNaN(index) ? undefined : index;
};

const isMaskedPath = (value: string): boolean =>
  MASKED_AUTH_PATTERN.test(value) || MASKED_QUERY_PATTERN.test(value);

const hasCredentials = (value: string): boolean => {
  if (!value) {
    return false;
  }

  if (isMaskedPath(value)) {
    return true;
  }

  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password) {
      return true;
    }

    return (
      parsed.searchParams.has("user") && parsed.searchParams.has("password")
    );
  } catch {
    return /:\/\/[^:@/\s]+:[^@/\s]+@/.test(value);
  }
};

const maskCredentials = (value: string): string => {
  if (!value) {
    return value;
  }

  const maskedAuth = value.replace(/:\/\/[^:@/\s]+:[^@/\s]*@/g, "://*:*@");

  return maskedAuth
    .replace(/([?&]user=)[^&]*/gi, "$1*")
    .replace(/([?&]password=)[^&]*/gi, "$1*");
};

export function CameraPathWidget(props: WidgetProps) {
  const {
    id,
    value,
    disabled,
    readonly,
    onChange,
    onBlur,
    onFocus,
    placeholder,
    schema,
    options,
  } = props;

  const { t } = useTranslation(["common", "views/settings"]);
  const [showCredentials, setShowCredentials] = useState(false);

  const formContext = props.registry?.formContext as
    | ConfigFormContext
    | undefined;
  const isCameraLevel = formContext?.level === "camera";
  const cameraName = formContext?.cameraName;
  const inputIndex = useMemo(() => getInputIndexFromWidgetId(id), [id]);

  const shouldFetchRawPaths =
    isCameraLevel && !!cameraName && inputIndex !== undefined;
  const { data: rawPaths } = useSWR<RawPathsResponse>(
    shouldFetchRawPaths ? "config/raw_paths" : null,
  );

  const rawPath = useMemo(() => {
    if (!cameraName || inputIndex === undefined) {
      return undefined;
    }

    const path =
      rawPaths?.cameras?.[cameraName]?.ffmpeg?.inputs?.[inputIndex]?.path;
    return typeof path === "string" ? path : undefined;
  }, [cameraName, inputIndex, rawPaths]);

  const rawValue = typeof value === "string" ? value : "";
  const resolvedValue =
    isMaskedPath(rawValue) && rawPath ? rawPath : (rawValue ?? "");
  const canReveal =
    hasCredentials(resolvedValue) && !isMaskedPath(resolvedValue);
  const canToggle = canReveal || isMaskedPath(rawValue);

  const isMaskedView = canToggle && !showCredentials;
  const displayValue = isMaskedView
    ? maskCredentials(resolvedValue)
    : resolvedValue;

  const isNullable = Array.isArray(schema.type)
    ? schema.type.includes("null")
    : false;

  const fieldClassName = getSizedFieldClassName(options, "xs");
  const uriLabel = t("cameraWizard.step3.url", {
    ns: "views/settings",
    defaultValue: schema.title,
  });
  const toggleLabel = showCredentials
    ? t("label.hide", { ns: "common", item: uriLabel })
    : t("label.show", { ns: "common", item: uriLabel });

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    if (isMaskedView && canReveal) {
      setShowCredentials(true);
      onFocus(id, resolvedValue);
      return;
    }

    onFocus(id, event.target.value);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (canToggle) {
      setShowCredentials(false);
    }

    onBlur(id, event.target.value);
  };

  return (
    <div className={cn("relative", fieldClassName)}>
      <Input
        id={id}
        className={cn("text-md", canToggle ? "pr-10" : undefined)}
        type="text"
        value={displayValue}
        disabled={disabled || readonly}
        placeholder={placeholder || (options.placeholder as string) || ""}
        onChange={(e) =>
          onChange(
            e.target.value === ""
              ? isNullable
                ? null
                : undefined
              : e.target.value,
          )
        }
        onBlur={handleBlur}
        onFocus={handleFocus}
        aria-label={schema.title}
      />

      {canToggle ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          onClick={() => setShowCredentials((previous) => !previous)}
          disabled={disabled || (!canReveal && !showCredentials)}
          aria-label={toggleLabel}
          title={toggleLabel}
        >
          {showCredentials ? (
            <LuEyeOff className="h-4 w-4" />
          ) : (
            <LuEye className="h-4 w-4" />
          )}
        </Button>
      ) : null}
    </div>
  );
}
