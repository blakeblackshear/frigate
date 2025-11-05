import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import useSWR from "swr";
import NameAndIdFields from "@/components/input/NameAndIdFields";
import { Form, FormDescription } from "@/components/ui/form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FrigateConfig } from "@/types/frigateConfig";
import { Trigger, TriggerType } from "@/types/trigger";

export type Step1FormData = {
  enabled: boolean;
  name: string;
  friendly_name: string;
  type: TriggerType;
};

type Step1NameAndTypeProps = {
  initialData?: Step1FormData;
  trigger?: Trigger | null;
  selectedCamera: string;
  onNext: (data: Step1FormData) => void;
  onCancel: () => void;
};

export default function Step1NameAndType({
  initialData,
  trigger,
  selectedCamera,
  onNext,
  onCancel,
}: Step1NameAndTypeProps) {
  const { t } = useTranslation("views/settings");
  const { data: config } = useSWR<FrigateConfig>("config");

  const existingTriggerNames = useMemo(() => {
    if (
      !config ||
      !selectedCamera ||
      !config.cameras[selectedCamera]?.semantic_search?.triggers
    ) {
      return [];
    }
    return Object.keys(config.cameras[selectedCamera].semantic_search.triggers);
  }, [config, selectedCamera]);

  const existingTriggerFriendlyNames = useMemo(() => {
    if (
      !config ||
      !selectedCamera ||
      !config.cameras[selectedCamera]?.semantic_search?.triggers
    ) {
      return [];
    }
    return Object.values(
      config.cameras[selectedCamera].semantic_search.triggers,
    ).map((trigger) => trigger.friendly_name);
  }, [config, selectedCamera]);

  const formSchema = z.object({
    enabled: z.boolean(),
    name: z
      .string()
      .min(2, t("triggers.dialog.form.name.error.minLength"))
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        t("triggers.dialog.form.name.error.invalidCharacters"),
      )
      .refine(
        (value) =>
          !existingTriggerNames.includes(value) || value === trigger?.name,
        t("triggers.dialog.form.name.error.alreadyExists"),
      ),
    friendly_name: z
      .string()
      .min(2, t("triggers.dialog.form.name.error.minLength"))
      .refine(
        (value) =>
          !existingTriggerFriendlyNames.includes(value) ||
          value === trigger?.friendly_name,
        t("triggers.dialog.form.name.error.alreadyExists"),
      ),
    type: z.enum(["description", "thumbnail"]),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      enabled: true,
      name: initialData?.name ?? trigger?.name ?? "",
      friendly_name: initialData?.friendly_name ?? trigger?.friendly_name ?? "",
      type: initialData?.type ?? trigger?.type ?? "description",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onNext({
      enabled: true,
      name: values.name,
      friendly_name: values.friendly_name || "",
      type: values.type,
    });
  };

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    } else if (trigger) {
      form.reset({
        enabled: trigger.enabled,
        name: trigger.name,
        friendly_name: trigger.friendly_name || "",
        type: trigger.type,
      });
    }
  }, [initialData, trigger, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <NameAndIdFields
          type="trigger"
          control={form.control}
          nameField="friendly_name"
          idField="name"
          nameLabel={t("triggers.dialog.form.name.title")}
          nameDescription={t("triggers.dialog.form.name.description")}
          placeholderName={t("triggers.dialog.form.name.placeholder")}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("triggers.dialog.form.type.title")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-10">
                    <SelectValue
                      placeholder={t("triggers.dialog.form.type.placeholder")}
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="description">
                    {t("triggers.type.description")}
                  </SelectItem>
                  <SelectItem value="thumbnail">
                    {t("triggers.type.thumbnail")}
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                {t("triggers.dialog.form.type.description")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            {t("button.cancel", { ns: "common" })}
          </Button>
          <Button
            type="submit"
            variant="select"
            disabled={!form.formState.isValid}
            className="flex-1"
          >
            {t("button.next", { ns: "common" })}
          </Button>
        </div>
      </form>
    </Form>
  );
}
