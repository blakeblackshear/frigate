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
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Trans } from "react-i18next";
import { t } from "i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Shield, User } from "lucide-react";
import { LuCheck, LuX } from "react-icons/lu";

type CreateUserOverlayProps = {
  show: boolean;
  onCreate: (user: string, password: string, role: "admin" | "viewer") => void;
  onCancel: () => void;
};

export default function CreateUserDialog({
  show,
  onCreate,
  onCancel,
}: CreateUserOverlayProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const formSchema = z
    .object({
      user: z
        .string()
        .min(
          1,
          t("users.dialog.form.usernameIsRequired", {
            ns: "views/settings",
          }),
        )
        .regex(/^[A-Za-z0-9._]+$/, {
          message: t("users.dialog.createUser.usernameOnlyInclude", {
            ns: "views/settings",
          }),
        }),
      password: z.string().min(1, "Password is required"),
      confirmPassword: z.string().min(1, "Please confirm your password"),
      role: z.enum(["admin", "viewer"]),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("users.dialog.form.password.notMatch", {
        ns: "views/settings",
      }),
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

  useEffect(() => {
    if (!show) {
      form.reset({
        user: "",
        password: "",
        role: "viewer",
      });
    }
  }, [show, form]);

  const handleCancel = () => {
    form.reset({
      user: "",
      password: "",
      role: "viewer",
    });
    onCancel();
  };

  return (
    <Dialog open={show} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            <Trans ns="views/settings">users.dialog.createUser.title</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans ns="views/settings">users.dialog.createUser.desc</Trans>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5 py-4"
          >
            <FormField
              name="user"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    <Trans ns="views/settings">users.dialog.form.user</Trans>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("users.dialog.form.user.placeholder", {
                        ns: "views/settings",
                      })}
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground">
                    <Trans ns="views/settings">
                      users.dialog.form.user.desc
                    </Trans>
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
                    <Trans ns="views/settings">
                      users.dialog.form.password
                    </Trans>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("users.dialog.form.password.placeholder", {
                        ns: "views/settings",
                      })}
                      type="password"
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    <Trans ns="views/settings">
                      users.dialog.form.password.confirm
                    </Trans>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t(
                        "users.dialog.form.password.confirm.placeholder",
                        { ns: "views/settings" },
                      )}
                      type="password"
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  {showMatchIndicator && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs">
                      {passwordsMatch ? (
                        <>
                          <LuCheck className="size-3.5 text-green-500" />
                          <span className="text-green-600">
                            <Trans ns="views/settings">
                              users.dialog.form.password.match
                            </Trans>
                          </span>
                        </>
                      ) : (
                        <>
                          <LuX className="size-3.5 text-red-500" />
                          <span className="text-red-600">
                            <Trans ns="views/settings">
                              users.dialog.form.password.notMatch
                            </Trans>
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
                    <Trans>role.title</Trans>
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
                      <SelectItem
                        value="admin"
                        className="flex items-center gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          <span>
                            <Trans>role.admin</Trans>
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem
                        value="viewer"
                        className="flex items-center gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>
                            <Trans>role.viewer</Trans>
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs text-muted-foreground">
                    <Trans>role.desc</Trans>
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
                    aria-label="Cancel"
                    disabled={isLoading}
                    onClick={handleCancel}
                    type="button"
                  >
                    <Trans>button.cancel</Trans>
                  </Button>
                  <Button
                    variant="select"
                    aria-label="Save"
                    disabled={isLoading || !form.formState.isValid}
                    className="flex flex-1"
                    type="submit"
                  >
                    {isLoading ? (
                      <div className="flex flex-row items-center gap-2">
                        <ActivityIndicator />
                        <span>
                          <Trans>button.saving</Trans>
                        </span>
                      </div>
                    ) : (
                      <Trans>button.save</Trans>
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
