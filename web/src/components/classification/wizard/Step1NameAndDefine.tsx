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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LuX } from "react-icons/lu";
import { MdAddBox } from "react-icons/md";

export type ModelType = "state" | "object";
export type ObjectClassificationType = "sub_label" | "attribute";

export type Step1FormData = {
  modelName: string;
  modelType: ModelType;
  objectType?: ObjectClassificationType;
  classes: string[];
};

type Step1NameAndDefineProps = {
  initialData?: Partial<Step1FormData>;
  onNext: (data: Step1FormData) => void;
  onCancel: () => void;
};

export default function Step1NameAndDefine({
  initialData,
  onNext,
  onCancel,
}: Step1NameAndDefineProps) {
  const step1FormData = z
    .object({
      modelName: z
        .string()
        .min(1, "Model name is required")
        .max(64, "Model name must be 64 characters or less")
        .refine((value) => !/^\d+$/.test(value), {
          message: "Model name cannot contain only numbers",
        }),
      modelType: z.enum(["state", "object"]),
      objectType: z.enum(["sub_label", "attribute"]).optional(),
      classes: z
        .array(z.string())
        .min(1, "At least one class field is required")
        .refine(
          (classes) => {
            const nonEmpty = classes.filter((c) => c.trim().length > 0);
            return nonEmpty.length >= 1;
          },
          { message: "At least 1 class is required" },
        )
        .refine(
          (classes) => {
            const nonEmpty = classes.filter((c) => c.trim().length > 0);
            const unique = new Set(nonEmpty.map((c) => c.toLowerCase()));
            return unique.size === nonEmpty.length;
          },
          { message: "Class names must be unique" },
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
        message: "State models require at least 2 classes",
        path: ["classes"],
      },
    )
    .refine(
      (data) => {
        // Object models require objectType to be selected
        if (data.modelType === "object") {
          return data.objectType !== undefined;
        }
        return true;
      },
      {
        message: "Please select a classification type",
        path: ["objectType"],
      },
    );

  const form = useForm<z.infer<typeof step1FormData>>({
    resolver: zodResolver(step1FormData),
    defaultValues: {
      modelName: initialData?.modelName || "",
      modelType: initialData?.modelType || "state",
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
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    className="h-8"
                    placeholder="Enter model name..."
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
                <FormLabel>Type</FormLabel>
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
                        State
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
                        Object
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {watchedModelType === "object" && (
            <FormField
              control={form.control}
              name="objectType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Classification Type</FormLabel>
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
                          Sub Label
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
                          Attribute
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FormLabel>Classes</FormLabel>
              <MdAddBox
                className="size-7 cursor-pointer text-primary hover:text-primary/80"
                onClick={handleAddClass}
              />
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
                            className="h-8"
                            placeholder="Enter class name..."
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
          Cancel
        </Button>
        <Button
          type="button"
          onClick={form.handleSubmit(onSubmit)}
          variant="select"
          className="flex items-center justify-center gap-2 sm:flex-1"
          disabled={!form.formState.isValid}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
