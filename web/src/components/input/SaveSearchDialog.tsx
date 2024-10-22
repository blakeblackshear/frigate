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
import { useState } from "react";
import { isMobile } from "react-device-detect";
import { toast } from "sonner";

type SaveSearchDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
};

export function SaveSearchDialog({
  isOpen,
  onClose,
  onSave,
}: SaveSearchDialogProps) {
  const [searchName, setSearchName] = useState("");

  const handleSave = () => {
    if (searchName.trim()) {
      onSave(searchName.trim());
      setSearchName("");
      toast.success(`Search (${searchName.trim()}) has been saved.`, {
        position: "top-center",
      });
      onClose();
    }
  };

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
          <DialogTitle>Save Search</DialogTitle>
          <DialogDescription className="sr-only">
            Provide a name for this saved search.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={searchName}
          className="text-md"
          onChange={(e) => setSearchName(e.target.value)}
          placeholder="Enter a name for your search"
        />
        <DialogFooter>
          <Button aria-label="Cancel" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="select"
            className="mb-2 md:mb-0"
            aria-label="Save this search"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
