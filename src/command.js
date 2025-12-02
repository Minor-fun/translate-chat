const { AVAILABLE_LANGUAGES } = require('./translate');
const Gui = require('./gui');

/**
 * 日志级别选项
 */
const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'none'];

/**
 * 翻译提供商选项
 */
const TRANSLATION_PROVIDERS = ['google', 'gemini', 'openai', 'hunyuan', 'custom'];

/**
 * Gemini OpenAI兼容模式选项
 */
const GEMINI_OPENAI_MODES = ['cloudflare', 'official'];

/**
 * 配置项模式定义
 */
const SETTINGS_SCHEMA = {
  // 基础配置
  'enabled': {
    type: 'boolean',
    default: false,
    description: '模块启用状态',
    applyEffect: (value, mod, utils) => mod.command.message(utils.t(value ? 'moduleEnabled' : 'moduleDisabled'))
  },
  'sourceLang': {
    type: 'string',
    default: 'auto',
    description: '源语言',
    validate: (value) => AVAILABLE_LANGUAGES.includes(value) || value === 'auto',
    validateMessage: (value, utils) => utils.t('invalidLanguage', value),
    applyEffect: (value, mod, utils) => mod.command.message(utils.t('sourceLanguageChanged', value))
  },
  'targetLang': {
    type: 'string',
    default: 'en',
    description: '目标语言',
    validate: (value) => AVAILABLE_LANGUAGES.includes(value) && value !== 'auto',
    validateMessage: (value, utils) => {
      if (!AVAILABLE_LANGUAGES.includes(value)) return utils.t('invalidLanguage', value);
      if (value === 'auto') return utils.t('targetLanguageAuto');
      return '';
    },
    applyEffect: (value, mod, utils) => mod.command.message(utils.t('targetLanguageChanged', value))
  },
  'sendMode': {
    type: 'boolean',
    default: false,
    description: '发送模式',
    applyEffect: (value, mod, utils) => mod.command.message(utils.t('sendModeStatus', value ? utils.t('sendModeEnabled', mod.settings.sendLang) : utils.t('sendModeDisabled')))
  },
  'sendLang': {
    type: 'string',
    default: 'en',
    description: '发送语言',
    validate: (value) => AVAILABLE_LANGUAGES.includes(value),
    validateMessage: (value, utils) => utils.t('invalidLanguage', value),
    applyEffect: (value, mod, utils) => {
      mod.settings.sendMode = true;
      mod.command.message(utils.t('sendLanguageChanged', value));
    }
  },
  
  // 界面语言设置
  'interfaceLanguage': {
    type: 'string',
    default: 'en',
    description: '界面语言',
    validate: (value) => AVAILABLE_LANGUAGES.includes(value),
    validateMessage: (value, utils) => utils.t('invalidLanguage', value),
    applyEffect: async (value, mod, utils) => {
      const success = await utils.translator.setInterfaceLanguage(value);
      if (success) {
        mod.command.message(utils.translator.getI18n().t('interfaceLanguageChanged', value));
      }
    }
  },
  
  // 缓存配置
  'useCache': {
    type: 'boolean',
    default: false,
    description: '启用缓存',
    path: 'cache.enabled',
    applyEffect: (value, mod, utils) => {
      // 更新mod.settings中的值以保持UI状态同步
      mod.settings.useCache = value;
      utils.setCacheEnabled(value);
      mod.command.message(utils.t('cacheEnabled', value ? utils.t('enabled') : utils.t('disabled')));
    }
  },
  // 缓存路径使用默认值 '../data/translation-cache.json'
  'cacheMaxSize': {
    type: 'number',
    default: 20000,
    description: '最大缓存条目数',
    path: 'cache.maxSize',
    validate: (value) => value > 0,
    validateMessage: (value, utils) => utils.t('positiveNumber'),
    applyEffect: (value, mod, utils) => {
      utils.updateCacheConfig({ maxSize: value }).then(config => 
        mod.command.message(utils.t('maxCacheSet', config.maxSize)));
    }
  },
  'cacheInterval': {
    type: 'number',
    default: 10,
    description: '自动保存间隔(分钟)',
    path: 'cache.autoSaveInterval',
    validate: (value) => value >= 0,
    validateMessage: (value, utils) => utils.t('nonNegativeNumber'),
    applyEffect: (value, mod, utils) => {
      // 限制最大间隔为24小时（1440分钟）
      const MAX_INTERVAL_MINUTES = 1440; // 24小时 = 1440分钟
      const effectiveInterval = Math.min(value, MAX_INTERVAL_MINUTES);
      
      // 如果请求的间隔超过最大值，显示警告
      if (value > MAX_INTERVAL_MINUTES) {
        mod.command.message(utils.t('maxIntervalWarning', value, MAX_INTERVAL_MINUTES));
      }
      
      // 直接传递分钟值，而不是毫秒值
      utils.updateCacheConfig({ autoSaveInterval: effectiveInterval }).then(config => 
        mod.command.message(utils.t('autoSaveSet', effectiveInterval)));
    }
  },
  'cacheHashEnabled': {
    type: 'boolean',
    default: false,
    description: '长文本哈希',
    path: 'cache.hashLongText',
    applyEffect: (value, mod, utils) => {
      utils.updateCacheConfig({ hashLongText: value });
      mod.command.message(utils.t('longTextHashEnabled', value ? utils.t('enabled') : utils.t('disabled')));
    }
  },
  'cacheThreshold': {
    type: 'number',
    default: 30,
    description: '长文本阈值',
    path: 'cache.longTextThreshold',
    validate: (value) => value > 0,
    validateMessage: (value, utils) => utils.t('positiveNumber'),
    applyEffect: (value, mod, utils) => {
      utils.updateCacheConfig({ longTextThreshold: value });
      mod.command.message(utils.t('longTextThresholdSet', value));
    }
  },
  'cacheLogLevel': {
    type: 'string',
    default: 'info',
    description: '日志级别',
    path: 'cache.logLevel',
    validate: (value) => LOG_LEVELS.includes(value),
    validateMessage: (value, utils) => utils.t('invalidLanguage', value),
    applyEffect: (value, mod, utils) => {
      utils.updateCacheConfig({ logLevel: value });
      mod.command.message(utils.t('logLevelSet', value));
    }
  },
  'cacheWriteThreshold': {
    type: 'number',
    default: 100,
    description: '写入阈值',
    path: 'cache.writeThreshold',
    validate: (value) => value > 0,
    validateMessage: (value, utils) => utils.t('positiveNumber'),
    applyEffect: (value, mod, utils) => {
      utils.updateCacheConfig({ writeThreshold: value });
      mod.command.message(utils.t('writeThresholdSet', value));
    }
  },
  'cacheCleanupPercentage': {
    type: 'number',
    default: 0.2,
    description: '清理百分比',
    path: 'cache.cleanupPercentage',
    validate: (value) => value > 0 && value <= 1,
    validateMessage: (value, utils) => utils.t('percentageRange'),
    applyEffect: (value, mod, utils) => {
      utils.updateCacheConfig({ cleanupPercentage: value });
      mod.command.message(utils.t('cleanupPercentageSet', value));
    }
  },
  'cacheDedupe': {
    type: 'boolean',
    default: false,
    description: '结果去重',
    path: 'cache.deduplicateResults',
    applyEffect: (value, mod, utils) => {
      utils.updateCacheConfig({ deduplicateResults: value });
      mod.command.message(utils.t('dedupeEnabled', value ? utils.t('enabled') : utils.t('disabled')));
    }
  },
  
  // 术语库配置
  'useTerminology': {
    type: 'boolean',
    default: false,
    description: '启用术语库',
    applyEffect: (value, mod, utils) => {
      if (utils.setTerminologyEnabled) {
        utils.setTerminologyEnabled(value);
      }
      mod.command.message(utils.t('terminologyEnabled', value ? utils.t('enabled') : utils.t('disabled')));
    }
  },
  
  // 翻译提供商配置
  'translationProvider': {
    type: 'string',
    default: 'google',
    description: '翻译提供商',
    path: 'translation.provider',
    validate: (value) => TRANSLATION_PROVIDERS.includes(value),
    validateMessage: (value, utils) => utils.t('invalidLanguage', value),
    applyEffect: (value, mod, utils) => {
      utils.setModuleSettings(mod.settings);
      mod.command.message(utils.t('providerChanged', value));
    }
  },
  'geminiOpenAIMode': {
    type: 'string',
    default: 'official',
    description: 'Gemini OpenAI兼容模式',
    path: 'translation.geminiOpenAIMode',
    validate: (value) => GEMINI_OPENAI_MODES.includes(value),
    validateMessage: (value, utils) => utils.t('invalidGeminiOpenAIMode', value),
    applyEffect: (value, mod, utils) => {
      utils.setModuleSettings(mod.settings);
      mod.command.message(utils.t('geminiOpenAIModeChanged', value));
    }
  },
  'cloudflareAccountId': {
    type: 'string',
    default: '',
    description: 'Cloudflare AI Gateway账户ID',
    path: 'translation.cloudflareAccountId',
    applyEffect: (value, mod, utils) => {
      utils.setModuleSettings(mod.settings);
      mod.command.message(utils.t('cloudflareAccountIdSet'));
    }
  },
  'cloudflareGatewayId': {
    type: 'string',
    default: '',
    description: 'Cloudflare AI Gateway网关ID',
    path: 'translation.cloudflareGatewayId',
    applyEffect: (value, mod, utils) => {
      utils.setModuleSettings(mod.settings);
      mod.command.message(utils.t('cloudflareGatewayIdSet'));
    }
  },
  // 模型配置
  'openaiModel': {
    type: 'string',
    default: '',
    description: 'OpenAI模型',
    path: 'translation.models.openai',
    applyEffect: (value, mod, utils) => {
      utils.setModuleSettings(mod.settings);
      mod.command.message(utils.t('modelSet', 'OpenAI', value));
    }
  },
  'hunyuanModel': {
    type: 'string',
    default: '',
    description: '腾讯混元模型',
    path: 'translation.models.hunyuan',
    applyEffect: (value, mod, utils) => {
      utils.setModuleSettings(mod.settings);
      mod.command.message(utils.t('modelSet', utils.t('hunyuanKey'), value));
    }
  },
  'geminiModels': {
    type: 'array',
    default: [],
    description: 'Gemini模型列表',
    path: 'translation.models.gemini',
    processInput: (value) => value.split(',').map(m => m.trim()),
    applyEffect: (value, mod, utils) => {
      utils.setModuleSettings(mod.settings);
      mod.command.message(utils.t('geminiModelsSet', value.length));
    }
  },
  'geminiKeys': {
    type: 'array',
    default: [],
    description: 'Gemini密钥',
    path: 'translation.geminiKeys',
    processInput: (value) => value.split(',').map(k => k.trim()),
    applyEffect: (value, mod, utils) => {
      utils.setModuleSettings(mod.settings);
      mod.command.message(utils.t('geminiKeysSet', value.filter(k => k).length));
    }
  },
  'openaiKey': {
    type: 'string',
    default: '',
    description: 'OpenAI密钥',
    path: 'translation.openaiKey',
    applyEffect: (value, mod, utils) => {
      utils.setModuleSettings(mod.settings);
      mod.command.message(utils.t('keySet', 'OpenAI'));
    }
  },
  'hunyuanKey': {
    type: 'string',
    default: '',
    description: '腾讯混元密钥',
    path: 'translation.hunyuanKey',
    applyEffect: (value, mod, utils) => {
      utils.setModuleSettings(mod.settings);
      mod.command.message(utils.t('keySet', utils.t('hunyuanKey')));
    }
  },
  'customUrl': {
    type: 'string',
    default: '',
    description: '自定义API URL',
    path: 'translation.customUrl',
    applyEffect: (value, mod, utils) => {
      utils.setModuleSettings(mod.settings);
      mod.command.message(utils.t('customUrlSet'));
    }
  },
  'customKey': {
    type: 'string',
    default: '',
    description: '自定义API密钥',
    path: 'translation.customKey',
    applyEffect: (value, mod, utils) => {
      utils.setModuleSettings(mod.settings);
      mod.command.message(utils.t('keySet', 'Custom'));
    }
  },
  'customModel': {
    type: 'string',
    default: '',
    description: '自定义API模型',
    path: 'translation.models.custom',
    applyEffect: (value, mod, utils) => {
      utils.setModuleSettings(mod.settings);
      mod.command.message(utils.t('modelSet', 'Custom', value));
    }
  }
};

