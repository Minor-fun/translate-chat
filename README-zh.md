# TERA Translate chat

这是一款为 TERA 设计的实时聊天翻译插件，旨在帮助玩家轻松跨越语言障碍，与来自全球的玩家无缝交流。加入了多种 **AI 翻译接口** 和 **本地化功能**。

[English](README.md) | [简体中文](README-zh.md) 

### **依赖**：需要运行 **Toolbox 工具箱**。

---

##  特点

*   ###  翻译引擎支持
    *   **基础翻译**: 支持 **Google 翻译**，无需额外配置即可使用。
    *   **AI 翻译接口**: 接入多种AI 翻译接口，包括 Google 的 **Gemini**、OpenAI 的 **ChatGPT** 和腾讯的 **混元**，提供更高准确的翻译结果。
    *   **语言代码**支持列表： `am, ar, az, be, bg, bn, ca, cs, da, de, el, en, es, et, eu, fa, fi, fr, gu, he, hi, hr, hu, hy, is, it, ja, ka, kn, ko, ku, lo, lt, lv, ml, mr, ms, nl, no, or, pa, pl, pt, ro, ru, sk, sl, sq, sr, sv, ta, te, th, tl, tr, uk, ur, vi, yo, zh` （采用 [Nito-ELD 语言检测器](https://github.com/nitotm/efficient-language-detector-js) ）。

*   ###  本地缓存翻译
    *   **节约成本**: 将已翻译内容保存至本地，避免重复请求 AI 接口，节省 API 费用。
    *   **快速翻译**: 本地缓存机制提升翻译响应速度，让聊天沟通流畅。
    *   **LRU 淘汰策略**: 采用 LRU（最近最少使用）算法管理缓存，当缓存达到预设容量时，自动清理最久未访问的条目，确保缓存始终包含最新且最常用的翻译，提高命中率。
    *   **高效存储**: 支持 **结果去重**（识别相同翻译结果，减少文件大小）和 **长文本哈希**（为长消息生成唯一键，优化存储）。

*   ###  游戏术语库
    *   允许用户添加和管理自定义的游戏术语（如职业名称、副本缩写等），确保这些特殊词汇在翻译时保持准确性，提升游戏内翻译质量。

*   ###  图形用户界面 (GUI)
    *   提供实时GUI 界面，显示当前翻译引擎状态、缓存命中率、内存优化情况、术语库规模等信息。
    *   **多语言支持**: 界面支持 `'en', 'zh', 'ko', 'ja', 'ru', 'es', 'pt', 'fr', 'de', 'it', 'nl', 'pl', 'sv', 'cs', 'ro', 'uk', 'bg', 'el', 'da', 'no', 'fi'` 等多种语言。
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

#### AI 翻译接口的准确度直接取决于所选 AI 模型的质量。模型能力越强，翻译准确度越高。

### 1. 翻译接口设置

#### Google 翻译 (默认)

*   **特点**: **免费**、**无需任何配置** 即可使用。
*   **局限**: 翻译质量不如 AI 模型准确，且可能受网络波动影响，稳定性一般。

#### Gemini API (Google AI)

*   **特点**:
    *   **免费使用**，免费层级有[速率限制](https://ai.google.dev/gemini-api/docs/rate-limits)
    *   支持 **模型降级策略**：在模型受限时自动尝试其他可用模型，提高可用性。
    *   支持 **多密钥循环**：配置多个密钥可避免 API 速率限制。
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
    4.  **配置模型**: 通过命令配置您希望使用的具体 Gemini 模型（例如：`gemini-2.5-flash`, `gemini-2.5-flash-lite`，`gemini-2.0-flash`）[查看模型列表](https://ai.google.dev/gemini-api/docs/models)：
        ```
        translate config geminiModels gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.0-flash
        ```


    *   **提示**: Gemini 在部分国家/地区（例如：国内、香港、俄罗斯等）不支持访问。详情请查看：[限制地区](https://ai.google.dev/gemini-api/docs/available-regions)。
    * **绕过gemini地区限制方法**：
	    * 1、使用游戏加速器加速toolbox，需要确保游戏加速器节点在gemini支持区域列表。
	    * 2、使用[cfll-gemini](https://github.com/DragonEmpery/cfll-gemini)项目，关闭Translate chat插件更新，修改translate-chat\src\translate.js文件，将文件内的`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`，替换成cfll-gemini项目获取的地址

---

*   **Cloudflare AI Gateway 模式 (可选)**:
    如果您拥有 Cloudflare 账户，可以利用其 AI Gateway 服务，进一步提高 API 稳定性并方便分析 API 用量。
    1.  **创建 AI Gateway**: 登录 Cloudflare 主页，左侧导航栏依次点击 **AI** → **AI Gateway** → 右上角 **创建网关**，命名为："mygemini" (或其他您喜欢的名称)。
    2.  **获取 API 端点**: 点击您已创建的网关，再点击右上角 **API** 按钮，查看 API 端点（例如：`https://gateway.ai.cloudflare.com/v1/YOUR_CLOUDFLARE_ACCOUNT_ID_EXAMPLE/mygemini/`）。
    3.  **插件配置**: 在 GUI 的 "Gemini OpenAI兼容模式" 中选择 `cloudflare`。
    4.  **设置 ID**: 使用命令配置您的 Cloudflare 账户 ID 和 AI Gateway 网关 ID：
        ```
        translate config cloudflareAccountId YOUR_CLOUDFLARE_ACCOUNT_ID_HERE # 请替换为您的实际账户ID
        translate config cloudflareGatewayId mygemini # 请替换为您的实际网关ID
        ```

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

---

### 3. GUI 界面设置

GUI 界面提供了直观的方式来管理插件的各项功能和参数。

#### **一、通用模块设置**

*   **模块启用状态 (`enabled`)**
    *   **可选值：** 启用 (`[绿色]`) / 禁用 (`[红色]`)
    *   **说明：** 控制整个翻译模块是否开启或关闭。
*   **发送模式 (`sendMode`)**
    *   **可选值：** 启用 (`[绿色]`) / 禁用 (`[红色]`)
    *   **说明：** 开启后，您发送的聊天消息将根据 `sendLang` 设置自动进行翻译。

#### **二、翻译提供商设置**

*   **翻译提供商 (`translationProvider`)**
    *   **可选值：** `google`, `gemini`, `openai`, `hunyuan`
    *   **说明：** 选择用于执行翻译的后端服务。当前选中的提供商会以绿色高亮显示。

#### **三、Gemini / Cloudflare 兼容模式设置**

*   **兼容模式 (`geminiOpenAIMode`)**
    *   **可选值：** `cloudflare`, `official`
    *   **说明：** 通过 Cloudflare AI Gateway 中转，或直接连接官方 API。当前选中的模式会以绿色高亮显示。

#### **四、本地缓存翻译设置**

*   **启用缓存 (`useCache`)**
    *   **可选值：** 启用 (`[绿色]`) / 禁用 (`[红色]`)
    *   **说明：** 控制是否启用翻译结果的本地缓存功能。
*   **最大缓存条目数 (`cacheMaxSize`)**
    *   **可选值：** `10000`, `20000`, `40000`, `50000`, `100000`
    *   **说明：** 设定缓存中最多可以存储的翻译条目数量。数值越大，可缓存的数据越多，但占用内存也越大。
*   **自动保存间隔 (`cacheInterval`)**
    *   **可选值：** `1`, `5`, `10`, `30`, `60` (分钟)
    *   **说明：** 设定缓存自动保存到本地文件的频率。
*   **日志级别 (`cacheLogLevel`)**
    *   **可选值：** `debug`, `info`, `warn`, `error`, `none`
    *   **说明：** 控制缓存系统日志的详细程度。`none` 表示不显示任何缓存日志。
*   **长文本哈希 (`cacheHashEnabled`)**
    *   **可选值：** 启用 (`[绿色]`) / 禁用 (`[红色]`)
    *   **说明：** 启用后，对长文本（超过 `cacheThreshold` 设定字符数）进行哈希处理，以更紧凑的方式存储其键值，提高缓存效率。
*   **结果去重 (`cacheDedupe` / `deduplicateResults`)**
    *   **可选值：** 启用 (`[绿色]`) / 禁用 (`[红色]`)
    *   **说明：** 启用后，缓存会识别并存储唯一的翻译结果，减少重复数据和缓存文件大小。
*   **长文本阈值 (`cacheThreshold` / `longTextThreshold`)**
    *   **可选值：** `10`, `20`, `30`, `50`, `100` (字符数)
    *   **说明：** 定义文本达到多少字符时被视为"长文本"，并可能进行哈希处理（当 `cacheHashEnabled` 启用时）。
*   **写入阈值 (`cacheWriteThreshold`)**
    *   **可选值：** `50`, `100`, `200`, `500` (次)
    *   **说明：** 控制在多少次缓存写入操作后强制进行一次自动保存，平衡性能与数据持久性。
*   **清理百分比 (`cacheCleanupPercentage`)**
    *   **可选值：** `0.1`, `0.2`, `0.3`, `0.5` (百分比，例如 `0.2` 代表 20%)
    *   **说明：** 当缓存条目数量达到 `cacheMaxSize` 时，每次清理操作将删除多少百分比的旧条目，为新数据腾出空间。

#### 不同缓存条目数量的模拟测试对比
> 采用中文到英文的真实聊天数据模拟不同缓存条目数的资源占用，实际不同的聊天内容会有不同的性能表现，仅供参考

| 性能指标        | 10,000 条目 | 20,000 条目 | 40,000 条目 | 50,000 条目 | 100,000 条目 | 单位    |
| :---------- | :-------- | :-------- | :-------- | :-------- | :--------- | :---- |
| **缓存文件**    | 1.15      | 2.32      | 4.67      | 5.84      | 11.70      | MB    |
| **缓存加载速度**  | 960,227   | 853,271   | 946,528   | 1,036,480 | 1,041,439  | 条目/秒  |
| **随机读取速度**  | 2,844,950 | 2,457,606 | 2,619,172 | 2,384,359 | 2,231,645  | 条目/秒  |
| **顺序读取速度**  | 3,397,893 | 3,157,562 | 2,672,368 | 2,653,928 | 2,308,403  | 条目/秒  |
| **文件读取速度**  | 1,769,598 | 1,746,771 | 1,543,383 | 1,828,541 | 1,614,969  | 条目/秒  |
| **文件写入速度**  | 2,981,426 | 3,047,108 | 2,812,841 | 2,438,251 | 3,156,147  | 条目/秒  |
| **LRU更新速度** | 3,801,800 | 4,550,971 | 4,299,226 | 4,055,698 | 4,426,084  | 操作/秒  |
| **内存占用**    | 2352      | 2616      | 2321      | 2546      | 3105       | 字节/条目 |
| **总内存占用**   | 22        | 50        | 89        | 121       | 296        | MB    |

#### **五、术语库设置**

*   **启用术语库 (`useTerminology`)**
    *   **可选值：** 启用 (`[绿色]`) / 禁用 (`[红色]`)
    *   **说明：** 控制是否启用自定义游戏术语库功能。

#### **六、语言设置**

*   **界面语言 (`interfaceLanguage`)**
    *   **可选值：** `en`, `zh`, `ko`, `ja`, `ru`, `es`, `pt`, `fr`, `de`, `it`, `nl`, `pl`, `sv`, `cs`, `ro`, `uk`, `bg`, `el`, `da`, `no`, `fi` (常用语言列表)
    *   **说明：** 设置模块 GUI 的显示语言。
*   **源语言 (`sourceLang`)**
    *   **可选值：** `auto` 
    *   **说明：** 设置聊天消息的原始语言。
*   **目标语言 (`targetLang`)**
    *   **可选值：** 常用语言列表中的所有语言。
    *   **说明：** 设置接收的聊天消息将被翻译成的语言。
*   **发送语言 (`sendLang`)**
    *   **可选值：** 常用语言列表中的所有语言。
    *   **说明：** 在发送模式下，您输入的消息将被翻译成的语言。

#### **七、界面预览**

![](https://i.imgur.com/VY2Bdc0.jpeg)

![](https://i.imgur.com/yo2Jmnp.jpeg)

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


 