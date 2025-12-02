/**
 * i18n.js - 国际化支持模块
 * 为翻译模块提供多语言界面支持，并利用现有翻译功能
 */

const fs = require('fs');
const path = require('path');

// 默认语言
const DEFAULT_LANGUAGE = 'en';

// 基础语言文件（英文）
const baseMessages = {
  'moduleEnabled': 'Module enabled',
  'moduleDisabled': 'Module disabled',
  'enabled': 'Enabled',
  'disabled': 'Disabled',
  'yes': 'Yes',
  'no': 'No',
  'save': 'Save',
  'cancel': 'Cancel',
  'apply': 'Apply',
  'reset': 'Reset',
  'guiTitle': 'Translation Settings',
  'basicSettings': 'Basic Settings',
  'languageSettings': 'Language Settings',
  'engineStatus': 'Translation Engine Status',
  'providerSettings': 'Translation Provider',
  'apiKeySettings': 'API Key Settings',
  'cacheSettings': 'Cache Settings',
  'terminologySettings': 'Terminology',
  'interfaceLanguage': 'Interface Language',
  'sourceLanguage': 'Source Language',
  'targetLanguage': 'Target Language',
  'sendLanguage': 'Send Language',
  'sendMode': 'Send Mode',
  'currentEngine': 'Current Engine',
  'provider': 'Provider',
  'availableModels': 'Available Models',
  'currentKey': 'Current Key',
  'errorStatus': 'Error Status',
  'geminiKeys': 'Gemini Keys',
  'geminiKeysCount': '{0} keys configured',
  'geminiKeysAvailable': '{0} available, current #{1}',
  'openaiKey': 'OpenAI Key',
  'hunyuanKey': 'Tencent Hunyuan Key',
  'keySet': 'Configured',
  'keyNotSet': 'Not Configured',
  'setKey': 'Set {0} key',
  'basicInfo': 'Basic Info',
  'cacheStatus': '{0}/{1} entries ({2}%)',
  'hitStats': '{0} (hit {1}/miss {2}/total {3})',
  'cacheState': '{0}{1}',
  'cacheStateEnabled': 'Enabled',
  'cacheStateDisabled': 'Disabled',
  'cacheModified': ' (unsaved changes)',
  'autoSave': 'Auto-save: {0} | Added {1} | Saved {2} times',
  'autoSaveMinutes': '{0} minutes',
  'autoSaveDisabled': 'disabled',
  'saveNow': 'Save Now',
  'cacheSaved': 'Translation cache manually saved',
  'saveFailed': 'Save failed: {0}',
  'deduplication': 'Deduplication',
  'dedupeEffects': 'Deduplication Effects',
  'memoryOptimization': 'Memory: {0} unique/{1} references (saved {2})',
  'performanceOptimization': 'Performance: Skipped {0} duplicate translations (saved {1} requests)',
  'duplicateData': 'Duplicates: Found {0} groups, {1} duplicate entries',
  'textReuse': 'Text reuse: {0} shared text blocks (reduced memory usage)',
  'maxCacheEntries': 'Max Cache Entries',
  'autoSaveInterval': 'Auto-save Interval (minutes)',
  'longTextHash': 'Long Text Hashing',
  'longTextThreshold': 'Long Text Threshold',
  'logLevel': 'Log Level',
  'writeThreshold': 'Write Threshold',
  'cleanupPercentage': 'Cleanup Percentage',
  'dedupeResults': 'Deduplicate Results',
  'termStats': 'Terminology Stats',
  'totalTerms': 'Total terms: {0}',
  'languageCoverage': 'Language Coverage',
  'confidenceDistribution': 'Confidence Distribution',
  'high': 'High: {0}',
  'medium': 'Medium: {0}',
  'low': 'Low: {0}',
  'addTerm': 'Add term: {0} add <original> <translated>',
  'searchTerm': 'Search terms: {0} search <keyword>',
  'providerChanged': 'Translation provider set to: {0}',
  'sourceLanguageChanged': 'Source language set to: {0}',
  'targetLanguageChanged': 'Target language set to: {0}',
  'sendLanguageChanged': 'Now translating outgoing messages to: {0}',
  'sendModeStatus': 'Send mode: {0}',
  'sendModeEnabled': 'enabled. Language: {0}',
  'sendModeDisabled': 'disabled',
  'logLevelSet': 'Log level set to: {0}',
  'geminiKeysSet': 'Set {0} Gemini keys',
  'cacheEnabled': 'Translation cache {0}',
  'maxCacheSet': 'Max cache entries set to: {0}',
  'autoSaveSet': 'Auto-save interval set to: {0} minutes',
  'longTextHashEnabled': 'Long text hashing {0}',
  'longTextThresholdSet': 'Long text threshold set to: {0} characters',
  'writeThresholdSet': 'Write threshold set to: {0} changes',
  'cleanupPercentageSet': 'Cleanup percentage set to: {0}',
  'dedupeEnabled': 'Result deduplication {0}',
  'terminologyEnabled': 'Terminology {0}',
  'interfaceLanguageChanged': 'Interface language set to: {0}. Restart may be required for full effect.',
  'openGuiDesc': 'Open GUI interface',
  'showCommandsDesc': 'Show all available commands',
  'saveCacheDesc': 'Save cache immediately',
  'searchCacheDesc': 'Search cache',
  'removeCacheDesc': 'Delete cache by condition',
  'addTermDesc': 'Add terminology',
  'searchTermDesc': 'Search terminology',
  'setInterfaceLanguageDesc': 'Set interface language',
  'alternativeInterfaceLanguageDesc': 'Alternative way to set interface language',
  'listInterfaceLanguagesDesc': 'Show available interface languages',
  'setGeminiKeysDesc': 'Set Gemini keys',
  'setOpenAIKeyDesc': 'Set OpenAI key',
  'setHunyuanKeyDesc': 'Set Tencent Hunyuan key',
  'openGuiSettingsDesc': 'Open graphical settings interface',
  'configsInGuiNote': 'Most settings can be configured directly in the GUI interface, which is recommended.',
  'keywordPlaceholder': 'keyword',
  'valuePlaceholder': 'value',
  'originalPlaceholder': 'original',
  'translatedPlaceholder': 'translated',
  'correctedPlaceholder': 'corrected',
  'languageCodePlaceholder': 'language code',
  'geminiKeysPlaceholder': 'key1,key2,...',
  'keyPlaceholder': 'key',
  'modelNamePlaceholder': 'model name',
  'modelNamesPlaceholder': 'model1,model2,...',
  'numberPlaceholder': 'number',
  'logLevelPlaceholder': 'debug|info|warn|error|none',
  'welcomeMessage': 'Send mode enabled. Translating sent messages to {0}',
  'helpMessage': 'Use "/8 translate list" to see all available commands.',
  'commandList': '===== Translation Module Command List =====',
  'commandListItem': '{0} - {1}',
  'commandCategory': '=== {0} ===',
  'currentInterfaceLanguage': 'Current interface language: {0}',
  'availableInterfaceLanguages': 'Available interface languages: {0}',
  'termAddedUpdated': 'Term added or updated: {0} → {1}',
  'provideKeyword': 'Please provide a search keyword',
  'noTermsFound': 'No terms found containing "{0}"',
  'termsFound': 'Found {0} terms containing "{1}":',
  'noCacheFound': 'No cache entries found containing "{0}"',
  'cacheFound': 'Found {0} cache entries containing "{1}":',
  'invalidLanguage': 'Error: {0} is not a valid language. Please check the documentation for available languages.',
  'targetLanguageAuto': 'Error: Target language cannot be set to auto.',
  'validLanguage': 'Please specify a valid language code',
  'valueError': 'Error: {0} is not a valid value',
  'invalidKey': 'Error: Unknown configuration item {0}',
  'validKeyword': 'Please provide a valid keyword',
  'positiveNumber': 'Error: Number must be positive',
  'nonNegativeNumber': 'Error: Number must be non-negative',
  'percentageRange': 'Error: Percentage must be between 0 and 1',
  'maxIntervalWarning': 'Warning: Requested interval {0} minutes too large, limited to maximum {1} minutes (24 hours)',
  'specifyCondition': 'Please specify a deletion condition, e.g.: translate cache remove lang ko or translate cache remove keyword hello',
  'cacheDeleted': 'Deleted cache for {0} language',
  'targetLangCacheDeleted': 'Deleted cache with {0} as target language',
  'keywordCacheDeleted': 'Deleted cache containing keyword "{0}"',
  'translatingMessages': 'Translating interface messages to {0}...',
  'translationComplete': 'Interface translation complete',
  'translationFailed': 'Failed to translate some messages',
  'languageFileLoaded': 'Language file loaded: {0}',
  'invalidUrlError': 'Invalid URL or protocol error',
  'dnsResolutionError': 'DNS resolution failed',
  'connectionRefusedError': 'Connection refused',
  'hostUnreachableError': 'Host unreachable',
  'networkTimeoutError': 'Network timeout',
  'networkConnectionError': 'Network connection failed',
  'unknownError': 'Unknown error',
  'badRequestError': 'Bad request parameters',
  'unauthorizedError': 'Invalid API key or unauthorized',
  'forbiddenError': 'Insufficient access permissions',
  'notFoundError': 'Resource not found',
  'requestTimeoutError': 'Request timeout',
  'contentTooLargeError': 'Request content too large',
  'rateLimitError': 'Rate limit exceeded',
  'serverError': 'Server internal error',
  'gatewayError': 'Gateway error',
  'serviceUnavailableError': 'Service unavailable',
  'gatewayTimeoutError': 'Gateway timeout',
  'httpError': 'HTTP error ({0})',
  'hunyuanParamError': 'Tencent Hunyuan parameter format error',
  'hunyuanAuthError': 'Tencent Hunyuan authentication failed',
  'hunyuanServiceUnavailableError': 'Tencent Hunyuan service temporarily unavailable',
  'hunyuanRateLimitError': 'Tencent Hunyuan request frequency exceeded',
  'hunyuanNoResponseError': 'Tencent Hunyuan API no response',
  'hunyuanParamFormatError': 'Tencent Hunyuan parameter error',
  'hunyuanPermissionError': 'Tencent Hunyuan insufficient permissions',
  'hunyuanInternalError': 'Tencent Hunyuan service internal error',
  'openaiModelNotFoundError': 'OpenAI model not found',
  'openaiQuotaExceededError': 'OpenAI quota exceeded',
  'openaiContextLengthError': 'OpenAI context length exceeded',
  'openaiContentPolicyError': 'OpenAI content policy violation',
  'openaiInvalidKeyError': 'OpenAI invalid API key',
  'openaiRateLimitError': 'OpenAI request rate limit',
  'openaiServerError': 'OpenAI server error',
  'openaiOverloadedError': 'OpenAI service overloaded',
  'geminiParamError': 'Gemini parameter error',
  'geminiAuthError': 'Gemini authentication failed',
  'geminiPermissionError': 'Gemini permission error',
  'geminiQuotaError': 'Gemini resource quota limit',
  'geminiInternalError': 'Gemini internal service error',
  'geminiUnavailableError': 'Gemini service temporarily unavailable',
  'geminiNoResponseError': 'Gemini API no response',
  'geminiSafetyFilterError': 'Gemini content safety filter',
  'geminiResourceLimitError': 'Gemini resource limit',
  'aiGatewayEmptyContentError': 'AI Gateway: Empty message content',
  'aiGatewayRoutingError': 'AI Gateway routing error',
  'aiGatewayProviderError': 'AI Gateway provider error',
  'aiGatewayQuotaError': 'Cloudflare AI Gateway quota limit',
  'aiGatewayRouteConfigError': 'AI Gateway route configuration error',
  'aiGatewayRequestFormatError': 'AI Gateway request format error',
  'aiGatewayAuthError': 'AI Gateway authentication failed',
  'aiGatewayPermissionError': 'AI Gateway insufficient permissions',
  'aiGatewayRateLimitError': 'AI Gateway request rate limit',
  'aiGatewayQuotaExceededError': 'AI Gateway quota exceeded',
  'aiGatewayInternalError': 'AI Gateway internal error',
  'aiGatewayBackendError': 'AI Gateway backend service error',
  'aiGatewayTimeoutError': 'AI Gateway request timeout',
  'invalidApiKeyError': 'Invalid API key',
  'requestRateLimitError': 'Request rate limit',
  'jsonParseError': 'JSON parsing error',
  'invalidResponseError': 'Invalid response',
  'contextLengthExceededError': 'Context length exceeded',
  'contentPolicyViolationError': 'Content policy violation',
  'logPrefix': '[{0}]',
  'errorPrefix': '[{0}] Error: ',
  'warningPrefix': '[{0}] Warning: ',
  'infoPrefix': '[{0}] Info: ',
  'invalidGeminiOpenAIMode': 'Invalid Gemini OpenAI compatibility mode: {0}',
  'geminiOpenAIModeChanged': 'Gemini OpenAI compatibility mode changed to: {0}',
  'cloudflareAccountIdSet': 'Cloudflare account ID set',
  'cloudflareGatewayIdSet': 'Cloudflare gateway ID set',
  'modelSet': '{0} model set to: {1}',
  'geminiModelsSet': 'Set {0} Gemini models',
  'setGeminiOpenAIModeDesc': 'Set Gemini OpenAI compatibility mode',
  'accountIdPlaceholder': 'account ID',
  'setCloudflareAccountIdDesc': 'Set Cloudflare AI Gateway account ID',
  'gatewayIdPlaceholder': 'gateway ID',
  'setCloudflareGatewayIdDesc': 'Set Cloudflare AI Gateway gateway ID',
  'modelSettings': 'Model Settings',
  'openaiModel': 'OpenAI Model',
  'modelPlaceholder': 'model name',
  'hunyuanModel': 'Tencent Hunyuan Model',
  'geminiModels': 'Gemini Models',
  'models': 'models',
  'geminiModelsPlaceholder': 'model1,model2,...',
  'geminiOpenAISettings': 'Gemini OpenAI Compatibility Settings',
  'geminiOpenAIMode': 'Gemini OpenAI Compatibility Mode',
  'cloudflareAccountId': 'Cloudflare Account ID',
  'cloudflareGatewayId': 'Cloudflare Gateway ID',
  'customModel': 'Custom API Model',
  'customUrl': 'Custom API URL',
  'customKey': 'Custom API Key',
  'customApiSettings': 'Custom API Settings',
  'customUrlPlaceholder': 'https://example.com/v1',
  'customUrlSet': 'Custom API URL set',
  'customModelSet': 'Custom API model set to: {0}',
  'customKeySet': 'Custom API key set'
};