/**
 * 配置处理器类
 */
class ConfigHandler {
  constructor(mod, utils) {
    this.mod = mod;
    this.utils = utils;
    this.schema = SETTINGS_SCHEMA;
  }

  /**
   * 处理配置命令
   * @param {string} key 配置项键名
   * @param {any} value 配置项值
   */
  handleConfigCommand(key, value) {
    const schema = this.schema[key];
    if (!schema) {
      this.mod.command.message(this.utils.t('invalidKey', key));
      return;
    }

    if (value === undefined) {
      // 显示当前值
      const currentValue = this.getConfigValue(key);
      this.mod.command.message(`${schema.description}: ${currentValue}`);
      return;
    }

    // 处理值
    let processedValue = this.processValue(value, schema);
    
    // 验证值
    if (schema.validate && !schema.validate(processedValue)) {
      this.mod.command.message(schema.validateMessage ? schema.validateMessage(value, this.utils) : this.utils.t('valueError', value));
      return;
    }

    // 设置值
    this.setConfigValue(key, processedValue);
    
    // 应用效果
    if (schema.applyEffect) {
      schema.applyEffect(processedValue, this.mod, this.utils);
    }
    
    // 保存设置
    this.mod.saveSettings();
  }

  /**
   * 处理输入值
   */
  processValue(value, schema) {
    if (schema.processInput) return schema.processInput(value);
    
    switch (schema.type) {
      case 'boolean':
        if (value === 'true' || value === 'on' || value === '1') return true;
        if (value === 'false' || value === 'off' || value === '0') return false;
        return Boolean(value);
      case 'number':
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
      case 'array':
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') return value.split(',').map(v => v.trim());
        return [value];
      default:
        return value;
    }
  }

