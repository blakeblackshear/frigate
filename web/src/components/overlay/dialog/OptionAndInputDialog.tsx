import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { isMobile } from "react-device-detect";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

type Option = {
  value: string;
  label: string;
};

type OptionAndInputDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  options: Option[];
  newValueKey: string;
  initialValue?: string;
  nameLabel: string;
  descriptionLabel: string;
  setOpen: (open: boolean) => void;
  onSave: (value: string) => void;
  onCreateNew: (name: string, description: string) => void;
};

export default function OptionAndInputDialog({
  open,
  title,
  description,
  options,
  newValueKey,
  initialValue,
  nameLabel,
  descriptionLabel,
  setOpen,
  onSave,
  onCreateNew,
}: OptionAndInputDialogProps) {
  const { t } = useTranslation("common");
  const firstOption = useMemo(() => options[0]?.value, [options]);

  const [selectedValue, setSelectedValue] = useState<string | undefined>(
    initialValue ?? firstOption,
  );
  const [name, setName] = useState("");
  const [descriptionValue, setDescriptionValue] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedValue(initialValue ?? firstOption);
      setName("");
      setDescriptionValue("");
    }
  }, [open, initialValue, firstOption]);

  const isNew = selectedValue === newValueKey;
  const disableSave = !selectedValue || (isNew && name.trim().length === 0);

  const handleSave = () => {
    if (!selectedValue) {
      return;
    }

    const trimmedName = name.trim();
    const trimmedDescription = descriptionValue.trim();

    if (isNew) {
      onCreateNew(trimmedName, trimmedDescription);
    } else {
      onSave(selectedValue);
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} defaultOpen={false} onOpenChange={setOpen}>
      <DialogContent
        className={cn("space-y-4", isMobile && "px-4")}
        onOpenAutoFocus={(e) => {
          if (isMobile) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-2">
          <Select
            value={selectedValue}
            onValueChange={(val) => setSelectedValue(val)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isNew && (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-secondary-foreground">
                {nameLabel}
              </label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-secondary-foreground">
                {descriptionLabel}
              </label>
              <Input
                value={descriptionValue}
                onChange={(e) => setDescriptionValue(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter className={cn("pt-2", isMobile && "gap-2")}>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOpen(false);
            }}
          >
            {t("button.cancel")}
          </Button>
          <Button
            type="button"
            variant="select"
            disabled={disableSave}
            onClick={handleSave}
          >
            {t("button.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
