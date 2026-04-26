import ActivityIndicator from "@/components/indicators/activity-indicator";
import TextEntry from "@/components/input/TextEntry";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { isMobile } from "react-device-detect";
import { useTranslation } from "react-i18next";

type TextEntryDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  setOpen: (open: boolean) => void;
  onSave: (text: string) => void;
  defaultValue?: string;
  placeholder?: string;
  allowEmpty?: boolean;
  isSaving?: boolean;
  regexPattern?: RegExp;
  regexErrorMessage?: string;
  forbiddenPattern?: RegExp;
  forbiddenErrorMessage?: string;
};

export default function TextEntryDialog({
  open,
  title,
  description,
  setOpen,
  onSave,
  defaultValue = "",
  placeholder,
  allowEmpty = false,
  isSaving = false,
  regexPattern,
  regexErrorMessage,
  forbiddenPattern,
  forbiddenErrorMessage,
}: TextEntryDialogProps) {
  const { t } = useTranslation("common");

  return (
    <Dialog open={open} defaultOpen={false} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <TextEntry
          defaultValue={defaultValue}
          placeholder={placeholder}
          allowEmpty={allowEmpty}
          onSave={onSave}
          regexPattern={regexPattern}
          regexErrorMessage={regexErrorMessage}
          forbiddenPattern={forbiddenPattern}
          forbiddenErrorMessage={forbiddenErrorMessage}
        >
          <DialogFooter className={cn("pt-4", isMobile && "gap-2")}>
            <Button
              type="button"
              disabled={isSaving}
              onClick={() => setOpen(false)}
            >
              {t("button.cancel")}
            </Button>
            <Button variant="select" type="submit" disabled={isSaving}>
              {isSaving ? (
                <div className="flex flex-row items-center gap-2">
                  <ActivityIndicator className="size-4" />
                  <span>{t("button.saving")}</span>
                </div>
              ) : (
                t("button.save")
              )}
            </Button>
          </DialogFooter>
        </TextEntry>
      </DialogContent>
    </Dialog>
  );
}
