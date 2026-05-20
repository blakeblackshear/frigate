/** ONNX embedding models that require local model downloads. GenAI providers are not in this list. */
export const JINA_EMBEDDING_MODELS = ["jinav1", "jinav2"] as const;

/**
 * Sentinel the backend substitutes for saved credentials (api keys,
 * passwords, secrets) in /config responses. The credential widget renders
 * this value as an empty input with a "saved — leave blank to keep" hint,
 * and stripRedactedCredentials() removes any field still equal to this
 * value before sending a config/set payload so the saved YAML value is
 * preserved. Mirror of frigate.const.REDACTED_CREDENTIAL_SENTINEL.
 */
export const REDACTED_CREDENTIAL_SENTINEL = "__FRIGATE_SAVED_CREDENTIAL__";

export const ANNOTATION_OFFSET_MIN = -10000;
export const ANNOTATION_OFFSET_MAX = 5000;
export const ANNOTATION_OFFSET_STEP = 50;

export const supportedLanguageKeys = [
  "en",
  "es",
  "pt",
  "pt-BR",
  "fr",
  "de",
  "it",
  "ca",
  "ro",
  "nl",
  "nb-NO",
  "sv",
  "zh-CN",
  "yue-Hant",
  "ja",
  "vi",
  "th",
  "he",
  "fa",
  "ru",
  "tr",
  "pl",
  "hr",
  "bs",
  "sk",
  "sl",
  "lt",
  "uk",
  "cs",
  "hu",
];
