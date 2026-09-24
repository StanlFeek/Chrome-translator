import { getSettings, saveSettings, LANGUAGE_OPTIONS } from "./settings.js";

const elements = {
  settingsButton: document.querySelector("#settingsButton"),
  noticeSettingsButton: document.querySelector("#noticeSettingsButton"),
  keyWarning: document.querySelector("#keyWarning"),
  targetLanguage: document.querySelector("#targetLanguage"),
  pageState: document.querySelector("#pageState"),
  translatePageButton: document.querySelector("#translatePageButton"),
  restorePageButton: document.querySelector("#restorePageButton"),
  sourceText: document.querySelector("#sourceText"),
  quickTranslateButton: document.querySelector("#quickTranslateButton"),
  quickResultBox: document.querySelector("#quickResultBox"),
  quickResult: document.querySelector("#quickResult"),
  copyButton: document.querySelector("#copyButton"),
  statusText: document.querySelector("#statusText")
};

void initialize();

async function initialize() {
  populateLanguages();
  const settings = await getSettings();
  elements.targetLanguage.value = settings.targetLanguage;
  elements.keyWarning.hidden = Boolean(settings.apiKey);

  elements.settingsButton.addEventListener("click", openOptions);
  elements.noticeSettingsButton.addEventListener("click", openOptions);
  elements.targetLanguage.addEventListener("change", async () => {
    await saveSettings({ targetLanguage: elements.targetLanguage.value });
    await checkPageState();
  });
  elements.translatePageButton.addEventListener("click", translateCurrentPage);
  elements.restorePageButton.addEventListener("click", restoreCurrentPage);
  elements.quickTranslateButton.addEventListener("click", quickTranslate);
  elements.copyButton.addEventListener("click", copyQuickResult);
  elements.sourceText.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.key === "Enter") {
      event.preventDefault();
      void quickTranslate();
    }
  });

  await checkPageState();
  setStatus("就绪");
}

function populateLanguages() {
  for (const option of LANGUAGE_OPTIONS) {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    elements.targetLanguage.append(element);
  }
}

async function openOptions() {
  await chrome.runtime.openOptionsPage();
  window.close();
}

async function checkPageState() {
  try {
    const response = await sendToActiveTab({ type: "GET_PAGE_STATE" });
    const translatedCount = Number(response.translatedCount || 0);
    elements.pageState.textContent = translatedCount ? `已翻译 ${translatedCount} 处` : "未翻译";
    elements.restorePageButton.disabled = !translatedCount;
  } catch (_error) {
    elements.pageState.textContent = "不可用";
    elements.restorePageButton.disabled = true;
  }
}

async function translateCurrentPage() {
  elements.translatePageButton.disabled = true;
  setStatus("已开始网页翻译，进度显示在页面右下角…");
  try {
    const response = await sendToActiveTab({
      type: "TRANSLATE_PAGE",
      targetLanguage: elements.targetLanguage.value
    });
    const count = Number(response.translatedCount || 0);
    setStatus(`网页翻译完成，共处理 ${count} 处内容。`);
    await checkPageState();
  } catch (error) {
    setStatus(formatError(error), true);
  } finally {
    elements.translatePageButton.disabled = false;
  }
}

async function restoreCurrentPage() {
  elements.restorePageButton.disabled = true;
  setStatus("正在恢复原文…");
  try {
    await sendToActiveTab({ type: "RESTORE_PAGE" });
    setStatus("已恢复网页原文。");
    await checkPageState();
  } catch (error) {
    setStatus(formatError(error), true);
    await checkPageState();
  }
}

async function quickTranslate() {
  const text = elements.sourceText.value.trim();
  if (!text) {
    elements.sourceText.focus();
    setStatus("请先输入要翻译的文字。", true);
    return;
  }

  elements.quickTranslateButton.disabled = true;
  elements.quickResultBox.hidden = true;
  setStatus("正在翻译…");
  try {
    const response = await chrome.runtime.sendMessage({
      type: "TRANSLATE_TEXT",
      text,
      targetLanguage: elements.targetLanguage.value
    });
    if (!response?.ok) {
      throw new Error(response?.error || "翻译失败。");
    }
    elements.quickResult.textContent = response.translation;
    elements.quickResult.className = "result";
    elements.quickResultBox.hidden = false;
    setStatus("翻译完成。");
  } catch (error) {
    elements.quickResult.textContent = formatError(error);
    elements.quickResult.className = "result error";
    elements.quickResultBox.hidden = false;
    setStatus("翻译失败。", true);
  } finally {
    elements.quickTranslateButton.disabled = false;
  }
}

async function copyQuickResult() {
  const text = elements.quickResult.textContent || "";
  if (!text) {
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    elements.copyButton.textContent = "已复制";
    window.setTimeout(() => {
      elements.copyButton.textContent = "复制";
    }, 1200);
  } catch (_error) {
    elements.copyButton.textContent = "复制失败";
  }
}

async function sendToActiveTab(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("没有找到当前标签页。");
  }

  try {
    return unwrapResponse(await chrome.tabs.sendMessage(tab.id, message));
  } catch (error) {
    if (!isMissingReceiverError(error)) {
      throw error;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
    return unwrapResponse(await chrome.tabs.sendMessage(tab.id, message));
  }
}

function unwrapResponse(response) {
  if (!response?.ok) {
    throw new Error(response?.error || "页面脚本没有响应。");
  }
  return response;
}

function isMissingReceiverError(error) {
  return /Receiving end does not exist|Could not establish connection/i.test(error?.message || "");
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