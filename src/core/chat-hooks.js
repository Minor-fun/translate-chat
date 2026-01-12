/**
 * chat-hooks.js
 * 
 * Chat Hook Management - Handles translation of incoming and outgoing messages
 * 
 * Responsibilities:
 * - Set up incoming message hooks (S_CHAT, S_WHISPER, S_PRIVATE_CHAT)
 * - Set up outgoing message hooks (C_CHAT, C_WHISPER)
 * - Use independent endpoint configurations for both directions
 */

'use strict';

const { normalize } = require('../utils/normalize');

/**
 * Normalize text for NA region
 * @param {string} str - Original text
 * @returns {string}
 */
function normalizeNa(str) {
    return normalize(str)
        .replace(/[^\x00-\x7F]/g, '')
        .replace(/\s+$/, '');
}

/**
 * Simplify model name, remove common prefixes and suffixes, limit length
 * @param {string} modelName - Original model name
 * @param {number} maxLength - Max length, default 18
 * @returns {string} Simplified model name
 * 
 * Example:
 * - moonshotai/kimi-k2-instruct → kimi-k2
 * - openai/gpt-4o-mini-2024-07-18 → gpt-4o..
 * - deepseek-chat → deepseek
 */
function simplifyModelName(modelName, maxLength = 18) {
    if (!modelName) return 'Google';
    if (modelName === 'Google') return 'Google';

    let name = modelName;

    // Remove org/ prefix (e.g. moonshotai/kimi-k2)
    if (name.includes('/')) {
        name = name.split('/').pop();
    }

    // Remove common suffixes
    const suffixPatterns = [
        /-chat$/i,
        /-turbo$/i,
        /-preview$/i,
        /-latest$/i,
        /-\d{4}-\d{2}-\d{2}$/,  // Date suffix -2024-07-18
        /-\d{8}$/,              // Compact date -20241022
        /-\d{4}$/               // Year suffix -2024
    ];

    for (const pattern of suffixPatterns) {
        name = name.replace(pattern, '');
    }

    // Limit length
    if (name.length > maxLength) {
        name = name.substring(0, maxLength - 2) + '..';
    }

    return name;
}

/**
 * Chat hooks management class
 */
class ChatHooks {
    /**
     * @param {Object} mod - TeraToolbox module instance
     * @param {TranslationService} translationService - Translation service instance
     * @param {Object} i18n - I18n instance
     */
    constructor(mod, translationService, i18n) {
        this.mod = mod;
        this.translationService = translationService;
        this.i18n = i18n;
    }

    /**
     * Setup all hooks
     */
    setup() {
        this._setupIncomingHooks();
        this._setupOutgoingHooks();
    }

    /**
     * Setup incoming message hooks
     * @private
     */
    _setupIncomingHooks() {
        const handler = async (packet, version, event) => {
            if (!this.mod.settings.enabled) return;
            if (this.mod.game.me.is(event.gameId)) return;

            const result = await this._handleIncoming(event.message);
            if (!result) return;

            const provider = simplifyModelName(result.provider);
            this.mod.send(packet, version, {
                ...event,
                message: `<FONT>(${provider}) ${result.text}</FONT>`
            });
        };

        const INCOMING_PACKETS = [
            ['S_CHAT', 3],
            ['S_WHISPER', 3],
            ['S_PRIVATE_CHAT', 1]
        ];

        for (const [packet, version] of INCOMING_PACKETS) {
            this.mod.hook(packet, version, { order: 100 }, event => handler(packet, version, event));
        }
    }

    /**
     * Setup outgoing message hooks
     * @private
     */
    _setupOutgoingHooks() {
        const handler = (packet, version, event) => {
            if (!this.mod.settings.enabled || !this.mod.settings.sendMode) return;

            // Check if message contains game special link tags
            if (event.message.includes('ChatLinkAction') || event.message.includes('chatLinkAction')) {
                this.mod.send(packet, version, event);
                return false;
            }

            // Extract plain text content
            const plainText = event.message.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, '');

            // Check if ends with # (skip translation marker)
            if (plainText.endsWith('#')) {
                const newPlainText = plainText.slice(0, -1);
                this.mod.send(packet, version, {
                    ...event,
                    message: event.message.replace(plainText, newPlainText)
                });
                return false;
            }

            // Async translation
            this._handleOutgoing(event, packet, version);
            return false;
        };

        const OUTGOING_PACKETS = [
            ['C_WHISPER', 1],
            ['C_CHAT', 1]
        ];

        for (const [packet, version] of OUTGOING_PACKETS) {
            this.mod.hook(packet, version, {}, event => handler(packet, version, event));
        }
    }

    /**
     * Handle incoming message
     * @private
     */
    async _handleIncoming(message) {
        const sanitized = message.replace(/<(.+?)>|&rt;|&lt;|&gt;/g, '').replace(/\s+$/, '');
        if (sanitized === '') return null;

        try {
            const result = await this.translationService.translateForReceive(
                sanitized,
                this.mod.settings.targetLang,
                this.mod.settings.sourceLang,
                this.mod.settings.useCache
            );

            // Skip display if translation was skipped or result is same as original
            if (result.provider === 'Skip' || result.text === sanitized) return null;

            // EME region text normalization
            if (this.mod.publisher === 'eme') {
                result.text = normalizeNa(result.text);
            }

            return result;
        } catch (e) {
            this.mod.error('Incoming message translation failed:', e);
            return null;
        }
    }

    /**
     * Handle outgoing message
     * @private
     */
    async _handleOutgoing(event, packet, version) {
        const sanitized = event.message.replace(/<(.+?)>|&rt;|&lt;|&gt;/g, '').replace(/\s+$/, '');
        if (sanitized === '') {
            this.mod.send(packet, version, event);
            return;
        }

        try {
            const result = await this.translationService.translateForSend(
                sanitized,
                this.mod.settings.sendLang,
                'auto',
                this.mod.settings.useCache
            );

            // Skip if translation was skipped or result is same as original
            if (!result || !result.text || result.provider === 'Skip' || result.text === sanitized) {
                this.mod.send(packet, version, event);
                return;
            }

            this.mod.send(packet, version, {
                ...event,
                message: `<FONT>${result.text}</FONT>`
            });

            const provider = simplifyModelName(result.provider);
            this.mod.command.message(`(${provider}) ${sanitized}`);
        } catch (e) {
            this.mod.error('Outgoing message translation failed:', e);
            this.mod.send(packet, version, event);
        }
    }

    /**
     * Get provider name for incoming direction
     * @returns {string}
     */
    getReceiveProvider() {
        return this.translationService.getReceiveProvider();
    }

    /**
     * Get provider name for outgoing direction
     * @returns {string}
     */
    getSendProvider() {
        return this.translationService.getSendProvider();
    }
}

module.exports = ChatHooks;
