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
const TRANSLATION_PROVIDERS = ['google', 'gemini', 'openai', 'hunyuan', 'custom'];

// 日志级别选项
const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'none'];

// 常用选项
const COMMON_LANGS = ['en', 'zh','zh-TW', 'ko', 'ja', 'ru', 'es', 'pt', 'fr', 'de', 'it'];

// 翻译界面支持的语言
const GUI_LANGS = ['en', 'zh', 'zh-TW', 'de', 'es', 'fr', 'ru'];

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
                // ========== 基本设置区域 ==========
                tmpData.push(this._createSectionHeader(t('basicSettings')));
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(1));
                tmpData.push(
                    this._createInfoText(t('moduleEnabled') + ': '),
                    this._createToggle(t(cfg.enabled ? 'enabled' : 'disabled'), cfg.enabled, `${this.cmd} config enabled ${!cfg.enabled};${this.cmd} gui`)
                );
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(1));
                tmpData.push(
                    this._createInfoText(t('sendMode') + ': '),
                    this._createToggle(t(cfg.sendMode ? 'enabled' : 'disabled'), cfg.sendMode, `${this.cmd} config sendMode ${!cfg.sendMode};${this.cmd} gui`)
                );
                tmpData.push(...this._createBreak());
                tmpData.push(this._createDivider());
                tmpData.push(...this._createBreak());

                // ========== 语言设置区域 ==========
                tmpData.push(this._createSectionHeader(t('languageSettings')));
                
                // 源语言设置
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(1));
                tmpData.push(this._createInfoText(`${t('sourceLanguage')}`, COLORS.gray));
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(2));
                const sourceLangs = ['auto', ...COMMON_LANGS];
                tmpData.push(...this._createLangButtons(sourceLangs, cfg.sourceLang, `${this.cmd} config sourceLang`));
                
                // 目标语言设置
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(1));
                tmpData.push(this._createInfoText(`${t('targetLanguage')}`, COLORS.gray));
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(2));
                tmpData.push(...this._createLangButtons(COMMON_LANGS, cfg.targetLang, `${this.cmd} config targetLang`));
                
                // 发送语言设置
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(1));
                tmpData.push(this._createInfoText(`${t('sendLanguage')}`, COLORS.gray));
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(2));
                tmpData.push(...this._createLangButtons(COMMON_LANGS, cfg.sendLang, `${this.cmd} config sendLang`));
                
                tmpData.push(...this._createBreak());
                tmpData.push(this._createDivider());
                tmpData.push(...this._createBreak());
                
                // ========== 翻译引擎状态区域 ==========
                const state = this.translator.getEngineState();
                tmpData.push(this._createSectionHeader(t('engineStatus')));
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(1));
                tmpData.push(this._createInfoText(`${t('currentEngine')}: `, COLORS.gray));
                tmpData.push(this._createInfoText(state.fullDisplayName, COLORS.cyan));
                
                tmpData.push(...this._createBreak(), this._createIndent(1));
                tmpData.push(this._createInfoText(`${t('provider')}: `, COLORS.gray));
                tmpData.push(this._createInfoText(state.provider, COLORS.cyan));
                
                if (state.provider === 'gemini') {
                    tmpData.push(...this._createBreak(), this._createIndent(2));
                    tmpData.push(this._createInfoText(`└─ ${t('geminiKeys')}: `, COLORS.gray));
                    tmpData.push(this._createInfoText(t('geminiKeysAvailable', state.totalValidKeys, state.currentGeminiKeyIndex + 1), COLORS.green));
                    
                    if (state.availableModels && state.availableModels.length > 0) {
                        tmpData.push(...this._createBreak(), this._createIndent(2));
                        tmpData.push(this._createInfoText(`└─ ${t('availableModels')}: `, COLORS.gray));
                        tmpData.push(this._createInfoText(state.availableModels.join(', '), COLORS.cyan));
                    }
                    
                    if (state.currentGeminiKey) {
                        tmpData.push(...this._createBreak(), this._createIndent(2));
                        tmpData.push(this._createInfoText(`└─ ${t('currentKey')}: `, COLORS.gray));
                        tmpData.push(this._createInfoText(state.currentGeminiKey, COLORS.green));
                    }
                }
                
                if (state.provider === 'openai' || state.provider === 'hunyuan') {
                    tmpData.push(...this._createBreak(), this._createIndent(2));
                    tmpData.push(this._createInfoText(`└─ ${t('currentEngine')}: `, COLORS.gray));
                    tmpData.push(this._createInfoText(state.model, COLORS.cyan));
                }
                
                if (state.errorType) {
                    tmpData.push(...this._createBreak(), this._createIndent(1));
                    tmpData.push(this._createInfoText(`${t('errorStatus')}: `, COLORS.orange));
                    tmpData.push(this._createInfoText(state.errorType, COLORS.red));
                }
                
                tmpData.push(...this._createBreak());
                tmpData.push(this._createDivider());
                tmpData.push(...this._createBreak());

                // ========== 翻译提供商设置区域 ==========
                const translationConfig = cfg.translation || {};
                tmpData.push(this._createSectionHeader(t('providerSettings')));
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(1));
                
                TRANSLATION_PROVIDERS.forEach((provider, index) => {
                    tmpData.push(
                        { "text": `<font color="${translationConfig.provider === provider ? COLORS.green : COLORS.blue}" size="+20">[${provider}]</font>`, 
                          "command": `${this.cmd} config translationProvider ${provider};${this.cmd} gui` }
                    );
                    if (index < TRANSLATION_PROVIDERS.length - 1) {
                        tmpData.push({ "text": "&nbsp;&nbsp;" });
                    }
                });
                
                tmpData.push(...this._createBreak());
                tmpData.push(this._createDivider());
                tmpData.push(...this._createBreak());
                
                // ========== 缓存设置区域 ==========
                const cacheStats = this.translator.getCacheStats();
                const dupStats = this.translator.getDuplicateStats();
                const cacheSettings = cfg.cache || {};
                
                tmpData.push(this._createSectionHeader(t('cacheSettings')));
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(1));
                tmpData.push(
                    this._createInfoText(t('cacheSettings') + ': '),
                    this._createToggle(t(cfg.useCache ? 'enabled' : 'disabled'), cfg.useCache, `${this.cmd} config useCache ${!cfg.useCache};${this.cmd} gui`)
                );
                
                if (cacheStats) {
                    // 计算使用百分比和总请求数
                    const usedPercentage = (cacheStats.size / cacheStats.maxSize * 100).toFixed(1);
                    const totalRequests = cacheStats.hits + cacheStats.misses;
                    
                    // 基础信息组
                    tmpData.push(...this._createBreak());
                    tmpData.push(...this._createBreak());
                    tmpData.push(this._createIndent(1));
                    tmpData.push(this._createInfoText(`${t('basicInfo')}`, COLORS.purple));
                    
                    tmpData.push(...this._createBreak());
                    tmpData.push(this._createIndent(2));
                    tmpData.push(this._createInfoText(`• ${t('cacheStatus', cacheStats.size, cacheStats.maxSize, usedPercentage)}`));
                    
                    tmpData.push(...this._createBreak());
                    tmpData.push(this._createIndent(2));
                    tmpData.push(this._createInfoText(`• ${t('hitStats', cacheStats.hitRate, cacheStats.hits, cacheStats.misses, totalRequests)}`));
                    
                    tmpData.push(...this._createBreak());
                    tmpData.push(this._createIndent(2));
                    tmpData.push(this._createInfoText(`• ${t('cacheState', t(cacheStats.enabled ? 'cacheStateEnabled' : 'cacheStateDisabled'), cacheStats.modified ? t('cacheModified') : '')}`));
                    
                    // 自动保存间隔
                    const autoSaveInterval = cacheSettings.autoSaveInterval || 0;
                    tmpData.push(...this._createBreak());
                    tmpData.push(this._createIndent(2));
                    tmpData.push(this._createInfoText(`• ${t('autoSave', autoSaveInterval ? t('autoSaveMinutes', autoSaveInterval) : t('autoSaveDisabled'), cacheStats.added, cacheStats.saves)}`));
                    tmpData.push({ "text": "&nbsp;&nbsp;" });
                    tmpData.push({ "text": `<font color="${COLORS.blue}" size="+20">[${t('saveNow')}]</font>`, "command": `${this.cmd} cache save;${this.cmd} gui` });
                    
                    // 去重功能相关
                    tmpData.push(...this._createBreak());
                    tmpData.push(...this._createBreak());
                    tmpData.push(this._createIndent(1));
                    tmpData.push(this._createInfoText(`${t('deduplication')}`, COLORS.purple));
                    
                    tmpData.push(...this._createBreak());
                    tmpData.push(this._createIndent(2));
                    tmpData.push(this._createInfoText(`• ${t('deduplication')}: ${t(cacheSettings.deduplicateResults ? 'enabled' : 'disabled')}`));
                    
                    // 去重效果组
                    if (dupStats && cacheSettings.deduplicateResults) {
                        tmpData.push(...this._createBreak());
                        tmpData.push(this._createIndent(2));
                        tmpData.push(this._createInfoText(`• ${t('memoryOptimization', dupStats.uniqueResults, cacheStats.size, dupStats.deduplicationSavings)}`, COLORS.green));
                        
                        if (dupStats.runtimeStats) {
                            const rs = dupStats.runtimeStats;
                            tmpData.push(...this._createBreak());
                            tmpData.push(this._createIndent(2));
                            tmpData.push(this._createInfoText(`• ${t('performanceOptimization', rs.duplicatesSkipped || 0, rs.deduplicationRate || '0%')}`, COLORS.cyan));
                        }
                        
                        if (dupStats.duplicateGroups > 0) {
                            tmpData.push(...this._createBreak());
                            tmpData.push(this._createIndent(2));
                            tmpData.push(this._createInfoText(`• ${t('duplicateData', dupStats.duplicateGroups, dupStats.duplicateCount)}`, COLORS.yellow));
                        }
                        
                        if (dupStats.stringPool) {
                            tmpData.push(...this._createBreak());
                            tmpData.push(this._createIndent(2));
                            tmpData.push(this._createInfoText(`• ${t('textReuse', cacheStats.stringPoolSize || 0)}`, COLORS.cyan));
                        }
                    }
                    
                    // 配置选项组
                    tmpData.push(...this._createBreak());
                    tmpData.push(...this._createBreak());
                    tmpData.push(this._createIndent(1));
                    tmpData.push(this._createInfoText(`${t('cacheSettings')}`, COLORS.purple));
                    
                    // 缓存大小设置
                    tmpData.push(...this._createBreak());
                    tmpData.push(this._createIndent(2));
                    tmpData.push(this._createInfoText(`${t('maxCacheEntries')}: `, COLORS.gray));
                    tmpData.push(...this._createValueButtons([10000, 20000, 40000, 50000, 100000], cacheSettings.maxSize, `${this.cmd} config cacheMaxSize`));
                    
                    // 自动保存间隔设置
                    tmpData.push(...this._createBreak());
                    tmpData.push(this._createIndent(2));
                    tmpData.push(this._createInfoText(`${t('autoSaveInterval')}: `, COLORS.gray));
                    const currentInterval = cacheSettings.autoSaveInterval || 0;
                    tmpData.push(...this._createValueButtons([1, 5, 10, 30, 60], currentInterval, `${this.cmd} config cacheInterval`, (a, b) => Math.abs(a - b) < 0.1));
                    
                    // 日志级别设置
                    tmpData.push(...this._createBreak());
                    tmpData.push(this._createIndent(2));
                    tmpData.push(this._createInfoText(`${t('logLevel')}: `, COLORS.gray));
                    tmpData.push(...this._createValueButtons(LOG_LEVELS, cacheSettings.logLevel, `${this.cmd} config cacheLogLevel`));
                    
                    // 其他缓存选项
                    tmpData.push(...this._createBreak());
                    tmpData.push(this._createIndent(2));
                    tmpData.push(this._createInfoText(`${t('longTextHash')}: `, COLORS.gray));
                    tmpData.push(
                        this._createToggle(t(cacheSettings.hashLongText ? 'enabled' : 'disabled'), cacheSettings.hashLongText, `${this.cmd} config cacheHashEnabled ${!cacheSettings.hashLongText};${this.cmd} gui`)
                    );
                    tmpData.push({ "text": "&nbsp;&nbsp;" });
                    tmpData.push(this._createInfoText(`${t('dedupeResults')}: `, COLORS.gray));
                    tmpData.push(
                        this._createToggle(t(cacheSettings.deduplicateResults ? 'enabled' : 'disabled'), cacheSettings.deduplicateResults, `${this.cmd} config cacheDedupe ${!cacheSettings.deduplicateResults};${this.cmd} gui`)
                    );
                    
                    // 长文本阈值设置
                    tmpData.push(...this._createBreak());
                    tmpData.push(this._createIndent(2));
                    tmpData.push(this._createInfoText(`${t('longTextThreshold')}: `, COLORS.gray));
                    tmpData.push(...this._createValueButtons([10, 20, 30, 50, 100], cacheSettings.longTextThreshold, `${this.cmd} config cacheThreshold`));
                    
                    // 写入阈值设置
                    tmpData.push(...this._createBreak());
                    tmpData.push(this._createIndent(2));
                    tmpData.push(this._createInfoText(`${t('writeThreshold')}: `, COLORS.gray));
                    tmpData.push(...this._createValueButtons([50, 100, 200, 500], cacheSettings.writeThreshold, `${this.cmd} config cacheWriteThreshold`));
                    
                    // 清理百分比设置
                    tmpData.push(...this._createBreak());
                    tmpData.push(this._createIndent(2));
                    tmpData.push(this._createInfoText(`${t('cleanupPercentage')}: `, COLORS.gray));
                    tmpData.push(...this._createValueButtons([0.1, 0.2, 0.3, 0.5], cacheSettings.cleanupPercentage, `${this.cmd} config cacheCleanupPercentage`, (a, b) => Math.abs(a - b) < 0.01));
                }
                
                tmpData.push(...this._createBreak());
                tmpData.push(this._createDivider());
                tmpData.push(...this._createBreak());
                
                // ========== 模型配置区域 ==========
                tmpData.push(this._createSectionHeader(t('modelSettings')));
                
                // OpenAI模型
                const openaiModel = translationConfig.models?.openai || "";
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(1));
                tmpData.push(this._createInfoText(`• ${t('openaiModel')}: `, COLORS.gray));
                tmpData.push(this._createInfoText(openaiModel || t('keyNotSet'), openaiModel ? COLORS.cyan : COLORS.red));
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(2));
                tmpData.push(this._createInfoText(`(${this.cmd} config openaiModel ${t('modelPlaceholder')})`, COLORS.gray));
                
                // 腾讯混元模型
                const hunyuanModel = translationConfig.models?.hunyuan || "";
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(1));
                tmpData.push(this._createInfoText(`• ${t('hunyuanModel')}: `, COLORS.gray));
                tmpData.push(this._createInfoText(hunyuanModel || t('keyNotSet'), hunyuanModel ? COLORS.cyan : COLORS.red));
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(2));
                tmpData.push(this._createInfoText(`(${this.cmd} config hunyuanModel ${t('modelPlaceholder')})`, COLORS.gray));
                
                // Gemini模型
                const geminiModels = translationConfig.models?.gemini || [];
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(1));
                tmpData.push(this._createInfoText(`• ${t('geminiModels')}: `, COLORS.gray));
                tmpData.push(this._createInfoText(`${geminiModels.length} ${t('models')}`, geminiModels.length > 0 ? COLORS.cyan : COLORS.red));
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(2));
                tmpData.push(this._createInfoText(`(${this.cmd} config geminiModels ${t('geminiModelsPlaceholder')})`, COLORS.gray));
                
                // 显示Gemini模型列表
                if (geminiModels.length > 0) {
                    tmpData.push(...this._createBreak());
                    tmpData.push(this._createIndent(2));
                    tmpData.push(this._createInfoText(`└─ ${geminiModels.join(', ')}`, COLORS.green));
                }
                
                // 自定义API模型
                const customModel = translationConfig.models?.custom || "";
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(1));
                tmpData.push(this._createInfoText(`• ${t('customModel')}: `, COLORS.gray));
                tmpData.push(this._createInfoText(customModel || t('keyNotSet'), customModel ? COLORS.cyan : COLORS.red));
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(2));
                tmpData.push(this._createInfoText(`(${this.cmd} config customModel ${t('modelPlaceholder')})`, COLORS.gray));
                
                tmpData.push(...this._createBreak());
                tmpData.push(this._createDivider());
                tmpData.push(...this._createBreak());
                
                // ========== API密钥设置区域 ==========
                tmpData.push(this._createSectionHeader(t('apiKeySettings')));
                
                // Gemini密钥
                const geminiKeys = translationConfig.geminiKeys || [];
                const validGeminiKeysCount = geminiKeys.filter(key => key && key.trim() !== "").length;
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(1));
                tmpData.push(this._createInfoText(`• ${t('geminiKeys')}: `, COLORS.gray));
                tmpData.push(this._createInfoText(t('geminiKeysCount', validGeminiKeysCount), validGeminiKeysCount > 0 ? COLORS.green : COLORS.red));
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(2));
                tmpData.push(this._createInfoText(`(${this.cmd} config geminiKeys ${t('geminiKeysPlaceholder')})`, COLORS.gray));
                
                // OpenAI密钥
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(1));
                tmpData.push(this._createInfoText(`• ${t('openaiKey')}: `, COLORS.gray));
                tmpData.push(this._createInfoText(translationConfig.openaiKey ? t('keySet') : t('keyNotSet'), translationConfig.openaiKey ? COLORS.green : COLORS.red));
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(2));
                tmpData.push(this._createInfoText(`(${this.cmd} config openaiKey ${t('keyPlaceholder')})`, COLORS.gray));
                
                // 腾讯混元密钥
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(1));
                tmpData.push(this._createInfoText(`• ${t('hunyuanKey')}: `, COLORS.gray));
                tmpData.push(this._createInfoText(translationConfig.hunyuanKey ? t('keySet') : t('keyNotSet'), translationConfig.hunyuanKey ? COLORS.green : COLORS.red));
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(2));
                tmpData.push(this._createInfoText(`(${this.cmd} config hunyuanKey ${t('keyPlaceholder')})`, COLORS.gray));
                
                // 自定义API配置
                tmpData.push(...this._createBreak());
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(1));
                tmpData.push(this._createInfoText(`${t('customApiSettings')}`, COLORS.purple));
                
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(2));
                tmpData.push(this._createInfoText(`• ${t('customUrl')}: `, COLORS.gray));
                tmpData.push(this._createInfoText(translationConfig.customUrl || t('keyNotSet'), translationConfig.customUrl ? COLORS.cyan : COLORS.red));
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(3));
                tmpData.push(this._createInfoText(`(${this.cmd} config customUrl ${t('customUrlPlaceholder')})`, COLORS.gray));
                
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(2));
                tmpData.push(this._createInfoText(`• ${t('customKey')}: `, COLORS.gray));
                tmpData.push(this._createInfoText(translationConfig.customKey ? t('keySet') : t('keyNotSet'), translationConfig.customKey ? COLORS.green : COLORS.red));
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(3));
                tmpData.push(this._createInfoText(`(${this.cmd} config customKey ${t('keyPlaceholder')})`, COLORS.gray));
                
                tmpData.push(...this._createBreak());
                tmpData.push(this._createDivider());
                tmpData.push(...this._createBreak());
                
                // ========== Gemini OpenAI兼容模式设置区域 ==========
                if (translationConfig.provider === 'gemini') {
                    tmpData.push(this._createSectionHeader(t('geminiOpenAISettings')));
                    
                    // 兼容模式选择
                    const openAIMode = translationConfig.geminiOpenAIMode || 'cloudflare';
                    tmpData.push(...this._createBreak());
                    tmpData.push(this._createIndent(1));
                    tmpData.push(this._createInfoText(`${t('geminiOpenAIMode')}: `, COLORS.gray));
                    
                    ['cloudflare', 'official'].forEach((mode, index) => {
                        tmpData.push(
                            { "text": `<font color="${openAIMode === mode ? COLORS.green : COLORS.blue}" size="+20">[${mode}]</font>`, 
                              "command": `${this.cmd} config geminiOpenAIMode ${mode};${this.cmd} gui` }
                        );
                        if (index === 0) {
                            tmpData.push({ "text": "&nbsp;&nbsp;" });
                        }
                    });
                    
                    // Cloudflare配置（仅当选择cloudflare模式时显示）
                    if (openAIMode === 'cloudflare') {
                        tmpData.push(...this._createBreak());
                        tmpData.push(...this._createBreak());
                        tmpData.push(this._createIndent(1));
                        tmpData.push(this._createInfoText(`Cloudflare ${t('apiKeySettings')}:`, COLORS.purple));
                        
                        // Cloudflare账户ID
                        const cfAccountId = translationConfig.cloudflareAccountId || '';
                        tmpData.push(...this._createBreak());
                        tmpData.push(this._createIndent(2));
                        tmpData.push(this._createInfoText(`• Account ID: `, COLORS.gray));
                        tmpData.push(this._createInfoText(cfAccountId || t('keyNotSet'), cfAccountId ? COLORS.cyan : COLORS.red));
                        
                        // Cloudflare网关ID
                        const cfGatewayId = translationConfig.cloudflareGatewayId || '';
                        tmpData.push(...this._createBreak());
                        tmpData.push(this._createIndent(2));
                        tmpData.push(this._createInfoText(`• Gateway ID: `, COLORS.gray));
                        tmpData.push(this._createInfoText(cfGatewayId || t('keyNotSet'), cfGatewayId ? COLORS.cyan : COLORS.red));
                    }
                    
                    tmpData.push(...this._createBreak());
                    tmpData.push(this._createDivider());
                    tmpData.push(...this._createBreak());
                }
                
                // ========== 界面语言设置区域 ==========
                const currentInterfaceLang = this.translator.getInterfaceLanguage();
                tmpData.push(this._createSectionHeader(t('interfaceLanguage')));
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(1));
                tmpData.push(...this._createLangButtons(GUI_LANGS, currentInterfaceLang, `${this.cmd} config interfaceLanguage`));
                tmpData.push(...this._createBreak());
                tmpData.push(this._createDivider());
                tmpData.push(...this._createBreak());

                // ========== 术语库设置区域 ==========
                const termStats = this.translator.getTerminologyStats();
                
                tmpData.push(this._createSectionHeader(t('terminologySettings')));
                tmpData.push(...this._createBreak());
                tmpData.push(this._createIndent(1));
                tmpData.push(
                    this._createInfoText(t('terminologySettings') + ': '),
                    this._createToggle(t(cfg.useTerminology ? 'enabled' : 'disabled'), cfg.useTerminology, `${this.cmd} config useTerminology ${!cfg.useTerminology};${this.cmd} gui`)
                );
                
                if (termStats) {
                    tmpData.push(...this._createBreak());
                    tmpData.push(...this._createBreak());
                    tmpData.push(this._createIndent(1));
                    tmpData.push(this._createInfoText(`${t('termStats')}`, COLORS.purple));
                    
                    tmpData.push(...this._createBreak());
                    tmpData.push(this._createIndent(2));
                    tmpData.push(this._createInfoText(`• ${t('totalTerms', termStats.totalTerms || 0)}`, COLORS.cyan));
                    
                    // 显示语言覆盖情况
                    if (termStats.languageCoverage) {
                        tmpData.push(...this._createBreak());
                        tmpData.push(...this._createBreak());
                        tmpData.push(this._createIndent(1));
                        tmpData.push(this._createInfoText(`${t('languageCoverage')}`, COLORS.purple));
                        
                        for (const [lang, count] of Object.entries(termStats.languageCoverage)) {
                            tmpData.push(...this._createBreak());
                            tmpData.push(this._createIndent(2));
                            tmpData.push(this._createInfoText(`• ${lang}: ${count}${t('totalTerms', '').replace(/:.+/, '')}`, COLORS.cyan));
                        }
                    }
                    
                    // 显示置信度分布
                    if (termStats.confidenceDistribution) {
                        const { high, medium, low } = termStats.confidenceDistribution;
                        tmpData.push(...this._createBreak());
                        tmpData.push(...this._createBreak());
                        tmpData.push(this._createIndent(1));
                        tmpData.push(this._createInfoText(`${t('confidenceDistribution')}`, COLORS.purple));
                        
                        tmpData.push(...this._createBreak());
                        tmpData.push(this._createIndent(2));
                        tmpData.push(this._createInfoText(`• ${t('high', high)}`, COLORS.green));
                        
                        tmpData.push(...this._createBreak());
                        tmpData.push(this._createIndent(2));
                        tmpData.push(this._createInfoText(`• ${t('medium', medium)}`, COLORS.yellow));
                        
                        tmpData.push(...this._createBreak());
                        tmpData.push(this._createIndent(2));
                        tmpData.push(this._createInfoText(`• ${t('low', low)}`, COLORS.orange));
                    }
                    
                    // 术语库操作说明
                    tmpData.push(...this._createBreak());
                    tmpData.push(...this._createBreak());
                    tmpData.push(this._createIndent(1));
                    tmpData.push(this._createInfoText(`${t('addTerm')}: ${this.cmd} term add [${t('originalPlaceholder')}] [${t('translatedPlaceholder')}]`, COLORS.gray));
                    tmpData.push(...this._createBreak());
                    tmpData.push(this._createIndent(1));
                    tmpData.push(this._createInfoText(`${t('searchTerm')}: ${this.cmd} term search [${t('keywordPlaceholder')}]`, COLORS.gray));
                }

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

    // 辅助函数，创建区域标题（带装饰）
    _createSectionHeader(text) {
        return { "text": `<font color="${COLORS.yellow}" size="+24">${text}</font>` };
    }

    // 辅助函数，创建分隔线
    _createDivider() {
        return { "text": `<font color="${COLORS.gray}">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</font>` };
    }

    // 辅助函数，创建缩进
    _createIndent(level = 1) {
        const indent = "&nbsp;&nbsp;&nbsp;&nbsp;".repeat(level);
        return { "text": indent };
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