// 已加载的语言缓存
const loadedLanguages = {
  [DEFAULT_LANGUAGE]: baseMessages
};

/**
 * 国际化管理类
 */
class I18nManager {
  /**
   * 构造函数
   * @param {Object} mod 模块对象
   * @param {Object} translator 翻译器对象
   */
  constructor(mod, translator = null) {
    this.mod = mod;
    this.translator = translator;
    this.currentLanguage = DEFAULT_LANGUAGE;
    
    // 设置语言文件目录
    const srcPath = 'src';
    this.srcDir = path.join(mod.info.path, srcPath);
    this.langDir = path.join(this.srcDir, 'lang');
    
    try {
      if (!fs.existsSync(this.langDir)) {
        fs.mkdirSync(this.langDir);
      }
    } catch (e) {
      this.mod.error('创建语言文件目录失败:', e);
    }
    
    // 初始化语言设置
    if (mod.settings.interfaceLanguage) {
      this.setLanguage(mod.settings.interfaceLanguage);
    }
  }
  
  /**
   * 设置翻译器实例
   * @param {Object} translator 翻译器实例
   */
  setTranslator(translator) {
    this.translator = translator;
  }
  
  /**
   * 设置当前语言
   * @param {string} lang 语言代码
   * @returns {Promise<boolean>} 是否成功设置
   */
  async setLanguage(lang) {
    if (lang === DEFAULT_LANGUAGE) {
      this.currentLanguage = DEFAULT_LANGUAGE;
      this.mod.settings.interfaceLanguage = DEFAULT_LANGUAGE;
      this.mod.saveSettings();
      return true;
    }
    
    try {
      // 尝试加载语言文件
      const langLoaded = await this.loadLanguageFile(lang);
      
      if (langLoaded) {
        this.currentLanguage = lang;
        this.mod.settings.interfaceLanguage = lang;
        this.mod.saveSettings();
        return true;
      }
      
      // 如果没有语言文件且有翻译器，尝试翻译消息
      if (this.translator) {
        await this.translateMessages(lang);
        return true;
      }
      
      return false;
    } catch (e) {
      this.mod.error('设置语言失败:', e);
      return false;
    }
  }
  
