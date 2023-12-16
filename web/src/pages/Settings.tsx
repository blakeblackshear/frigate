import Heading from "@/components/ui/heading";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

function Settings() {
  return (
    <>
      <Heading as="h2">Settings</Heading>
      <div className="flex items-center space-x-2 mt-5">
        <Switch id="detect" checked={false} onCheckedChange={() => {}} />
        <Label htmlFor="detect">
          Always show PTZ controls for ONVIF cameras
        </Label>
      </div>

      <div className="flex items-center space-x-2 mt-5">
        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Default Live Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Live Mode</SelectLabel>
              <SelectItem value="jsmpeg">JSMpeg</SelectItem>
              <SelectItem value="mse">MSE</SelectItem>
              <SelectItem value="webrtc">WebRTC</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

export default Settings;
