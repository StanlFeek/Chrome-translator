import {
  getSettings,
  saveSettings,
  LANGUAGE_OPTIONS,
  MODEL_OPTIONS
} from "./settings.js";

const elements = {
  apiKey: document.querySelector("#apiKey"),
  toggleKeyButton: document.querySelector("#toggleKeyButton"),
  model: document.querySelector("#model"),
  targetLanguage: document.querySelector("#targetLanguage"),
  saveButton: document.querySelector("#saveButton"),
  testButton: document.querySelector("#testButton"),
  statusText: document.querySelector("#statusText")
};

void initialize();

async function initialize() {
  populateSelect(elements.model, MODEL_OPTIONS);
  populateSelect(elements.targetLanguage, LANGUAGE_OPTIONS);

  const settings = await getSettings();
  elements.apiKey.value = settings.apiKey;
  elements.model.value = settings.model;
  elements.targetLanguage.value = settings.targetLanguage;

  elements.toggleKeyButton.addEventListener("click", toggleKeyVisibility);
  elements.saveButton.addEventListener("click", () => void saveForm());
  elements.testButton.addEventListener("click", testConnection);
  elements.apiKey.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void saveForm();
    }
  });
}

function populateSelect(select, options) {
  for (const option of options) {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    select.append(element);
  }
}

function toggleKeyVisibility() {
  const shouldShow = elements.apiKey.type === "password";
  elements.apiKey.type = shouldShow ? "text" : "password";
  elements.toggleKeyButton.textContent = shouldShow ? "隐藏" : "显示";
}

async function saveForm() {
  const settings = {
    apiKey: elements.apiKey.value.trim(),
    model: elements.model.value,
    targetLanguage: elements.targetLanguage.value
  };
  await saveSettings(settings);
  setStatus(settings.apiKey ? "设置已保存。" : "设置已保存，但尚未配置 API Key。");
  return true;
}

async function testConnection() {
  if (!elements.apiKey.value.trim()) {
    setStatus("请先填写 DeepSeek API Key。", true);
    elements.apiKey.focus();
    return;
  }

  elements.testButton.disabled = true;
  elements.saveButton.disabled = true;
  setStatus("正在连接 DeepSeek API…");

  try {
    await saveForm();
    const response = await chrome.runtime.sendMessage({
      type: "TEST_CONNECTION",
      targetLanguage: elements.targetLanguage.value
    });
    if (!response?.ok) {
      throw new Error(response?.error || "连接测试失败。");
    }
    setStatus(`连接成功，示例译文：${response.translation}`);
  } catch (error) {
    setStatus(formatError(error), true);
  } finally {
    elements.testButton.disabled = false;
    elements.saveButton.disabled = false;
  }
}

function setStatus(message, isError = false) {
  elements.statusText.textContent = message;
  elements.statusText.className = isError ? "status-text error" : "status-text";
}

function formatError(error) {
  return error instanceof Error && error.message
    ? error.message
    : String(error || "未知错误");
}