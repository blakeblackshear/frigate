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
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { FrigateConfig } from "@/types/frigateConfig";
import { CameraNameLabel } from "../camera/FriendlyNameLabel";
import { isDesktop, isMobile } from "react-device-detect";
import { cn } from "@/lib/utils";
import {
  MobilePage,
  MobilePageContent,
  MobilePageDescription,
  MobilePageHeader,
  MobilePageTitle,
} from "../mobile/MobilePage";

type CreateRoleOverlayProps = {
  show: boolean;
  config: FrigateConfig;
  onCreate: (role: string, cameras: string[]) => void;
  onCancel: () => void;
};

export default function CreateRoleDialog({
  show,
  config,
  onCreate,
  onCancel,
}: CreateRoleOverlayProps) {
  const { t } = useTranslation(["views/settings"]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const cameras = Object.keys(config.cameras || {});

  const existingRoles = Object.keys(config.auth?.roles || {});

  const formSchema = z.object({
    role: z
      .string()
      .min(1, t("roles.dialog.form.role.roleIsRequired"))
      .regex(/^[A-Za-z0-9._]+$/, {
        message: t("roles.dialog.form.role.roleOnlyInclude"),
      })
      .refine((role) => !existingRoles.includes(role), {
        message: t("roles.dialog.form.role.roleExists"),
      }),
    cameras: z
      .array(z.string())
      .min(1, t("roles.dialog.form.cameras.required")),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      role: "",
      cameras: [],
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      await onCreate(values.role, values.cameras);
      form.reset();
    } catch (error) {
      // Error handled in parent
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!show) {
      form.reset({
        role: "",
        cameras: [],
      });
    }
  }, [show, form]);

  const handleCancel = () => {
    form.reset({
      role: "",
      cameras: [],
    });
    onCancel();
  };

  const Overlay = isDesktop ? Dialog : MobilePage;
  const Content = isDesktop ? DialogContent : MobilePageContent;
  const Header = isDesktop ? DialogHeader : MobilePageHeader;
  const Description = isDesktop ? DialogDescription : MobilePageDescription;
  const Title = isDesktop ? DialogTitle : MobilePageTitle;

  return (
    <Overlay open={show} onOpenChange={onCancel}>
      <Content
        className={cn(
          "scrollbar-container overflow-y-auto",
          isDesktop && "my-4 flex max-h-dvh flex-col sm:max-w-[425px]",
          isMobile && "px-4",
        )}
      >
        <Header className="mt-2" onClose={onCancel}>
          <Title>{t("roles.dialog.createRole.title")}</Title>
          <Description className={cn(!isDesktop && "sr-only")}>
            {t("roles.dialog.createRole.desc")}
          </Description>
        </Header>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5 pt-4"
          >
            <FormField
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    {t("roles.dialog.form.role.title")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("roles.dialog.form.role.placeholder")}
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground">
                    {t("roles.dialog.form.role.desc")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
      </Content>
    </Overlay>
  );
}