  /**
   * 获取配置值
   */
  getConfigValue(key) {
    const schema = this.schema[key];
    if (!schema) return undefined;
    
    return schema.path 
      ? this.getValueByPath(this.mod.settings, schema.path)
      : (this.mod.settings[key] !== undefined ? this.mod.settings[key] : schema.default);
  }

  /**
   * 设置配置值
   */
  setConfigValue(key, value) {
    const schema = this.schema[key];
    if (!schema) return;
    
    schema.path 
      ? this.setValueByPath(this.mod.settings, schema.path, value)
      : this.mod.settings[key] = value;
  }

  /**
   * 按路径获取值
   */
  getValueByPath(obj, path) {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    
    return current;
  }

  /**
   * 按路径设置值
   */
  setValueByPath(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current[part] === undefined || current[part] === null) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }
}

/**
 * 命令处理模块
 */
class CommandHandler {
  constructor(mod, translator) {
    this.mod = mod;
    this.translator = translator;
    this.i18n = translator.getI18n();
    
    const utils = {
      setCacheEnabled: (enabled) => this.translator.setCacheEnabled(enabled),
      updateCacheConfig: (config) => this.translator.updateCacheConfig(config),
      setModuleSettings: () => this.translator.updateSettings(),
      setTerminologyEnabled: (enabled) => this.translator.setTerminologyEnabled(enabled),
      t: (key, ...args) => this.i18n.t(key, ...args),
      translator: this.translator
    };
    this.configHandler = new ConfigHandler(mod, utils);
    
    // 初始化GUI
    this.gui = new Gui(mod, this.translator);
    this.gui.init();
  }

