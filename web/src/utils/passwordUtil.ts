import { TFunction } from "i18next";

export const calculatePasswordStrength = (password: string): number => {
  if (!password) return 0;

  let strength = 0;
  if (password.length >= 12) strength += 1;
  if (/\d/.test(password)) strength += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;

  return strength;
};

export const getPasswordRequirements = (password: string) => ({
  length: password?.length >= 12,
  uppercase: /[A-Z]/.test(password),
  digit: /\d/.test(password),
  special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
});

export const getPasswordStrengthLabel = (
  password: string,
  t: TFunction,
): string => {
  const strength = calculatePasswordStrength(password);

  if (!password) return "";
  if (strength < 1)
    return t("users.dialog.form.password.strength.weak", {
      ns: "views/settings",
    });
  return t("users.dialog.form.password.strength.veryStrong", {
    ns: "views/settings",
  });
};

export const getPasswordStrengthColor = (password: string): string => {
  const strength = calculatePasswordStrength(password);

  if (!password) return "bg-gray-200";
  if (strength === 0) return "bg-red-500";
  return "bg-green-500";
};
