import Heading from "@/components/ui/heading";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect } from "react";

export default function General() {
  useEffect(() => {
    document.title = "General Settings - Frigate";
  }, []);

  return (
    <>
      <Heading as="h2">Settings</Heading>
      <div className="flex items-center space-x-2 mt-5">
        <Switch id="lowdata" checked={false} onCheckedChange={() => {}} />
        <Label htmlFor="lowdata">Low Data Mode (this device only)</Label>
      </div>
    </>
  );
}
