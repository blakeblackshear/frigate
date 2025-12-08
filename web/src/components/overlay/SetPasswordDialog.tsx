import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

import { Label } from "../ui/label";
import { LuCheck, LuX, LuEye, LuEyeOff } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import ActivityIndicator from "../indicators/activity-indicator";

type SetPasswordProps = {
  show: boolean;
  onSave: (password: string, oldPassword?: string) => void;
  onCancel: () => void;
  onVerifyOldPassword?: (oldPassword: string) => Promise<boolean>;
  initialError?: string | null;
  username?: string;
};

export default function SetPasswordDialog({
  show,
  onSave,
  onCancel,
  onVerifyOldPassword,
  initialError,
  username,
}: SetPasswordProps) {
  const { t } = useTranslation(["views/settings"]);
  const [oldPassword, setOldPassword] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [passwordStrength, setPasswordStrength] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isValidatingOldPassword, setIsValidatingOldPassword] =
    useState<boolean>(false);

  // visibility toggles for password fields
  const [showOldPassword, setShowOldPassword] = useState<boolean>(false);
  const [showPasswordVisible, setShowPasswordVisible] =
    useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);

  // Password strength requirements

  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    digit: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  // Reset state when dialog opens/closes

  useEffect(() => {
    if (show) {
      setOldPassword("");
      setPassword("");
      setConfirmPassword("");
      setError(initialError || null);
    }
  }, [show, initialError]);

  // Password strength calculation

  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }

    let strength = 0;
    if (requirements.length) strength += 1;
    if (requirements.digit) strength += 1;
    if (requirements.special) strength += 1;
    if (requirements.uppercase) strength += 1;

    setPasswordStrength(strength);
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password]);

  const handleSave = async () => {
    if (!password) {
      setError(t("users.dialog.passwordSetting.cannotBeEmpty"));
      return;
    }

    // Validate all requirements
    if (!requirements.length) {
      setError(t("users.dialog.form.password.requirements.length"));
      return;
    }
    if (!requirements.uppercase) {
      setError(t("users.dialog.form.password.requirements.uppercase"));
      return;
    }
    if (!requirements.digit) {
      setError(t("users.dialog.form.password.requirements.digit"));
      return;
    }
    if (!requirements.special) {
      setError(t("users.dialog.form.password.requirements.special"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("users.dialog.passwordSetting.doNotMatch"));
      return;
    }

    // Require old password when changing own password (username is provided)
    if (username && !oldPassword) {
      setError(t("users.dialog.passwordSetting.currentPasswordRequired"));
      return;
    }

    // Verify old password if callback is provided and old password is provided
    if (username && oldPassword && onVerifyOldPassword) {
      setIsValidatingOldPassword(true);
      try {
        const isValid = await onVerifyOldPassword(oldPassword);
        if (!isValid) {
          setError(t("users.dialog.passwordSetting.incorrectCurrentPassword"));
          setIsValidatingOldPassword(false);
          return;
        }
      } catch (err) {
        setError(t("users.dialog.passwordSetting.passwordVerificationFailed"));
        setIsValidatingOldPassword(false);
        return;
      }
      setIsValidatingOldPassword(false);
    }

    onSave(password, oldPassword || undefined);
  };

  const getStrengthLabel = () => {
    if (!password) return "";
    if (passwordStrength <= 1)
      return t("users.dialog.form.password.strength.weak");
    if (passwordStrength === 2)
      return t("users.dialog.form.password.strength.medium");
    if (passwordStrength === 3)
      return t("users.dialog.form.password.strength.strong");
    return t("users.dialog.form.password.strength.veryStrong");
  };

  const getStrengthColor = () => {
    if (!password) return "bg-gray-200";
    if (passwordStrength <= 1) return "bg-red-500";
    if (passwordStrength === 2) return "bg-yellow-500";
    if (passwordStrength === 3) return "bg-green-500";
    return "bg-green-600";
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
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {username && (
            <div className="space-y-2">
              <Label htmlFor="old-password">
                {t("users.dialog.form.currentPassword.title")}
              </Label>
              <div className="relative">
                <Input
                  id="old-password"
                  className="h-10 pr-10"
                  type={showOldPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(event) => {
                    setOldPassword(event.target.value);
                    setError(null);
                  }}
                  placeholder={t(
                    "users.dialog.form.currentPassword.placeholder",
                  )}
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
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">
              {t("users.dialog.form.newPassword.title")}
            </Label>
            <div className="relative">
              <Input
                id="password"
                className="h-10 pr-10"
                type={showPasswordVisible ? "text" : "password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError(null);
                }}
                placeholder={t("users.dialog.form.newPassword.placeholder")}
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
                onClick={() => setShowPasswordVisible(!showPasswordVisible)}
              >
                {showPasswordVisible ? (
                  <LuEyeOff className="size-4" />
                ) : (
                  <LuEye className="size-4" />
                )}
              </Button>
            </div>

            {password && (
              <div className="mt-2 space-y-2">
                <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-secondary-foreground">
                  <div
                    className={`${getStrengthColor()} transition-all duration-300`}
                    style={{ width: `${(passwordStrength / 4) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("users.dialog.form.password.strength.title")}
                  <span className="font-medium">{getStrengthLabel()}</span>
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
                        {t("users.dialog.form.password.requirements.length")}
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-xs">
                      {requirements.uppercase ? (
                        <LuCheck className="size-3.5 text-green-500" />
                      ) : (
                        <LuX className="size-3.5 text-red-500" />
                      )}
                      <span
                        className={
                          requirements.uppercase
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {t("users.dialog.form.password.requirements.uppercase")}
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-xs">
                      {requirements.digit ? (
                        <LuCheck className="size-3.5 text-green-500" />
                      ) : (
                        <LuX className="size-3.5 text-red-500" />
                      )}
                      <span
                        className={
                          requirements.digit ? "text-green-600" : "text-red-600"
                        }
                      >
                        {t("users.dialog.form.password.requirements.digit")}
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-xs">
                      {requirements.special ? (
                        <LuCheck className="size-3.5 text-green-500" />
                      ) : (
                        <LuX className="size-3.5 text-red-500" />
                      )}
                      <span
                        className={
                          requirements.special
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {t("users.dialog.form.password.requirements.special")}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">
              {t("users.dialog.form.password.confirm.title")}
            </Label>
            <div className="relative">
              <Input
                id="confirm-password"
                className="h-10 pr-10"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setError(null);
                }}
                placeholder={t(
                  "users.dialog.form.newPassword.confirm.placeholder",
                )}
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
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <LuEyeOff className="size-4" />
                ) : (
                  <LuEye className="size-4" />
                )}
              </Button>
            </div>

            {/* Password match indicator */}
            {password && confirmPassword && (
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                {password === confirmPassword ? (
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
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <div className="flex flex-1 flex-col justify-end">
            <div className="flex flex-row gap-2 pt-5">
              <Button
                className="flex flex-1"
                aria-label={t("button.cancel", { ns: "common" })}
                onClick={onCancel}
                type="button"
              >
                {t("button.cancel", { ns: "common" })}
              </Button>
              <Button
                variant="select"
                aria-label={t("button.save", { ns: "common" })}
                className="flex flex-1"
                onClick={handleSave}
                disabled={
                  isValidatingOldPassword ||
                  !password ||
                  password !== confirmPassword ||
                  (username && !oldPassword) ||
                  !requirements.length ||
                  !requirements.uppercase ||
                  !requirements.digit ||
                  !requirements.special
                }
              >
                {isValidatingOldPassword ? (
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
      </DialogContent>
    </Dialog>
  );
}
