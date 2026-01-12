/**
 * translation-service.js
 * 
 * Translation Service - Handles actual translation logic
 * 
 * Responsibilities:
 * - Coordinating endpoint manager and cache manager
 * - Execute AI translation and Google translation
 * - Handle translation errors and fallback logic
 */

'use strict';

const request = require('node-fetch');
const { defaultCacheManager } = require('../managers/cache-manager');
const { handleTranslationError } = require('../utils/error-handler');
const LanguageDetect = require('../../lib/language-detector');

// Initialize language detector
const lngDetector = new LanguageDetect();
lngDetector.setLanguageType('iso2');

// Supported languages list - single source of truth
const AVAILABLE_LANGUAGES = [
    'am', 'ar', 'az', 'be', 'bg', 'bn', 'ca', 'cs', 'da', 'de',
    'el', 'en', 'es', 'et', 'eu', 'fa', 'fi', 'fr', 'gu', 'he',
    'hi', 'hr', 'hu', 'hy', 'is', 'it', 'ja', 'ka', 'kn', 'ko',
    'ku', 'lo', 'lt', 'lv', 'ml', 'mr', 'ms', 'nl', 'no', 'or',
    'pa', 'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sq', 'sr', 'sv',
    'ta', 'te', 'th', 'tl', 'tr', 'uk', 'ur', 'vi', 'yo',
    'zh', 'zh-CN', 'zh-TW', 'auto'
];

// AI translation system prompt
const AI_PROMPT = `You are a veteran player and translation assistant for the TERA EU server. Your task is to translate in-game chat messages strictly adhering to the following instructions:
1. No Machine Translation Tone (Gamer Slang):
Use the natural spoken language of MMORPG players.
Avoid formal written language; use concise, punchy expressions typical of gamers.
2. Output Constraints:
Output ONLY the translation.`;

/**
 * Translation service class
 */
class TranslationService {
    /**
     * @param {EndpointManager} endpointManager - Endpoint manager instance
     * @param {Object} i18n - I18n instance (optional)
     */
    constructor(endpointManager, i18n = null) {
        this.endpointManager = endpointManager;
        this.i18n = i18n;
        this.cacheManager = defaultCacheManager;

        // Translation state tracking
        this.state = {
            receive: { model: '', errorType: '' },
            send: { model: '', errorType: '' }
        };
    }

    /**
     * Set i18n instance
     * @param {Object} i18n
     */
    setI18n(i18n) {
        this.i18n = i18n;
    }

    /**
     * Get i18n translate function
     * @private
     */
    _getTranslateFunc() {
        return this.i18n ? (key, ...args) => this.i18n.t(key, ...args) : null;
    }



    /**
     * Execute translation for receiving
     * @param {string} text - Text to translate
     * @param {string} targetLang - Target language
     * @param {string} sourceLang - Source language
     * @param {boolean} useCache - Whether to use cache
     * @returns {Promise<{text: string, provider: string}>}
     */
    async translateForReceive(text, targetLang, sourceLang = 'auto', useCache = true) {
        const endpointInfo = this.endpointManager.getReceiveEndpointInfo();
        return this._translate(text, targetLang, sourceLang, useCache, endpointInfo, 'receive');
    }

    /**
     * Execute translation for sending
     * @param {string} text - Text to translate
     * @param {string} targetLang - Target language
     * @param {string} sourceLang - Source language
     * @param {boolean} useCache - Whether to use cache
     * @returns {Promise<{text: string, provider: string}>}
     */
    async translateForSend(text, targetLang, sourceLang = 'auto', useCache = true) {
        const endpointInfo = this.endpointManager.getSendEndpointInfo();
        return this._translate(text, targetLang, sourceLang, useCache, endpointInfo, 'send');
    }

    /**
     * General translation method (for UI translation, etc.)
     * @param {string} text - Text to translate
     * @param {string} targetLang - Target language
     * @param {string} sourceLang - Source language
     * @param {boolean} useCache - Whether to use cache
     * @returns {Promise<string>}
     */
    async translate(text, targetLang, sourceLang = 'auto', useCache = true) {
        // Default to using receive endpoint configuration
        const endpointInfo = this.endpointManager.getReceiveEndpointInfo();
        const result = await this._translate(text, targetLang, sourceLang, useCache, endpointInfo, 'receive');
        return result.text;
    }

    /**
     * Core translation implementation
     * @private
     */
    async _translate(text, targetLang, sourceLang, useCache, endpointInfo, direction) {
        // Language detection for skip logic
        const detectedLanguage = lngDetector.detect(text, 1);
        const detectedLangCode = detectedLanguage[0] ? detectedLanguage[0][0] : null;

        // Skip translation if detected language matches target language
        if (detectedLangCode && detectedLangCode === targetLang) {
            return { text, provider: 'Skip' };
        }

        // Chinese simplified/traditional interoperability - skip translation
        const isChineseVariant = (lang) => lang === 'zh' || lang === 'zh-CN' || lang === 'zh-TW';
        if (detectedLangCode && isChineseVariant(detectedLangCode) && isChineseVariant(targetLang)) {
            return { text, provider: 'Skip' };
        }

        // Use detected language as source language when sourceLang is 'auto'
        if (sourceLang === 'auto' && detectedLangCode) {
            sourceLang = detectedLangCode;
        }

        // Check cache
        const cacheKey = this.cacheManager.generateKey(text, sourceLang, targetLang, direction);

        if (useCache) {
            const cachedResult = this.cacheManager.get(cacheKey);
            if (cachedResult) {
                return { text: cachedResult, provider: 'Cache' };
            }
        }

        let translatedText;
        let providerName;
        const translateFunc = this._getTranslateFunc();

        try {
            if (endpointInfo.isGoogle) {
                // Use Google Translate
                translatedText = await this._translateWithGoogle(text, targetLang, sourceLang);
                providerName = 'Google';
                this.state[direction] = { model: 'Google', errorType: '' };
            } else {
                // Use AI endpoint translation (no fallback to Google)
                translatedText = await this._translateWithAI(
                    text,
                    targetLang,
                    sourceLang,
                    endpointInfo.endpoint,
                    endpointInfo.model
                );
                providerName = endpointInfo.model || endpointInfo.endpoint.name;
                this.state[direction] = { model: providerName, errorType: '' };
            }

            // Cache result
            if (useCache && translatedText) {
                this.cacheManager.set(cacheKey, translatedText);
            }

            return { text: translatedText, provider: providerName };
        } catch (error) {
            const providerName = endpointInfo.isGoogle ? 'Google' : (endpointInfo.endpoint?.name || 'unknown');
            const errorInfo = handleTranslationError(error, providerName, translateFunc);
            this.state[direction] = {
                model: endpointInfo.isGoogle ? 'Google' : (endpointInfo.model || endpointInfo.endpoint?.name || ''),
                errorType: errorInfo.type
            };

            console.error(`Translation failed for ${direction}:`, error.message);
            throw error;
        }
    }