  registerCommands() {
    this.mod.command.add('translate', {
      $default: () => this.showGui(),
      list: () => this.showCommandList(),
      cache: {
        $none: () => this.showGui(),
        search: keyword => this.searchCacheItems(keyword),
        remove: this.getCacheRemoveCommands(),
        save: () => this.saveCache()
      },
      term: {
        $none: () => this.showGui(),
        add: (original, translated) => this.addTerm(original, translated),
        correct: (original, corrected) => this.addTerm(original, corrected),
        search: keyword => this.searchTerms(keyword)
      },
      interface: {
        $default: (lang) => this.setInterfaceLanguage(lang),
        list: () => this.listInterfaceLanguages()
      },
      config: {
        $default: () => this.showGui(),
        // 基础设置
        enabled: (value) => this.configHandler.handleConfigCommand('enabled', value),
        sendMode: (value) => this.configHandler.handleConfigCommand('sendMode', value),
        // 语言设置
        sourceLang: (value) => this.configHandler.handleConfigCommand('sourceLang', value),
        targetLang: (value) => this.configHandler.handleConfigCommand('targetLang', value),
        sendLang: (value) => this.configHandler.handleConfigCommand('sendLang', value),
        interfaceLanguage: (value) => this.configHandler.handleConfigCommand('interfaceLanguage', value),
        // 翻译提供商设置
        translationProvider: (value) => this.configHandler.handleConfigCommand('translationProvider', value),
        // 模型配置
        openaiModel: (value) => this.configHandler.handleConfigCommand('openaiModel', value),
        hunyuanModel: (value) => this.configHandler.handleConfigCommand('hunyuanModel', value),
        geminiModels: (value) => this.configHandler.handleConfigCommand('geminiModels', value),
        // Gemini OpenAI兼容模式设置
        geminiOpenAIMode: (value) => this.configHandler.handleConfigCommand('geminiOpenAIMode', value),
        cloudflareAccountId: (value) => this.configHandler.handleConfigCommand('cloudflareAccountId', value),
        cloudflareGatewayId: (value) => this.configHandler.handleConfigCommand('cloudflareGatewayId', value),
        // API密钥设置
        geminiKeys: (value) => this.configHandler.handleConfigCommand('geminiKeys', value),
        openaiKey: (value) => this.configHandler.handleConfigCommand('openaiKey', value),
        hunyuanKey: (value) => this.configHandler.handleConfigCommand('hunyuanKey', value),
        // 自定义API设置
        customUrl: (value) => this.configHandler.handleConfigCommand('customUrl', value),
        customKey: (value) => this.configHandler.handleConfigCommand('customKey', value),
        customModel: (value) => this.configHandler.handleConfigCommand('customModel', value),
        // 缓存设置
        useCache: (value) => this.configHandler.handleConfigCommand('useCache', value),
        cacheMaxSize: (value) => this.configHandler.handleConfigCommand('cacheMaxSize', value),
        cacheInterval: (value) => this.configHandler.handleConfigCommand('cacheInterval', value),
        cacheHashEnabled: (value) => this.configHandler.handleConfigCommand('cacheHashEnabled', value),
        cacheThreshold: (value) => this.configHandler.handleConfigCommand('cacheThreshold', value),
        cacheLogLevel: (value) => this.configHandler.handleConfigCommand('cacheLogLevel', value),
        cacheWriteThreshold: (value) => this.configHandler.handleConfigCommand('cacheWriteThreshold', value),
        cacheCleanupPercentage: (value) => this.configHandler.handleConfigCommand('cacheCleanupPercentage', value),
        cacheDedupe: (value) => this.configHandler.handleConfigCommand('cacheDedupe', value),
        // 术语库设置
        useTerminology: (value) => this.configHandler.handleConfigCommand('useTerminology', value)
      },
      gui: () => this.showGui()
    });
  }

