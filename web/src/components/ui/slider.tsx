import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className,
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

const VolumeSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className,
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-muted">
      <SliderPrimitive.Range className="absolute h-full bg-white" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-3 w-3 rounded-full bg-white ring-white focus:ring-white disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
VolumeSlider.displayName = SliderPrimitive.Root.displayName;

const NoThumbSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className,
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full">
      <SliderPrimitive.Range className="absolute h-full bg-selected" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-16 rounded-full bg-transparent -translate-y-[50%] ring-offset-transparent focus-visible:outline-none focus-visible:ring-transparent disabled:pointer-events-none disabled:opacity-50 cursor-col-resize" />
  </SliderPrimitive.Root>
));
NoThumbSlider.displayName = SliderPrimitive.Root.displayName;

const DualThumbSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className,
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-selected/60">
      <SliderPrimitive.Range className="absolute h-full bg-selected" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block size-3 rounded-full bg-selected transition-colors cursor-col-resize disabled:pointer-events-none disabled:opacity-50" />
    <SliderPrimitive.Thumb className="block size-3 rounded-full bg-selected transition-colors cursor-col-resize disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
DualThumbSlider.displayName = SliderPrimitive.Root.displayName;

export { DualThumbSlider, Slider, NoThumbSlider, VolumeSlider };
