import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type StepIndicatorProps = {
  steps: string[];
  currentStep: number;
  variant?: "default" | "dots";
  translationNameSpace?: string;
};

export default function StepIndicator({
  steps,
  currentStep,
  variant = "default",
  translationNameSpace,
}: StepIndicatorProps) {
  const { t } = useTranslation(translationNameSpace);

  if (variant == "dots") {
    return (
      <div className="flex flex-row justify-center gap-2">
        {steps.map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "size-2 rounded-full transition-colors",
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
    <div className="flex flex-row justify-evenly">
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
