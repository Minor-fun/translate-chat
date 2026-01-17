/* eslint-disable no-case-declarations */
"use strict";

// Hook settings
const HOOK_SETTINGS = Object.freeze({
    "LAST": { "order": 100010 },
    "LASTA": { "order": 100010, "filter": { "fake": false, "silenced": false, "modified": null } }
});

// Color definitions
const COLORS = {
    red: "#FF0000",          // Red - Disabled status
    green: "#00FF00",        // Green - Enabled status
    yellow: "#FFFF00",       // Yellow - Title
    blue: "#00BFFF",         // Blue - Button
    gray: "#AAAAAA",         // Gray - Description text
    white: "#FFFFFF",        // White - Normal text
    orange: "#FFA500",       // Orange - Warning
    purple: "#FFFFFF",       // White - Special info
    cyan: "#00FFFF"          // Cyan - Important data
};

// Common options
const COMMON_LANGS = ['en', 'zh', 'zh-TW', 'ko', 'ja', 'ru', 'es', 'pt', 'fr', 'de', 'it'];

// Supported languages for translation interface
const GUI_LANGS = ['en', 'zh', 'zh-TW', 'de', 'es', 'fr', 'ru'];

class Gui {
    constructor(mod, translator) {
        this.mod = mod;
        this.translator = translator;
        this.i18n = translator.getI18n();
        this.cmd = 'translate';
    }

    init() {
        this.mod.hook('C_CONFIRM_UPDATE_NOTIFICATION', 'raw', HOOK_SETTINGS.LAST, () => false);
        this.mod.hook('C_ADMIN', 'raw', HOOK_SETTINGS.LASTA, event => {
            try {
                const parsed = this.mod.parse.base.parse(event);
                if (parsed.command && parsed.command.includes(";")) {
                    parsed.command.split(";").forEach(cmd => {
                        try {
                            this.mod.command.exec(cmd);
                        } catch (e) {
                            return;
                        }
                    });
                    return false;
                }
            } catch (e) {
                return;
            }
        });
    }

    parse(array, title) {
        let body = "";
        try {
            array.forEach(data => {
                if (data.command)
                    body += `<a href="admincommand:/@${data.command};" style="text-decoration:none">${data.text}</a>`;
                else if (!data.command)
                    body += `${data.text}`;
                else
                    return;
            });
        } catch (e) {
            body += e.toString();
        }
        this.mod.send('S_ANNOUNCE_UPDATE_NOTIFICATION', 1, { id: 0, title, body });
    }

    show(section, _pageNumber = 1) {
        const t = this.i18n.t.bind(this.i18n);
        let tmpData = [];

        switch (section) {
            case "index":
                tmpData.push(...this._buildBasicSettings());
                tmpData.push(...this._createSeparator());
                tmpData.push(...this._buildLanguageSettings());
                tmpData.push(...this._createSeparator());
                tmpData.push(...this._buildEngineStatus());
                tmpData.push(...this._createSeparator());
                tmpData.push(...this._buildEndpointManager());
                tmpData.push(...this._createSeparator());
                tmpData.push(...this._buildCacheSettings());
                tmpData.push(...this._createSeparator());
                tmpData.push(...this._buildInterfaceLanguage());
                break;
        }

        this.parse(tmpData,
            `<font>${t('guiTitle')}</font> | ` +
            `<font color="${COLORS.red}" size="+20">${t('disabled')}</font><font color="${COLORS.gray}" size="+20"> = ${t('disabled')}, </font>` +
            `<font color="${COLORS.green}" size="+20">${t('enabled')}</font><font color="${COLORS.gray}" size="+20"> = ${t('enabled')}</font>`
        );
    }

    // Section builders

    _buildBasicSettings() {
        const cfg = this.mod.settings;
        const t = this.i18n.t.bind(this.i18n);
        return [
            this._createSectionHeader(t('basicSettings')),
            ...this._createBreak(),
            this._createIndent(1),
            this._createInfoText(t('moduleEnabled') + ': '),
            this._createToggle(t(cfg.enabled ? 'enabled' : 'disabled'), cfg.enabled, `${this.cmd} config enabled ${!cfg.enabled};${this.cmd} gui`),
            this._createIndent(2),
            this._createInfoText(t('sendMode') + ': '),
            this._createToggle(t(cfg.sendMode ? 'enabled' : 'disabled'), cfg.sendMode, `${this.cmd} config sendMode ${!cfg.sendMode};${this.cmd} gui`),
            ...this._createBreak()
        ];
    }

