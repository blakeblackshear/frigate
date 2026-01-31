import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { LuCheck, LuX, LuEye, LuEyeOff, LuExternalLink } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { useDocDomain } from "@/hooks/use-doc-domain";
import useSWR from "swr";
import { formatSecondsToDuration } from "@/utils/dateUtil";
import { useDateLocale } from "@/hooks/use-date-locale";
import ActivityIndicator from "../indicators/activity-indicator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useIsAdmin } from "@/hooks/use-is-admin";
import {
  calculatePasswordStrength,
  getPasswordRequirements,
  getPasswordStrengthLabel,
  getPasswordStrengthColor,
} from "@/utils/passwordUtil";

type SetPasswordProps = {
  show: boolean;
  onSave: (password: string, oldPassword?: string) => void;
  onCancel: () => void;
  initialError?: string | null;
  username?: string;
  isLoading?: boolean;
};

export default function SetPasswordDialog({
  show,
  onSave,
  onCancel,
  initialError,
  username,
  isLoading = false,
}: SetPasswordProps) {
  const { t } = useTranslation(["views/settings", "common"]);
  const { getLocaleDocUrl } = useDocDomain();
  const isAdmin = useIsAdmin();
  const dateLocale = useDateLocale();

  const { data: config } = useSWR("config");
  const refreshSeconds: number | undefined =
    config?.auth?.refresh_time ?? undefined;
  const refreshTimeLabel = refreshSeconds
    ? formatSecondsToDuration(refreshSeconds, dateLocale)
    : t("time.30minutes", { ns: "common" });

  // visibility toggles for password fields
  const [showOldPassword, setShowOldPassword] = useState<boolean>(false);
  const [showPasswordVisible, setShowPasswordVisible] =
    useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);

  // Create form schema with conditional old password requirement
  const formSchema = useMemo(() => {
    const baseSchema = {
      password: z
        .string()
        .min(12, t("users.dialog.form.password.requirements.length")),
      confirmPassword: z.string(),
    };

    if (username) {
      return z
        .object({
          oldPassword: z
            .string()
            .min(1, t("users.dialog.passwordSetting.currentPasswordRequired")),
          ...baseSchema,
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t("users.dialog.passwordSetting.doNotMatch"),
          path: ["confirmPassword"],
        });
    } else {
      return z
        .object(baseSchema)
        .refine((data) => data.password === data.confirmPassword, {
          message: t("users.dialog.passwordSetting.doNotMatch"),
          path: ["confirmPassword"],
        });
    }
  }, [username, t]);

  type FormValues = z.infer<typeof formSchema>;

  const defaultValues = username
    ? {
        oldPassword: "",
        password: "",
        confirmPassword: "",
      }
    : {
        password: "",
        confirmPassword: "",
      };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: defaultValues as FormValues,
  });

  const password = form.watch("password");
  const confirmPassword = form.watch("confirmPassword");

  // Password strength calculation
  const passwordStrength = useMemo(
    () => calculatePasswordStrength(password),
    [password],
  );

  const requirements = useMemo(
    () => getPasswordRequirements(password),
    [password],
  );

  // Reset form and visibility toggles when dialog opens/closes
  useEffect(() => {
    if (show) {
      form.reset();
      setShowOldPassword(false);
      setShowPasswordVisible(false);
      setShowConfirmPassword(false);
    }
  }, [show, form]);

  // Handle backend errors
  useEffect(() => {
    if (show && initialError) {
      const errorMsg = String(initialError);
      // Check if the error is about incorrect current password
      if (
        errorMsg.toLowerCase().includes("current password is incorrect") ||
        errorMsg.toLowerCase().includes("current password incorrect")
      ) {
        if (username) {
          form.setError("oldPassword" as keyof FormValues, {
            type: "manual",
            message: t("users.dialog.passwordSetting.incorrectCurrentPassword"),
          });
        }
      } else {
        // For other errors, show as form-level error
        form.setError("root", {
          type: "manual",
          message: errorMsg,
        });
      }
    }
  }, [show, initialError, form, t, username]);

  const onSubmit = async (values: FormValues) => {
    const oldPassword =
      "oldPassword" in values
        ? (
            values as {
              oldPassword: string;
              password: string;
              confirmPassword: string;
            }
          ).oldPassword
        : undefined;
    onSave(values.password, oldPassword);
  };

  return (
    <Dialog open={show} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="space-y-2">
          <DialogTitle>
            {username
              ? t("users.dialog.passwordSetting.updatePassword", {
                  username,
                  ns: "views/settings",
                })
              : t("users.dialog.passwordSetting.setPassword")}
          </DialogTitle>
          <DialogDescription>
            {t("users.dialog.passwordSetting.desc")}
          </DialogDescription>

          <p className="text-sm text-muted-foreground">
            {t("users.dialog.passwordSetting.multiDeviceWarning", {
              refresh_time: refreshTimeLabel,
              ns: "views/settings",
            })}
          </p>
          {isAdmin && (
            <>
              <p className="text-sm text-muted-foreground">
                {t("users.dialog.passwordSetting.multiDeviceAdmin", {
                  ns: "views/settings",
                })}
              </p>
              <p className="text-sm text-primary-variant">
                <a
                  href={getLocaleDocUrl(
                    "configuration/authentication#jwt-token-secret",
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-primary"
                >
                  {t("readTheDocumentation", { ns: "common" })}
                  <LuExternalLink className="ml-2 size-3" />
                </a>
              </p>
            </>
          )}
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 pt-4"
          >
            {username && (
              <FormField
                control={form.control}
                name={"oldPassword" as keyof FormValues}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("users.dialog.form.currentPassword.title")}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showOldPassword ? "text" : "password"}
                          placeholder={t(
                            "users.dialog.form.currentPassword.placeholder",
                          )}
                          className="h-10 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          tabIndex={-1}
                          aria-label={
                            showOldPassword
                              ? t("users.dialog.form.password.hide", {
                                  ns: "views/settings",
                                })
                              : t("users.dialog.form.password.show", {
                                  ns: "views/settings",
                                })
                          }
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                        >
                          {showOldPassword ? (
                            <LuEyeOff className="size-4" />
                          ) : (
                            <LuEye className="size-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("users.dialog.form.newPassword.title")}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPasswordVisible ? "text" : "password"}
                        placeholder={t(
                          "users.dialog.form.newPassword.placeholder",
                        )}
                        className="h-10 pr-10"
                        autoFocus
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        tabIndex={-1}
                        aria-label={
                          showPasswordVisible
                            ? t("users.dialog.form.password.hide", {
                                ns: "views/settings",
                              })
                            : t("users.dialog.form.password.show", {
                                ns: "views/settings",
                              })
                        }
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() =>
                          setShowPasswordVisible(!showPasswordVisible)
                        }
                      >
                        {showPasswordVisible ? (
                          <LuEyeOff className="size-4" />
                        ) : (
                          <LuEye className="size-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>

                  {password && (
                    <div className="mt-2 space-y-2">
                      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-secondary-foreground">
                        <div
                          className={`${getPasswordStrengthColor(
                            password,
                          )} transition-all duration-300`}
                          style={{ width: `${passwordStrength * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("users.dialog.form.password.strength.title")}
                        <span className="font-medium">
                          {getPasswordStrengthLabel(password, t)}
                        </span>
                      </p>

                      <div className="space-y-1 rounded-md bg-muted/50 p-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          {t("users.dialog.form.password.requirements.title")}
                        </p>
                        <ul className="space-y-1">
                          <li className="flex items-center gap-2 text-xs">
                            {requirements.length ? (
                              <LuCheck className="size-3.5 text-green-500" />
                            ) : (
                              <LuX className="size-3.5 text-red-500" />
                            )}
                            <span
                              className={
                                requirements.length
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            >
                              {t(
                                "users.dialog.form.password.requirements.length",
                              )}
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("users.dialog.form.password.confirm.title")}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder={t(
                          "users.dialog.form.newPassword.confirm.placeholder",
                        )}
                        className="h-10 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        tabIndex={-1}
                        aria-label={
                          showConfirmPassword
                            ? t("users.dialog.form.password.hide", {
                                ns: "views/settings",
                              })
                            : t("users.dialog.form.password.show", {
                                ns: "views/settings",
                              })
                        }
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? (
                          <LuEyeOff className="size-4" />
                        ) : (
                          <LuEye className="size-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>

                  {password &&
                    confirmPassword &&
                    password === confirmPassword && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs">
                        <LuCheck className="size-3.5 text-green-500" />
                        <span className="text-green-600">
                          {t("users.dialog.form.password.match")}
                        </span>
                      </div>
                    )}

                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {form.formState.errors.root.message}
              </div>
            )}

            <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <div className="flex flex-1 flex-col justify-end">
                <div className="flex flex-row gap-2 pt-5">
                  <Button
                    className="flex flex-1"
                    aria-label={t("button.cancel", { ns: "common" })}
                    onClick={onCancel}
                    type="button"
                    disabled={isLoading}
                  >
                    {t("button.cancel", { ns: "common" })}
                  </Button>
                  <Button
                    variant="select"
                    aria-label={t("button.save", { ns: "common" })}
                    className="flex flex-1"
                    type="submit"
                    disabled={isLoading || !form.formState.isValid}
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
