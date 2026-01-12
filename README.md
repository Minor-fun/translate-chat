# TERA Translate Chat

TERA chat translation plugin. Supports Google Translate (default) and custom AI interfaces, with independent configuration for receive and send translation engines.

[English](README.md) | [简体中文](README-zh.md)

---

 **⚠️ Privacy & Data Security Disclaimer**

 This plugin utilizes third-party AI models (e.g., OpenAI GPT, Google Gemini) to provide translation services. Before using this feature, please be aware of the following:

 1.  **Data Transmission**: To perform translations, your in-game chat content will be sent to the servers of the AI provider you have configured.
 2.  **Data Training Risk**: Please review the privacy policy of your chosen AI provider carefully. Some providers (especially free tiers or non-enterprise APIs) may use submitted data for **model training** or **quality improvement**. This means your chat logs could theoretically be used to train future AI models.
 3.  **Sensitive Information**: It is recommended NOT to use this plugin to translate messages containing Personally Identifiable Information (PII), passwords, or highly sensitive private chats.

 **If you are concerned about data privacy or do not wish for your chat content to be processed by third-party AI companies, please DO NOT use the AI translation feature.**

---
## Description

*   **Google Translate**:
    *   Built-in Google Translate works out of the box with no configuration required.

*   **AI Translation Interface**:
    *   Supports adding OpenAI-compatible API endpoints.
    *   Works with ChatGPT, Gemini, DeepSeek,etc.
    *   Requires obtaining an API key and adding it via command.

*   **Local Cache**:
    *   Caches translated content locally; identical content does not require repeated API requests.
    *   Reduces API calls, saves costs, and speeds up response time.
    *   Uses LRU (Least Recently Used) strategy to manage cache and automatically cleans old entries.
    *   Supports manual save, search, and conditional deletion of cache.

*   **Graphical User Interface (GUI)**:
    *   Type `/8 translate` to open the graphical settings interface.
    *   Switch translation engines, set languages, manage cache, etc.
    *   Interface supports multiple display languages.

### Supported Language Codes
`am, ar, az, be, bg, bn, ca, cs, da, de, el, en, es, et, eu, fa, fi, fr, gu, he, hi, hr, hu, hy, is, it, ja, ka, kn, ko, ku, lo, lt, lv, ml, mr, ms, nl, no, or, pa, pl, pt, ro, ru, sk, sl, sq, sr, sv, ta, te, th, tl, tr, uk, ur, vi, yo, zh, zh-TW, auto`

---

## Quick Start

1.  **Usage**: The plugin runs automatically after entering the game, using Google Translate by default.
2.  **Settings**:
    *   Type `/8 translate` to open the settings interface.

### Language Settings
*   **Source Language**: The language of the message sender. Usually keep the default value `auto` (auto-detect).
*   **Target Language**: The target language for received translations. The language you want to **see**.
*   **Send Language**: The target language for sent translations. The language you want to **send**.

### Notes
*   **Skip Translation**: If you have send translation mode enabled but don't want a specific message translated, add **#** at the end of the message (e.g., `hello#`), and the plugin will send the original text.

---

## AI Interface Configuration

### 1. Add Endpoint
Use a command to add your API service.
Format: `/8 translate endpoint add <name> <API_URL> <key>`
```bash
/8 translate endpoint add mygpt https://api.openai.com/v1 sk-your-api-key...
```
*Note: API URL should end with `/v1`, do not include `/chat/completions`.*

### 2. Set Models
Tell the plugin which models this endpoint supports. Separate model names with commas.
Format: `/8 translate endpoint models <name> <model_list>`
```bash
/8 translate endpoint models mygpt gpt-4o-mini,gpt-3.5-turbo
```

### 3. Select Endpoint in GUI
Type `/8 translate` to open the graphical interface. In **Receive Settings** or **Send Settings**, select **Translation Provider** as the endpoint you just added (e.g., `mygpt`), and choose the appropriate model.

---

## API Providers

### OpenRouter (Recommended)

[OpenRouter](https://openrouter.ai/) offers various free and paid models. Users who have purchased $10 or more in credits can enjoy 1000 calls per day for each free model (50 calls/day for users without credits). Paid models are charged based on usage.

**Configuration Example:**
```bash
/8 translate endpoint add openrouter https://openrouter.ai/api/v1 sk-api-key
/8 translate endpoint models openrouter tngtech/deepseek-r1t2-chimera:free,z-ai/glm-4.5-air:free,mistralai/devstral-2512:free
```

> 💡 **Finding Free Models**: Visit the [OpenRouter Models](https://openrouter.ai/models) page and search for `free` to see all available free models.

### Google Gemini

**Configuration Example:**
```bash
/8 translate endpoint add gemini https://generativelanguage.googleapis.com/v1beta/openai/chat/completions api-key
/8 translate endpoint models gemini gemini-3-flash-preview,gemini-3-pro-preview
```

> ⚠️ **Note**: The Gemini endpoint URL differs from the standard OpenAI format. You must use the full path `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`.

---
## Interface Preview

![Interface Preview](https://i.imgur.com/b633ykt.jpeg)

---

## Command List

### Basic Commands
| Command | Description |
| :--- | :--- |
| `/8 translate gui` | Open graphical settings interface |
| `/8 translate list` | View command help |

### Configuration Commands
| Command | Description |
| :--- | :--- |
| `/8 translate config enabled <true/false>` | Enable/disable plugin (alias: `on/off`) |
| `/8 translate config sendMode <true/false>` | Enable/disable send translation mode |
| `/8 translate config sourceLang <code>` | Set source language (default `auto`) |
| `/8 translate config targetLang <code>` | Set receive target language (e.g., `zh`) |
| `/8 translate config sendLang <code>` | Set send target language (e.g., `en`) |
| `/8 translate config interfaceLanguage <code>` | Set interface display language |
| `/8 translate interface list` | List supported interface languages |
| `/8 translate interface <code>` | Quick command to switch interface language |

### Endpoint Management Commands
| Command | Description |
| :--- | :--- |
| `/8 translate endpoint list` | List all configured endpoints |
| `/8 translate endpoint add <name> <URL> <Key>` | Add a new API endpoint |
| `/8 translate endpoint models <name> <model...>` | Set supported models for an endpoint (comma-separated) |
| `/8 translate endpoint delete <name>` | Delete the specified endpoint |
| `/8 translate endpoint receive <name> [model]` | Set endpoint and model for receive channel |
| `/8 translate endpoint send <name> [model]` | Set endpoint and model for send channel |

### Cache Management Commands
| Command | Description |
| :--- | :--- |
| `/8 translate config useCache <true/false>` | Enable/disable cache |
| `/8 translate cache save` | Save in-memory cache to disk |
| `/8 translate cache search <keyword>` | Search cache content |
| `/8 translate cache remove lang <code>` | Delete cache by source language |
| `/8 translate cache remove to <code>` | Delete cache by target language |
| `/8 translate cache remove keyword <keyword>` | Delete cache entries containing keyword |
| `/8 translate config cacheMaxSize <number>` | Set maximum cache entries (default 20000) |
| `/8 translate config cacheInterval <minutes>` | Set auto-save interval (default 10) |
| `/8 translate config cacheCleanupPercentage <0.2>` | Set cleanup deletion ratio (default 0.2) |

---

## Acknowledgements

* [hsdn](https://github.com/hsdn)
* [Pravv](https://github.com/Pravv)
* [teralove](https://github.com/teralove)
* [HakuryuuDom](https://github.com/HakuryuuDom)