  showCommandList() {
    const t = (key, ...args) => this.i18n.t(key, ...args);
    
    const messages = [
      t('commandList'),
      
      // 基础命令
      t('commandListItem', 'translate', t('openGuiDesc')),
      t('commandListItem', 'translate gui', t('openGuiSettingsDesc')),
      t('commandListItem', 'translate list', t('showCommandsDesc')),
      
      // 基础设置
      t('commandCategory', t('basicSettings')),
      t('commandListItem', 'translate config enabled [true|false]', t('toggleModuleDesc')),
      t('commandListItem', 'translate config sendMode [true|false]', t('toggleSendModeDesc')),
      
      // 语言设置
      t('commandCategory', t('languageSettings')),
      t('commandListItem', 'translate config sourceLang [' + t('languageCodePlaceholder') + ']', t('setSourceLangDesc')),
      t('commandListItem', 'translate config targetLang [' + t('languageCodePlaceholder') + ']', t('setTargetLangDesc')),
      t('commandListItem', 'translate config sendLang [' + t('languageCodePlaceholder') + ']', t('setSendLangDesc')),
      t('commandListItem', 'translate config interfaceLanguage [' + t('languageCodePlaceholder') + ']', t('setInterfaceLanguageDesc')),
      t('commandListItem', 'translate interface [' + t('languageCodePlaceholder') + ']', t('setInterfaceLanguageDesc')),
      t('commandListItem', 'translate interface list', t('listInterfaceLanguagesDesc')),
      
      // 缓存命令
      t('commandCategory', t('cacheCommands')),
      t('commandListItem', 'translate cache save', t('saveCacheDesc')),
      t('commandListItem', 'translate cache search [' + t('keywordPlaceholder') + ']', t('searchCacheDesc')),
      t('commandListItem', 'translate cache remove lang/to/keyword [' + t('valuePlaceholder') + ']', t('removeCacheDesc')),
      
      // 缓存设置
      t('commandCategory', t('cacheSettings')),
      t('commandListItem', 'translate config useCache [true|false]', t('toggleCacheDesc')),
      t('commandListItem', 'translate config cacheMaxSize [' + t('numberPlaceholder') + ']', t('setCacheMaxSizeDesc')),
      t('commandListItem', 'translate config cacheInterval [' + t('numberPlaceholder') + ']', t('setCacheIntervalDesc')),
      t('commandListItem', 'translate config cacheHashEnabled [true|false]', t('toggleCacheHashDesc')),
      t('commandListItem', 'translate config cacheThreshold [' + t('numberPlaceholder') + ']', t('setCacheThresholdDesc')),
      t('commandListItem', 'translate config cacheLogLevel [' + t('logLevelPlaceholder') + ']', t('setCacheLogLevelDesc')),
      t('commandListItem', 'translate config cacheWriteThreshold [' + t('numberPlaceholder') + ']', t('setCacheWriteThresholdDesc')),
      t('commandListItem', 'translate config cacheCleanupPercentage [' + t('numberPlaceholder') + ']', t('setCacheCleanupPercentageDesc')),
      t('commandListItem', 'translate config cacheDedupe [true|false]', t('toggleCacheDedupeDesc')),
      
      // 术语库命令和设置
      t('commandCategory', t('terminologyCommands')),
      t('commandListItem', 'translate term add [' + t('originalPlaceholder') + '] [' + t('translatedPlaceholder') + ']', t('addTermDesc')),
      t('commandListItem', 'translate term correct [' + t('originalPlaceholder') + '] [' + t('correctedPlaceholder') + ']', t('correctTermDesc')),
      t('commandListItem', 'translate term search [' + t('keywordPlaceholder') + ']', t('searchTermDesc')),
      t('commandListItem', 'translate config useTerminology [true|false]', t('toggleTerminologyDesc')),
      
      // 翻译提供商设置
      t('commandCategory', t('providerSettings')),
      t('commandListItem', 'translate config translationProvider [google|gemini|openai|hunyuan]', t('setProviderDesc')),
      
      // API密钥设置
      t('commandCategory', t('apiKeySettings')),
      t('commandListItem', 'translate config geminiKeys [' + t('geminiKeysPlaceholder') + ']', t('setGeminiKeysDesc')),
      t('commandListItem', 'translate config openaiKey [' + t('keyPlaceholder') + ']', t('setOpenAIKeyDesc')),
      t('commandListItem', 'translate config hunyuanKey [' + t('keyPlaceholder') + ']', t('setHunyuanKeyDesc')),
      
      // 模型配置
      t('commandCategory', t('modelSettings')),
      t('commandListItem', 'translate config openaiModel [' + t('modelNamePlaceholder') + ']', t('setOpenAIModelDesc')),
      t('commandListItem', 'translate config hunyuanModel [' + t('modelNamePlaceholder') + ']', t('setHunyuanModelDesc')),
      t('commandListItem', 'translate config geminiModels [' + t('modelNamesPlaceholder') + ']', t('setGeminiModelsDesc')),
      
      // Gemini OpenAI兼容模式设置
      t('commandCategory', t('geminiOpenAISettings')),
      t('commandListItem', 'translate config geminiOpenAIMode [cloudflare|official]', t('setGeminiOpenAIModeDesc')),
      t('commandListItem', 'translate config cloudflareAccountId [' + t('accountIdPlaceholder') + ']', t('setCloudflareAccountIdDesc')),
      t('commandListItem', 'translate config cloudflareGatewayId [' + t('gatewayIdPlaceholder') + ']', t('setCloudflareGatewayIdDesc')),
      
      '\n' + t('configsInGuiNote')
    ];
    
    messages.forEach(msg => this.mod.command.message(msg));
  }

