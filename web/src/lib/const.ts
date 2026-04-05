/** ONNX embedding models that require local model downloads. GenAI providers are not in this list. */
export const JINA_EMBEDDING_MODELS = ["jinav1", "jinav2"] as const;

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
  "sk",
  "sl",
  "lt",
  "uk",
  "cs",
  "hu",
];
