const MASKED_AUTH_PATTERN = /:\/\/\*:\*@/i;
const MASKED_QUERY_PATTERN = /(?:[?&])user=\*&password=\*/i;

export const isMaskedPath = (value: string): boolean =>
  MASKED_AUTH_PATTERN.test(value) || MASKED_QUERY_PATTERN.test(value);

export const hasCredentials = (value: string): boolean => {
  if (!value) {
    return false;
  }

  if (isMaskedPath(value)) {
    return true;
  }

  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password) {
      return true;
    }

    return (
      parsed.searchParams.has("user") && parsed.searchParams.has("password")
    );
  } catch {
    return /:\/\/[^:@/\s]+:[^@/\s]+@/.test(value);
  }
};

export const maskCredentials = (value: string): string => {
  if (!value) {
    return value;
  }

  const maskedAuth = value.replace(/:\/\/[^:@/\s]+:[^@/\s]*@/g, "://*:*@");

  return maskedAuth
    .replace(/([?&]user=)[^&]*/gi, "$1*")
    .replace(/([?&]password=)[^&]*/gi, "$1*");
};
