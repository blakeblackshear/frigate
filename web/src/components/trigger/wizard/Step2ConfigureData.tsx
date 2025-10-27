import { useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ImagePicker from "@/components/overlay/ImagePicker";
import { TriggerType } from "@/types/trigger";

export type Step2FormData = {
  data: string;
};

type Step2ConfigureDataProps = {
  initialData?: Step2FormData;
  triggerType: TriggerType;
  selectedCamera: string;
  onNext: (data: Step2FormData) => void;
  onBack: () => void;
};

export default function Step2ConfigureData({
  initialData,
  triggerType,
  selectedCamera,
  onNext,
  onBack,
}: Step2ConfigureDataProps) {
  const { t } = useTranslation("views/settings");

  const formSchema = z.object({
    data: z.string().min(1, t("triggers.dialog.form.content.error.required")),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      data: initialData?.data ?? "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onNext({
      data: values.data,
    });
  };

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="data"
          render={({ field }) => (
            <FormItem>
              {triggerType === "thumbnail" ? (
                <>
                  <FormLabel className="font-normal">
                    {t("triggers.dialog.form.content.imagePlaceholder")}
                  </FormLabel>
                  <FormControl>
                    <ImagePicker
                      selectedImageId={field.value}
                      setSelectedImageId={field.onChange}
                      camera={selectedCamera}
                      direct
                      className="max-h-[50dvh] overflow-y-auto rounded-lg border p-4"
                    />
                  </FormControl>
                  <FormDescription>
                    {t("triggers.dialog.form.content.imageDesc")}
                  </FormDescription>
                </>
              ) : (
                <>
                  <FormControl>
                    <Textarea
                      placeholder={t(
                        "triggers.dialog.form.content.textPlaceholder",
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("triggers.dialog.form.content.textDesc")}
                  </FormDescription>
                </>
              )}

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
