# TERA Translate chat

这是一款为 TERA 设计的实时聊天翻译插件，旨在帮助玩家轻松跨越语言障碍，与来自全球的玩家无缝交流。加入了多种 **AI 翻译接口** 和 **本地化功能**。

[English](README.md) | [简体中文](README-zh.md) 

### **依赖**：需要运行 **Toolbox 工具箱**。

---

##  特点

*   ###  翻译引擎支持
    *   **基础翻译**: 支持 **Google 翻译**，无需额外配置即可使用。
    *   **AI 翻译接口**: 接入多种AI 翻译接口，包括 Google 的 **Gemini**、OpenAI 的 **ChatGPT** 和腾讯的 **混元**，提供更高准确的翻译结果。
    *   **语言代码**支持列表： `am, ar, az, be, bg, bn, ca, cs, da, de, el, en, es, et, eu, fa, fi, fr, gu, he, hi, hr, hu, hy, is, it, ja, ka, kn, ko, ku, lo, lt, lv, ml, mr, ms, nl, no, or, pa, pl, pt, ro, ru, sk, sl, sq, sr, sv, ta, te, th, tl, tr, uk, ur, vi, yo, zh, zh-TW` （采用 [Nito-ELD 语言检测器](https://github.com/nitotm/efficient-language-detector-js) ）。

*   ###  本地缓存翻译
    *   **节约成本**: 将已翻译内容保存至本地，避免重复请求 AI 接口，节省 API 费用。
    *   **快速翻译**: 本地缓存机制提升翻译响应速度，让聊天沟通流畅。
    *   **LRU 淘汰策略**: 采用 LRU（最近最少使用）算法管理缓存，当缓存达到预设容量时，自动清理最久未访问的条目，确保缓存始终包含最新且最常用的翻译，提高命中率。
    *   **高效存储**: 支持 **结果去重**（识别相同翻译结果，减少文件大小）和 **长文本哈希**（为长消息生成唯一键，优化存储）。

*   ###  游戏术语库
    *   允许用户添加和管理自定义的游戏术语（如职业名称、副本缩写等），确保这些特殊词汇在翻译时保持准确性，提升游戏内翻译质量。

*   ###  图形用户界面 (GUI)
    *   提供实时GUI 界面，显示当前翻译引擎状态、缓存命中率、内存优化情况、术语库规模等信息。
    *   **多语言支持**: 界面支持 `'en', 'zh', 'zh-TW', 'de', 'es', 'fr', 'ru'等多种语言。
    *   **自定义界面语言**: 如果现有界面语言不满足需求，可使用命令 `/translate interface [你的语言代码]` 进行设置（此功能依赖 AI 翻译接口，设置后请查看 Toolbox 后台日志确认翻译完成）。

---

## 快速使用

插件默认使用 Google 翻译，无需任何配置即可开始使用。

1.  **第一步：打开设置界面**
    在 TERA 聊天框中输入以下命令，即可打开插件的图形用户界面 (GUI)：
    ```
    /8 translate gui
    ```
    *   **源语言**: 推荐默认 `auto`（自动检测）。
    *   **目标语言**: 设置您希望接收到的消息被翻译成的语言（如 `zh` 中文，`en` 英文）。
    *   **发送语言**: 设置您希望发送的消息被翻译成的语言（如 `en` 英文）。
    *   **注意**：发送消息时，在消息的结尾加入"#"，会跳过发送模式不进行翻译，直接发送原始消息。方便游戏内与相同语言玩家沟通。

2.  **第二步：选择翻译引擎（或配置 AI 引擎）**
    *   **默认使用 Google 翻译**: 插件开箱即用，无需额外配置。
    *   **设置AI 翻译接口**: 建议在 GUI 中选择 AI 翻译提供商（如 `gemini`、`openai`），设置相应的 **API 密钥**，以获得更准确的翻译质量。

3.  **第三步：开始使用**
    *   **接收翻译**: 配置完成后，插件将自动翻译其他玩家的聊天信息。
    *   **发送翻译**: 在 GUI 中启用"发送模式"，并设置一个"发送语言"（例如 `en`）。之后，您在聊天框中正常输入您的母语（如中文），发送后，插件会自动将其翻译成目标语言（如英文）发送出去，并在您的聊天框中显示原文，确保您知道发送了什么内容。

---

## 详细设置介绍

### 1. 翻译接口设置

#### Google 翻译 (默认)

#### Gemini API (Google AI)

*   **设置步骤**:
    1.  **获取密钥**: 访问 [Google AI Studio](https://aistudio.google.com/apikey) 获取您的 Gemini API 密钥。
    2.  **选择提供商**: 在 GUI 中将翻译提供商选为 `gemini`。
    3.  **配置密钥**: 使用命令设置您的密钥（支持多个密钥，用逗号 `,` 分隔）。
        *   **单密钥示例**:
            ```
            translate config geminiKeys YOUR_GEMINI_API_KEY_HERE # 请替换为您的实际密钥
            ```
        *   **多密钥示例**:
            ```
            translate config geminiKeys KEY1_EXAMPLE,KEY2_EXAMPLE,KEY3_EXAMPLE # 请替换为您的实际密钥
            ```
    4.  **配置模型**: 通过命令配置您希望使用的具体 Gemini 模型（例如：`gemini-2.5-flash`, `gemini-2.5-flash-lite`，`gemini-2.0-flash`）：
        ```
        translate config geminiModels gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.0-flash
        ```


    *   **提示**: Gemini 在部分国家/地区（例如：国内、香港、俄罗斯等）不支持访问。详情请查看：[限制地区](https://ai.google.dev/gemini-api/docs/available-regions)。

---

#### OpenAI (ChatGPT)

*   **设置步骤**:
    1.  **获取密钥**: 访问 [OpenAI 平台](https://platform.openai.com/api-keys) 获取您的 OpenAI API 密钥。
    2.  **选择提供商**: 在 GUI 中将翻译提供商选为 `openai`。
    3.  **配置密钥**: 使用命令设置您的密钥：
        ```
        translate config openaiKey YOUR_OPENAI_API_KEY_HERE # 请替换为您的实际密钥
        ```
    4.  **配置模型**: 配置你使用的具体模型（例如：`gpt-4o-mini`）：
        ```
        translate config openaiModel gpt-4o-mini
        ```

#### 腾讯混元

*   **设置步骤**:
    1.  **获取密钥**: 获取您的腾讯云 `APIKEY`。访问 [腾讯云混元大模型 API 密钥](https://console.cloud.tencent.com/hunyuan/api-key)。
    2.  **选择提供商**: 在 GUI 中将翻译提供商选为 `hunyuan`。
    3.  **配置密钥**: 使用命令设置您的密钥：
        ```
        translate config hunyuanKey YOUR_HUNYUAN_API_KEY_HERE # 请替换为您的实际密钥
        ```
    4.  **配置模型**: 配置你使用的模型（例如：`hunyuan-turbos-latest`）：
        ```
        translate config hunyuanModel hunyuan-turbos-latest
        ```




#### 自定义 AI翻译接口（OpenAI 接口格式）

模块支持自定义AI翻译接口

**接口地址**：`customUrl` 必须以 **/v1** 结尾。请**不要**包含 `/chat/completions`。


**配置示例：**



1. 启用自定义模式
```
translate config translationProvider custom
```

2. 设置API地址：例如：https://api.example.com/v1
```
translate config customUrl https://api.deepseek.com/v1
```

3. 设置 API Key
```
translate config customKey sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

4. 设置模型名称 (如 deepseek-chat, moonshot-v1-8k 等)
```
translate config customModel deepseek-chat
```


---

### 2. 自定义游戏术语库设置

通过定义游戏内专用缩写、职业名称等词汇的翻译，可以显著提升翻译的准确性，避免 AI 翻译模型可能出现的误解。（未进行大量测试，如果出现bug，请关闭该功能）

*   **添加/更新术语**:
    假设您希望游戏中的副本缩写 "AAH" 总是被准确地翻译成 "AAH"，而不是其他内容。
    ```
    translate term add AAH AAH
    ```
    *   `AAH` 是原文（或原始缩写）。
    *   `AAH` 是您指定的目标语言译文。
    *   **提示**: `term add` 和 `term correct` 命令功能相同，都用于添加或更新术语条目。

*   **搜索术语**:
    查找您已经添加过的术语，方便管理。
    ```
    translate term search AAH
    ```

## **界面预览**

![](https://i.imgur.com/8g2GLYJ.jpeg)


## 命令列表

| 命令                                               | 描述                                                                   |
| :----------------------------------------------- | :------------------------------------------------------------------- |
| `/translate`                                     | 打开图形用户界面 (GUI) 的快捷方式。                                                |
| `/translate list`                                | 显示所有可用的 `translate` 子命令列表及其简要说明。                                     |
| `/translate gui`                                 | 明确地打开图形用户界面 (GUI) 设置。                                                |
| **--- 缓存管理 (Cache Management) ---**              |                                                                      |
| `/translate cache`                               | 打开 GUI 中与缓存相关的设置页面。                                                  |
| `/translate cache save`                          | 手动保存当前所有内存中的缓存条目到文件，确保数据不丢失。                                         |
| `/translate cache search <关键词>`                  | 搜索缓存中包含指定关键词的翻译条目（原文或译文），并显示匹配结果。                                    |
| `/translate cache remove lang <语言代码>`            | 根据源语言代码删除缓存条目（例如：`/translate cache remove lang en`，删除所有源语言为英语的缓存）。   |
| `/translate cache remove to <语言代码>`              | 根据目标语言代码删除缓存条目（例如：`/translate cache remove to zh`，删除所有目标语言为中文的缓存）。   |
| `/translate cache remove keyword <关键词>`          | 删除缓存中包含指定关键词的翻译条目（原文或译文）。                                            |
| **--- 术语库管理 (Terminology Management) ---**       |                                                                      |
| `/translate term`                                | 打开 GUI 中与术语库相关的设置页面。                                                 |
| `/translate term add <原文> <译文>`                  | 向术语库中添加一个新的术语条目，或更新现有条目。例如：`/translate term add AAH 阿卡莎的秘密圣殿`。       |
| `/translate term correct <原文> <更正后的译文>`          | 同 `add` 命令，用于向术语库中添加或更新条目。提供此别名以增强用户理解。                              |
| `/translate term search <关键词>`                   | 在术语库中搜索包含特定关键词的条目，并显示匹配结果。                                           |
| **--- 界面语言设置 (Interface Language Settings) ---** |                                                                      |
| `/translate interface <语言代码>`                    | 设置模块用户界面的显示语言（例如：`/translate interface zh` 将界面设为中文）。                 |
| `/translate interface list`                      | 列出所有支持的界面语言，并显示当前的界面语言设置。                                            |
| **--- 配置命令 (Configuration Commands) ---**        | *以下命令均可在 GUI 界面中找到对应选项进行设置。*                                         |
| `/translate config`                              | 打开 GUI 中与配置相关的设置页面。                                                  |
| `/translate config enabled <值>`                  | 启用或禁用整个翻译模块。`[值]`可以是 `true/false/on/off/1/0`。                        |
| `/translate config sendMode <值>`                 | 启用或禁用发送模式（您的消息在发送前将被翻译）。`[值]`可以是 `true/false/on/off/1/0`。            |
| `/translate config sourceLang <语言代码>`            | 设置翻译的源语言。`[语言代码]`可以是 `auto` (自动检测) 或有效的语言代码。                         |
| `/translate config targetLang <语言代码>`            | 设置翻译的目标语言。`[语言代码]`必须是有效的语言代码，不能为 `auto`。                             |
| `/translate config sendLang <语言代码>`              | 设置发送模式下您的消息将被翻译成的语言。`[语言代码]`必须是有效的语言代码。                              |
| `/translate config interfaceLanguage <语言代码>`     | 设置模块用户界面的显示语言。`[语言代码]`必须是有效的语言代码。                                    |
| `/translate config translationProvider <提供商名称>`  | 选择用于翻译的后端服务提供商。`[提供商名称]`可以是 `google/gemini/openai/hunyuan`。          |
| `/translate config geminiOpenAIMode <模式>`        | 为 Gemini 和 OpenAI 兼容模式设置具体的连接方式。`[模式]`可以是 `cloudflare/official`。     |
| `/translate config cloudflareAccountId <账户ID>`   | 设置 Cloudflare AI Gateway 的账户 ID。                                     |
| `/translate config cloudflareGatewayId <网关ID>`   | 设置 Cloudflare AI Gateway 的网关 ID。                                     |
| `/translate config openaiModel <模型名称>`           | 设置 OpenAI 翻译模型（例如：`gpt-3.5-turbo`, `gpt-4o-mini`）。                   |
| `/translate config hunyuanModel <模型名称>`          | 设置腾讯混元翻译模型（例如：`HunYuan-Standard`）。                                   |
| `/translate config geminiModels <模型1,模型2,...>`   | 设置 Gemini 翻译模型列表，多个模型以逗号分隔（例如：`gemini-pro,gemini-flash`）。插件将按顺序尝试使用。 |
| `/translate config geminiKeys <密钥1,密钥2,...>`     | 设置 Gemini API 密钥列表，多个密钥以逗号分隔。插件将轮流使用这些密钥以避免速率限制。                     |
| `/translate config openaiKey <密钥>`               | 设置 OpenAI API 密钥。                                                    |
| `/translate config hunyuanKey <密钥>`              | 设置腾讯混元 API 密钥（格式通常为 `SecretId,SecretKey`）。                           |
| `/translate config useCache <值>`                 | 启用或禁用缓存功能。`[值]`可以是 `true/false/on/off/1/0`。                          |
| `/translate config cacheMaxSize <数量>`            | 设置最大缓存条目数量。`[数量]`必须是大于 0 的整数。                                        |
| `/translate config cacheInterval <分钟>`           | 设置自动保存缓存的间隔时间（分钟）。`[分钟]`必须是非负整数，最大 1440 分钟。                          |
| `/translate config cacheHashEnabled <值>`         | 启用或禁用长文本哈希功能。`[值]`可以是 `true/false/on/off/1/0`。                       |
| `/translate config cacheThreshold <字符数>`         | 设置长文本哈希的字符阈值。`[字符数]`必须是大于 0 的整数。                                     |
| `/translate config cacheLogLevel <级别>`           | 设置缓存日志的级别。`[级别]`可以是 `debug/info/warn/error/none`。                    |
| `/translate config cacheWriteThreshold <数量>`     | 设置写入缓存文件所需的最小条目修改或新增数量。`[数量]`必须是大于 0 的整数。                            |
| `/translate config cacheCleanupPercentage <百分比>` | 设置缓存清理时删除的条目百分比。`[百分比]`范围为 `0.0` 到 `1.0`（例如 `0.2` 代表 20%）。           |
| `/translate config cacheDedupe <值>`              | 启用或禁用缓存结果去重功能。`[值]`可以是 `true/false/on/off/1/0`。                      |
| `/translate config useTerminology <值>`           | 启用或禁用术语库功能。`[值]`可以是 `true/false/on/off/1/0`。                         |

---

## 致谢


* [hsdn](https://github.com/hsdn)
* [Pravv](https://github.com/Pravv)
* [teralove](https://github.com/teralove)
* [HakuryuuDom](https://github.com/HakuryuuDom)


 