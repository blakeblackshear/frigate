import { Button } from "../ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import ActivityIndicator from "../indicators/activity-indicator";
import { useEffect, useState, useMemo } from "react";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Shield, User } from "lucide-react";
import { LuCheck, LuX, LuEye, LuEyeOff } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { isDesktop, isMobile } from "react-device-detect";
import { cn } from "@/lib/utils";
import { FrigateConfig } from "@/types/frigateConfig";
import {
  calculatePasswordStrength,
  getPasswordRequirements,
  getPasswordStrengthLabel,
  getPasswordStrengthColor,
} from "@/utils/passwordUtil";
import {
  MobilePage,
  MobilePageContent,
  MobilePageDescription,
  MobilePageHeader,
  MobilePageTitle,
} from "../mobile/MobilePage";

type CreateUserOverlayProps = {
  show: boolean;
  onCreate: (user: string, password: string, role: string) => void;
  onCancel: () => void;
};

export default function CreateUserDialog({
  show,
  onCreate,
  onCancel,
}: CreateUserOverlayProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const { t } = useTranslation(["views/settings"]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPasswordVisible, setShowPasswordVisible] =
    useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);

  const roles = useMemo(() => {
    const existingRoles = config ? Object.keys(config.auth?.roles || {}) : [];
    return Array.from(new Set(["admin", "viewer", ...(existingRoles || [])]));
  }, [config]);

  const formSchema = z
    .object({
      user: z
        .string()
        .min(1, t("users.dialog.form.usernameIsRequired"))
        .regex(/^[A-Za-z0-9._]+$/, {
          message: t("users.dialog.createUser.usernameOnlyInclude"),
        }),
      password: z
        .string()
        .min(12, t("users.dialog.form.password.requirements.length")),
      confirmPassword: z
        .string()
        .min(1, t("users.dialog.createUser.confirmPassword")),
      role: z.string().min(1),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("users.dialog.form.password.notMatch"),
      path: ["confirmPassword"],
    });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      user: "",
      password: "",
      confirmPassword: "",
      role: "viewer",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    await onCreate(values.user, values.password, values.role);
    form.reset();
    setIsLoading(false);
  };

  // Check if passwords match for real-time feedback
  const password = form.watch("password");
  const confirmPassword = form.watch("confirmPassword");
  const passwordsMatch = password === confirmPassword;
  const showMatchIndicator = password && confirmPassword;

  // Password strength calculation
  const passwordStrength = useMemo(
    () => calculatePasswordStrength(password),
    [password],
  );

  const requirements = useMemo(
    () => getPasswordRequirements(password),
    [password],
  );

  useEffect(() => {
    if (!show) {
      form.reset({
        user: "",
        password: "",
        confirmPassword: "",
        role: "viewer",
      });
      setShowPasswordVisible(false);
      setShowConfirmPassword(false);
    }
  }, [show, form]);

  const handleCancel = () => {
    form.reset({
      user: "",
      password: "",
      confirmPassword: "",
      role: "viewer",
    });
    setShowPasswordVisible(false);
    setShowConfirmPassword(false);
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
          <Title>{t("users.dialog.createUser.title")}</Title>
          <Description className={cn(!isDesktop && "sr-only")}>
            {t("users.dialog.createUser.desc")}
          </Description>
        </Header>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5 pt-4"
          >
            <FormField
              name="user"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    {t("users.dialog.form.user.title")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("users.dialog.form.user.placeholder")}
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground">
                    {t("users.dialog.form.user.desc")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    {t("users.dialog.form.password.title")}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder={t(
                          "users.dialog.form.password.placeholder",
                        )}
                        type={showPasswordVisible ? "text" : "password"}
                        className="h-10 pr-10"
                        {...field}
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
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    {t("users.dialog.form.password.confirm.title")}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder={t(
                          "users.dialog.form.password.confirm.placeholder",
                        )}
                        type={showConfirmPassword ? "text" : "password"}
                        className="h-10 pr-10"
                        {...field}
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
                  {showMatchIndicator && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs">
                      {passwordsMatch ? (
                        <>
                          <LuCheck className="size-3.5 text-green-500" />
                          <span className="text-green-600">
                            {t("users.dialog.form.password.match")}
                          </span>
                        </>
                      ) : (
                        <>
                          <LuX className="size-3.5 text-red-500" />
                          <span className="text-red-600">
                            {t("users.dialog.form.password.notMatch")}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    {t("role.title", { ns: "common" })}
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem
                          value={r}
                          key={r}
                          className="flex items-center gap-2"
                        >
                          <div className="flex items-center gap-2">
                            {r === "admin" ? (
                              <Shield className="h-4 w-4 text-primary" />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span>{t(`role.${r}`, { ns: "common" }) || r}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs text-muted-foreground">
                    {t("role.desc", { ns: "common" })}
                  </FormDescription>
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
      </Content>
    </Overlay>
  );
}
