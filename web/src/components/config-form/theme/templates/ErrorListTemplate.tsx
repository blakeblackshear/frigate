// Error List Template - displays form-level errors
import type { ErrorListProps, RJSFValidationError } from "@rjsf/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LuCircleAlert } from "react-icons/lu";
import { useTranslation } from "react-i18next";

export function ErrorListTemplate(props: ErrorListProps) {
  const { errors } = props;
  const { t } = useTranslation(["common"]);

  if (!errors || errors.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <LuCircleAlert className="h-4 w-4" />
      <AlertTitle>{t("validation_errors", { ns: "common" })}</AlertTitle>
      <AlertDescription>
        <ul className="mt-2 list-inside list-disc space-y-1">
          {errors.map((error: RJSFValidationError, index: number) => (
            <li key={index} className="text-sm">
              {error.property && (
                <span className="font-medium">{error.property}: </span>
              )}
              {error.message}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
