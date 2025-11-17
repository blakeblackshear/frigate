import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Trans, useTranslation } from "react-i18next";
import { FrigateConfig } from "@/types/frigateConfig";
import { CameraNameLabel } from "@/components/camera/FriendlyNameLabel";

type EditRoleCamerasOverlayProps = {
  show: boolean;
  config: FrigateConfig;
  role: string;
  currentCameras: string[];
  onSave: (cameras: string[]) => void;
  onCancel: () => void;
};

export default function EditRoleCamerasDialog({
  show,
  config,
  role,
  currentCameras,
  onSave,
  onCancel,
}: EditRoleCamerasOverlayProps) {
  const { t } = useTranslation(["views/settings"]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const cameras = Object.keys(config.cameras || {});

  const formSchema = z.object({
    cameras: z
      .array(z.string())
      .min(1, t("roles.dialog.form.cameras.required")),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      cameras: currentCameras,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      await onSave(values.cameras);
      form.reset();
    } catch (error) {
      // Error handled in parent
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    form.reset({
      cameras: currentCameras,
    });
    onCancel();
  };

  return (
    <Dialog open={show} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {t("roles.dialog.editCameras.title", { role })}
          </DialogTitle>
          <DialogDescription>
            <Trans
              ns={"views/settings"}
              values={{ role }}
              components={{ strong: <span className="font-medium" /> }}
            >
              roles.dialog.editCameras.desc
            </Trans>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5 pt-4"
          >
            <div className="space-y-2">
              <FormLabel>{t("roles.dialog.form.cameras.title")}</FormLabel>
              <FormDescription className="text-xs text-muted-foreground">
                {t("roles.dialog.form.cameras.desc")}
              </FormDescription>
              <div className="scrollbar-container max-h-[40dvh] space-y-2 overflow-y-auto">
                {cameras.map((camera) => (
                  <FormField
                    key={camera}
                    control={form.control}
                    name="cameras"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={camera}
                          className="flex flex-row items-center justify-between space-x-3 space-y-0"
                        >
                          <div className="space-y-0.5">
                            <FormLabel className="font-normal">
                              <CameraNameLabel
                                className="mx-2 w-full cursor-pointer text-primary smart-capitalize"
                                htmlFor={camera.replaceAll("_", " ")}
                                camera={camera}
                              />
                            </FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value?.includes(camera)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([
                                      ...(field.value as string[]),
                                      camera,
                                    ])
                                  : field.onChange(
                                      (field.value as string[])?.filter(
                                        (value: string) => value !== camera,
                                      ) || [],
                                    );
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </div>

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
