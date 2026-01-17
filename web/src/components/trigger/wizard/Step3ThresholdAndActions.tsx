import { useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trigger, TriggerAction } from "@/types/trigger";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";

export type Step3FormData = {
  threshold: number;
  actions: TriggerAction[];
};

type Step3ThresholdAndActionsProps = {
  initialData?: Step3FormData;
  trigger?: Trigger | null;
  camera: string;
  onNext: (data: Step3FormData) => void;
  onBack: () => void;
  isLoading?: boolean;
};

export default function Step3ThresholdAndActions({
  initialData,
  trigger,
  camera,
  onNext,
  onBack,
  isLoading = false,
}: Step3ThresholdAndActionsProps) {
  const { t } = useTranslation("views/settings");
  const { data: config } = useSWR<FrigateConfig>("config");

  const availableActions = useMemo(() => {
    if (!config) return [];

    if (config.cameras[camera].notifications.enabled_in_config) {
      return ["notification", "sub_label", "attribute"];
    }
    return ["sub_label", "attribute"];
  }, [config, camera]);

  const formSchema = z.object({
    threshold: z
      .number()
      .min(0, t("triggers.dialog.form.threshold.error.min"))
      .max(1, t("triggers.dialog.form.threshold.error.max")),
    actions: z.array(z.enum(["notification", "sub_label", "attribute"])),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      threshold: initialData?.threshold ?? trigger?.threshold ?? 0.5,
      actions:
        initialData?.actions ?? (trigger?.actions as TriggerAction[]) ?? [],
    },
  });

  const onSubmit = useCallback(
    (values: z.infer<typeof formSchema>) => {
      onNext({
        threshold: values.threshold,
        actions: values.actions,
      });
    },
    [onNext],
  );

  const handleSave = useCallback(() => {
    const formData = form.getValues();
    // Basic validation
    if (formData.threshold < 0 || formData.threshold > 1) {
      return;
    }
    onNext(formData);
  }, [form, onNext]);

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    } else if (trigger) {
      form.reset({
        threshold: trigger.threshold,
        actions: trigger.actions,
      });
    }
  }, [initialData, trigger, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="threshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("triggers.dialog.form.threshold.title")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  placeholder="0.50"
                  className="h-10"
                  {...field}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    field.onChange(isNaN(value) ? 0 : value);
                  }}
                />
              </FormControl>
              <FormDescription>
                {t("triggers.dialog.form.threshold.desc")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="actions"
          render={() => (
            <FormItem>
              <FormLabel>{t("triggers.dialog.form.actions.title")}</FormLabel>
              <div className="space-y-2">
                {availableActions.map((action) => (
                  <label
                    key={action}
                    className="flex cursor-pointer items-center space-x-2"
                  >
                    <FormControl>
                      <Checkbox
                        checked={form
                          .watch("actions")
                          .includes(action as TriggerAction)}
                        onCheckedChange={(checked) => {
                          const currentActions = form.getValues("actions");
                          if (checked) {
                            form.setValue("actions", [
                              ...currentActions,
                              action as TriggerAction,
                            ]);
                          } else {
                            form.setValue(
                              "actions",
                              currentActions.filter((a) => a !== action),
                            );
                          }
                        }}
                      />
                    </FormControl>
                    <span className="text-sm font-normal">
                      {t(`triggers.actions.${action}`)}
                    </span>
                  </label>
                ))}
              </div>
              <FormDescription>
                {t("triggers.dialog.form.actions.desc")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="flex-1"
          >
            {t("button.back", { ns: "common" })}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1"
            variant="select"
          >
            {isLoading && <ActivityIndicator className="mr-2 size-5" />}
            {isLoading
              ? t("button.saving", { ns: "common" })
              : t("button.save", { ns: "common" })}
          </Button>
        </div>
      </form>
    </Form>
  );
}
