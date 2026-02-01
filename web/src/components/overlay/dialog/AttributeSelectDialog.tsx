import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { isDesktop } from "react-device-detect";
import { useTranslation } from "react-i18next";

type AttributeSelectDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  title: string;
  description: string;
  onSave: (selectedAttributes: string[]) => void;
  selectedAttributes: Record<string, string | null>; // model -> selected attribute
  modelAttributes: Record<string, string[]>; // model -> available attributes
  className?: string;
};

export default function AttributeSelectDialog({
  open,
  setOpen,
  title,
  description,
  onSave,
  selectedAttributes,
  modelAttributes,
  className,
}: AttributeSelectDialogProps) {
  const { t } = useTranslation();
  const [internalSelection, setInternalSelection] = useState<
    Record<string, string | null>
  >({});

  useEffect(() => {
    if (open) {
      setInternalSelection({ ...selectedAttributes });
    }
  }, [open, selectedAttributes]);

  const handleSave = useCallback(() => {
    // Convert from model->attribute map to flat list of attributes
    const attributes = Object.values(internalSelection).filter(
      (attr): attr is string => attr !== null,
    );
    onSave(attributes);
  }, [internalSelection, onSave]);

  const handleToggle = useCallback((modelName: string, attribute: string) => {
    setInternalSelection((prev) => {
      const currentSelection = prev[modelName];
      // If clicking the currently selected attribute, deselect it
      if (currentSelection === attribute) {
        return { ...prev, [modelName]: null };
      }
      // Otherwise, select this attribute for this model
      return { ...prev, [modelName]: attribute };
    });
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className={cn(className, isDesktop ? "max-w-md" : "max-w-[90%]")}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="scrollbar-container overflow-y-auto">
          <div className="max-h-[80dvh] space-y-6 py-2">
            {Object.entries(modelAttributes).map(([modelName, attributes]) => (
              <div key={modelName} className="space-y-3">
                <div className="text-sm font-semibold text-primary-variant">
                  {modelName}
                </div>
                <div className="space-y-2 pl-2">
                  {attributes.map((attribute) => (
                    <div
                      key={attribute}
                      className="flex items-center justify-between gap-2"
                    >
                      <Label
                        htmlFor={`${modelName}-${attribute}`}
                        className="cursor-pointer text-sm text-primary"
                      >
                        {attribute}
                      </Label>
                      <Switch
                        id={`${modelName}-${attribute}`}
                        checked={internalSelection[modelName] === attribute}
                        onCheckedChange={() =>
                          handleToggle(modelName, attribute)
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => setOpen(false)}>
            {t("button.cancel")}
          </Button>
          <Button variant="select" onClick={handleSave}>
            {t("button.save", { ns: "common" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
