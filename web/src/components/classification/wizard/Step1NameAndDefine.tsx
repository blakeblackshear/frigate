import { Button } from "@/components/ui/button";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { LuX, LuPlus, LuInfo, LuExternalLink } from "react-icons/lu";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { getTranslatedLabel } from "@/utils/i18n";
import { useDocDomain } from "@/hooks/use-doc-domain";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type ModelType = "state" | "object";
export type ObjectClassificationType = "sub_label" | "attribute";

export type Step1FormData = {
  modelName: string;
  modelType: ModelType;
  objectLabel?: string;
  objectType?: ObjectClassificationType;
  classes: string[];
};

type Step1NameAndDefineProps = {
  initialData?: Partial<Step1FormData>;
  defaultModelType?: "state" | "object";
  onNext: (data: Step1FormData) => void;
  onCancel: () => void;
};

export default function Step1NameAndDefine({
  initialData,
  defaultModelType,
  onNext,
  onCancel,
}: Step1NameAndDefineProps) {
  const { t } = useTranslation(["views/classificationModel"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const { getLocaleDocUrl } = useDocDomain();

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

  const step1FormData = z
    .object({
      modelName: z
        .string()
        .min(1, t("wizard.step1.errors.nameRequired"))
        .max(64, t("wizard.step1.errors.nameLength"))
        .refine((value) => !/^\d+$/.test(value), {
          message: t("wizard.step1.errors.nameOnlyNumbers"),
        }),
      modelType: z.enum(["state", "object"]),
      objectLabel: z.string().optional(),
      objectType: z.enum(["sub_label", "attribute"]).optional(),
      classes: z
        .array(
          z
            .string()
            .refine(
              (val) => val.trim().toLowerCase() !== "none",
              t("wizard.step1.errors.noneNotAllowed"),
            ),
        )
        .min(1, t("wizard.step1.errors.classRequired"))
        .refine(
          (classes) => {
            const nonEmpty = classes.filter((c) => c.trim().length > 0);
            return nonEmpty.length >= 1;
          },
          { message: t("wizard.step1.errors.classRequired") },
        )
        .refine(
          (classes) => {
            const nonEmpty = classes.filter((c) => c.trim().length > 0);
            const unique = new Set(nonEmpty.map((c) => c.toLowerCase()));
            return unique.size === nonEmpty.length;
          },
          { message: t("wizard.step1.errors.classesUnique") },
        ),
    })
    .refine(
      (data) => {
        // State models require at least 2 classes
        if (data.modelType === "state") {
          const nonEmpty = data.classes.filter((c) => c.trim().length > 0);
          return nonEmpty.length >= 2;
        }
        return true;
      },
      {
        message: t("wizard.step1.errors.stateRequiresTwoClasses"),
        path: ["classes"],
      },
    )
    .refine(
      (data) => {
        if (data.modelType === "object") {
          return data.objectLabel !== undefined && data.objectLabel !== "";
        }
        return true;
      },
      {
        message: t("wizard.step1.errors.objectLabelRequired"),
        path: ["objectLabel"],
      },
    )
    .refine(
      (data) => {
        if (data.modelType === "object") {
          return data.objectType !== undefined;
        }
        return true;
      },
      {
        message: t("wizard.step1.errors.objectTypeRequired"),
        path: ["objectType"],
      },
    );

  const form = useForm<z.infer<typeof step1FormData>>({
    resolver: zodResolver(step1FormData),
    defaultValues: {
      modelName: initialData?.modelName || "",
      modelType: initialData?.modelType || defaultModelType || "state",
      objectLabel: initialData?.objectLabel,
      objectType: initialData?.objectType || "sub_label",
      classes: initialData?.classes?.length ? initialData.classes : [""],
    },
    mode: "onChange",
  });

  const watchedClasses = form.watch("classes");
  const watchedModelType = form.watch("modelType");
  const watchedObjectType = form.watch("objectType");

  const handleAddClass = () => {
    const currentClasses = form.getValues("classes");
    form.setValue("classes", [...currentClasses, ""], { shouldValidate: true });
  };

  const handleRemoveClass = (index: number) => {
    const currentClasses = form.getValues("classes");
    const newClasses = currentClasses.filter((_, i) => i !== index);

    // Ensure at least one field remains (even if empty)
    if (newClasses.length === 0) {
      form.setValue("classes", [""], { shouldValidate: true });
    } else {
      form.setValue("classes", newClasses, { shouldValidate: true });
    }
  };

  const onSubmit = (data: z.infer<typeof step1FormData>) => {
    // Filter out empty classes
    const filteredClasses = data.classes.filter((c) => c.trim().length > 0);
    onNext({
      ...data,
      classes: filteredClasses,
    });
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="modelName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-primary-variant">
                  {t("wizard.step1.name")}
                </FormLabel>
                <FormControl>
                  <Input
                    className="text-md h-8"
                    placeholder={t("wizard.step1.namePlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="modelType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-primary-variant">
                  {t("wizard.step1.type")}
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
                          watchedModelType === "state"
                            ? "bg-selected from-selected/50 to-selected/90 text-selected"
                            : "bg-secondary from-secondary/50 to-secondary/90 text-secondary"
                        }
                        id="state"
                        value="state"
                      />
                      <Label className="cursor-pointer" htmlFor="state">
                        {t("wizard.step1.typeState")}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem
                        className={
                          watchedModelType === "object"
                            ? "bg-selected from-selected/50 to-selected/90 text-selected"
                            : "bg-secondary from-secondary/50 to-secondary/90 text-secondary"
                        }
                        id="object"
                        value="object"
                      />
                      <Label className="cursor-pointer" htmlFor="object">
                        {t("wizard.step1.typeObject")}
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {watchedModelType === "object" && (
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
                    <div className="flex items-center gap-1">
                      <FormLabel className="text-primary-variant">
                        {t("wizard.step1.classificationType")}
                      </FormLabel>
                      <Popover modal={true}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                          >
                            <LuInfo className="size-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="pointer-events-auto w-80 text-xs">
                          <div className="flex flex-col gap-2">
                            <div className="text-sm">
                              {t("wizard.step1.classificationTypeDesc")}
                            </div>
                            <div className="mt-3 flex items-center text-primary">
                              <a
                                href={getLocaleDocUrl(
                                  "configuration/custom_classification/object_classification#classification-type",
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline cursor-pointer"
                              >
                                {t("readTheDocumentation", { ns: "common" })}
                                <LuExternalLink className="ml-2 inline-flex size-3" />
                              </a>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
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
                          <Label className="cursor-pointer" htmlFor="sub_label">
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
                          <Label className="cursor-pointer" htmlFor="attribute">
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <FormLabel className="text-primary-variant">
                  {watchedModelType === "state"
                    ? t("wizard.step1.states")
                    : t("wizard.step1.classes")}
                </FormLabel>
                <Popover modal={true}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                      <LuInfo className="size-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="pointer-events-auto w-80 text-xs">
                    <div className="flex flex-col gap-2">
                      <div className="text-sm">
                        {watchedModelType === "state"
                          ? t("wizard.step1.classesStateDesc")
                          : t("wizard.step1.classesObjectDesc")}
                      </div>
                      <div className="mt-3 flex items-center text-primary">
                        <a
                          href={getLocaleDocUrl(
                            watchedModelType === "state"
                              ? "configuration/custom_classification/state_classification"
                              : "configuration/custom_classification/object_classification",
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline cursor-pointer"
                        >
                          {t("readTheDocumentation", { ns: "common" })}
                          <LuExternalLink className="ml-2 inline-flex size-3" />
                        </a>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
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
              {watchedClasses.map((_, index) => (
                <FormField
                  key={index}
                  control={form.control}
                  name={`classes.${index}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input
                            className="text-md h-8"
                            placeholder={t("wizard.step1.classPlaceholder")}
                            {...field}
                          />
                          {watchedClasses.length > 1 && (
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            {form.formState.errors.classes && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.classes.message}
              </p>
            )}
          </div>
        </form>
      </Form>

      <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:justify-end sm:gap-4">
        <Button type="button" onClick={onCancel} className="sm:flex-1">
          {t("button.cancel", { ns: "common" })}
        </Button>
        <Button
          type="button"
          onClick={form.handleSubmit(onSubmit)}
          variant="select"
          className="flex items-center justify-center gap-2 sm:flex-1"
          disabled={!form.formState.isValid}
        >
          {t("button.continue", { ns: "common" })}
        </Button>
      </div>
    </div>
  );
}
