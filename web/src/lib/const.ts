/** ONNX embedding models that require local model downloads. GenAI providers are not in this list. */
export const JINA_EMBEDDING_MODELS = ["jinav1", "jinav2"] as const;

export const supportedLanguages: {
  code: string;
  label: string;
}[] = [
  {
    code: "ar",
    label: "العربية (Arabic)",
  },
  {
    code: "bg",
    label: "Български (Bulgarian)",
  },
  {
    code: "ca",
    label: "Català (Catalan)",
  },
  {
    code: "cs",
    label: "Čeština (Czech)",
  },
  {
    code: "da",
    label: "Dansk (Danish)",
  },
  {
    code: "de",
    label: "Deutsch (German)",
  },
  {
    code: "el",
    label: "Ελληνικά (Greek)",
  },
  {
    code: "en",
    label: "English (English)",
  },
  {
    code: "es",
    label: "Español (Spanish)",
  },
  {
    code: "et",
    label: "Eesti (Estonian)",
  },
  {
    code: "fa",
    label: "فارسی (Persian)",
  },
  {
    code: "fi",
    label: "Suomi (Finnish)",
  },
  {
    code: "fr",
    label: "Français (French)",
  },
  {
    code: "gl",
    label: "Galego (Galician)",
  },
  {
    code: "he",
    label: "עברית (Hebrew)",
  },
  {
    code: "hi",
    label: "हिन्दी (Hindi)",
  },
  {
    code: "hr",
    label: "Hrvatski (Croatian)",
  },
  {
    code: "hu",
    label: "Magyar (Hungarian)",
  },
  {
    code: "hy",
    label: "Հայերեն (Armenian)",
  },
  {
    code: "id",
    label: "Bahasa Indonesia (Indonesian)",
  },
  {
    code: "is",
    label: "Íslenska (Icelandic)",
  },
  {
    code: "it",
    label: "Italiano (Italian)",
  },
  {
    code: "ja",
    label: "日本語 (Japanese)",
  },
  {
    code: "ko",
    label: "한국어 (Korean)",
  },
  {
    code: "lt",
    label: "Lietuvių (Lithuanian)",
  },
  {
    code: "lv",
    label: "Latviešu (Latvian)",
  },
  {
    code: "ml",
    label: "മലയാളം (Malayalam)",
  },
  {
    code: "nb-NO",
    label: "Norsk Bokmål (Norwegian Bokmål)",
  },
  {
    code: "nl",
    label: "Nederlands (Dutch)",
  },
  {
    code: "pl",
    label: "Polski (Polish)",
  },
  {
    code: "pt",
    label: "Português (Portuguese)",
  },
  {
    code: "pt-BR",
    label: "Português brasileiro (Brazilian Portuguese)",
  },
  {
    code: "ro",
    label: "Română (Romanian)",
  },
  {
    code: "ru",
    label: "Русский (Russian)",
  },
  {
    code: "sk",
    label: "Slovenčina (Slovak)",
  },
  {
    code: "sl",
    label: "Slovenščina (Slovenian)",
  },
  {
    code: "sq",
    label: "Shqip (Albanian)",
  },
  {
    code: "sr",
    label: "Српски (Serbian)",
  },
  {
    code: "sv",
    label: "Svenska (Swedish)",
  },
  {
    code: "th",
    label: "ไทย (Thai)",
  },
  {
    code: "tr",
    label: "Türkçe (Turkish)",
  },
  {
    code: "uk",
    label: "Українська (Ukrainian)",
  },
  {
    code: "ur",
    label: "اردو (Urdu)",
  },
  {
    code: "uz",
    label: "O‘zbek (Uzbek)",
  },
  {
    code: "vi",
    label: "Tiếng Việt (Vietnamese)",
  },
  {
    code: "yue-Hant",
    label: "粵語 (Cantonese)",
  },
  {
    code: "zh-CN",
    label: "简体中文 (Simplified Chinese, China)",
  },
  {
    code: "zh-Hans",
    label: "简体中文 (Simplified Chinese)",
  },
  {
    code: "zh-Hant",
    label: "正體中文 (Traditional Chinese)",
  },
];
