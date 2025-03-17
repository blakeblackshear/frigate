import { cn } from "@/lib/utils";

type StepIndicatorProps = {
  steps: string[];
  currentStep: number;
};
export default function StepIndicator({
  steps,
  currentStep,
}: StepIndicatorProps) {
  return (
    <div className="flex flex-row justify-evenly">
      {steps.map((name, idx) => (
        <div className="flex flex-col items-center gap-2">
          <div
            className={cn(
              "flex size-16 items-center justify-center rounded-full",
              currentStep == idx ? "bg-selected" : "border-2 border-selected",
            )}
          >
            {idx + 1}
          </div>
          <div className="w-24 text-center md:w-24">{name}</div>
        </div>
      ))}
    </div>
  );
}
