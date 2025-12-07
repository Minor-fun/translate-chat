# TERA Translate chat

This is a real-time chat translation plugin designed for TERA, aiming to help players easily overcome language barriers and communicate seamlessly with players from around the world. It integrates various **AI translation interfaces** and **localization features**.

[English](README.md) | [简体中文](README-zh.md) 

### **Dependency**: Requires **Toolbox** to run.

---

## Features

*   ### Translation Engine Support
    *   **Basic Translation**: Supports **Google Translate**, usable out of the box with no extra configuration.
    *   **AI Translation Interfaces**: Integrates multiple AI translation interfaces, including Google's **Gemini**, OpenAI's **ChatGPT**, and Tencent's **Hunyuan**, providing highly accurate translation results.
    *   **Language Code** support list: `am, ar, az, be, bg, bn, ca, cs, da, de, el, en, es, et, eu, fa, fi, fr, gu, he, hi, hr, hu, hy, is, it, ja, ka, kn, ko, ku, lo, lt, lv, ml, mr, ms, nl, no, or, pa, pl, pt, ro, ru, sk, sl, sq, sr, sv, ta, te, th, tl, tr, uk, ur, vi, yo, zh, zh-TW` (utilizes [Nito-ELD Language Detector](https://github.com/nitotm/efficient-language-detector-js)).

*   ### Local Cached Translations
    *   **Cost Savings**: Saves translated content locally, avoiding repetitive requests to AI interfaces and saving API costs.
    *   **Fast Translation**: The local caching mechanism improves translation response speed, making chat communication smoother.
    *   **LRU Eviction Policy**: Employs the LRU (Least Recently Used) algorithm to manage the cache. When the cache reaches its preset capacity, it automatically clears the least recently accessed entries, ensuring the cache always contains the latest and most frequently used translations, thereby increasing hit rates.
    *   **Efficient Storage**: Supports **result deduplication** (identifies identical translation results to reduce file size) and **long text hashing** (generates unique keys for long messages, optimizing storage).

*   ### Game Terminology Library
    *   Allows users to add and manage custom game terms (such as class names, dungeon abbreviations, etc.), ensuring these specific vocabularies maintain accuracy during translation and improving in-game translation quality.

*   ### Graphical User Interface (GUI)
    *   Provides a real-time GUI displaying current translation engine status, cache hit rate, memory optimization, terminology library size, and other information.
    *   **Multi-language Support**: The interface supports `'en', 'zh', 'zh-TW', 'de', 'es', 'fr', 'ru'` and other languages.
    *   **Custom Interface Language**: If existing interface languages do not meet your needs, you can use the command `/translate interface [your language code]` to set it (this feature relies on AI translation interfaces; after setting, please check the Toolbox backend logs to confirm translation completion).

---

## Quick Start

The plugin uses Google Translate by default and can be used without any configuration.

1.  **Step One: Open the Settings Interface**
    Enter the following command in the TERA chat box to open the plugin's Graphical User Interface (GUI):
    ```
    /8 translate gui
    ```
    *   **Source Language**: `auto` (auto-detect) is recommended by default.
    *   **Target Language**: Set the language you wish to receive messages translated into (e.g., `zh` for Chinese, `en` for English).
    *   **Send Language**: Set the language you wish your sent messages to be translated into (e.g., `en` for English).
    *   **Note**: When sending a message, append "#" to the end to skip send mode translation and send the original message directly. This is convenient for communicating with players who speak the same language in-game.

2.  **Step Two: Select Translation Engine (or configure AI engine)**
    *   **Default Use of Google Translate**: The plugin is ready to use out-of-the-box, no extra configuration needed.
    *   **Set AI Translation Interface**: It is recommended to select an AI translation provider (e.g., `gemini`, `openai`) in the GUI and set the corresponding **API Key** for more accurate translation quality.

3.  **Step Three: Start Using**
    *   **Receive Translation**: Once configured, the plugin will automatically translate other players' chat messages.
    *   **Send Translation**: Enable "Send Mode" in the GUI and set a "Send Language" (e.g., `en`). Afterwards, you type your native language (e.g., Chinese) normally in the chat box. Upon sending, the plugin will automatically translate it into the target language (e.g., English) and send it, displaying your original text in your chat box to ensure you know what you sent.

---

## Detailed Configuration Guide

### 1. Translation Interface Settings

#### Google Translate (Default)

#### Gemini API (Google AI)

*   **Setup Steps**:
    1.  **Get Key**: Visit [Google AI Studio](https://aistudio.google.com/apikey) to obtain your Gemini API key.
    2.  **Select Provider**: In the GUI, select `gemini` as the translation provider.
    3.  **Configure Key**: Use the command to set your key (multiple keys supported, separated by commas `,`).
        *   **Single Key Example**:
            ```
            translate config geminiKeys YOUR_GEMINI_API_KEY_HERE # Please replace with your actual key
            ```
        *   **Multiple Keys Example**:
            ```
            translate config geminiKeys KEY1_EXAMPLE,KEY2_EXAMPLE,KEY3_EXAMPLE # Please replace with your actual keys
            ```
    4.  **Configure Model**: Use the command to configure the specific Gemini model you wish to use (e.g., `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.0-flash`):
        ```
        translate config geminiModels gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.0-flash
        ```

    *   **Tip**: Gemini does not support access in some countries/regions (e.g., China, Hong Kong, Russia, etc.). Details: [Available Regions](https://ai.google.dev/gemini-api/docs/available-regions).

---

#### OpenAI (ChatGPT)

*   **Setup Steps**:
    1.  **Get Key**: Visit [OpenAI Platform](https://platform.openai.com/api-keys) to obtain your OpenAI API key.
    2.  **Select Provider**: In the GUI, select `openai` as the translation provider.
    3.  **Configure Key**: Use the command to set your key:
        ```
        translate config openaiKey YOUR_OPENAI_API_KEY_HERE # Please replace with your actual key
        ```
    4.  **Configure Model**: Configure the specific model you use (e.g., `gpt-4o-mini`):
        ```
        translate config openaiModel gpt-4o-mini
        ```

#### Tencent Hunyuan

*   **Setup Steps**:
    1.  **Get Key**: Obtain your Tencent Cloud `APIKEY`. Visit [Tencent Cloud Hunyuan Large Model API Key](https://console.cloud.tencent.com/hunyuan/api-key).
    2.  **Select Provider**: In the GUI, select `hunyuan` as the translation provider.
    3.  **Configure Key**: Use the command to set your key:
        ```
        translate config hunyuanKey YOUR_HUNYUAN_API_KEY_HERE # Please replace with your actual key
        ```
    4.  **Configure Model**: Configure the model you use (e.g., `hunyuan-turbos-latest`):
        ```
        translate config hunyuanModel hunyuan-turbos-latest
        ```

#### Custom AI Translation Interface (OpenAI Interface Format)

The module supports custom AI translation interfaces.

**Interface URL**: `customUrl` must end with **/v1**. Please **do not** include `/chat/completions`.

**Configuration Example:**

1. Enable Custom Mode
```
translate config translationProvider custom
```

2. Set API Address: e.g., https://api.example.com/v1
```
translate config customUrl https://api.deepseek.com/v1
```

3. Set API Key
```
translate config customKey sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

4. Set Model Name (e.g., deepseek-chat, moonshot-v1-8k, etc.)
```
translate config customModel deepseek-chat
```

---

### 2. Custom Game Terminology Library Settings

By defining translations for in-game specific abbreviations, class names, and other terms, you can significantly improve translation accuracy and avoid potential misunderstandings by AI translation models. (Not extensively tested; if bugs occur, please disable this feature).

*   **Add/Update Terminology**:
    Suppose you want the in-game dungeon abbreviation "AAH" to always be accurately translated as "AAH", not something else.
    ```
    translate term add AAH AAH
    ```
    *   `AAH` is the original text (or original abbreviation).
    *   `AAH` is your specified target language translation.
    *   **Tip**: `term add` and `term correct` commands have the same functionality, both used to add or update terminology entries.

*   **Search Terminology**:
    Find terms you have already added for easier management.
    ```
    translate term search AAH
    ```

## **Interface Preview**

![](https://i.imgur.com/PfRVSHN.jpeg)

## Command List

| Command                                                    | Description                                                                                                                                                                                              |
| :--------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/translate`                                               | Shortcut to open the Graphical User Interface (GUI).                                                                                                                                                     |
| `/translate list`                                          | Displays a list of all available `translate` sub-commands and their brief descriptions.                                                                                                                   |
| `/translate gui`                                           | Explicitly opens the Graphical User Interface (GUI) settings.                                                                                                                                            |
| **--- Cache Management ---**                               |                                                                                                                                                                                                          |
| `/translate cache`                                         | Opens the cache-related settings page in the GUI.                                                                                                                                                        |
| `/translate cache save`                                    | Manually saves all current in-memory cache entries to a file, ensuring data persistence.                                                                                                                  |
| `/translate cache search <keyword>`                        | Searches cache for translation entries (original or translated text) containing the specified keyword and displays matching results.                                                                       |
| `/translate cache remove lang <language_code>`             | Removes cache entries based on the source language code (e.g., `/translate cache remove lang en` removes all cache entries with English as the source language).                                        |
| `/translate cache remove to <language_code>`               | Removes cache entries based on the target language code (e.g., `/translate cache remove to zh` removes all cache entries with Chinese as the target language).                                        |
| `/translate cache remove keyword <keyword>`                | Removes cache entries containing the specified keyword (original or translated text).                                                                                                                     |
| **--- Terminology Management ---**                         |                                                                                                                                                                                                          |
| `/translate term`                                          | Opens the terminology library-related settings page in the GUI.                                                                                                                                          |
| `/translate term add <original_text> <translated_text>`    | Adds a new terminology entry to the terminology library, or updates an existing entry. Example: `/translate term add AAH Akasha's Secret Sanctuary`.                                                      |
| `/translate term correct <original_text> <corrected_text>` | Same as the `add` command, used to add or update entries in the terminology library. This alias is provided for improved user understanding.                                                              |
| `/translate term search <keyword>`                         | Searches for entries containing a specific keyword in the terminology library and displays matching results.                                                                                             |
| **--- Interface Language Settings ---**                    |                                                                                                                                                                                                          |
| `/translate interface <language_code>`                     | Sets the display language for the module's user interface (e.g., `/translate interface zh` sets the interface to Chinese).                                                                           |
| `/translate interface list`                                | Lists all supported interface languages and displays the current interface language setting.                                                                                                             |
| **--- Configuration Commands ---**                         | *The following commands all have corresponding options in the GUI interface.*                                                                                                                            |
| `/translate config`                                        | Opens the configuration-related settings page in the GUI.                                                                                                                                                |
| `/translate config enabled <value>`                        | Enables or disables the entire translation module. `[value]` can be `true/false/on/off/1/0`.                                                                                                             |
| `/translate config sendMode <value>`                       | Enables or disables send mode (your messages will be translated before sending). `[value]` can be `true/false/on/off/1/0`.                                                                             |
| `/translate config sourceLang <language_code>`             | Sets the source language for translation. `[language_code]` can be `auto` (auto-detect) or a valid language code.                                                                                        |
| `/translate config targetLang <language_code>`             | Sets the target language for translation. `[language_code]` must be a valid language code, not `auto`.                                                                                                 |
| `/translate config sendLang <language_code>`               | Sets the language into which your messages will be translated in send mode. `[language_code]` must be a valid language code.                                                                            |
| `/translate config interfaceLanguage <language_code>`      | Sets the display language for the module's user interface. `[language_code]` must be a valid language code.                                                                                              |
| `/translate config translationProvider <provider_name>`    | Selects the backend service provider for translation. `[provider_name]` can be `google/gemini/openai/hunyuan`.                                                                                         |
| `/translate config geminiOpenAIMode <mode>`                | Sets the specific connection method for Gemini and OpenAI compatible mode. `[mode]` can be `cloudflare/official`.                                                                                        |
| `/translate config cloudflareAccountId <account_ID>`       | Sets the Cloudflare AI Gateway account ID.                                                                                                                                                               |
| `/translate config cloudflareGatewayId <gateway_ID>`       | Sets the Cloudflare AI Gateway gateway ID.                                                                                                                                                               |
| `/translate config openaiModel <model_name>`               | Sets the OpenAI translation model (e.g., `gpt-3.5-turbo`, `gpt-4o-mini`).                                                                                                                                |
| `/translate config hunyuanModel <model_name>`              | Sets the Tencent Hunyuan translation model (e.g., `HunYuan-Standard`).                                                                                                                                   |
| `/translate config geminiModels <model1,model2,...>`       | Sets the list of Gemini translation models, multiple models separated by commas (e.g., `gemini-pro,gemini-flash`). The plugin will attempt to use them in order.                                        |
| `/translate config geminiKeys <key1,key2,...>`             | Sets the list of Gemini API keys, multiple keys separated by commas. The plugin will cycle through these keys to avoid rate limits.                                                                     |
| `/translate config openaiKey <key>`                        | Sets the OpenAI API key.                                                                                                                                                                                 |
| `/translate config hunyuanKey <key>`                       | Sets the Tencent Hunyuan API key (format usually `SecretId,SecretKey`).                                                                                                                                  |
| `/translate config useCache <value>`                       | Enables or disables the caching function. `[value]` can be `true/false/on/off/1/0`.                                                                                                                      |
| `/translate config cacheMaxSize <number>`                  | Sets the maximum number of cache entries. `[number]` must be an integer greater than 0.                                                                                                                  |
| `/translate config cacheInterval <minutes>`                | Sets the automatic cache save interval (in minutes). `[minutes]` must be a non-negative integer, maximum 1440 minutes.                                                                                 |
| `/translate config cacheHashEnabled <value>`               | Enables or disables long text hashing. `[value]` can be `true/false/on/off/1/0`.                                                                                                                         |
| `/translate config cacheThreshold <char_count>`            | Sets the character threshold for long text hashing. `[char_count]` must be an integer greater than 0.                                                                                                    |
| `/translate config cacheLogLevel <level>`                  | Sets the cache log level. `[level]` can be `debug/info/warn/error/none`.                                                                                                                               |
| `/translate config cacheWriteThreshold <number>`           | Sets the minimum number of cache entry modifications or additions required to force an automatic save to file. `[number]` must be an integer greater than 0.                                         |
| `/translate config cacheCleanupPercentage <percentage>`    | Sets the percentage of entries deleted during cache cleanup. `[percentage]` ranges from `0.0` to `1.0` (e.g., `0.2` for 20%).                                                                         |
| `/translate config cacheDedupe <value>`                    | Enables or disables cache result deduplication. `[value]` can be `true/false/on/off/1/0`.                                                                                                                |
| `/translate config useTerminology <value>`                 | Enables or disables the terminology library function. `[value]` can be `true/false/on/off/1/0`.                                                                                                          |

---

## Acknowledgements


* [hsdn](https://github.com/hsdn)
* [Pravv](https://github.com/Pravv)
* [teralove](https://github.com/teralove)
* [HakuryuuDom](https://github.com/HakuryuuDom)