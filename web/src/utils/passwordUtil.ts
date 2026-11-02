export const getPasswordRequirements = (password: string) => ({
  length: password?.length >= 12,
});