  getCacheRemoveCommands() {
    return {
      $default: () => this.mod.command.message(this.i18n.t('specifyCondition')),
      lang: (lang) => this.removeCacheByCondition('lang', lang),
      to: (lang) => this.removeCacheByCondition('to', lang),
      keyword: (keyword) => this.removeCacheByCondition('keyword', keyword)
    };
  }

  /**
   * 手动保存缓存
   */
  saveCache() {
    const result = this.translator.saveCache();
    if (result && result.then) {
      // 如果是Promise，等待它完成
      result.then(() => {
        this.mod.command.message(this.i18n.t('cacheSaved'));
      }).catch(err => {
        this.mod.command.message(this.i18n.t('saveFailed', err.message || '未知错误'));
      });
    } else {
      // 如果不是Promise，直接显示成功消息
      this.mod.command.message(this.i18n.t('cacheSaved'));
    }
  }

  searchCacheItems(keyword) {
    if (!keyword) {
      this.mod.command.message(this.i18n.t('provideKeyword'));
      return;
    }
    
    const results = this.translator.searchCache(keyword, 5);
    if (results.length === 0) {
      this.mod.command.message(this.i18n.t('noCacheFound', keyword));
      return;
    }
    
    this.mod.command.message(this.i18n.t('cacheFound', results.length, keyword));
    results.forEach((item, index) => {
      this.mod.command.message(`${index + 1}. ${item.from} → ${item.to}: "${item.text}" => "${item.result}" (${item.time})`);
    });
  }

