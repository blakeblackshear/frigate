import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { useCameraNickname } from "@/hooks/use-camera-nickname";
import { CameraConfig } from "@/types/frigateConfig";

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
);

interface CameraNameLabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
    VariantProps<typeof labelVariants> {
  camera?: string | CameraConfig;
}

const CameraNameLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  CameraNameLabelProps
>(({ className, camera, ...props }, ref) => {
  const displayName = useCameraNickname(camera);
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(labelVariants(), className)}
      {...props}
    >
      {displayName}
    </LabelPrimitive.Root>
  );
});
CameraNameLabel.displayName = LabelPrimitive.Root.displayName;

export { CameraNameLabel };
