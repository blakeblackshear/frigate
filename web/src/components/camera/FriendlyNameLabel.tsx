import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { useCameraFriendlyName } from "@/hooks/use-camera-friendly-name";
import { CameraConfig } from "@/types/frigateConfig";
import { useZoneFriendlyName } from "@/hooks/use-zone-friendly-name";

interface CameraNameLabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  camera?: string | CameraConfig;
}

interface ZoneNameLabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  zone: string;
  camera?: string;
}

const CameraNameLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  CameraNameLabelProps
>(({ className, camera, ...props }, ref) => {
  const displayName = useCameraFriendlyName(camera);
  return (
    <LabelPrimitive.Root ref={ref} className={className} {...props}>
      {displayName}
    </LabelPrimitive.Root>
  );
});
CameraNameLabel.displayName = LabelPrimitive.Root.displayName;

const ZoneNameLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  ZoneNameLabelProps
>(({ className, zone, camera, ...props }, ref) => {
  const displayName = useZoneFriendlyName(zone, camera);
  return (
    <LabelPrimitive.Root ref={ref} className={className} {...props}>
      {displayName}
    </LabelPrimitive.Root>
  );
});
ZoneNameLabel.displayName = LabelPrimitive.Root.displayName;

export { CameraNameLabel, ZoneNameLabel };
