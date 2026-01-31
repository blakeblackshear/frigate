export const calculatePasswordStrength = (password: string): number => {
  if (!password) return 0;

  let strength = 0;
  if (password.length >= 8) strength += 1;
  if (/\d/.test(password)) strength += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;

  return strength;
};

export const getPasswordRequirements = (password: string) => ({
  length: password?.length >= 8,
  uppercase: /[A-Z]/.test(password || ""),
  digit: /\d/.test(password || ""),
  special: /[!@#$%^&*(),.?":{}|<>]/.test(password || ""),
});

export const getPasswordStrengthLabel = (
  password: string,
  t: (key: string) => string,
): string => {
  const strength = calculatePasswordStrength(password);

  if (!password) return "";
  if (strength <= 1) return t("users.dialog.form.password.strength.weak");
  if (strength === 2) return t("users.dialog.form.password.strength.medium");
  if (strength === 3) return t("users.dialog.form.password.strength.strong");
  return t("users.dialog.form.password.strength.veryStrong");
};

export const getPasswordStrengthColor = (password: string): string => {
  const strength = calculatePasswordStrength(password);

  if (!password) return "bg-gray-200";
  if (strength <= 1) return "bg-red-500";
  if (strength === 2) return "bg-yellow-500";
  if (strength === 3) return "bg-green-500";
  return "bg-green-600";
};
