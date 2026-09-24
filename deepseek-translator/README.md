# DeepSeek 翻译扩展 / DeepSeek Translator Extension

[简体中文](#简体中文) | [English](#english)

一个基于 Chrome Manifest V3 的翻译扩展，通过 DeepSeek API 提供划词翻译和整页翻译。

A Chrome Manifest V3 translation extension that provides selection and full-page translation through the DeepSeek API.

---

## 简体中文

### 功能

- 选中网页文字后，点击悬浮的“翻译”按钮
- 翻译整个网页，并在页面右下角显示进度
- 一键恢复网页原文
- 在扩展弹窗中快速翻译输入的文字
- 在弹窗底部开启或关闭实时翻译
- 右键菜单翻译选中文字或当前页面
- 快捷键 `Alt + Shift + T` 翻译或恢复当前网页
- 支持简体中文、繁体中文、英语、日语、韩语、法语、德语、西班牙语、俄语

### 安装

1. 打开 Chrome，在地址栏输入 `chrome://extensions/`。
2. 打开右上角的“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本目录 `deepseek-translator`。
5. 打开 DeepSeek 开放平台并创建 API Key：<https://platform.deepseek.com/api_keys>。
6. 点击浏览器工具栏里的扩展图标，再点击设置按钮，填写 API Key 并测试连接。

### 使用

#### 划词翻译

1. 在普通网页中选中文字。
2. 点击选区旁边出现的蓝色“翻译”按钮。
3. 在弹出的卡片中查看译文，或点击“复制译文”。

#### 整个网页翻译

1. 点击浏览器工具栏中的扩展图标。
2. 选择目标语言。
3. 点击“翻译整个网页”。
4. 翻译进度显示在页面右下角。
5. 点击“恢复原文”可以恢复本次翻译前的文字。

也可以按 `Alt + Shift + T`，或在页面空白处点击右键选择“使用 DeepSeek 翻译整个页面”。

### 数据与费用

- API Key 保存在 `chrome.storage.local`，不会同步到其他 Chrome 设备，也不会发送给 DeepSeek 之外的第三方。
- 待翻译文字会发送到 `https://api.deepseek.com/chat/completions` 以完成翻译。
- 翻译会消耗 DeepSeek API 用量，请以 DeepSeek 开放平台的实际计费规则为准。
- 实时翻译开启后会持续处理当前页面及后续新增内容，可能产生更多 API 用量。
- 扩展会跳过 `script`、`style`、输入框、代码块、`translate="no"` 和隐藏区域。

### 开发

本项目不需要构建步骤。修改文件后，在 `chrome://extensions/` 中点击扩展的“重新加载”按钮即可。

主要文件：

- `manifest.json`：扩展清单
- `background.js`：DeepSeek API 调用、上下文菜单与快捷键
- `content.js`：划词界面、整页翻译与恢复原文
- `popup.html` / `popup.js`：工具栏弹窗
- `options.html` / `options.js`：API Key 与默认设置

### 已知限制

- Chrome 内置页面（例如 `chrome://settings`）不允许扩展运行。
- 网页翻译目前处理已有的静态文字节点；翻译过程中由网页动态新增的内容不会被自动翻译。
- 单个文字节点超过 12000 个字符时会被跳过。
- 页面结构复杂的网站（例如在线文档、代码编辑器）可能不支持完整翻译。

---

## English

### Features

- Select text on a web page and click the floating **Translate** button
- Translate an entire page and show progress at the bottom-right
- Restore the original page text with one click
- Translate typed text quickly from the extension popup
- Turn real-time translation on or off from the popup footer
- Translate selected text or the current page from the context menu
- Use `Alt + Shift + T` to translate or restore the current page
- Support Simplified Chinese, Traditional Chinese, English, Japanese, Korean, French, German, Spanish, and Russian

### Installation

1. Open Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select this `deepseek-translator` directory.
5. Create a DeepSeek API key at <https://platform.deepseek.com/api_keys>.
6. Click the extension icon in the Chrome toolbar, open Settings, enter the API key, and test the connection.

### Usage

#### Selection Translation

1. Select text on a regular web page.
2. Click the blue **Translate** button that appears next to the selection.
3. View the translation in the popup card, or click **Copy translation**.

#### Full-Page Translation

1. Click the extension icon in the Chrome toolbar.
2. Select the target language.
3. Click **Translate entire page**.
4. Translation progress appears at the bottom-right of the page.
5. Click **Restore original** to restore the text from before this translation.

You can also press `Alt + Shift + T`, or right-click on a blank area of the page and select the DeepSeek full-page translation command.

### Data and Cost

- The API key is stored in `chrome.storage.local`, is not synced to other Chrome devices, and is not sent to any third party other than DeepSeek.
- Text to be translated is sent to `https://api.deepseek.com/chat/completions`.
- Translation consumes DeepSeek API usage. Refer to the DeepSeek platform for current pricing and billing rules.
- Real-time translation processes the current page and newly added content while enabled, which may use more API credits.
- The extension skips `script`, `style`, input fields, code blocks, `translate="no"` elements, and hidden areas.

### Development

This project has no build step. After editing a file, click **Reload** for the extension at `chrome://extensions/`.

Main files:

- `manifest.json`: extension manifest
- `background.js`: DeepSeek API calls, context menus, and shortcuts
- `content.js`: selection UI, full-page translation, and restoration
- `popup.html` / `popup.js`: toolbar popup
- `options.html` / `options.js`: API key and default settings

### Known Limitations

- Chrome internal pages such as `chrome://settings` do not allow extensions to run.
- Full-page translation currently processes existing static text nodes. Text added dynamically during translation is not translated automatically.
- A single text node longer than 12,000 characters is skipped.
- Websites with complex page structures, such as online document editors and code editors, may not support full-page translation.