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
import { useState } from "react";
import { isMobile } from "react-device-detect";
import { useTranslation } from "react-i18next";
import FilterSwitch from "@/components/filter/FilterSwitch";

type MultiSelectDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  setOpen: (open: boolean) => void;
  onSave: (selectedItems: string[]) => void;
  selectedItems: string[];
  availableItems: string[];
  allowEmpty?: boolean;
};

export default function MultiSelectDialog({
  open,
  title,
  description,
  setOpen,
  onSave,
  selectedItems = [],
  availableItems = [],
  allowEmpty = false,
}: MultiSelectDialogProps) {
  const { t } = useTranslation("common");
  const [internalSelection, setInternalSelection] =
    useState<string[]>(selectedItems);

  // Reset internal selection when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setInternalSelection(selectedItems);
    }
    setOpen(isOpen);
  };

  const toggleItem = (item: string) => {
    setInternalSelection((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  };

  const handleSave = () => {
    if (!allowEmpty && internalSelection.length === 0) {
      return;
    }
    onSave(internalSelection);
    setOpen(false);
  };

  return (
    <Dialog open={open} defaultOpen={false} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="max-h-[80dvh] space-y-3 overflow-y-auto py-4">
          {availableItems.map((item) => (
            <FilterSwitch
              key={item}
              label={item}
              isChecked={internalSelection.includes(item)}
              onCheckedChange={() => toggleItem(item)}
            />
          ))}
        </div>
        <DialogFooter className={cn("pt-4", isMobile && "gap-2")}>
          <Button type="button" onClick={() => setOpen(false)}>
            {t("button.cancel")}
          </Button>
          <Button
            variant="select"
            type="button"
            onClick={handleSave}
            disabled={!allowEmpty && internalSelection.length === 0}
          >
            {t("button.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
