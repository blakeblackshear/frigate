// Error List Template - displays form-level errors
import type {
  ErrorListProps,
  RJSFSchema,
  RJSFValidationError,
} from "@rjsf/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LuCircleAlert } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { buildTranslationPath, humanizeKey } from "../utils";
import type { ConfigFormContext } from "@/types/configForm";

type ErrorSchemaNode = RJSFSchema & {
  properties?: Record<string, RJSFSchema>;
  items?: RJSFSchema | RJSFSchema[];
  additionalProperties?: boolean | RJSFSchema;
  title?: string;
};

const parsePropertyPath = (property: string): Array<string | number> => {
  const normalizedProperty = property.replace(/^\./, "").trim();
  if (!normalizedProperty) {
    return [];
  }

  return normalizedProperty
    .split(".")
    .filter(Boolean)
    .map((segment) => {
      const maybeIndex = Number(segment);
      return Number.isInteger(maybeIndex) ? maybeIndex : segment;
    });
};

const resolveSchemaNodeForPath = (
  schema: RJSFSchema | undefined,
  segments: Array<string | number>,
): ErrorSchemaNode | undefined => {
  if (!schema) {
    return undefined;
  }

  let currentSchema: ErrorSchemaNode | undefined = schema as ErrorSchemaNode;

  for (const segment of segments) {
    if (!currentSchema) {
      return undefined;
    }

    if (typeof segment === "number") {
      const items = currentSchema.items;
      if (Array.isArray(items)) {
        currentSchema = items[0] as ErrorSchemaNode | undefined;
      } else {
        currentSchema = items as ErrorSchemaNode | undefined;
      }
      continue;
    }

    const nextFromProperties = currentSchema.properties?.[segment];
    if (nextFromProperties) {
      currentSchema = nextFromProperties as ErrorSchemaNode;
      continue;
    }

    const additionalProperties = currentSchema.additionalProperties;
    if (
      additionalProperties &&
      typeof additionalProperties === "object" &&
      !Array.isArray(additionalProperties)
    ) {
      currentSchema = additionalProperties as ErrorSchemaNode;
      continue;
    }

    return undefined;
  }

  return currentSchema;
};

const resolveErrorFieldLabel = ({
  error,
  schema,
  formContext,
  t,
  i18n,
}: {
  error: RJSFValidationError;
  schema: RJSFSchema | undefined;
  formContext?: ConfigFormContext;
  t: (key: string, options?: Record<string, unknown>) => string;
  i18n: ReturnType<typeof useTranslation>["i18n"];
}): string | undefined => {
  const segments = parsePropertyPath(error.property || "");
  if (segments.length === 0) {
    return undefined;
  }

  const stringSegments = segments.filter(
    (segment): segment is string => typeof segment === "string",
  );

  const sectionI18nPrefix = formContext?.sectionI18nPrefix;
  const effectiveNamespace =
    formContext?.level === "camera"
      ? "config/cameras"
      : formContext?.i18nNamespace;

  const translationPath = buildTranslationPath(
    stringSegments,
    sectionI18nPrefix,
    formContext,
  );

  if (effectiveNamespace && translationPath) {
    const prefixedTranslationKey =
      sectionI18nPrefix && !translationPath.startsWith(`${sectionI18nPrefix}.`)
        ? `${sectionI18nPrefix}.${translationPath}.label`
        : undefined;
    const translationKey = `${translationPath}.label`;

    if (
      prefixedTranslationKey &&
      i18n.exists(prefixedTranslationKey, { ns: effectiveNamespace })
    ) {
      return t(prefixedTranslationKey, { ns: effectiveNamespace });
    }

    if (i18n.exists(translationKey, { ns: effectiveNamespace })) {
      return t(translationKey, { ns: effectiveNamespace });
    }
  }

  const schemaNode = resolveSchemaNodeForPath(schema, segments);
  if (schemaNode?.title && schemaNode.title.trim().length > 0) {
    return schemaNode.title;
  }

  const fallbackSegment =
    [...stringSegments].reverse().find((segment) => segment.length > 0) ||
    (typeof segments[segments.length - 1] === "string"
      ? (segments[segments.length - 1] as string)
      : undefined);

  return fallbackSegment ? humanizeKey(fallbackSegment) : undefined;
};

export function ErrorListTemplate(props: ErrorListProps) {
  const { errors, schema } = props;
  const formContext = (
    props as { registry?: { formContext?: ConfigFormContext } }
  ).registry?.formContext;
  const { t, i18n } = useTranslation([
    formContext?.level === "camera"
      ? "config/cameras"
      : formContext?.i18nNamespace || "config/global",
    "common",
  ]);

  if (!errors || errors.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <LuCircleAlert className="h-4 w-4" />
      <AlertTitle>{t("validation_errors", { ns: "common" })}</AlertTitle>
      <AlertDescription>
        <ul className="mt-2 list-inside list-disc space-y-1">
          {errors.map((error: RJSFValidationError, index: number) => {
            const fieldLabel = resolveErrorFieldLabel({
              error,
              schema,
              formContext,
              t,
              i18n,
            });

            return (
              <li key={index} className="text-sm">
                {fieldLabel && (
                  <span className="font-medium">{fieldLabel}: </span>
                )}
                {error.message}
              </li>
            );
          })}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
