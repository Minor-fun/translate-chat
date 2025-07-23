/* eslint-disable no-case-declarations */
"use strict";

// Hook settings
const HOOK_SETTINGS = Object.freeze({
    "LAST": { "order": 100010 },
    "LASTA": { "order": 100010, "filter": { "fake": false, "silenced": false, "modified": null } }
});

// 颜色定义
const COLORS = {
    red: "#FF0000",          // 红色 - 禁用状态
    green: "#00FF00",        // 绿色 - 启用状态
    yellow: "#FFFF00",       // 黄色 - 标题
    blue: "#00BFFF",         // 蓝色 - 按钮
    gray: "#AAAAAA",         // 灰色 - 描述文本
    white: "#FFFFFF",        // 白色 - 普通文本
    orange: "#FFA500",       // 橙色 - 警告
    purple: "#9370DB",       // 紫色 - 特殊信息
    cyan: "#00FFFF"          // 青色 - 重要数据
};

// 翻译提供商选项
const TRANSLATION_PROVIDERS = ['google', 'gemini', 'openai', 'hunyuan'];

// 日志级别选项
const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'none'];

// 常用选项
const COMMON_LANGS = ['en', 'zh', 'ko', 'ja', 'ru', 'es', 'pt', 'fr', 'de', 'it', 'nl', 'pl', 'sv', 'cs', 'ro', 'uk', 'bg', 'el', 'da', 'no', 'fi'];

class Gui {
    /**
     * 创建GUI实例
     * @param {Object} mod 模块实例
     * @param {Object} translator 翻译器实例
     */
    constructor(mod, translator) {
        this.mod = mod;
        this.translator = translator;
        this.i18n = translator.getI18n();
        this.cmd = 'translate';
    }

