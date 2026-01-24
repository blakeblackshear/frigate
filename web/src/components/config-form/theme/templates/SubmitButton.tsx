// Submit Button Template
import type { SubmitButtonProps } from "@rjsf/utils";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { LuSave } from "react-icons/lu";

export function SubmitButton(props: SubmitButtonProps) {
  const { uiSchema } = props;
  const { t } = useTranslation(["common"]);

  const shouldHide = uiSchema?.["ui:submitButtonOptions"]?.norender === true;

  if (shouldHide) {
    return null;
  }

  const submitText =
    (uiSchema?.["ui:options"]?.submitText as string) ||
    t("save", { ns: "common" });

  return (
    <Button type="submit" className="gap-2">
      <LuSave className="h-4 w-4" />
      {submitText}
    </Button>
  );
}
