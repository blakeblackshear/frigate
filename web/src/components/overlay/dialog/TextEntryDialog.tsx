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
  allowEmpty?: boolean;
};

export default function TextEntryDialog({
  open,
  title,
  description,
  setOpen,
  onSave,
  defaultValue = "",
  allowEmpty = false,
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
          allowEmpty={allowEmpty}
          onSave={onSave}
        >
          <DialogFooter className={cn("pt-4", isMobile && "gap-2")}>
            <Button type="button" onClick={() => setOpen(false)}>
              {t("button.cancel")}
            </Button>
            <Button variant="select" type="submit">
              {t("button.save")}
            </Button>
          </DialogFooter>
        </TextEntry>
      </DialogContent>
    </Dialog>
  );
}