    _buildLanguageSettings() {
        const cfg = this.mod.settings;
        const t = this.i18n.t.bind(this.i18n);
        const sourceLangs = ['auto', ...COMMON_LANGS];
        return [
            this._createSectionHeader(t('languageSettings')),
            ...this._createBreak(),
            this._createIndent(1),
            this._createInfoText(`${t('sourceLanguage')}`, COLORS.gray),
            ...this._createBreak(),
            this._createIndent(2),
            ...this._createLangButtons(sourceLangs, cfg.sourceLang, `${this.cmd} config sourceLang`),
            ...this._createBreak(),
            this._createIndent(1),
            this._createInfoText(`${t('targetLanguage')}`, COLORS.gray),
            ...this._createBreak(),
            this._createIndent(2),
            ...this._createLangButtons(COMMON_LANGS, cfg.targetLang, `${this.cmd} config targetLang`),
            ...this._createBreak(),
            this._createIndent(1),
            this._createInfoText(`${t('sendLanguage')}`, COLORS.gray),
            ...this._createBreak(),
            this._createIndent(2),
            ...this._createLangButtons(COMMON_LANGS, cfg.sendLang, `${this.cmd} config sendLang`),
            ...this._createBreak()
        ];
    }

    _buildEngineStatus() {
        const t = this.i18n.t.bind(this.i18n);
        const state = this.translator.getEngineState();
        const result = [
            this._createSectionHeader(t('engineStatus')),
            ...this._createBreak(),
            this._createIndent(1),
            this._createInfoText(`${t('receiveEndpoint')}: `, COLORS.gray),
            this._createInfoText(this.translator.getReceiveProvider(), COLORS.cyan),
            ...this._createBreak(),
            this._createIndent(1),
            this._createInfoText(`${t('sendEndpoint')}: `, COLORS.gray),
            this._createInfoText(this.translator.getSendProvider(), COLORS.cyan),
            ...this._createBreak()
        ];

        if (state.receive && state.receive.errorType) {
            result.push(
                ...this._createBreak(),
                this._createIndent(1),
                this._createInfoText(`${t('errorStatus')}: `, COLORS.orange),
                this._createInfoText(state.receive.errorType, COLORS.red)
            );
        }

        return result;
    }

    _buildEndpointManager() {
        const t = this.i18n.t.bind(this.i18n);
        const endpointManager = this.translator.getEndpointManager();
        const endpoints = endpointManager.listEndpoints();
        const receiveConfig = endpointManager.getReceiveConfig();
        const sendConfig = endpointManager.getSendConfig();
        const fallbackConfig = endpointManager.getFallbackConfig();

        const result = [
            this._createSectionHeader(t('endpointListTitle')),
            ...this._createBreak()
        ];

        // Configured endpoints list
        result.push(
            this._createIndent(1),
            this._createInfoText(`${t('configuredEndpoints')}:`, COLORS.purple),
            ...this._createBreak()
        );

        if (endpoints.length === 0) {
            result.push(
                this._createIndent(2),
                this._createInfoText(t('noEndpoints'), COLORS.gray),
                ...this._createBreak()
            );
        } else {
            for (const ep of endpoints) {
                // Mask URL for display (show domain only)
                let maskedUrl = ep.url;
                try {
                    const urlObj = new URL(ep.url);
                    maskedUrl = urlObj.hostname;
                } catch (e) {
                    maskedUrl = ep.url.substring(0, 30) + (ep.url.length > 30 ? '...' : '');
                }

                const modelCount = ep.models.length;
                const maskedKey = endpointManager.maskKey(ep.key);
                result.push(
                    this._createIndent(2),
                    { "text": `<font color="${COLORS.cyan}" size="+22">• ${ep.name}</font>` },
                    this._createInfoText(` (${maskedUrl})`, COLORS.gray),
                    { "text": "&nbsp;&nbsp;" },
                    {
                        "text": `<font color="${COLORS.red}" size="+18">[${t('deleteEndpoint')}]</font>`,
                        "command": `${this.cmd} endpoint delete ${ep.name};${this.cmd} gui`
                    },
                    ...this._createBreak(),
                    this._createIndent(3),
                    this._createInfoText(`${t('endpointKey')}: ${maskedKey}`, COLORS.orange),
                    { "text": "&nbsp;&nbsp;" },
                    this._createInfoText(`${modelCount} ${t('models')}`, COLORS.white),
                    ...this._createBreak()
                );
            }
        }

        // Endpoint selection section header
        result.push(
            this._createSectionHeader(t('endpointSettings')),
            ...this._createBreak()
        );

        // Receive endpoint
        result.push(...this._buildDirectionEndpoint('receive', receiveConfig, endpoints, endpointManager, t));

        // Send endpoint
        result.push(...this._buildDirectionEndpoint('send', sendConfig, endpoints, endpointManager, t));

        // Fallback endpoint
        result.push(...this._buildDirectionEndpoint('fallback', fallbackConfig, endpoints, endpointManager, t));

        return result;
    }

