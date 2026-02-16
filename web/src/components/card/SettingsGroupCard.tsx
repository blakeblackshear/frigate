import { ReactNode } from "react";
import { Label } from "../ui/label";

export const SPLIT_ROW_CLASS_NAME =
  "space-y-2 md:grid md:grid-cols-[minmax(14rem,24rem)_minmax(0,1fr)] md:items-start md:gap-x-6 md:space-y-0";
export const DESCRIPTION_CLASS_NAME = "text-sm text-muted-foreground";
export const CONTROL_COLUMN_CLASS_NAME = "w-full md:max-w-2xl";

type SettingsGroupCardProps = {
  title: string | ReactNode;
  children: ReactNode;
};

export function SettingsGroupCard({ title, children }: SettingsGroupCardProps) {
  return (
    <div className="space-y-4 rounded-lg border border-border/70 bg-card/30 p-4">
      <div className="text-md border-b border-border/60 pb-4 font-semibold text-primary-variant">
        {title}
      </div>
      {children}
    </div>
  );
}

type SplitCardRowProps = {
  label: ReactNode;
  description?: ReactNode;
  content: ReactNode;
};

export function SplitCardRow({
  label,
  description,
  content,
}: SplitCardRowProps) {
  return (
    <div className={SPLIT_ROW_CLASS_NAME}>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <div className={`hidden md:block ${DESCRIPTION_CLASS_NAME}`}>
            {description}
          </div>
        )}
      </div>
      <div className={`${CONTROL_COLUMN_CLASS_NAME} space-y-1.5`}>
        {content}
        {description && (
          <div className={`md:hidden ${DESCRIPTION_CLASS_NAME}`}>
            {description}
          </div>
        )}
      </div>
    </div>
  );
}
