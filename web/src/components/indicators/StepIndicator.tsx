import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type StepIndicatorProps = {
  steps: string[];
  currentStep: number;
  variant?: "default" | "dots";
  translationNameSpace?: string;
  className?: string;
};

export default function StepIndicator({
  steps,
  currentStep,
  variant = "default",
  translationNameSpace,
  className,
}: StepIndicatorProps) {
  const { t } = useTranslation(translationNameSpace);

  if (variant == "dots") {
    return (
      <div className={cn("flex flex-row justify-center gap-2", className)}>
        {steps.map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "size-3 rounded-full border border-primary/10 transition-colors",
              currentStep === idx
                ? "bg-selected"
                : currentStep > idx
                  ? "bg-muted-foreground"
                  : "bg-muted",
            )}
          />
        ))}
      </div>
    );
  }

  // Default variant (original behavior)
  return (
    <div className={cn("flex flex-row justify-evenly", className)}>
      {steps.map((name, idx) => (
        <div key={idx} className="flex flex-col items-center gap-2">
          <div
            className={cn(
              "flex size-16 items-center justify-center rounded-full",
              currentStep == idx ? "bg-selected" : "border-2 border-selected",
            )}
          >
            {idx + 1}
          </div>
          <div className="w-24 text-center md:w-24">{t(name)}</div>
        </div>
      ))}
    </div>
  );
}