    /**
     * Translate using AI endpoint
     * @private
     */
    async _translateWithAI(text, targetLang, sourceLang, endpoint, model) {
        if (!endpoint || !endpoint.url) {
            throw new Error('Endpoint URL not configured');
        }

        if (!endpoint.key) {
            throw new Error('Endpoint API key not configured');
        }

        if (!model) {
            throw new Error('Model not specified');
        }

        const translationPrompt = `
Source Language: ${sourceLang}
Target Language: ${targetLang}
Original Text:
"""
${text}
"""
Translation:`;

        const requestBody = {
            model: model,
            messages: [
                { role: 'system', content: AI_PROMPT },
                { role: 'user', content: translationPrompt }
            ],
            temperature: 0.4,
            ...endpoint.extraParams
        };

        const apiUrl = `${endpoint.url}/chat/completions`;

        const response = await request(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${endpoint.key}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            let errorBody = {};
            try {
                errorBody = await response.json();
            } catch (e) {
                // Ignore parsing error
            }

            const error = new Error(`HTTP Error ${response.status}: ${response.statusText || ''}`);
            error.statusCode = response.status;
            error.responseBody = errorBody;
            throw error;
        }

        const jsonBody = await response.json();

        if (!jsonBody.choices?.[0]?.message?.content) {
            throw new Error('Invalid AI translation response');
        }

        return jsonBody.choices[0].message.content.trim();
    }

    /**
     * Translate using Google (primary: GTX API, fallback: Dictionary API)
     * @private
     */
    async _translateWithGoogle(text, targetLang, sourceLang) {
        // Try GTX API first (more stable)
        try {
            return await this._googleGTX(text, targetLang, sourceLang);
        } catch (e) {
            // GTX API failed, try Dictionary API
        }

        // Fallback to Dictionary API
        return await this._googleDict(text, targetLang, sourceLang);
    }

    /**
     * Google GTX API
     * @private
     */
    async _googleGTX(text, targetLang, sourceLang) {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

        const response = await request(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            const error = new Error(`Google GTX API Error ${response.status}`);
            error.statusCode = response.status;
            throw error;
        }

        const data = JSON.parse(await response.text());

        if (!data || !data[0]) {
            throw new Error('Invalid Google GTX response');
        }

        // Extract translation from nested array
        return data[0].map(item => item[0]).filter(Boolean).join('');
    }

    /**
     * Google Dictionary API (fallback)
     * @private
     */
    async _googleDict(text, targetLang, sourceLang) {
        const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${sourceLang}&tl=${targetLang}&q=${encodeURIComponent(text)}`;

        const response = await request(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            const error = new Error(`Google Dict API Error ${response.status}`);
            error.statusCode = response.status;
            throw error;
        }

        const data = JSON.parse(await response.text());

        // Handle different response formats
        if (Array.isArray(data)) {
            return data[0] || '';
        } else if (data.sentences) {
            return data.sentences.map(s => s.trans).join('');
        }

        throw new Error('Invalid Google Dict response');
    }

    /**
     * Get translation provider name for receive direction
     * @returns {string}
     */
    getReceiveProvider() {
        const state = this.state.receive;
        if (state.errorType) {
            return `${state.model} (${state.errorType})`;
        }
        return state.model || this.endpointManager.getReceiveDisplayName();
    }

    /**
     * Get translation provider name for send direction
     * @returns {string}
     */
    getSendProvider() {
        const state = this.state.send;
        if (state.errorType) {
            return `${state.model} (${state.errorType})`;
        }
        return state.model || this.endpointManager.getSendDisplayName();
    }

    /**
     * Get translation state
     * @param {string} direction - 'receive' or 'send'
     * @returns {Object}
     */
    getState(direction = 'receive') {
        const config = direction === 'send'
            ? this.endpointManager.getSendConfig()
            : this.endpointManager.getReceiveConfig();

        const state = this.state[direction];
        const endpointInfo = direction === 'send'
            ? this.endpointManager.getSendEndpointInfo()
            : this.endpointManager.getReceiveEndpointInfo();

        return {
            direction,
            endpoint: config.endpoint,
            model: config.model || state.model,
            errorType: state.errorType,
            isGoogle: endpointInfo.isGoogle,
            displayName: direction === 'send'
                ? this.getSendProvider()
                : this.getReceiveProvider()
        };
    }

    /**
     * Get cache statistics
     * @returns {Object}
     */
    getCacheStats() {
        return this.cacheManager.getStats();
    }
}

module.exports = { TranslationService, AVAILABLE_LANGUAGES };
