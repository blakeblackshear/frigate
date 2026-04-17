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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { cn } from "@/lib/utils";
import { isMobile } from "react-device-detect";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  onSave: (value: string) => Promise<void>;
  onCreateNew: (name: string, description: string) => Promise<void>;
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

  const [isLoading, setIsLoading] = useState(false);
  const isNew = selectedValue === newValueKey;
  const disableSave =
    !selectedValue || (isNew && name.trim().length === 0) || isLoading;

  const handleSave = useCallback(async () => {
    if (!selectedValue) {
      return;
    }

    const trimmedName = name.trim();
    const trimmedDescription = descriptionValue.trim();

    setIsLoading(true);
    try {
      if (isNew) {
        await onCreateNew(trimmedName, trimmedDescription);
      } else {
        await onSave(selectedValue);
      }
      setOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedValue,
    name,
    descriptionValue,
    isNew,
    onCreateNew,
    onSave,
    setOpen,
  ]);

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
              <Input
                className="text-md"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-secondary-foreground">
                {descriptionLabel}
              </label>
              <Textarea
                className="text-md"
                value={descriptionValue}
                onChange={(e) => setDescriptionValue(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter className={cn("pt-2", isMobile && "gap-2")}>
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
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
            onClick={() => void handleSave()}
          >
            {isLoading ? (
              <ActivityIndicator className="size-4" />
            ) : (
              t("button.save")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
