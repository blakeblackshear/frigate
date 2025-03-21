import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { isMobile } from "react-device-detect";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

type SaveSearchDialogProps = {
  existingNames: string[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
};

export function SaveSearchDialog({
  existingNames,
  isOpen,
  onClose,
  onSave,
}: SaveSearchDialogProps) {
  const { t } = useTranslation(["components/dialog"]);

  const [searchName, setSearchName] = useState("");

  const handleSave = () => {
    if (searchName.trim()) {
      onSave(searchName.trim());
      setSearchName("");
      toast.success(
        t("search.saveSearch.success", {
          searchName: searchName.trim(),
        }),
        {
          position: "top-center",
        },
      );
      onClose();
    }
  };

  const overwrite = useMemo(
    () => existingNames.includes(searchName),
    [existingNames, searchName],
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        onOpenAutoFocus={(e) => {
          if (isMobile) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{t("search.saveSearch.label")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("search.saveSearch.desc")}
          </DialogDescription>
        </DialogHeader>
        <Input
          value={searchName}
          className="text-md"
          onChange={(e) => setSearchName(e.target.value)}
          placeholder={t("search.saveSearch.placeholder")}
        />
        {overwrite && (
          <div className="ml-1 text-sm text-danger">
            {t("search.saveSearch.overwrite", { searchName })}
          </div>
        )}
        <DialogFooter>
          <Button
            aria-label={t("button.cancel", { ns: "common" })}
            onClick={onClose}
          >
            {t("button.cancel", { ns: "common" })}
          </Button>
          <Button
            onClick={handleSave}
            variant="select"
            className="mb-2 md:mb-0"
            aria-label={t("search.saveSearch.button.save.label")}
          >
            {t("button.save", { ns: "common" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
