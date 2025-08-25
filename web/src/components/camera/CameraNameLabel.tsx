import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { useCameraNickname } from "@/hooks/use-camera-nickname";
import { CameraConfig } from "@/types/frigateConfig";

interface CameraNameLabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  camera?: string | CameraConfig;
}

const CameraNameLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  CameraNameLabelProps
>(({ className, camera, ...props }, ref) => {
  const displayName = useCameraNickname(camera);
  return (
    <LabelPrimitive.Root ref={ref} className={className} {...props}>
      {displayName}
    </LabelPrimitive.Root>
  );
});
CameraNameLabel.displayName = LabelPrimitive.Root.displayName;

export { CameraNameLabel };
