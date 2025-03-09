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
import { Trans } from "react-i18next";
import { t } from "i18next";

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
  const [searchName, setSearchName] = useState("");

  const handleSave = () => {
    if (searchName.trim()) {
      onSave(searchName.trim());
      setSearchName("");
      toast.success(
        t("search.saveSearch.success", {
          searchName: searchName.trim(),
          ns: "components/dialog"
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
          <DialogTitle>
            <Trans ns="components/dialog">search.saveSearch.label</Trans>
          </DialogTitle>
          <DialogDescription className="sr-only">
            <Trans ns="components/dialog">search.saveSearch.desc</Trans>
          </DialogDescription>
        </DialogHeader>
        <Input
          value={searchName}
          className="text-md"
          onChange={(e) => setSearchName(e.target.value)}
          placeholder={t("search.saveSearch.placeholder", {ns: "components/dialog"})}
        />
        {overwrite && (
          <div className="ml-1 text-sm text-danger">
            <Trans ns="components/dialog" values={{ searchName }}>
              search.saveSearch.overwrite
            </Trans>
          </div>
        )}
        <DialogFooter>
          <Button aria-label="Cancel" onClick={onClose}>
            <Trans>button.cancel</Trans>
          </Button>
          <Button
            onClick={handleSave}
            variant="select"
            className="mb-2 md:mb-0"
            aria-label="Save this search"
          >
            <Trans>button.save</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
