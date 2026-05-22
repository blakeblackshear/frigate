// Disables model_size and shows "N/A" when a GenAI provider is selected.
// Reads model via LiveFormDataContext so it re-runs even when RJSF's
// SchemaField memoization would skip this widget.
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

export function SemanticSearchModelSizeWidget(props: WidgetProps) {
  const { t } = useTranslation(["views/settings"]);
  const liveFormData = useContext(LiveFormDataContext);
  const model = liveFormData?.model;
  const isProvider =
    typeof model === "string" &&
    model !== "" &&
    model !== "jinav1" &&
    model !== "jinav2";

  // Clear model_size while on a provider (buildOverrides converts to ""
  // which the backend treats as "remove"). Restore the schema default
  // when returning to a Jina model so the field isn't left empty.
  const { value, onChange, schema } = props;
  const schemaDefault = schema?.default as string | undefined;
  useEffect(() => {
    if (isProvider && value !== undefined) {
      onChange(undefined);
    } else if (!isProvider && value === undefined && schemaDefault) {
      onChange(schemaDefault);
    }
  }, [isProvider, value, onChange, schemaDefault]);

  if (isProvider) {
    const fieldClassName = getSizedFieldClassName(props.options ?? {}, "sm");
    return (
      <Select value="" disabled>
        <SelectTrigger className={fieldClassName}>
          <SelectValue
            placeholder={t("configForm.semanticSearchModelSize.notApplicable", {
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
