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
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Search</DialogTitle>
          <DialogDescription className="sr-only">
            Provide a name for this saved search.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          placeholder="Enter a name for your search"
        />
        <DialogFooter>
          <Button onClick={onClose} variant="select">
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
