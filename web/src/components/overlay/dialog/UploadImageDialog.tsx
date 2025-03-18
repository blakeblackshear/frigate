import ImageEntry from "@/components/input/ImageEntry";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

type UploadImageDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  setOpen: (open: boolean) => void;
  onSave: (file: File) => void;
};
export default function UploadImageDialog({
  open,
  title,
  description,
  setOpen,
  onSave,
}: UploadImageDialogProps) {
  const { t } = useTranslation("common");

  return (
    <Dialog open={open} defaultOpen={false} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <ImageEntry onSave={onSave}>
          <DialogFooter className="pt-4">
            <Button onClick={() => setOpen(false)}>{t("button.cancel")}</Button>
            <Button variant="select" type="submit">
              {t("button.save")}
            </Button>
          </DialogFooter>
        </ImageEntry>
      </DialogContent>
    </Dialog>
  );
}
