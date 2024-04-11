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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MotionTuner from "@/components/settings/MotionTuner";
import SettingsZones from "@/components/settings/Zones";

function General() {
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

export default function Settings() {
  return (
    <div className="w-full h-full">
      <div className="flex h-full">
        <div className="flex-1 content-start gap-2 overflow-y-auto no-scrollbar mt-4 mr-5">
          <Tabs defaultValue="general" className="w-auto">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="objects">Objects</TabsTrigger>
              <TabsTrigger value="zones">Zones</TabsTrigger>
              <TabsTrigger value="masks">Masks</TabsTrigger>
              <TabsTrigger value="motion">Motion</TabsTrigger>
            </TabsList>
            <TabsContent value="general">
              <General />
            </TabsContent>
            <TabsContent value="objects">Objects</TabsContent>
            <TabsContent value="zones">
              <SettingsZones />
            </TabsContent>
            <TabsContent value="masks">Masks</TabsContent>
            <TabsContent value="motion">
              <MotionTuner />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
