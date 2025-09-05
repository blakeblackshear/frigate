import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { useCameraFriendlyName } from "@/hooks/use-camera-friendly-name";
import { CameraConfig } from "@/types/frigateConfig";

interface CameraNameLabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  camera?: string | CameraConfig;
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

export { CameraNameLabel };
