import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { FrigateConfig } from "@/types/frigateConfig";
import ImagePicker from "@/components/overlay/ImagePicker";
import { Trigger, TriggerAction, TriggerType } from "@/types/trigger";

type CreateTriggerDialogProps = {
  show: boolean;
  trigger: Trigger | null;
  selectedCamera: string;
  onCreate: (
    name: string,
    type: TriggerType,
    data: string,
    threshold: number,
    actions: TriggerAction[],
  ) => void;
  onEdit: (trigger: Trigger) => void;
  onCancel: () => void;
};

export default function CreateTriggerDialog({
  show,
  trigger,
  selectedCamera,
  onCreate,
  onEdit,
  onCancel,
}: CreateTriggerDialogProps) {
  const { t } = useTranslation("views/settings");
  const [isLoading, setIsLoading] = useState(false);
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

  const formSchema = z.object({
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
    type: z.enum(["thumbnail", "description"]),
    data: z.string().min(1, t("triggers.dialog.form.content.error.required")),
    threshold: z
      .number()
      .min(0, t("triggers.dialog.form.threshold.error.min"))
      .max(1, t("triggers.dialog.form.threshold.error.max")),
    actions: z
      .array(z.enum(["alert", "notification"]))
      .min(1, t("triggers.dialog.form.actions.error.min")),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      name: trigger?.name ?? "",
      type: trigger?.type ?? "description",
      data: trigger?.data ?? "",
      threshold: trigger?.threshold ?? 0.5,
      actions: trigger?.actions ?? ["alert"],
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    if (trigger) {
      onEdit({ ...values });
    } else {
      onCreate(
        values.name,
        values.type,
        values.data,
        values.threshold,
        values.actions,
      );
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (!show) {
      form.reset({
        name: "",
        type: "description",
        data: "",
        threshold: 0.5,
        actions: ["alert"],
      });
    } else if (trigger) {
      form.reset({
        name: trigger.name,
        type: trigger.type,
        data: trigger.data,
        threshold: trigger.threshold,
        actions: trigger.actions,
      });
    }
  }, [show, trigger, form]);

  const handleCancel = () => {
    form.reset();
    onCancel();
  };

  return (
    <Dialog open={show} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {t(
              trigger
                ? "triggers.dialog.editTrigger.title"
                : "triggers.dialog.createTrigger.title",
            )}
          </DialogTitle>
          <DialogDescription>
            {t(
              trigger
                ? "triggers.dialog.editTrigger.desc"
                : "triggers.dialog.createTrigger.desc",
              { camera: selectedCamera },
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5 py-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("triggers.dialog.form.name.title")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("triggers.dialog.form.name.placeholder")}
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("triggers.dialog.form.type.title")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10">
                        <SelectValue
                          placeholder={t(
                            "triggers.dialog.form.type.placeholder",
                          )}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="thumbnail">
                        {t("triggers.type.thumbnail")}
                      </SelectItem>
                      <SelectItem value="description">
                        {t("triggers.type.description")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="data"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("triggers.dialog.form.content.title")}
                  </FormLabel>
                  {form.watch("type") === "thumbnail" ? (
                    <FormControl>
                      <ImagePicker
                        selectedImageId={field.value}
                        setSelectedImageId={field.onChange}
                        camera={selectedCamera}
                      />
                    </FormControl>
                  ) : (
                    <FormControl>
                      <Input
                        placeholder={t(
                          "triggers.dialog.form.content.textPlaceholder",
                        )}
                        className="h-10"
                        {...field}
                      />
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="threshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("triggers.dialog.form.threshold.title")}
                  </FormLabel>
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actions"
              render={() => (
                <FormItem>
                  <FormLabel>
                    {t("triggers.dialog.form.actions.title")}
                  </FormLabel>
                  <div className="space-y-2">
                    {["alert", "notification"].map((action) => (
                      <div key={action} className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={form
                              .watch("actions")
                              .includes(action as "alert" | "notification")}
                            onCheckedChange={(checked) => {
                              const currentActions = form.getValues("actions");
                              if (checked) {
                                form.setValue("actions", [
                                  ...currentActions,
                                  action as "alert" | "notification",
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
                        <FormLabel className="text-sm font-normal">
                          {t(`triggers.actions.${action}`)}
                        </FormLabel>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex gap-2 pt-2 sm:justify-end">
              <div className="flex flex-1 flex-col justify-end">
                <div className="flex flex-row gap-2 pt-5">
                  <Button
                    className="flex flex-1"
                    aria-label={t("button.cancel", { ns: "common" })}
                    disabled={isLoading}
                    onClick={handleCancel}
                    type="button"
                  >
                    {t("button.cancel", { ns: "common" })}
                  </Button>
                  <Button
                    variant="select"
                    aria-label={t("button.save", { ns: "common" })}
                    disabled={isLoading || !form.formState.isValid}
                    className="flex flex-1"
                    type="submit"
                  >
                    {isLoading ? (
                      <div className="flex flex-row items-center gap-2">
                        <ActivityIndicator />
                        <span>{t("button.saving", { ns: "common" })}</span>
                      </div>
                    ) : (
                      t("button.save", { ns: "common" })
                    )}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
