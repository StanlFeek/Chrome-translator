# DeepSeek Chrome 翻译插件 / DeepSeek Chrome Translator

[简体中文](#简体中文) | [English](#english)

---

## 简体中文

一个基于 Chrome Manifest V3 的网页翻译扩展，通过 DeepSeek API 实现划词翻译和整页翻译。

### 功能

- 选中网页文字后点击悬浮的“翻译”按钮
- 翻译整个网页，并显示翻译进度
- 一键恢复网页原文
- 在扩展弹窗中快速翻译输入文字
- 在弹窗底部开启或关闭实时翻译
- 支持右键菜单和 `Alt + Shift + T` 快捷键
- API Key 仅保存在浏览器本地存储中

### 导入到 Chrome

1. 打开 Chrome，在地址栏输入并访问 `chrome://extensions/`。
2. 打开页面右上角的“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本仓库中的 `deepseek-translator` 文件夹。
5. 扩展加载完成后，点击浏览器工具栏中的扩展图标。
6. 点击右上角设置按钮，填写 DeepSeek API Key，然后点击“保存并测试连接”。

DeepSeek API Key 可在 <https://platform.deepseek.com/api_keys> 创建。

### 使用方法

- **划词翻译**：选中文字，点击选区旁的“翻译”按钮。
- **整页翻译**：点击扩展图标，然后点击“翻译整个网页”。
- **恢复原文**：点击页面右下角的“恢复原文”，或按 `Alt + Shift + T`。
- **快速翻译**：在扩展弹窗中输入文字并点击“翻译”。

### 注意事项

- `chrome://` 等 Chrome 内置页面不允许扩展运行。
- 网页翻译会调用 DeepSeek API，并按照 DeepSeek 的实际用量计费。
- 翻译过程中动态新增的网页内容不会自动再次翻译。
- 请勿将 API Key 写入源码或提交到 GitHub。

### 项目结构

- `deepseek-translator/manifest.json`：扩展清单
- `deepseek-translator/background.js`：DeepSeek API 调用与后台逻辑
- `deepseek-translator/content.js`：划词和整页翻译界面
- `deepseek-translator/popup.html`：工具栏弹窗
- `deepseek-translator/options.html`：API Key 与翻译设置

---

## English

A Chrome Manifest V3 translation extension that uses the DeepSeek API for selection translation and full-page translation.

### Features

- Select text on a page, then click the floating **Translate** button
- Translate a full web page with progress reporting
- Restore the original page text with one click
- Translate typed text quickly from the extension popup
- Turn real-time translation on or off from the popup footer
- Support the context menu and the `Alt + Shift + T` shortcut
- Store the API key only in local browser storage

### Install in Chrome

1. Open Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the `deepseek-translator` folder in this repository.
5. After the extension is loaded, click its icon in the Chrome toolbar.
6. Open Settings, enter your DeepSeek API key, and click **Save and test connection**.

Create a DeepSeek API key at <https://platform.deepseek.com/api_keys>.

### Usage

- **Selection translation**: Select text and click the **Translate** button next to the selection.
- **Full-page translation**: Click the extension icon, then click **Translate entire page**.
- **Restore original text**: Click **Restore original** at the bottom-right of the page, or press `Alt + Shift + T`.
- **Quick translation**: Enter text in the extension popup and click **Translate**.

### Notes

- Extensions cannot run on Chrome internal pages such as `chrome://`.
- Full-page translation calls the DeepSeek API and is billed according to actual DeepSeek usage.
- Text added dynamically during translation is not translated again automatically.
- Never write an API key into the source code or commit it to GitHub.

### Project Structure

- `deepseek-translator/manifest.json`: extension manifest
- `deepseek-translator/background.js`: DeepSeek API calls and background logic
- `deepseek-translator/content.js`: selection and full-page translation UI
- `deepseek-translator/popup.html`: toolbar popup
- `deepseek-translator/options.html`: API key and translation settings