// Disables model_size and shows "N/A" when a GenAI provider is selected in the
// companion model field. Reads model via LiveFormDataContext so it re-runs even
// when RJSF's SchemaField memoization would skip this widget. The built-in model
// names and the i18n key prefix come from ui:options.
import type { WidgetProps } from "@rjsf/utils";
import { useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LiveFormDataContext } from "../../LiveFormDataContext";
import { getSizedFieldClassName } from "../utils";
import { SelectWidget } from "./SelectWidget";

export function GenAIBackedModelSizeWidget(props: WidgetProps) {
  const { t } = useTranslation(["views/settings"]);
  const liveFormData = useContext(LiveFormDataContext);
  const model = liveFormData?.model;

  const builtInModels = (props.options?.builtInModels as string[]) ?? [];
  const i18nPrefix =
    (props.options?.i18nPrefix as string | undefined) ??
    "semanticSearchModelSize";

  const isProvider =
    typeof model === "string" && model !== "" && !builtInModels.includes(model);

  // model_size is unused on a GenAI provider. Only clear it (which the backend
  // treats as "remove") for a non-default value, which can only come from the
  // config file. A defaulted value is indistinguishable from unset in the
  // resolved config, so clearing it would falsely dirty the field and delete a
  // YAML key that isn't there. Restore the default when returning to a built-in model.
  const { value, onChange, schema } = props;
  const schemaDefault = schema?.default as string | undefined;
  useEffect(() => {
    if (isProvider) {
      if (value !== undefined && value !== schemaDefault) {
        onChange(undefined);
      }
    } else if (value === undefined && schemaDefault) {
      onChange(schemaDefault);
    }
  }, [isProvider, value, onChange, schemaDefault]);

  if (isProvider) {
    const fieldClassName = getSizedFieldClassName(props.options ?? {}, "sm");
    return (
      <Select value="" disabled>
        <SelectTrigger className={fieldClassName}>
          <SelectValue
            placeholder={t(`configForm.${i18nPrefix}.notApplicable`, {
              defaultValue: "Not applicable for GenAI providers",
            })}
          />
        </SelectTrigger>
        <SelectContent />
      </Select>
    );
  }

  return <SelectWidget {...props} />;
}