  /**
   * 获取当前语言
   * @returns {string} 当前语言代码
   */
  getLanguage() {
    return this.currentLanguage;
  }
  
  /**
   * 加载语言文件
   * @param {string} lang 语言代码
   * @returns {Promise<boolean>} 是否成功加载
   */
  async loadLanguageFile(lang) {
    // 如果已经加载过，直接返回
    if (loadedLanguages[lang]) {
      return true;
    }
    
    const langFile = path.join(this.langDir, `${lang}.json`);
    
    try {
      if (fs.existsSync(langFile)) {
        const fileContent = fs.readFileSync(langFile, 'utf8');
        const langData = JSON.parse(fileContent);
        loadedLanguages[lang] = langData;
        
        this.mod.log(this.t('languageFileLoaded', lang));
        return true;
      }
    } catch (e) {
      this.mod.error(`加载语言文件 ${lang}.json 失败:`, e);
    }
    
    return false;
  }
  
  /**
   * 翻译并保存消息
   * @param {string} lang 目标语言代码
   * @returns {Promise<boolean>} 是否成功翻译
   */
  async translateMessages(lang) {
    if (!this.translator || lang === DEFAULT_LANGUAGE) {
      return false;
    }
    
    this.mod.log(this.t('translatingMessages', lang));
    
    const messages = { ...baseMessages };
    const translatedMessages = {};
    
    // 最大重试次数
    const maxRetries = 3;
    let retryCount = 0;
    
    const translateBatch = async () => {
      // 将所有消息合并成一个文本，用特殊标记分隔
      const keys = Object.keys(messages);
      const allTexts = keys.map(key => messages[key]);
      
      // 添加唯一分隔符，确保不会在文本中出现且不会被翻译
      const separator = "@@||TRANSLATE_SEPARATOR_TOKEN_DO_NOT_TRANSLATE||@@";
      const combinedText = allTexts.join(separator);
      
      // 一次性翻译所有文本
      const translatedCombined = await this.translator.translateText(combinedText, lang, 'en', true);
      
      // 分割回单独的消息
      const translatedArray = translatedCombined.split(separator);
      
      // 检查翻译结果数量是否匹配
      if (translatedArray.length === keys.length) {
        keys.forEach((key, index) => {
          translatedMessages[key] = translatedArray[index];
        });
        
        return true;
      }
      
      // 如果分割后数量不匹配，表示翻译异常
      this.mod.error(`批量翻译结果异常: 预期 ${keys.length} 条消息，实际收到 ${translatedArray.length} 条`);
      return false;
    };
    
    try {
      let success = false;
      
      while (!success && retryCount < maxRetries) {
        try {
          success = await translateBatch();
          
          if (!success) {
            retryCount++;
            if (retryCount < maxRetries) {
              this.mod.log(`批量翻译失败，${10}秒后进行第${retryCount + 1}次重试...`);
              // 等待10秒后重试
              await new Promise(resolve => setTimeout(resolve, 10000));
            }
          }
        } catch (err) {
          retryCount++;
          this.mod.error(`翻译尝试 #${retryCount} 失败:`, err);
          
          if (retryCount < maxRetries) {
            this.mod.log(`${10}秒后进行第${retryCount + 1}次重试...`);
            // 等待10秒后重试
            await new Promise(resolve => setTimeout(resolve, 10000));
          }
        }
      }
      
      if (success) {
        // 保存结果
        loadedLanguages[lang] = translatedMessages;
        this.saveLanguageFile(lang, translatedMessages);
        
        this.mod.log(this.t('translationComplete'));
        this.currentLanguage = lang;
        return true;
      } else {
        this.mod.error(`批量翻译失败，已重试${retryCount}次`);
        this.mod.log(this.t('translationFailed'));
        return false;
      }
    } catch (error) {
      this.mod.error('翻译消息失败:', error);
      this.mod.log(this.t('translationFailed'));
      return false;
    }
  }
  