    _buildDirectionEndpoint(direction, config, endpoints, endpointManager, t) {
        const isFallback = direction === 'fallback';
        const labelKey = isFallback
            ? 'fallbackEndpoint'
            : (direction === 'receive' ? 'receiveEndpoint' : 'sendEndpoint');
        const modelLabelKey = isFallback
            ? 'fallbackModel'
            : (direction === 'receive' ? 'receiveModel' : 'sendModel');
        const commandPrefix = isFallback
            ? `${this.cmd} endpoint fallback`
            : `${this.cmd} endpoint ${direction}`;

        const result = [
            this._createIndent(1),
            this._createInfoText(`${t(labelKey)}: `, COLORS.purple),
            ...this._createBreak(),
            this._createIndent(2),
            // Google button
            {
                "text": `<font color="${config.endpoint === 'google' ? COLORS.green : COLORS.blue}" size="+22">[Google]</font>`,
                "command": `${commandPrefix} google;${this.cmd} gui`
            },
            { "text": "&nbsp;" }
        ];

        // Other endpoint buttons
        for (const ep of endpoints) {
            const isActive = config.endpoint === ep.name;
            result.push(
                {
                    "text": `<font color="${isActive ? COLORS.green : COLORS.blue}" size="+22">[${ep.name}]</font>`,
                    "command": `${commandPrefix} ${ep.name};${this.cmd} gui`
                },
                { "text": "&nbsp;" }
            );
        }

        // Model selection (if not Google)
        if (config.endpoint !== 'google') {
            const endpoint = endpointManager.getEndpoint(config.endpoint);
            if (endpoint && endpoint.models.length > 0) {
                result.push(...this._createBreak(), this._createIndent(1), this._createInfoText(`${t(modelLabelKey)}: `, COLORS.gray));
                for (const model of endpoint.models) {
                    const isActiveModel = config.model === model;
                    result.push(
                        ...this._createBreak(),
                        this._createIndent(2),
                        {
                            "text": `<font color="${isActiveModel ? COLORS.green : COLORS.blue}" size="+22">[${model}]</font>`,
                            "command": `${commandPrefix} ${config.endpoint} ${model};${this.cmd} gui`
                        }
                    );
                }
            }
        }

        result.push(...this._createBreak());
        return result;
    }

