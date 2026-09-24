export const LANGUAGE_OPTIONS = [
  { value: "zh-CN", label: "简体中文" },
  { value: "zh-TW", label: "繁体中文" },
  { value: "en", label: "英语" },
  { value: "ja", label: "日语" },
  { value: "ko", label: "韩语" },
  { value: "fr", label: "法语" },
  { value: "de", label: "德语" },
  { value: "es", label: "西班牙语" },
  { value: "ru", label: "俄语" }
];

export const MODEL_OPTIONS = [
  { value: "deepseek-chat", label: "deepseek-chat（推荐）" },
  { value: "deepseek-reasoner", label: "deepseek-reasoner（较慢）" }
];

export const DEFAULT_SETTINGS = Object.freeze({
  apiKey: "",
  model: "deepseek-chat",
  targetLanguage: "zh-CN",
  realtimeTranslation: false
});

export function languageLabel(value) {
  return LANGUAGE_OPTIONS.find((item) => item.value === value)?.label || value;
}

export async function getSettings() {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    apiKey: typeof stored.apiKey === "string" ? stored.apiKey.trim() : ""
  };
}

export async function saveSettings(patch) {
  await chrome.storage.local.set(patch);
}