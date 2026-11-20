import { useState } from "react";
import useSWR from "swr";
import { useTranslation } from "react-i18next";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function AnalyticsPreview() {
  const { t } = useTranslation("views/settings");
  const [open, setOpen] = useState(false);

  // built on demand, since building runs every collector on the server
  const { data, error } = useSWR<Record<string, unknown>>(
    open ? "analytics/preview" : null,
    { revalidateOnFocus: false },
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-2">
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          {open ? (
            <LuChevronDown className="size-4" />
          ) : (
            <LuChevronRight className="size-4" />
          )}
          {t("analyticsPreview.show")}
        </Button>
      </CollapsibleTrigger>
      <div className="mt-1 text-xs text-muted-foreground">
        {t("analyticsPreview.desc")}
      </div>
      <CollapsibleContent className="mt-2">
        {error ? (
          <div className="text-sm text-danger">
            {t("analyticsPreview.error")}
          </div>
        ) : data ? (
          <pre
            data-testid="analytics-preview"
            className="max-h-96 overflow-auto rounded-md bg-secondary p-3 text-xs"
          >
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : (
          <ActivityIndicator className="size-5" />
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
