import { cn } from "@/lib/utils";

type ImageShadowOverlayProps = {
  upperClassName?: string;
  lowerClassName?: string;
};
export function ImageShadowOverlay({
  upperClassName,
  lowerClassName,
}: ImageShadowOverlayProps) {
  return (
    <>
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 h-[30%] w-full rounded-lg bg-gradient-to-b to-transparent md:rounded-2xl",
          upperClassName,
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[10%] w-full rounded-lg bg-gradient-to-t to-transparent md:rounded-2xl",
          lowerClassName,
        )}
      />
    </>
  );
}
