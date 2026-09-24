(() => {
  if (globalThis.__deepseekTranslatorLoaded) {
    return;
  }
  globalThis.__deepseekTranslatorLoaded = true;

  const PAGE_BATCH_MAX_ITEMS = 24;
  const PAGE_BATCH_MAX_CHARS = 3200;
  const MAX_PAGE_NODE_LENGTH = 12000;
  const SKIP_SELECTOR = [
    "script",
    "style",
    "noscript",
    "textarea",
    "input",
    "select",
    "option",
    "code",
    "pre",
    "svg",
    "canvas",
    "math",
    "[contenteditable='true']",
    "[contenteditable='']",
    "[role='textbox']",
    "[translate='no']",
    ".notranslate",
    ".deepseek-translator-ui"
  ].join(",");

  const ui = createUi();
  const translatedNodes = new Map();
  let pageTranslationInProgress = false;
  let cancelPageTranslation = false;
  let panelAnchorRect = null;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const handler = messageHandlers[message?.type];
    if (!handler) {
      return false;
    }

    void Promise.resolve(handler(message))
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: formatError(error) }));

    return true;
  });

  document.addEventListener("mouseup", handleMouseUp, true);
  document.addEventListener("pointerdown", handlePointerDown, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideSelectionBubble();
      hideTranslationPanel();
      hideStatus();
    }
  });

  const messageHandlers = {
    PING: () => ({ ready: true }),

    TRANSLATE_SELECTION: async ({ text, targetLanguage }) => {
      const normalizedText = String(text || "").trim();
      if (!normalizedText) {
        throw new Error("没有选中文字。");
      }
      showTranslationPanel(normalizedText, getSelectionAnchorRect());
      const translation = await requestSingleTranslation(normalizedText, targetLanguage);
      return { translation };
    },

    TRANSLATE_PAGE: async ({ targetLanguage }) => {
      await translatePage(targetLanguage);
      return { translatedCount: translatedNodes.size };
    },

    RESTORE_PAGE: () => {
      restorePage();
      return { translatedCount: 0 };
    },

    GET_PAGE_STATE: () => ({
      translatedCount: translatedNodes.size,
      isTranslating: pageTranslationInProgress
    }),

    TOGGLE_PAGE_TRANSLATION: async () => {
      if (translatedNodes.size) {
        restorePage();
        return { state: "restored" };
      }
      await translatePage();
      return { state: "translated", translatedCount: translatedNodes.size };
    }
  };

  function createUi() {
    const host = document.createElement("div");
    host.className = "deepseek-translator-ui";
    host.style.position = "fixed";
    host.style.inset = "0";
    host.style.width = "0";
    host.style.height = "0";
    host.style.zIndex = "2147483647";
    host.style.pointerEvents = "none";

    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host { all: initial; }
      * { box-sizing: border-box; }
      button { font: inherit; }
      .selection-bubble,
      .panel,
      .status {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
        color: #172033;
        pointer-events: auto;
      }
      .selection-bubble {
        position: fixed;
        display: none;
        align-items: center;
        gap: 6px;
        height: 32px;
        padding: 0 12px;
        border: 1px solid rgba(255,255,255,.24);
        border-radius: 9px;
        background: #1769e0;
        color: #fff;
        box-shadow: 0 8px 24px rgba(15, 50, 105, .28);
        cursor: pointer;
        font-size: 13px;
        font-weight: 650;
      }
      .selection-bubble:hover { background: #0e5ac8; }
      .selection-bubble::before {
        content: "";
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #8ff0b8;
      }
      .panel {
        position: fixed;
        display: none;
        width: min(430px, calc(100vw - 24px));
        max-height: min(520px, calc(100vh - 24px));
        overflow: hidden;
        border: 1px solid #d9e2f0;
        border-radius: 14px;
        background: #fff;
        box-shadow: 0 18px 50px rgba(15, 23, 42, .24);
      }
      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 44px;
        padding: 0 12px 0 14px;
        border-bottom: 1px solid #edf1f7;
      }
      .panel-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; }
      .brand-dot { width: 9px; height: 9px; border-radius: 50%; background: #1769e0; box-shadow: 0 0 0 4px #e8f1ff; }
      .icon-button {
        width: 30px;
        height: 30px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: #64748b;
        cursor: pointer;
        font-size: 18px;
      }
      .icon-button:hover { background: #f1f5f9; color: #1e293b; }
      .panel-body { max-height: calc(min(520px, 100vh - 24px) - 94px); overflow: auto; padding: 13px 14px 14px; }
      .label { margin: 0 0 6px; color: #64748b; font-size: 12px; font-weight: 650; }
      .source {
        max-height: 112px;
        margin: 0 0 13px;
        overflow: auto;
        color: #64748b;
        font-family: inherit;
        font-size: 13px;
        line-height: 1.55;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .result-box {
        min-height: 62px;
        padding: 11px 12px;
        border: 1px solid #e4ebf5;
        border-radius: 10px;
        background: #f8fafc;
      }
      .result {
        margin: 0;
        color: #172033;
        font-size: 14px;
        line-height: 1.65;
        white-space: pre-wrap;
        word-break: break-word;
        user-select: text;
      }
      .result.error { color: #b42318; }
      .loading { display: inline-flex; align-items: center; gap: 8px; color: #1769e0; font-size: 13px; }
      .spinner {
        width: 14px;
        height: 14px;
        border: 2px solid #cfe0f8;
        border-top-color: #1769e0;
        border-radius: 50%;
        animation: spin .8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      .panel-actions { display: flex; justify-content: flex-end; margin-top: 10px; }
      .secondary-button {
        height: 30px;
        padding: 0 11px;
        border: 1px solid #d5deeb;
        border-radius: 8px;
        background: #fff;
        color: #334155;
        cursor: pointer;
        font-size: 12px;
        font-weight: 650;
      }
      .secondary-button:hover { background: #f8fafc; }
      .status {
        position: fixed;
        right: 18px;
        bottom: 18px;
        display: none;
        align-items: center;
        gap: 10px;
        max-width: min(520px, calc(100vw - 36px));
        min-height: 46px;
        padding: 9px 10px 9px 14px;
        border: 1px solid #d9e2f0;
        border-radius: 12px;
        background: #fff;
        box-shadow: 0 14px 38px rgba(15, 23, 42, .22);
        font-size: 13px;
      }
      .status.error { border-color: #f2bbb5; }
      .status-message { line-height: 1.45; }
      .status-action {
        height: 29px;
        padding: 0 10px;
        border: 1px solid #cbdcf3;
        border-radius: 8px;
        background: #edf5ff;
        color: #1558b6;
        cursor: pointer;
        font-size: 12px;
        font-weight: 650;
        white-space: nowrap;
      }
      .status-action:disabled { cursor: default; opacity: .55; }
      .status-close {
        width: 28px;
        height: 28px;
        padding: 0;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: #64748b;
        cursor: pointer;
        font-size: 17px;
      }
      .status-close:hover { background: #f1f5f9; }
    `;

    const selectionBubble = document.createElement("button");
    selectionBubble.type = "button";
    selectionBubble.className = "selection-bubble";
    selectionBubble.textContent = "翻译";

    const panel = document.createElement("section");
    panel.className = "panel";

    const panelHeader = document.createElement("div");
    panelHeader.className = "panel-header";
    const panelTitle = document.createElement("div");
    panelTitle.className = "panel-title";
    const brandDot = document.createElement("span");
    brandDot.className = "brand-dot";
    const titleText = document.createElement("span");
    titleText.textContent = "DeepSeek 翻译";
    panelTitle.append(brandDot, titleText);

    const closePanel = createIconButton("×", "关闭");
    panelHeader.append(panelTitle, closePanel);

    const panelBody = document.createElement("div");
    panelBody.className = "panel-body";
    const sourceLabel = document.createElement("p");
    sourceLabel.className = "label";
    sourceLabel.textContent = "原文";
    const source = document.createElement("pre");
    source.className = "source";
    const resultLabel = document.createElement("p");
    resultLabel.className = "label";
    resultLabel.textContent = "译文";
    const resultBox = document.createElement("div");
    resultBox.className = "result-box";
    const result = document.createElement("div");
    result.className = "result";
    resultBox.append(result);
    const panelActions = document.createElement("div");
    panelActions.className = "panel-actions";
    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "secondary-button";
    copyButton.textContent = "复制译文";
    panelActions.append(copyButton);
    panelBody.append(sourceLabel, source, resultLabel, resultBox, panelActions);
    panel.append(panelHeader, panelBody);

    const status = document.createElement("div");
    status.className = "status";
    const statusMessage = document.createElement("span");
    statusMessage.className = "status-message";
    const statusAction = document.createElement("button");
    statusAction.type = "button";
    statusAction.className = "status-action";
    const statusClose = createIconButton("×", "关闭");
    statusClose.className = "status-close";
    status.append(statusMessage, statusAction, statusClose);

    shadow.append(style, selectionBubble, panel, status);
    document.documentElement.append(host);

    selectionBubble.addEventListener("click", () => {
      const selection = getSelectedText();
      if (!selection.text) {
        return;
      }
      hideSelectionBubble();
      showTranslationPanel(selection.text, selection.rect);
      void requestSingleTranslation(selection.text).catch(() => {});
    });

    closePanel.addEventListener("click", hideTranslationPanel);
    copyButton.addEventListener("click", () => {
      void copyResult();
    });
    statusClose.addEventListener("click", hideStatus);

    return {
      host,
      selectionBubble,
      panel,
      source,
      result,
      copyButton,
      status,
      statusMessage,
      statusAction,
      statusClose
    };
  }

  function createIconButton(text, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-button";
    button.textContent = text;
    button.title = label;
    button.setAttribute("aria-label", label);
    return button;
  }

  function handleMouseUp(event) {
    if (isUiEvent(event)) {
      return;
    }

    window.setTimeout(() => {
      const selection = getSelectedText();
      if (!selection.text || pageTranslationInProgress) {
        hideSelectionBubble();
        return;
      }
      showSelectionBubble(selection.rect);
    }, 0);
  }

  function handlePointerDown(event) {
    if (isUiEvent(event)) {
      return;
    }
    hideSelectionBubble();
    hideTranslationPanel();
  }

  function getSelectedText() {
    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement
    ) {
      const start = activeElement.selectionStart ?? 0;
      const end = activeElement.selectionEnd ?? 0;
      if (end > start) {
        return {
          text: activeElement.value.slice(start, end).trim(),
          rect: activeElement.getBoundingClientRect()
        };
      }
    }

    const selection = window.getSelection();
    const text = selection?.toString().trim() || "";
    if (!text || !selection.rangeCount) {
      return { text: "", rect: null };
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect.width && !rect.height) {
      return { text: "", rect: null };
    }
    return { text, rect };
  }

  function getSelectionAnchorRect() {
    return getSelectedText().rect;
  }

  function showSelectionBubble(rect) {
    if (!rect) {
      hideSelectionBubble();
      return;
    }

    const button = ui.selectionBubble;
    button.style.display = "flex";
    button.style.visibility = "hidden";
    button.style.left = "0px";
    button.style.top = "0px";

    const width = button.offsetWidth;
    const height = button.offsetHeight;
    const left = clamp(rect.left + rect.width / 2 - width / 2, 8, innerWidth - width - 8);
    const top = rect.bottom + 8 + height <= innerHeight - 8
      ? rect.bottom + 8
      : Math.max(8, rect.top - height - 8);

    button.style.left = `${left}px`;
    button.style.top = `${top}px`;
    button.style.visibility = "visible";
  }

  function hideSelectionBubble() {
    ui.selectionBubble.style.display = "none";
  }

  function showTranslationPanel(sourceText, anchorRect) {
    panelAnchorRect = anchorRect;
    ui.source.textContent = sourceText;
    ui.result.className = "result";
    ui.result.innerHTML = '<span class="loading"><span class="spinner"></span>正在翻译…</span>';
    ui.copyButton.disabled = true;
    ui.panel.style.display = "block";
    positionPanel(panelAnchorRect);
  }

  function positionPanel(anchorRect) {
    const panel = ui.panel;
    const rect = anchorRect || {
      left: innerWidth - 450,
      right: innerWidth - 18,
      top: 18,
      bottom: 18,
      width: 432
    };
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    let left = rect.left + rect.width / 2 - width / 2;
    let top = rect.bottom + 12;

    if (top + height > innerHeight - 12) {
      top = rect.top - height - 12;
    }

    left = clamp(left, 12, innerWidth - width - 12);
    top = clamp(top, 12, Math.max(12, innerHeight - height - 12));
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  function hideTranslationPanel() {
    ui.panel.style.display = "none";
  }

  async function requestSingleTranslation(text, targetLanguage) {
    try {
      const response = await sendRuntimeMessage({
        type: "TRANSLATE_TEXT",
        text,
        targetLanguage
      });
      setPanelResult(response.translation);
      return response.translation;
    } catch (error) {
      setPanelResult(formatError(error), true);
      throw error;
    }
  }

  function setPanelResult(text, isError = false) {
    ui.result.className = isError ? "result error" : "result";
    ui.result.textContent = text;
    ui.copyButton.disabled = isError;
    positionPanel(panelAnchorRect);
  }

  async function copyResult() {
    const text = ui.result.textContent || "";
    if (!text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      const oldText = ui.copyButton.textContent;
      ui.copyButton.textContent = "已复制";
      window.setTimeout(() => {
        ui.copyButton.textContent = oldText;
      }, 1200);
    } catch (_error) {
      ui.copyButton.textContent = "复制失败";
    }
  }

  async function translatePage(providedTargetLanguage) {
    if (pageTranslationInProgress) {
      showStatus("正在翻译当前页面…");
      return;
    }

    if (translatedNodes.size) {
      showStatus("当前页面已翻译。", {
        actionLabel: "恢复原文",
        action: restorePage
      });
      return;
    }

    let targetLanguage = providedTargetLanguage;
    if (!targetLanguage) {
      const settings = await sendRuntimeMessage({ type: "GET_SETTINGS" });
      targetLanguage = settings.targetLanguage;
      if (!settings.hasApiKey) {
        showStatus("请先打开扩展设置，填写 DeepSeek API Key。", {
          error: true,
          closeable: true,
          actionLabel: "打开设置",
          action: openOptionsPage
        });
        return;
      }
    }

    currentPageTargetLanguage = targetLanguage;
    const records = collectPageRecords();
    if (!records.length) {
      showStatus("当前页面没有找到适合翻译的文字。", { closeable: true });
      return;
    }

    pageTranslationInProgress = true;
    cancelPageTranslation = false;
    showStatus("正在准备网页翻译…", {
      actionLabel: "停止",
      action: () => {
        cancelPageTranslation = true;
        ui.statusAction.disabled = true;
        ui.statusMessage.textContent = "正在停止…";
      }
    });

    let processed = 0;
    try {
      for (const batch of createBatches(records)) {
        if (cancelPageTranslation) {
          break;
        }

        const response = await sendRuntimeMessage({
          type: "TRANSLATE_BATCH",
          items: batch.map(({ id, text }) => ({ id, text })),
          targetLanguage
        });

        const translations = new Map(
          response.translations.map((item) => [Number(item.id), item.text])
        );

        for (const record of batch) {
          const translation = translations.get(record.id);
          if (typeof translation !== "string" || !translation.trim()) {
            continue;
          }

          const translatedValue = `${record.leading}${translation}${record.trailing}`;
          record.node.nodeValue = translatedValue;
          translatedNodes.set(record.id, {
            node: record.node,
            originalValue: record.originalValue,
            translatedValue
          });
          processed += 1;
        }

        const percent = Math.min(100, Math.round((processed / records.length) * 100));
        showStatus(`正在翻译网页：${percent}%`, {
          actionLabel: "停止",
          action: () => {
            cancelPageTranslation = true;
            ui.statusAction.disabled = true;
            ui.statusMessage.textContent = "正在停止…";
          }
        });
      }

      pageTranslationInProgress = false;

      if (cancelPageTranslation) {
        showStatus(`翻译已停止，已翻译 ${translatedNodes.size} 处内容。`, {
          actionLabel: translatedNodes.size ? "恢复原文" : "",
          action: restorePage,
          closeable: true
        });
        return;
      }

      showStatus(`网页翻译完成，共处理 ${translatedNodes.size} 处内容。`, {
        actionLabel: "恢复原文",
        action: restorePage,
        closeable: true
      });
    } catch (error) {
      pageTranslationInProgress = false;
      showStatus(`翻译中断：${formatError(error)}`, {
        error: true,
        actionLabel: translatedNodes.size ? "恢复原文" : "打开设置",
        action: translatedNodes.size ? restorePage : openOptionsPage,
        closeable: true
      });
    }
  }

  function collectPageRecords() {
    if (!document.body) {
      return [];
    }

    const records = [];
    let nextId = 1;
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const originalValue = node.nodeValue || "";
          const text = originalValue.trim();
          const parent = node.parentElement;

          if (!text || text.length < 2 || text.length > MAX_PAGE_NODE_LENGTH || !parent) {
            return NodeFilter.FILTER_REJECT;
          }
          if (parent.closest(SKIP_SELECTOR) || parent.closest(".deepseek-translator-ui")) {
            return NodeFilter.FILTER_REJECT;
          }
          if (isHidden(parent) || !hasTranslatableLetters(text)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (/^(https?:\/\/|www\.)\S+$/i.test(text) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (!shouldTranslateForTarget(text, currentPageTargetLanguage)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const originalValue = node.nodeValue || "";
      const text = originalValue.trim();
      const leading = originalValue.match(/^\s*/)?.[0] || "";
      const trailing = originalValue.match(/\s*$/)?.[0] || "";
      records.push({ id: nextId++, node, originalValue, leading, trailing, text });
    }

    return records;
  }

  function createBatches(records) {
    const batches = [];
    let batch = [];
    let characterCount = 0;

    for (const record of records) {
      if (
        batch.length &&
        (batch.length >= PAGE_BATCH_MAX_ITEMS ||
          characterCount + record.text.length > PAGE_BATCH_MAX_CHARS)
      ) {
        batches.push(batch);
        batch = [];
        characterCount = 0;
      }
      batch.push(record);
      characterCount += record.text.length;
    }

    if (batch.length) {
      batches.push(batch);
    }
    return batches;
  }

  let currentPageTargetLanguage = "";

  function shouldTranslateForTarget(text, targetLanguage) {
    if (!targetLanguage?.startsWith("zh")) {
      return true;
    }

    if (/[\u3040-\u30ff]/.test(text)) {
      return true;
    }

    const cjkCount = (text.match(/[\u3400-\u9fff]/g) || []).length;
    const latinCount = (text.match(/[A-Za-z]/g) || []).length;
    return !(cjkCount >= 2 && cjkCount >= latinCount * 1.5);
  }

  function hasTranslatableLetters(text) {
    return /[A-Za-z\u00c0-\u024f\u0400-\u04ff\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(text);
  }

  function isHidden(element) {
    const style = getComputedStyle(element);
    return style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0;
  }

  function restorePage() {
    for (const item of translatedNodes.values()) {
      if (item.node?.isConnected && item.node.nodeValue === item.translatedValue) {
        item.node.nodeValue = item.originalValue;
      }
    }
    translatedNodes.clear();
    showStatus("已恢复网页原文。", { closeable: true });
    window.setTimeout(hideStatus, 1800);
  }

  function showStatus(message, options = {}) {
    ui.status.style.display = "flex";
    ui.status.className = options.error ? "status error" : "status";
    ui.statusMessage.textContent = message;
    ui.statusAction.disabled = false;
    ui.statusAction.style.display = options.actionLabel ? "" : "none";
    ui.statusAction.textContent = options.actionLabel || "";
    ui.statusAction.onclick = options.action || null;
    ui.statusClose.style.display = options.closeable ? "" : "none";
  }

  function hideStatus() {
    ui.status.style.display = "none";
  }

  async function openOptionsPage() {
    await chrome.runtime.openOptionsPage();
  }

  async function sendRuntimeMessage(message) {
    const response = await chrome.runtime.sendMessage(message);
    if (!response?.ok) {
      throw new Error(response?.error || "扩展后台没有响应。");
    }
    return response;
  }

  function isUiEvent(event) {
    return event.composedPath?.().includes(ui.host) || false;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function formatError(error) {
    return error instanceof Error && error.message
      ? error.message
      : String(error || "未知错误");
  }
})();