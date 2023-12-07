import { useState } from "react";
import ActivityIndicator from "@/components/ui/activity-indicator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDetectState } from "@/api/ws";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import Heading from "@/components/ui/heading";

export function Dashboard() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const [selectedCamera, setSelectedCamera] = useState<string | undefined>(
    undefined
  );

  let cameras;
  if (config?.cameras) {
    cameras = Object.keys(config.cameras).map((name) => (
      <div key={name}>
        <SelectItem value={name} onClick={() => setSelectedCamera(name)}>
          {name}
        </SelectItem>
      </div>
    ));
  }

  return (
    <>
      {!config && <ActivityIndicator />}

      <Heading as="h2">Components testing</Heading>

      <div className="flex items-center space-x-2 mt-5">
        <Select
          value={selectedCamera}
          onValueChange={(val) => setSelectedCamera(val as string)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Choose camera" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>{cameras}</SelectGroup>
          </SelectContent>
        </Select>
      </div>
      {selectedCamera && <Camera cameraName={selectedCamera} />}
    </>
  );
}

function Camera({ cameraName }: { cameraName: string }) {
  const { payload: detectValue, send: sendDetect } = useDetectState(cameraName);

  return (
    <>
      <Heading as="h3" className="mt-5">
        {cameraName}
      </Heading>
      <div className="flex items-center space-x-2 mt-5">
        <Switch
          id={`detect-${cameraName}`}
          checked={detectValue === "ON"}
          onCheckedChange={() =>
            sendDetect(detectValue === "ON" ? "OFF" : "ON", true)
          }
        />
        <Label htmlFor={`detect-${cameraName}`}>Detect</Label>
      </div>
    </>
  );
}

export default Dashboard;
