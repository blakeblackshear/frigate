import { useTranslation } from "react-i18next";

/**
 * Hook to get documentation URLs based on current language
 *
 * @returns {Object} An object containing:
 *   - getLocaleDocUrl: Function to get full documentation URL for a given path
 *   - docDomain: Current documentation domain based on language
 */
export function useDocDomain() {
  const { i18n } = useTranslation();

  // Map of language codes to their specific documentation domains
  const DOC_DOMAINS: Record<string, string> = {
    "zh-CN": "docs.frigate-cn.video",
    // Add other language-specific domains here as needed
  };

  // Get the appropriate documentation domain for current language
  const docDomain = DOC_DOMAINS[i18n.language] || "docs.frigate.video";

  /**
   * Get full documentation URL for a given path
   * @param {string} path - Documentation path (e.g. "/configuration/live")
   * @returns {string} Full documentation URL
   */
  const getLocaleDocUrl = (path: string): string => {
    // Ensure path starts with a slash
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `https://${docDomain}${normalizedPath}`;
  };

  return {
    getLocaleDocUrl,
    docDomain,
  };
}