  /**
   * 保存语言文件
   * @param {string} lang 语言代码
   * @param {Object} messages 消息对象
   */
  saveLanguageFile(lang, messages) {
    const langFile = path.join(this.langDir, `${lang}.json`);
    
    try {
      fs.writeFileSync(langFile, JSON.stringify(messages, null, 2), 'utf8');
    } catch (e) {
      this.mod.error(`保存语言文件 ${lang}.json 失败:`, e);
    }
  }
  
  /**
   * 获取翻译文本
   * @param {string} key 文本键名
   * @param {...any} args 格式化参数
   * @returns {string} 翻译后的文本
   */
  getText(key, ...args) {
    // 获取当前语言的翻译，如果不存在则使用基础语言
    const messages = loadedLanguages[this.currentLanguage] || baseMessages;
    
    // 获取对应键名的翻译，如果不存在则使用键名
    let text = messages[key] || baseMessages[key] || key;
    
    // 参数替换
    if (args.length > 0) {
      args.forEach((arg, index) => {
        text = text.replace(new RegExp(`\\{${index}\\}`, 'g'), arg);
      });
    }
    
    return text;
  }
  
  /**
   * getText 的简写形式
   */
  t(key, ...args) {
    return this.getText(key, ...args);
  }
}

module.exports = {
  I18nManager,
  DEFAULT_LANGUAGE,
  baseMessages
}; 