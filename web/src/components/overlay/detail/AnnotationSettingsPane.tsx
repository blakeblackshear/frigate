import Heading from "@/components/ui/heading";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Event } from "@/types/event";
import { FrigateConfig } from "@/types/frigateConfig";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { LuExternalLink } from "react-icons/lu";
import { PiWarningCircle } from "react-icons/pi";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import useSWR from "swr";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Trans, useTranslation } from "react-i18next";

type AnnotationSettingsPaneProps = {
  event: Event;
  showZones: boolean;
  setShowZones: React.Dispatch<React.SetStateAction<boolean>>;
  annotationOffset: number;
  setAnnotationOffset: React.Dispatch<React.SetStateAction<number>>;
};
export function AnnotationSettingsPane({
  event,
  showZones,
  setShowZones,
  annotationOffset,
  setAnnotationOffset,
}: AnnotationSettingsPaneProps) {
  const { t } = useTranslation(["views/explore"]);

  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");

  const [isLoading, setIsLoading] = useState(false);

  const formSchema = z.object({
    annotationOffset: z.coerce.number().optional().or(z.literal("")),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      annotationOffset: annotationOffset,
    },
  });

  const saveToConfig = useCallback(
    async (annotation_offset: number | string) => {
      if (!config || !event) {
        return;
      }

      axios
        .put(
          `config/set?cameras.${event?.camera}.detect.annotation_offset=${annotation_offset}`,
          {
            requires_restart: 0,
          },
        )
        .then((res) => {
          if (res.status === 200) {
            toast.success(
              `Annotation offset for ${event?.camera} has been saved to the config file. Restart Frigate to apply your changes.`,
              {
                position: "top-center",
              },
            );
            updateConfig();
          } else {
            toast.error(
              t("toast.save.error", {
                errorMessage: res.statusText,
                ns: "common",
              }),
              {
                position: "top-center",
              },
            );
          }
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          toast.error(t("toast.save.error", { errorMessage, ns: "common" }), {
            position: "top-center",
          });
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [updateConfig, config, event, t],
  );

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!values || values.annotationOffset == null || !config) {
      return;
    }
    setIsLoading(true);

    saveToConfig(values.annotationOffset);
  }

  function onApply(values: z.infer<typeof formSchema>) {
    if (
      !values ||
      values.annotationOffset === null ||
      values.annotationOffset === "" ||
      !config
    ) {
      return;
    }
    setAnnotationOffset(values.annotationOffset ?? 0);
  }

  return (
    <div className="mb-3 space-y-3 rounded-lg border border-secondary-foreground bg-background_alt p-2">
      <Heading as="h4" className="my-2">
        {t("objectLifecycle.annotationSettings.title")}
      </Heading>
      <div className="flex flex-col">
        <div className="flex flex-row items-center justify-start gap-2 p-3">
          <Switch
            id="show-zones"
            checked={showZones}
            onCheckedChange={setShowZones}
          />
          <Label className="cursor-pointer" htmlFor="show-zones">
            {t("objectLifecycle.annotationSettings.showAllZones")}
          </Label>
        </div>
        <div className="text-sm text-muted-foreground">
          {t("objectLifecycle.annotationSettings.showAllZones.desc")}
        </div>
      </div>
      <Separator className="my-2 flex bg-secondary" />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-1 flex-col space-y-6"
        >
          <FormField
            control={form.control}
            name="annotationOffset"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("objectLifecycle.annotationSettings.offset.label")}
                </FormLabel>
                <div className="flex flex-col gap-3 md:flex-row-reverse md:gap-8">
                  <div className="flex flex-row items-center gap-3 rounded-lg bg-destructive/50 p-3 text-sm text-primary-variant md:my-0 md:my-5">
                    <PiWarningCircle className="size-24" />
                    <div>
                      <Trans ns="views/explore">
                        objectLifecycle.annotationSettings.offset.desc
                      </Trans>
                      <div className="mt-2 flex items-center text-primary">
                        <Link
                          to="https://docs.frigate.video/configuration/reference"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline"
                        >
                          {t(
                            "objectLifecycle.annotationSettings.offset.documentation",
                          )}
                          <LuExternalLink className="ml-2 inline-flex size-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <FormControl>
                      <Input
                        className="text-md w-full border border-input bg-background p-2 hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
                        placeholder="0"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        "objectLifecycle.annotationSettings.offset.millisecondsToOffset",
                      )}
                      <div className="mt-2">
                        {t("objectLifecycle.annotationSettings.offset.tips")}
                      </div>
                    </FormDescription>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-1 flex-col justify-end">
            <div className="flex flex-row gap-2 pt-5">
              <Button
                className="flex flex-1"
                aria-label={t("button.apply", { ns: "common" })}
                onClick={form.handleSubmit(onApply)}
              >
                {t("button.apply", { ns: "common" })}
              </Button>
              <Button
                variant="select"
                aria-label={t("button.save", { ns: "common" })}
                disabled={isLoading}
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
        </form>
      </Form>
    </div>
  );
}
