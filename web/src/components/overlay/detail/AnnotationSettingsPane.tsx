import { Event } from "@/types/event";
import { FrigateConfig } from "@/types/frigateConfig";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { LuExternalLink } from "react-icons/lu";
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
import { useDocDomain } from "@/hooks/use-doc-domain";
import { useIsAdmin } from "@/hooks/use-is-admin";

type AnnotationSettingsPaneProps = {
  event: Event;
  annotationOffset: number;
  setAnnotationOffset: React.Dispatch<React.SetStateAction<number>>;
};
export function AnnotationSettingsPane({
  event,
  annotationOffset,
  setAnnotationOffset,
}: AnnotationSettingsPaneProps) {
  const { t } = useTranslation(["views/explore"]);
  const isAdmin = useIsAdmin();
  const { getLocaleDocUrl } = useDocDomain();

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
              t("trackingDetails.annotationSettings.offset.toast.success", {
                camera: event?.camera,
              }),
              {
                position: "top-center",
              },
            );
            updateConfig();
          } else {
            toast.error(
              t("toast.save.error.title", {
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
          toast.error(
            t("toast.save.error.title", { errorMessage, ns: "common" }),
            {
              position: "top-center",
            },
          );
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
    <div className="p-4">
      <div className="text-md mb-2">
        {t("trackingDetails.annotationSettings.title")}
      </div>

      <Separator className="mb-4 flex bg-secondary" />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-1 flex-col space-y-3"
        >
          <FormField
            control={form.control}
            name="annotationOffset"
            render={({ field }) => (
              <>
                <FormItem className="flex flex-row items-start justify-between space-x-2">
                  <div className="flex flex-col gap-1">
                    <FormLabel>
                      {t("trackingDetails.annotationSettings.offset.label")}
                    </FormLabel>
                    <FormDescription>
                      <Trans ns="views/explore">
                        trackingDetails.annotationSettings.offset.millisecondsToOffset
                      </Trans>
                      <FormMessage />
                    </FormDescription>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="min-w-24">
                      <FormControl>
                        <Input
                          className="text-md w-full border border-input bg-background p-2 text-center hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                    </div>
                  </div>
                </FormItem>
                <div className="mt-1 text-sm text-secondary-foreground">
                  {t("trackingDetails.annotationSettings.offset.tips")}
                  <div className="mt-2 flex items-center text-primary-variant">
                    <Link
                      to={getLocaleDocUrl("configuration/reference")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline"
                    >
                      {t("readTheDocumentation", { ns: "common" })}
                      <LuExternalLink className="ml-2 inline-flex size-3" />
                    </Link>
                  </div>
                </div>
              </>
            )}
          />

          <div className="flex flex-1 flex-col justify-end">
            <div className="flex flex-row gap-2 pt-5">
              <Button
                className="flex flex-1"
                variant="default"
                aria-label={t("button.apply", { ns: "common" })}
                type="button"
                onClick={form.handleSubmit(onApply)}
              >
                {t("button.apply", { ns: "common" })}
              </Button>
              {isAdmin && (
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
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