  removeCacheByCondition(type, value) {
    // 语言类型验证
    if ((type === 'lang' || type === 'to') && (!value || !AVAILABLE_LANGUAGES.includes(value))) {
      this.mod.command.message(value ? this.i18n.t('invalidLanguage', value) : this.i18n.t('validLanguage'));
      return;
    }
    
    // 关键词验证
    if (type === 'keyword' && !value) {
      this.mod.command.message(this.i18n.t('validKeyword'));
      return;
    }
    
    // 执行删除操作
    switch (type) {
      case 'lang':
        this.translator.removeCacheByLang(value);
        this.mod.command.message(this.i18n.t('cacheDeleted', value));
        break;
      case 'to':
        this.translator.removeCacheByTargetLang(value);
        this.mod.command.message(this.i18n.t('targetLangCacheDeleted', value));
        break;
      case 'keyword':
        this.translator.removeCacheByKeyword(value);
        this.mod.command.message(this.i18n.t('keywordCacheDeleted', value));
        break;
    }
  }

  addTerm(original, translated) {
    this.translator.addOrUpdateTerm(original, translated);
    this.mod.command.message(this.i18n.t('termAddedUpdated', original, translated));
  }

  searchTerms(keyword) {
    if (!keyword) {
      this.mod.command.message(this.i18n.t('provideKeyword'));
      return;
    }
    
    const results = this.translator.searchTerminology(keyword);
    if (results.length === 0) {
      this.mod.command.message(this.i18n.t('noTermsFound', keyword));
      return;
    }
    
    this.mod.command.message(this.i18n.t('termsFound', results.length, keyword));
    results.forEach((item, index) => {
      this.mod.command.message(`${index + 1}. ${item.original} → ${item.translated}: "${item.definition}"`);
    });
  }
  
  /**
   * 设置界面语言
   * @param {string} lang 语言代码
   */
  async setInterfaceLanguage(lang) {
    if (!lang || !AVAILABLE_LANGUAGES.includes(lang)) {
      this.mod.command.message(lang ? this.i18n.t('invalidLanguage', lang) : this.i18n.t('validLanguage'));
      return;
    }
    
    const result = await this.translator.setInterfaceLanguage(lang);
    if (result) {
      this.mod.command.message(this.i18n.t('interfaceLanguageChanged', lang));
    } else {
      this.mod.command.message(this.i18n.t('invalidLanguage', lang));
    }
  }
  
  /**
   * 列出支持的界面语言
   */
  listInterfaceLanguages() {
    const currentLang = this.translator.getInterfaceLanguage();
    const t = this.i18n.t.bind(this.i18n);
    this.mod.command.message(t('currentInterfaceLanguage', currentLang));
    this.mod.command.message(t('availableInterfaceLanguages', AVAILABLE_LANGUAGES.join(', ')));
  }

  /**
   * 显示GUI界面
   */
  showGui() {
    this.gui.show('index');
  }
}

module.exports = CommandHandler; 