    /**
     * 初始化GUI钩子
     */
    init() {
        // 钩子用于处理GUI发送的命令
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

    /**
     * 解析GUI元素数组为HTML
     * @param {Array} array GUI元素数组
     * @param {string} title 标题
     */
    parse(array, title) {
        let body = "";

        try {
            array.forEach(data => {
                if (data.command)
                    body += `<a href="admincommand:/@${data.command};">${data.text}</a>`;
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

    /**
     * 显示指定部分的GUI
     * @param {string} section 部分标识符
     * @param {number} pageNumber 页码
     */
    show(section, pageNumber = 1) {
        const cfg = this.mod.settings;
        const page = pageNumber - 1;
        const t = this.i18n.t.bind(this.i18n);
        const title = t("guiTitle");

        let tmpData = [];

        switch (section) {
            // 主菜单
            case "index":
                // 基本设置
                tmpData.push(this._createTitle(t('basicSettings')), ...this._createBreak(), this._createSpace(0));
                tmpData.push(
                    this._createToggle(t('moduleEnabled'), cfg.enabled, `${this.cmd} config enabled ${!cfg.enabled};${this.cmd} gui`),
                    { "text": "&nbsp;&nbsp;" },
                    this._createToggle(t('sendMode'), cfg.sendMode, `${this.cmd} config sendMode ${!cfg.sendMode};${this.cmd} gui`)
                );
                tmpData.push(...this._createBreak(2));
                
                // 翻译引擎状态
                const state = this.translator.getEngineState();
                tmpData.push(this._createTitle(t('engineStatus')), ...this._createBreak(), this._createSpace(0));
                tmpData.push(this._createInfoText(`${t('currentEngine')}: ${state.fullDisplayName}`));
                tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('provider')}: ${state.provider}`));
                
                if (state.provider === 'gemini') {
                    tmpData.push(...this._createBreak(), this._createSpace(0));
                    tmpData.push(this._createInfoText(`${t('geminiKeys')}: ${t('geminiKeysAvailable', state.totalValidKeys, state.currentGeminiKeyIndex + 1)}`));
                    
                    if (state.availableModels && state.availableModels.length > 0) {
                        tmpData.push(...this._createBreak(), this._createSpace(0));
                        tmpData.push(this._createInfoText(`${t('availableModels')}: ${state.availableModels.join(', ')}`));
                    }
                    
                    if (state.currentGeminiKey) {
                        tmpData.push(...this._createBreak(), this._createSpace(0));
                        tmpData.push(this._createInfoText(`${t('currentKey')}: ${state.currentGeminiKey}`));
                    }
                }
                
                if (state.provider === 'openai' || state.provider === 'hunyuan') {
                    tmpData.push(...this._createBreak(), this._createSpace(0));
                    tmpData.push(this._createInfoText(`${t('currentEngine')}: ${state.model}`));
                }
                
                if (state.errorType) {
                    tmpData.push(...this._createBreak(), this._createSpace(0));
                    tmpData.push(this._createInfoText(`${t('errorStatus')}: ${state.errorType}`, COLORS.orange));
                }
                
                tmpData.push(...this._createBreak(2));

                // 翻译提供商设置
                const translationConfig = cfg.translation || {};
                tmpData.push(this._createTitle(t('providerSettings')), ...this._createBreak(), this._createSpace(0));
                
                TRANSLATION_PROVIDERS.forEach(provider => {
                    tmpData.push(
                        { "text": `<font color="${translationConfig.provider === provider ? COLORS.green : COLORS.red}" size="+20">[${provider}]</font>`, 
                          "command": `${this.cmd} config translationProvider ${provider};${this.cmd} gui` }, 
                        { "text": "&nbsp;&nbsp;" }
                    );
                });
                
                tmpData.push(...this._createBreak(2));
                
                // 在API密钥设置部分之前添加Gemini OpenAI兼容模式设置
                tmpData.push(...this._createBreak(2));
                
                // 模型配置
                tmpData.push(this._createTitle(t('modelSettings')), ...this._createBreak());
                
                // OpenAI模型
                const openaiModel = translationConfig.models?.openai || "";
                tmpData.push(
                    this._createSpace(0),
                    this._createInfoText(`${t('openaiModel')}: `),
                    { "text": `<font color="${COLORS.green}" size="+20">[${openaiModel}]</font>` },
                    { "text": "&nbsp;&nbsp;" },
                    this._createInfoText(`(${this.cmd} config openaiModel ${t('modelPlaceholder')})`, COLORS.gray)
                );
                tmpData.push(...this._createBreak());
                
                // 腾讯混元模型
                const hunyuanModel = translationConfig.models?.hunyuan || "";
                tmpData.push(
                    this._createSpace(0),
                    this._createInfoText(`${t('hunyuanModel')}: `),
                    { "text": `<font color="${COLORS.green}" size="+20">[${hunyuanModel}]</font>` },
                    { "text": "&nbsp;&nbsp;" },
                    this._createInfoText(`(${this.cmd} config hunyuanModel ${t('modelPlaceholder')})`, COLORS.gray)
                );
                tmpData.push(...this._createBreak());
                
                // Gemini模型
                const geminiModels = translationConfig.models?.gemini || [];
                tmpData.push(
                    this._createSpace(0),
                    this._createInfoText(`${t('geminiModels')}: `),
                    { "text": `<font color="${COLORS.green}" size="+20">[${geminiModels.length} ${t('models')}]</font>` },
                    { "text": "&nbsp;&nbsp;" },
                    this._createInfoText(`(${this.cmd} config geminiModels ${t('geminiModelsPlaceholder')})`, COLORS.gray)
                );
                tmpData.push(...this._createBreak());
                
                // 显示Gemini模型列表
                if (geminiModels.length > 0) {
                    tmpData.push(...this._createBreak(), this._createSpace(0));
                    tmpData.push(this._createInfoText(geminiModels.join(', '), COLORS.cyan));
                }
                
                tmpData.push(...this._createBreak(2));
                
                // Gemini OpenAI兼容模式设置
                if (translationConfig.provider === 'gemini') {
                    tmpData.push(this._createTitle(t('geminiOpenAISettings')), ...this._createBreak());
                    
                    // 兼容模式选择
                    const openAIMode = translationConfig.geminiOpenAIMode || 'cloudflare';
                    tmpData.push(
                        this._createSpace(0),
                        this._createInfoText(`${t('geminiOpenAIMode')}: `),
                        { "text": `<font color="${COLORS.blue}" size="+20">[${openAIMode}]</font>` },
                        { "text": "&nbsp;&nbsp;" }
                    );
                    
                    // 模式选择按钮
                    ['cloudflare', 'official'].forEach(mode => {
                        tmpData.push(
                            { "text": `<font color="${openAIMode === mode ? COLORS.green : COLORS.red}" size="+20">[${mode}]</font>`, 
                              "command": `${this.cmd} config geminiOpenAIMode ${mode};${this.cmd} gui` }, 
                            { "text": "&nbsp;&nbsp;" }
                        );
                    });
                    
                    tmpData.push(...this._createBreak());
                    
                    // Cloudflare配置（仅当选择cloudflare模式时显示）
                    if (openAIMode === 'cloudflare') {
                        // Cloudflare账户ID
                        const cfAccountId = translationConfig.cloudflareAccountId || '';
                        tmpData.push(
                            this._createSpace(0),
                            this._createInfoText(`${t('cloudflareAccountId')}: `),
                            { "text": `<font color="${cfAccountId ? COLORS.green : COLORS.red}" size="+20">[${cfAccountId || t('notSet')}]</font>` },
                            { "text": "&nbsp;&nbsp;" },
                            this._createInfoText(`(${this.cmd} config cloudflareAccountId ${t('accountIdPlaceholder')})`, COLORS.gray)
                        );
                        tmpData.push(...this._createBreak());
                        
                        // Cloudflare网关ID
                        const cfGatewayId = translationConfig.cloudflareGatewayId || '';
                        tmpData.push(
                            this._createSpace(0),
                            this._createInfoText(`${t('cloudflareGatewayId')}: `),
                            { "text": `<font color="${cfGatewayId ? COLORS.green : COLORS.red}" size="+20">[${cfGatewayId || t('notSet')}]</font>` },
                            { "text": "&nbsp;&nbsp;" },
                            this._createInfoText(`(${this.cmd} config cloudflareGatewayId ${t('gatewayIdPlaceholder')})`, COLORS.gray)
                        );
                        tmpData.push(...this._createBreak());
                    }
                }
                
                // API密钥设置
                tmpData.push(this._createTitle(t('apiKeySettings')), ...this._createBreak());
                
                // Gemini密钥
                const geminiKeys = translationConfig.geminiKeys || [];
                const validGeminiKeysCount = geminiKeys.filter(key => key && key.trim() !== "").length;
                tmpData.push(
                    this._createSpace(0),
                    this._createInfoText(`${t('geminiKeys')}: ${t('geminiKeysCount', validGeminiKeysCount)}`),
                    { "text": "&nbsp;&nbsp;" },
                    this._createInfoText(`(${this.cmd} config geminiKeys ${t('geminiKeysPlaceholder')})`, COLORS.gray)
                );
                tmpData.push(...this._createBreak());
                
                // OpenAI密钥
                tmpData.push(
                    this._createSpace(0),
                    this._createInfoText(`${t('openaiKey')}: `),
                    { "text": `<font color="${translationConfig.openaiKey ? COLORS.green : COLORS.red}" size="+20">[${translationConfig.openaiKey ? t('keySet') : t('keyNotSet')}]</font>` },
                    { "text": "&nbsp;&nbsp;" },
                    this._createInfoText(`(${this.cmd} config openaiKey ${t('keyPlaceholder')})`, COLORS.gray)
                );
                tmpData.push(...this._createBreak());
                
                // 腾讯混元密钥
                tmpData.push(
                    this._createSpace(0),
                    this._createInfoText(`${t('hunyuanKey')}: `),
                    { "text": `<font color="${translationConfig.hunyuanKey ? COLORS.green : COLORS.red}" size="+20">[${translationConfig.hunyuanKey ? t('keySet') : t('keyNotSet')}]</font>` },
                    { "text": "&nbsp;&nbsp;" },
                    this._createInfoText(`(${this.cmd} config hunyuanKey ${t('keyPlaceholder')})`, COLORS.gray)
                );
                tmpData.push(...this._createBreak(2));
                
                // 缓存统计信息
                const cacheStats = this.translator.getCacheStats();
                const dupStats = this.translator.getDuplicateStats();
                const cacheSettings = cfg.cache || {};
                
                tmpData.push(
                    this._createTitle(t('cacheSettings')),
                    ...this._createBreak(),
                    this._createSpace(0),
                    this._createToggle(t(cfg.useCache ? 'enabled' : 'disabled'), cfg.useCache, `${this.cmd} config useCache ${!cfg.useCache};${this.cmd} gui`)
                );
                
                if (cacheStats) {
                    // 计算使用百分比和总请求数
                    const usedPercentage = (cacheStats.size / cacheStats.maxSize * 100).toFixed(1);
                    const totalRequests = cacheStats.hits + cacheStats.misses;
                    
                    // 基础信息组
                    tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('basicInfo')}:`, COLORS.cyan));
                    tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('cacheStatus', cacheStats.size, cacheStats.maxSize, usedPercentage)}`));
                    tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('hitStats', cacheStats.hitRate, cacheStats.hits, cacheStats.misses, totalRequests)}`));
                    tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('cacheState', t(cacheStats.enabled ? 'cacheStateEnabled' : 'cacheStateDisabled'), cacheStats.modified ? t('cacheModified') : '')}`));
                    tmpData.push(...this._createBreak(), this._createSpace(0));
                    
                    // 自动保存间隔
                    const autoSaveInterval = cacheSettings.autoSaveInterval || 0;
                    tmpData.push(this._createInfoText(`${t('autoSave', autoSaveInterval ? t('autoSaveMinutes', autoSaveInterval) : t('autoSaveDisabled'), cacheStats.added, cacheStats.saves)}`));
                    tmpData.push(...this._createBreak(), this._createSpace(0), { "text": `<font color="${COLORS.blue}" size="+20">[${t('saveNow')}]</font>`, "command": `${this.cmd} cache save;${this.cmd} gui` });
                    
                    // 去重功能相关
                    tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('deduplication')}:`, COLORS.cyan));
                    tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('deduplication')}: ${t(cacheSettings.deduplicateResults ? 'enabled' : 'disabled')}`));
                    
                    // 去重效果组
                    if (dupStats && cacheSettings.deduplicateResults) {
                        tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('dedupeEffects')}:`, COLORS.cyan));
                        tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('memoryOptimization', dupStats.uniqueResults, cacheStats.size, dupStats.deduplicationSavings)}`));
                        
                        if (dupStats.runtimeStats) {
                            const rs = dupStats.runtimeStats;
                            tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('performanceOptimization', rs.duplicatesSkipped || 0, rs.deduplicationRate || '0%')}`));
                        }
                        
                        if (dupStats.duplicateGroups > 0) {
                            tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('duplicateData', dupStats.duplicateGroups, dupStats.duplicateCount)}`));
                        }
                        
                        if (dupStats.stringPool) {
                            tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('textReuse', cacheStats.stringPoolSize || 0)}`));
                        }
                    }
                    
                    // 缓存大小设置
                    tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('maxCacheEntries')}:`, COLORS.gray), { "text": "&nbsp;" });
                    tmpData.push(...this._createValueButtons([10000, 20000, 40000, 50000, 100000], cacheSettings.maxSize, `${this.cmd} config cacheMaxSize`));
                    
                    // 自动保存间隔设置
                    tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('autoSaveInterval')}:`, COLORS.gray), { "text": "&nbsp;" });
                    const currentInterval = cacheSettings.autoSaveInterval || 0;
                    tmpData.push(...this._createValueButtons([1, 5, 10, 30, 60], currentInterval, `${this.cmd} config cacheInterval`, (a, b) => Math.abs(a - b) < 0.1));
                    
                    // 日志级别设置
                    tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('logLevel')}:`, COLORS.gray), { "text": "&nbsp;" });
                    tmpData.push(...this._createValueButtons(LOG_LEVELS, cacheSettings.logLevel, `${this.cmd} config cacheLogLevel`));
                    
                    // 其他缓存选项
                    tmpData.push(...this._createBreak(), this._createSpace(0));
                    tmpData.push(
                        this._createToggle(t('longTextHash'), cacheSettings.hashLongText, `${this.cmd} config cacheHashEnabled ${!cacheSettings.hashLongText};${this.cmd} gui`),
                        { "text": "&nbsp;&nbsp;" },
                        this._createToggle(t('dedupeResults'), cacheSettings.deduplicateResults, `${this.cmd} config cacheDedupe ${!cacheSettings.deduplicateResults};${this.cmd} gui`)
                    );
                    
                    // 长文本阈值设置
                    tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('longTextThreshold')}:`, COLORS.gray), { "text": "&nbsp;" });
                    tmpData.push(...this._createValueButtons([10, 20, 30, 50, 100], cacheSettings.longTextThreshold, `${this.cmd} config cacheThreshold`));
                    
                    // 写入阈值设置
                    tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('writeThreshold')}:`, COLORS.gray), { "text": "&nbsp;" });
                    tmpData.push(...this._createValueButtons([50, 100, 200, 500], cacheSettings.writeThreshold, `${this.cmd} config cacheWriteThreshold`));
                    
                    // 清理百分比设置
                    tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('cleanupPercentage')}:`, COLORS.gray), { "text": "&nbsp;" });
                    tmpData.push(...this._createValueButtons([0.1, 0.2, 0.3, 0.5], cacheSettings.cleanupPercentage, `${this.cmd} config cacheCleanupPercentage`, (a, b) => Math.abs(a - b) < 0.01));
                }
                
                tmpData.push(...this._createBreak(2));

                // 术语库统计信息
                const termStats = this.translator.getTerminologyStats();
                
                tmpData.push(
                    this._createTitle(t('terminologySettings')),
                    ...this._createBreak(),
                    this._createSpace(0),
                    this._createToggle(t(cfg.useTerminology ? 'enabled' : 'disabled'), cfg.useTerminology, `${this.cmd} config useTerminology ${!cfg.useTerminology};${this.cmd} gui`)
                );
                
                if (termStats) {
                    tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('termStats')}:`, COLORS.cyan));
                    tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('totalTerms', termStats.totalTerms || 0)}`));
                    
                    // 显示语言覆盖情况
                    if (termStats.languageCoverage) {
                        tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('languageCoverage')}:`, COLORS.cyan));
                        
                        for (const [lang, count] of Object.entries(termStats.languageCoverage)) {
                            tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${lang}: ${count}${t('totalTerms', '').replace(/:.+/, '')}`));
                        }
                    }
                    
                    // 显示置信度分布
                    if (termStats.confidenceDistribution) {
                        const { high, medium, low } = termStats.confidenceDistribution;
                        tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('confidenceDistribution')}:`, COLORS.cyan));
                        tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('high', high)}`, COLORS.green));
                        tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('medium', medium)}`, COLORS.yellow));
                        tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('low', low)}`, COLORS.orange));
                    }
                    
                    // 术语库操作说明
                    tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('addTerm')}: ${this.cmd} term add [${t('originalPlaceholder')}] [${t('translatedPlaceholder')}]`, COLORS.gray));
                    tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(`${t('searchTerm')}: ${this.cmd} term search [${t('keywordPlaceholder')}]`, COLORS.gray));
                }
                
                tmpData.push(...this._createBreak(2));

                // 界面语言设置（移动到最下面）
                const currentInterfaceLang = this.translator.getInterfaceLanguage();
                tmpData.push(this._createTitle(t('interfaceLanguage')), ...this._createBreak(), this._createSpace(0));
                tmpData.push(...this._createLangButtons(COMMON_LANGS, currentInterfaceLang, `${this.cmd} config interfaceLanguage`));
                tmpData.push(...this._createBreak(2));

                // 语言设置（移动到最下面）
                tmpData.push(this._createTitle(t('languageSettings')), ...this._createBreak());
                
                // 源语言设置
                tmpData.push(this._createInfoText(t('sourceLanguage'), COLORS.gray), { "text": "&nbsp;" });
                const sourceLangs = ['auto', ...COMMON_LANGS];
                tmpData.push(...this._createLangButtons(sourceLangs, cfg.sourceLang, `${this.cmd} config sourceLang`));
                
                // 目标语言设置
                tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(t('targetLanguage'), COLORS.gray), { "text": "&nbsp;" });
                tmpData.push(...this._createLangButtons(COMMON_LANGS, cfg.targetLang, `${this.cmd} config targetLang`));
                
                // 发送语言设置
                tmpData.push(...this._createBreak(), this._createSpace(0), this._createInfoText(t('sendLanguage'), COLORS.gray), { "text": "&nbsp;" });
                tmpData.push(...this._createLangButtons(COMMON_LANGS, cfg.sendLang, `${this.cmd} config sendLang`));
                tmpData.push(...this._createBreak(2));

                break;
        }

        // 解析GUI数据
        this.parse(tmpData,
            `<font>${t('guiTitle')}</font> | ` +
            `<font color="${COLORS.red}" size="+20">${t('disabled')}</font><font color="${COLORS.gray}" size="+20"> = ${t('disabled')}, </font>` +
            `<font color="${COLORS.green}" size="+20">${t('enabled')}</font><font color="${COLORS.gray}" size="+20"> = ${t('enabled')}</font>`
        );

        tmpData = [];
    }

    // 辅助函数，创建标题
    _createTitle(text) {
        return { "text": `<font color="${COLORS.yellow}" size="+24">${text}:</font>` };
    }

    // 辅助函数，创建间距
    _createSpace(count = 2) {
        return { "text": "&nbsp;".repeat(count) };
    }

    // 辅助函数，创建换行
    _createBreak(count = 1) {
        const breaks = [];
        for (let i = 0; i < count; i++) breaks.push({ "text": "<br>" });
        return breaks;
    }

    // 辅助函数，创建开关按钮
    _createToggle(text, isEnabled, command) {
        return { "text": `<font color="${isEnabled ? COLORS.green : COLORS.red}" size="+20">[${text}]</font>`, "command": command };
    }

    // 辅助函数，创建语言选择按钮
    _createLangButtons(langs, currentLang, cmdPrefix) {
        return langs.map(lang => ({
            "text": `<font color="${currentLang === lang ? COLORS.green : COLORS.blue}" size="+20">[${lang}]</font>`,
            "command": `${cmdPrefix} ${lang};${this.cmd} gui`
        })).reduce((acc, item, i) => {
            acc.push(item);
            acc.push({ "text": "&nbsp;" });
            return acc;
        }, []);
    }

    // 辅助函数，创建数值选择按钮
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

    // 辅助函数，创建信息文本
    _createInfoText(text, color = COLORS.white) {
        return { "text": `<font color="${color}" size="+20">${text}</font>` };
    }
}

module.exports = Gui; 