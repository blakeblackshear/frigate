// Description Field Template
import type { DescriptionFieldProps } from "@rjsf/utils";
import { useTranslation } from "react-i18next";
import { ConfigFormContext } from "@/types/configForm";

export function DescriptionFieldTemplate(props: DescriptionFieldProps) {
  const { description, id } = props;
  const formContext = (
    props as { registry?: { formContext?: ConfigFormContext } }
  ).registry?.formContext;

  const isCameraLevel = formContext?.level === "camera";
  const sectionI18nPrefix = formContext?.sectionI18nPrefix;
  const i18nNamespace = formContext?.i18nNamespace;
  const effectiveNamespace = isCameraLevel ? "config/cameras" : i18nNamespace;

  const { t, i18n } = useTranslation([
    effectiveNamespace || i18nNamespace || "common",
    i18nNamespace || "common",
  ]);

  let resolvedDescription = description;

  // Support nested keys for both camera-level and consolidated global namespace
  if (sectionI18nPrefix && effectiveNamespace) {
    const descriptionKey = `${sectionI18nPrefix}.description`;
    if (i18n.exists(descriptionKey, { ns: effectiveNamespace })) {
      resolvedDescription = t(descriptionKey, { ns: effectiveNamespace });
    }
  }

  if (!resolvedDescription) {
    return null;
  }

  return (
    <p id={id} className="text-sm text-muted-foreground">
      {resolvedDescription}
    </p>
  );
}
