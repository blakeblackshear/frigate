import { FaCog } from "react-icons/fa";

import { useState } from "react";
import { PlatformAwareSheet } from "./PlatformAwareDialog";
import { Button } from "@/components/ui/button";

type SearchFilterDialogProps = {};
export default function SearchFilterDialog({}: SearchFilterDialogProps) {
  const [open, setOpen] = useState(false);

  const trigger = (
    <Button className="flex items-center gap-2" size="sm">
      <FaCog className={"text-secondary-foreground"} />
      More Filters
    </Button>
  );
  const content = <></>;

  return (
    <PlatformAwareSheet
      trigger={trigger}
      content={content}
      contentClassName="w-auto"
      open={open}
      onOpenChange={setOpen}
    />
  );
}