    _buildCacheSettings() {
        const cfg = this.mod.settings;
        const t = this.i18n.t.bind(this.i18n);
        const cacheStats = this.translator.getCacheStats();
        const cacheSettings = cfg.cache || {};

        const result = [
            this._createSectionHeader(t('cacheSettings')),
            ...this._createBreak(),
            this._createIndent(1),
            this._createInfoText(t('cacheSettings') + ': '),
            this._createToggle(t(cfg.useCache ? 'enabled' : 'disabled'), cfg.useCache, `${this.cmd} config useCache ${!cfg.useCache};${this.cmd} gui`)
        ];

        if (cacheStats) {
            const usedPercentage = (cacheStats.size / cacheStats.maxSize * 100).toFixed(1);
            const totalRequests = cacheStats.hits + cacheStats.misses;
            const autoSaveInterval = cacheSettings.autoSaveInterval || 0;

            result.push(
                ...this._createBreak(),
                this._createIndent(1),
                this._createInfoText(`${t('basicInfo')}`, COLORS.purple),
                ...this._createBreak(),
                this._createIndent(2),
                this._createInfoText(`• ${t('cacheStatus', cacheStats.size, cacheStats.maxSize, usedPercentage)}`),
                ...this._createBreak(),
                this._createIndent(2),
                this._createInfoText(`• ${t('hitStats', cacheStats.hitRate, cacheStats.hits, cacheStats.misses, totalRequests)}`),
                ...this._createBreak(),
                this._createIndent(2),
                this._createInfoText(`• ${t('cacheState', t(cacheStats.enabled ? 'cacheStateEnabled' : 'cacheStateDisabled'), cacheStats.modified ? t('cacheModified') : '')}`),
                ...this._createBreak(),
                this._createIndent(2),
                this._createInfoText(`• ${t('autoSave', autoSaveInterval ? t('autoSaveMinutes', autoSaveInterval) : t('autoSaveDisabled'), cacheStats.added, cacheStats.saves)}`),
                { "text": "&nbsp;&nbsp;" },
                { "text": `<font color="${COLORS.blue}" size="+20">[${t('saveNow')}]</font>`, "command": `${this.cmd} cache save;${this.cmd} gui` },
                ...this._createBreak(),
                this._createIndent(2),
                this._createInfoText(`${t('maxCacheEntries')}: `, COLORS.gray),
                ...this._createValueButtons([5000, 10000, 20000, 50000], cacheSettings.maxSize, `${this.cmd} config cacheMaxSize`),
                ...this._createBreak(),
                this._createIndent(2),
                this._createInfoText(`${t('autoSaveInterval')}: `, COLORS.gray),
                ...this._createValueButtons([0, 5, 10, 30], autoSaveInterval, `${this.cmd} config cacheInterval`),
                ...this._createBreak(),
                this._createIndent(2),
                this._createInfoText(`${t('writeThreshold')}: `, COLORS.gray),
                ...this._createValueButtons([50, 100, 200, 500], cacheSettings.writeThreshold, `${this.cmd} config cacheWriteThreshold`),
                ...this._createBreak(),
                this._createIndent(2),
                this._createInfoText(`${t('cleanupPercentage')}: `, COLORS.gray),
                ...this._createValueButtons([0.1, 0.2, 0.3, 0.5], cacheSettings.cleanupPercentage, `${this.cmd} config cacheCleanupPercentage`, (a, b) => Math.abs(a - b) < 0.01)
            );
        }

        result.push(...this._createBreak());
        return result;
    }

    _buildInterfaceLanguage() {
        const t = this.i18n.t.bind(this.i18n);
        const currentInterfaceLang = this.translator.getInterfaceLanguage();
        return [
            this._createSectionHeader(t('interfaceLanguage')),
            ...this._createBreak(),
            this._createIndent(1),
            ...this._createLangButtons(GUI_LANGS, currentInterfaceLang, `${this.cmd} config interfaceLanguage`)
        ];
    }



    _createSectionHeader(text) {
        return { "text": `<font color="${COLORS.yellow}" size="+24">${text}</font>` };
    }

    _createSeparator() {
        return [
            { "text": `<font color="${COLORS.gray}" size="+20">━━━━━━━━━━━━━━━━━━━━━━━━━━━━</font>` },
            { "text": "<br>" }
        ];
    }

    _createIndent(level = 1) {
        const indent = "&nbsp;&nbsp;&nbsp;&nbsp;".repeat(level);
        return { "text": indent };
    }



    _createBreak(count = 1) {
        const breaks = [];
        for (let i = 0; i < count; i++) breaks.push({ "text": "<br>" });
        return breaks;
    }

    _createToggle(text, isEnabled, command) {
        return { "text": `<font color="${isEnabled ? COLORS.green : COLORS.red}" size="+20">[${text}]</font>`, "command": command };
    }

    _createLangButtons(langs, currentLang, cmdPrefix) {
        return langs.map(lang => ({
            "text": `<font color="${currentLang === lang ? COLORS.green : COLORS.blue}" size="+20">[${lang}]</font>`,
            "command": `${cmdPrefix} ${lang};${this.cmd} gui`
        })).reduce((acc, item) => {
            acc.push(item);
            acc.push({ "text": "&nbsp;" });
            return acc;
        }, []);
    }

    _createValueButtons(values, currentValue, cmdPrefix, compareFn = (a, b) => a === b) {
        return values.map(value => ({
            "text": `<font color="${compareFn(currentValue, value) ? COLORS.green : COLORS.blue}" size="+20">[${value}]</font>`,
            "command": `${cmdPrefix} ${value};${this.cmd} gui`
        })).reduce((acc, item) => {
            acc.push(item);
            acc.push({ "text": "&nbsp;" });
            return acc;
        }, []);
    }

    _createInfoText(text, color = COLORS.white) {
        return { "text": `<font color="${color}" size="+20">${text}</font>` };
    }
}

module.exports = Gui;
