import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CustomClassificationModelConfig,
  FrigateConfig,
} from "@/types/frigateConfig";
import { ClassificationDatasetResponse } from "@/types/classification";
import { getTranslatedLabel } from "@/utils/i18n";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { LuPlus, LuX } from "react-icons/lu";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import { z } from "zod";

type ClassificationModelEditDialogProps = {
  open: boolean;
  model: CustomClassificationModelConfig;
  onClose: () => void;
  onSuccess: () => void;
};

type ObjectClassificationType = "sub_label" | "attribute";

type ObjectFormData = {
  objectLabel: string;
  objectType: ObjectClassificationType;
};

type StateFormData = {
  classes: string[];
};

export default function ClassificationModelEditDialog({
  open,
  model,
  onClose,
  onSuccess,
}: ClassificationModelEditDialogProps) {
  const { t } = useTranslation(["views/classificationModel"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const [isSaving, setIsSaving] = useState(false);

  const isStateModel = model.state_config !== undefined;
  const isObjectModel = model.object_config !== undefined;

  const objectLabels = useMemo(() => {
    if (!config) return [];

    const labels = new Set<string>();

    Object.values(config.cameras).forEach((cameraConfig) => {
      if (!cameraConfig.enabled || !cameraConfig.enabled_in_config) {
        return;
      }

      cameraConfig.objects.track.forEach((label) => {
        if (!config.model.all_attributes.includes(label)) {
          labels.add(label);
        }
      });
    });

    return [...labels].sort();
  }, [config]);

  // Define form schema based on model type
  const formSchema = useMemo(() => {
    if (isObjectModel) {
      return z.object({
        objectLabel: z
          .string()
          .min(1, t("wizard.step1.errors.objectLabelRequired")),
        objectType: z.enum(["sub_label", "attribute"]),
      });
    } else {
      // State model
      return z.object({
        classes: z
          .array(z.string())
          .min(1, t("wizard.step1.errors.classRequired"))
          .refine(
            (classes) => {
              const nonEmpty = classes.filter((c) => c.trim().length > 0);
              return nonEmpty.length >= 2;
            },
            { message: t("wizard.step1.errors.stateRequiresTwoClasses") },
          )
          .refine(
            (classes) => {
              const nonEmpty = classes.filter((c) => c.trim().length > 0);
              const unique = new Set(nonEmpty.map((c) => c.toLowerCase()));
              return unique.size === nonEmpty.length;
            },
            { message: t("wizard.step1.errors.classesUnique") },
          ),
      });
    }
  }, [isObjectModel, t]);

  const form = useForm<ObjectFormData | StateFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: isObjectModel
      ? ({
          objectLabel: model.object_config?.objects?.[0] || "",
          objectType:
            (model.object_config
              ?.classification_type as ObjectClassificationType) || "sub_label",
        } as ObjectFormData)
      : ({
          classes: [""], // Will be populated from dataset
        } as StateFormData),
    mode: "onChange",
  });

  // Fetch dataset to get current classes for state models
  const { data: dataset, mutate: mutateDataset } =
    useSWR<ClassificationDatasetResponse>(
      isStateModel && open ? `classification/${model.name}/dataset` : null,
      { revalidateOnFocus: false },
    );

  useEffect(() => {
    if (open) {
      if (isObjectModel) {
        form.reset({
          objectLabel: model.object_config?.objects?.[0] || "",
          objectType:
            (model.object_config
              ?.classification_type as ObjectClassificationType) || "sub_label",
        } as ObjectFormData);
      } else {
        form.reset({
          classes: [""],
        } as StateFormData);
      }

      if (isStateModel) {
        mutateDataset();
      }
    }
  }, [open, isObjectModel, isStateModel, model, form, mutateDataset]);

  // Update form with classes from dataset when loaded
  useEffect(() => {
    if (isStateModel && open && dataset?.categories) {
      const classes = Object.keys(dataset.categories).filter(
        (key) => key !== "none",
      );
      if (classes.length > 0) {
        (form as ReturnType<typeof useForm<StateFormData>>).setValue(
          "classes",
          classes,
        );
      }
    }
  }, [dataset, isStateModel, open, form]);

  const watchedClasses = isStateModel
    ? (form as ReturnType<typeof useForm<StateFormData>>).watch("classes")
    : undefined;
  const watchedObjectType = isObjectModel
    ? (form as ReturnType<typeof useForm<ObjectFormData>>).watch("objectType")
    : undefined;

  const handleAddClass = useCallback(() => {
    const currentClasses = (
      form as ReturnType<typeof useForm<StateFormData>>
    ).getValues("classes");
    (form as ReturnType<typeof useForm<StateFormData>>).setValue(
      "classes",
      [...currentClasses, ""],
      {
        shouldValidate: true,
      },
    );
  }, [form]);

  const handleRemoveClass = useCallback(
    (index: number) => {
      const currentClasses = (
        form as ReturnType<typeof useForm<StateFormData>>
      ).getValues("classes");
      const newClasses = currentClasses.filter((_, i) => i !== index);

      // Ensure at least one field remains (even if empty)
      if (newClasses.length === 0) {
        (form as ReturnType<typeof useForm<StateFormData>>).setValue(
          "classes",
          [""],
          { shouldValidate: true },
        );
      } else {
        (form as ReturnType<typeof useForm<StateFormData>>).setValue(
          "classes",
          newClasses,
          { shouldValidate: true },
        );
      }
    },
    [form],
  );

  const onSubmit = useCallback(
    async (data: ObjectFormData | StateFormData) => {
      setIsSaving(true);
      try {
        if (isObjectModel) {
          const objectData = data as ObjectFormData;

          // Update the config
          await axios.put("/config/set", {
            requires_restart: 0,
            update_topic: `config/classification/custom/${model.name}`,
            config_data: {
              classification: {
                custom: {
                  [model.name]: {
                    enabled: model.enabled,
                    name: model.name,
                    threshold: model.threshold,
                    object_config: {
                      objects: [objectData.objectLabel],
                      classification_type: objectData.objectType,
                    },
                  },
                },
              },
            },
          });

          toast.success(t("toast.success.updatedModel"), {
            position: "top-center",
          });
        } else {
          const stateData = data as StateFormData;
          const newClasses = stateData.classes.filter(
            (c) => c.trim().length > 0,
          );
          const oldClasses = dataset?.categories
            ? Object.keys(dataset.categories).filter((key) => key !== "none")
            : [];

          const renameMap = new Map<string, string>();
          const maxLength = Math.max(oldClasses.length, newClasses.length);

          for (let i = 0; i < maxLength; i++) {
            const oldClass = oldClasses[i];
            const newClass = newClasses[i];

            if (oldClass && newClass && oldClass !== newClass) {
              renameMap.set(oldClass, newClass);
            }
          }

          const renamePromises = Array.from(renameMap.entries()).map(
            async ([oldName, newName]) => {
              try {
                await axios.put(
                  `/classification/${model.name}/dataset/${oldName}/rename`,
                  {
                    new_category: newName,
                  },
                );
              } catch (err) {
                const error = err as {
                  response?: { data?: { message?: string; detail?: string } };
                };
                const errorMessage =
                  error.response?.data?.message ||
                  error.response?.data?.detail ||
                  "Unknown error";
                throw new Error(
                  `Failed to rename ${oldName} to ${newName}: ${errorMessage}`,
                );
              }
            },
          );

          if (renamePromises.length > 0) {
            await Promise.all(renamePromises);
            await mutate(`classification/${model.name}/dataset`);
            toast.success(t("toast.success.updatedModel"), {
              position: "top-center",
            });
          } else {
            toast.info(t("edit.stateClassesInfo"), {
              position: "top-center",
            });
          }
        }

        onSuccess();
        onClose();
      } catch (err) {
        const error = err as {
          response?: { data?: { message?: string; detail?: string } };
          message?: string;
        };
        const errorMessage =
          error.message ||
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(t("toast.error.updateModelFailed", { errorMessage }), {
          position: "top-center",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [isObjectModel, model, dataset, t, onSuccess, onClose],
  );

  const handleCancel = useCallback(() => {
    form.reset();
    onClose();
  }, [form, onClose]);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("edit.title")}</DialogTitle>
          <DialogDescription>
            {isStateModel
              ? t("edit.descriptionState")
              : t("edit.descriptionObject")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {isObjectModel && (
                <>
                  <FormField
                    control={form.control}
                    name="objectLabel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-primary-variant">
                          {t("wizard.step1.objectLabel")}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-8">
                              <SelectValue
                                placeholder={t(
                                  "wizard.step1.objectLabelPlaceholder",
                                )}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {objectLabels.map((label) => (
                              <SelectItem
                                key={label}
                                value={label}
                                className="cursor-pointer hover:bg-secondary-highlight"
                              >
                                {getTranslatedLabel(label)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="objectType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-primary-variant">
                          {t("wizard.step1.classificationType")}
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col gap-4 pt-2"
                          >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem
                                className={
                                  watchedObjectType === "sub_label"
                                    ? "bg-selected from-selected/50 to-selected/90 text-selected"
                                    : "bg-secondary from-secondary/50 to-secondary/90 text-secondary"
                                }
                                id="sub_label"
                                value="sub_label"
                              />
                              <Label
                                className="cursor-pointer"
                                htmlFor="sub_label"
                              >
                                {t("wizard.step1.classificationSubLabel")}
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem
                                className={
                                  watchedObjectType === "attribute"
                                    ? "bg-selected from-selected/50 to-selected/90 text-selected"
                                    : "bg-secondary from-secondary/50 to-secondary/90 text-secondary"
                                }
                                id="attribute"
                                value="attribute"
                              />
                              <Label
                                className="cursor-pointer"
                                htmlFor="attribute"
                              >
                                {t("wizard.step1.classificationAttribute")}
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {isStateModel && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-primary-variant">
                      {t("wizard.step1.states")}
                    </FormLabel>
                    <Button
                      type="button"
                      variant="secondary"
                      className="size-6 rounded-md bg-secondary-foreground p-1 text-background"
                      onClick={handleAddClass}
                    >
                      <LuPlus />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {watchedClasses?.map((_: string, index: number) => (
                      <FormField
                        key={index}
                        control={
                          (form as ReturnType<typeof useForm<StateFormData>>)
                            .control
                        }
                        name={`classes.${index}` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="flex items-center gap-2">
                                <Input
                                  className="text-md h-8"
                                  placeholder={t(
                                    "wizard.step1.classPlaceholder",
                                  )}
                                  {...field}
                                />
                                {watchedClasses &&
                                  watchedClasses.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleRemoveClass(index)}
                                    >
                                      <LuX className="size-4" />
                                    </Button>
                                  )}
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  {isStateModel &&
                    "classes" in form.formState.errors &&
                    form.formState.errors.classes && (
                      <p className="text-sm font-medium text-destructive">
                        {form.formState.errors.classes.message}
                      </p>
                    )}
                </div>
              )}

              <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:justify-end sm:gap-4">
                <Button
                  type="button"
                  onClick={handleCancel}
                  className="sm:flex-1"
                  disabled={isSaving}
                >
                  {t("button.cancel", { ns: "common" })}
                </Button>
                <Button
                  type="submit"
                  variant="select"
                  className="flex items-center justify-center gap-2 sm:flex-1"
                  disabled={!form.formState.isValid || isSaving}
                >
                  {isSaving
                    ? t("button.saving", { ns: "common" })
                    : t("button.save", { ns: "common" })}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
