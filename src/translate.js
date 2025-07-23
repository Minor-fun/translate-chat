const request = require('node-fetch');
const { normalize } = require('./normalize');
const LanguageDetect = require('../lib/language-detector');
const { defaultCacheManager } = require('./cache-manager');
const { getErrorType, handleTranslationError } = require('./error-handler');
const { terminologyManager } = require('./terminology-manager');
const lngDetector = new LanguageDetect();
lngDetector.setLanguageType('iso2'); 

// AI Translation Configuration
let AI_PROVIDER; // 可选值: "openai", "hunyuan", "gemini", "google"

// Gemini API密钥配置 - 按顺序轮换机制（自动跳过空密钥）
let GEMINI_KEYS = [];
let geminiKeyIndex = 0;

// 获取有效的Gemini密钥
function getNextValidGeminiKey() {
  const validKeys = GEMINI_KEYS.filter(k => k.trim() !== "");
  if (validKeys.length === 0) return "";
  
  // 只在有效密钥中循环
  return validKeys[geminiKeyIndex % validKeys.length];
}

// 获取Gemini OpenAI兼容端点URL
function getGeminiOpenAIEndpoint() {
  // 获取OpenAI模式配置
  const openAIMode = global.modSettings?.translation?.geminiOpenAIMode;
  
  // 如果明确设置为official模式，或者cloudflare模式但没有配置账户ID和网关ID，则使用谷歌官方端点
  if (openAIMode === "official" || 
      (openAIMode === "cloudflare" && 
       (!global.modSettings?.translation?.cloudflareAccountId || 
        !global.modSettings?.translation?.cloudflareGatewayId))) {
    // 使用谷歌官方的OpenAI兼容端点
    return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  } else {
    // 使用Cloudflare AI Gateway的OpenAI兼容端点
    const accountId = global.modSettings?.translation?.cloudflareAccountId;
    const gatewayId = global.modSettings?.translation?.cloudflareGatewayId;
    
    return `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/compat/chat/completions`;
  }
}

// 获取Gemini模型前缀
function getGeminiModelPrefix() {
  const openAIMode = global.modSettings?.translation?.geminiOpenAIMode;
  
  // 如果是official模式，或者cloudflare模式但没有配置账户ID和网关ID，则不需要前缀
  if (openAIMode === "official" || 
      (openAIMode === "cloudflare" && 
       (!global.modSettings?.translation?.cloudflareAccountId || 
        !global.modSettings?.translation?.cloudflareGatewayId))) {
    return "";
  } else {
    // Cloudflare端点需要"google-ai-studio/"前缀
    return "google-ai-studio/";
  }
}

// AI模型配置
const AI_CONFIGS = {
  openai: {
    get key() { return global.modSettings?.translation?.openaiKey; },
    url: "https://api.openai.com/v1/chat/completions",
    get model() { return global.modSettings?.translation?.models?.openai; },
    extraParams: {}, // OpenAI没有额外参数
    needsProviderPrefix: false
  },
  hunyuan: {
    get key() { return global.modSettings?.translation?.hunyuanKey; },
    url: "https://api.hunyuan.cloud.tencent.com/v1/chat/completions",
    get model() { return global.modSettings?.translation?.models?.hunyuan; },
    extraParams: { enable_enhancement: false }, // 腾讯混元自定义参数
    needsProviderPrefix: false
  },
  gemini: {
    get key() { return getNextValidGeminiKey(); },
    // 动态获取端点URL
    get url() { return getGeminiOpenAIEndpoint(); },
    get models() { return global.modSettings?.translation?.models?.gemini; }, // 模型降级策略
    extraParams: {},
    needsProviderPrefix: true,
    get providerPrefix() { return getGeminiModelPrefix(); }
  },
  google: {
    key: "",
    url: "https://translate.google.com",
    model: "Google",
    extraParams: {},
    needsProviderPrefix: false
  }
};

// 用于跟踪当前使用的翻译模型和错误信息
let translationState = {
  model: "",
  errorType: ""
};

// 全局配置引用
let global = {
  modSettings: null
};

// 添加一个变量来存储i18n实例
let i18nInstance = null;

// 设置模块配置
function setModuleSettings(settings) {
  global.modSettings = settings;
  
  // 保存i18n实例（如果提供）
  if (settings?.i18n) {
    i18nInstance = settings.i18n;
  }
  
  // 更新翻译提供者
  if (settings?.translation?.provider) {
    AI_PROVIDER = settings.translation.provider;
  }
  
  // 更新Gemini密钥
  if (settings?.translation?.geminiKeys && Array.isArray(settings.translation.geminiKeys)) {
    GEMINI_KEYS = settings.translation.geminiKeys;
  }
  
  // 更新缓存配置
  if (settings?.cache) {
    const cacheConfig = {};
    
    // 处理所有可能的缓存配置项
    const cacheConfigKeys = [
      'maxSize', 'deduplicateResults', 
      'hashLongText', 'hashAlgorithm', 'longTextThreshold', 
      'logLevel', 'writeThreshold', 'cleanupPercentage'
    ];
    
    // 直接传递自动保存间隔配置，由缓存管理器处理
    if (typeof settings.cache.autoSaveInterval === 'number') {
      cacheConfig.autoSaveInterval = settings.cache.autoSaveInterval;
    }
    
    // 处理其他配置项
    for (const key of cacheConfigKeys) {
      if (key in settings.cache) {
        cacheConfig[key] = settings.cache[key];
      }
    }
    
    if (Object.keys(cacheConfig).length > 0) {
      defaultCacheManager.updateConfig(cacheConfig);
    }
  }
}

// 通用提示词
const AI_PROMPT = "你是tera国际服资深游戏聊天翻译机，严格遵守翻译规则：1.仅输出译文，不进行任何额外解释。遇到无法翻译的缩写时保持原文（如Oops→Oops）2.请原样保留 [TERM:Valkyrie]符号[]内的文本，不进行任何翻译或修改。 例如，[TERM:Valkyrie] 输出为 [TERM:Valkyrie]。";

// 定义支持的语言列表
const AVAILABLE_LANGUAGES = ['am', 'ar', 'az', 'be', 'bg', 'bn', 'ca', 'cs', 'da', 'de', 'el', 'en', 'es', 'et', 'eu', 'fa', 'fi', 'fr', 'gu', 'he', 'hi', 'hr', 'hu', 'hy', 'is', 'it', 'ja', 'ka', 'kn', 'ko', 'ku', 'lo', 'lt', 'lv', 'ml', 'mr', 'ms', 'nl', 'no', 'or', 'pa', 'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sq', 'sr', 'sv', 'ta', 'te', 'th', 'tl', 'tr', 'uk', 'ur', 'vi', 'yo', 'zh', 'auto', 'any'];

/**
 * 获取当前使用的翻译提供者名称
 * @returns {string} 翻译提供者名称
 */
function getTranslationProvider() {
  if (translationState.model === "Google") {
    // 当使用谷歌翻译且有错误信息时，显示错误类型
    return translationState.errorType ? `Google (${translationState.errorType})` : "Google";
  } else if (translationState.model.startsWith("gemini")) {
    // 对于Gemini模型，显示当前密钥索引和模型信息
    const keyIndex = getCurrentGeminiKeyIndex();
    return `${translationState.model}${keyIndex >= 0 ? ` #${keyIndex+1}` : ''}${translationState.errorType ? ` (${translationState.errorType})` : ''}`;
  } else {
    // 其他AI模型
    return translationState.errorType ? `${translationState.model} (${translationState.errorType})` : translationState.model;
  }
}

/**
 * 初始化翻译系统
 * @param {Object} cacheConfig 缓存配置（可选）
 */
async function initTranslationCache(cacheConfig = {}) {
  // 使用提供的配置更新缓存管理器
  if (Object.keys(cacheConfig).length > 0) {
    defaultCacheManager.updateConfig(cacheConfig);
  }
  
  // 初始化缓存管理器
  await defaultCacheManager.init();
  
  // 初始化术语库
  await terminologyManager.init();
  
  console.log('Translation system initialized');
  return {
    translationProvider: getTranslationProvider(),
    cacheConfig: defaultCacheManager.config
  };
}

/**
 * 翻译文本
 * @param {string} text 要翻译的文本
 * @param {string} translateTo 目标语言
 * @param {string} translateFrom 源语言，默认为'auto'
 * @param {boolean} useCache 是否使用缓存，默认为true
 * @returns {Promise<string>} 翻译结果
 */
async function translate(text, translateTo, translateFrom = 'auto', useCache = true) {
  const detectedLanguage = lngDetector.detect(text, 1);
  const detectedLangCode = detectedLanguage[0] ? detectedLanguage[0][0] : null;

  // 如果检测到的语言与目标语言相同，直接返回原文
  if (detectedLangCode && detectedLangCode === translateTo) {
    return text;
  }

  // 当源语言为'auto'时，使用检测到的实际语言
  let actualSourceLang = translateFrom === 'auto' && detectedLangCode ? detectedLangCode : translateFrom;
  
  // 使用缓存管理器生成缓存键
  const cacheKey = defaultCacheManager.generateKey(text, actualSourceLang, translateTo);
  
  // 检查缓存
  if (useCache) {
    const cachedResult = defaultCacheManager.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
  }
  
  // 应用术语库预处理
  const processedText = global.modSettings?.useTerminology 
    ? terminologyManager.preProcessText(text, actualSourceLang)
    : text;
  
  // 尝试翻译并缓存结果
  try {
    // 首先尝试AI翻译
    let translatedText = await tryTranslate(processedText, translateTo, actualSourceLang);
    
    // 应用术语库后处理
    translatedText = global.modSettings?.useTerminology
      ? terminologyManager.postProcessText(translatedText, actualSourceLang, translateTo)
      : translatedText;
    
    // 如果启用缓存，存入缓存
    if (useCache) {
      defaultCacheManager.set(cacheKey, translatedText);
    }
    
    return translatedText;
  } catch (e) {
    console.error('All translation methods failed', e);
    return text; // 如果所有翻译方法都失败，返回原文
  }
}

/**
 * 尝试使用不同的翻译方法
 * @param {string} text 要翻译的文本
 * @param {string} translateTo 目标语言
 * @param {string} translateFrom 源语言
 * @returns {Promise<string>} 翻译结果
 */
async function tryTranslate(text, translateTo, translateFrom) {
  const config = AI_CONFIGS[AI_PROVIDER];
  let lastError = null; // 记录最后一个错误
  let aiErrorType = ""; // 新增：用于存储AI翻译的错误类型

  // 获取i18n翻译函数
  const translateFunc = i18nInstance ? (key, ...args) => i18nInstance.t(key, ...args) : null;

  // 如果选择Google作为提供商，直接使用Google翻译
  if (AI_PROVIDER === "google") {
    translationState.model = "Google";
    try {
      const result = await translateWithGoogle(text, translateTo, translateFrom);
      translationState.errorType = "";
      return result;
    } catch (e) {
      lastError = e;
      const errorInfo = handleTranslationError(e, "Google", translateFunc);
      translationState.errorType = errorInfo.type;
      throw e;
    }
  }

  // 尝试AI翻译
  if (AI_PROVIDER === "gemini") {
    
    const validKeys = GEMINI_KEYS.filter(k => k.trim() !== "");
    if (validKeys.length > 0) {
      // 记住初始状态的密钥索引
      const initialKeyIndex = geminiKeyIndex;
      
      // 尝试每个有效密钥
      for (let keyAttempt = 0; keyAttempt < validKeys.length; keyAttempt++) {
        // 获取当前密钥的配置副本
        const currentKeyConfig = { ...config };
        
        try {
          // 为每个密钥单独调用translateWithAI，让它内部尝试所有模型
          translationState.model = currentKeyConfig.models?.[0];
          const result = await translateWithAI(text, translateTo, translateFrom, currentKeyConfig);
          translationState.errorType = ""; // 成功时清除错误类型
          aiErrorType = ""; // AI成功，清除AI错误类型
          return result;
        } catch (e) {
          lastError = e; // 记录当前错误
          // 根据AI服务URL动态确定handleTranslationError的provider参数
          const effectiveProvider = config.url?.includes('gateway.ai.cloudflare.com') ? 'AIGateway' : AI_PROVIDER;
          const errorInfo = handleTranslationError(e, effectiveProvider, translateFunc);
          aiErrorType = errorInfo.type; // 记录AI错误类型
          translationState.errorType = errorInfo.type; // 立即更新状态，以便getTranslationProvider显示
          
          // 当前密钥的所有模型都尝试失败，轮换到下一个密钥
          geminiKeyIndex++;
        }
      }
      
      // 如果所有密钥都尝试过，但都失败了，重置到循环开始的密钥
      // 这保证了下一次翻译从相同的密钥开始（避免额外的密钥轮换）
      if (geminiKeyIndex - initialKeyIndex >= validKeys.length) {
        geminiKeyIndex = initialKeyIndex;
      }
    }
  } else if (config?.key && config.key.trim() !== "") {
    // 非Gemini AI提供商的处理逻辑保持不变
    translationState.model = config.model;
    try {
      const result = await translateWithAI(text, translateTo, translateFrom, config);
      translationState.errorType = ""; // 成功时清除错误类型
      aiErrorType = ""; // AI成功，清除AI错误类型
      return result;
    } catch (e) {
      lastError = e; // 记录当前错误
      // 根据AI服务URL动态确定handleTranslationError的provider参数
      const effectiveProvider = config.url?.includes('gateway.ai.cloudflare.com') ? 'AIGateway' : AI_PROVIDER;
      const errorInfo = handleTranslationError(e, effectiveProvider, translateFunc);
      aiErrorType = errorInfo.type; // 记录AI错误类型
      translationState.errorType = errorInfo.type; // 立即更新状态，以便getTranslationProvider显示
    }
  }

  // 如果AI翻译未成功（或未配置），尝试Google翻译
  return fallbackToGoogleTranslate(text, translateTo, translateFrom, translateFunc);
}

/**
 * 回退到Google翻译
 * @param {string} text 要翻译的文本
 * @param {string} translateTo 目标语言
 * @param {string} translateFrom 源语言
 * @param {Function} translateFunc i18n翻译函数
 * @returns {Promise<string>} 翻译结果
 * @throws {Error} 如果Google翻译也失败
 */
async function fallbackToGoogleTranslate(text, translateTo, translateFrom, translateFunc) {
  translationState.model = "Google";
  try {
    const result = await translateWithGoogle(text, translateTo, translateFrom);
    return result;
  } catch (e) {
    const errorInfo = handleTranslationError(e, "Google", translateFunc);
    translationState.errorType = errorInfo.type; // Google翻译失败，使用Google错误类型
    
    // 如果所有翻译方法都失败，抛出错误
    console.error('All translation methods failed:', e);
    throw new Error('All translation methods failed');
  }
}

/**
 * 使用AI进行翻译
 * @param {string} text 要翻译的文本
 * @param {string} translateTo 目标语言
 * @param {string} translateFrom 源语言
 * @param {Object} config AI配置
 * @returns {Promise<string>} 翻译结果
 */
async function translateWithAI(text, translateTo, translateFrom, config) {
  const translationPrompt = `Translate from ${translateFrom} to ${translateTo}: ${text}`;
  const modelsToTry = Array.isArray(config.models) ? config.models : [config.model];
  let lastError = null;

  // 检查URL是否有效
  if (!config.url) {
    throw new Error('翻译服务URL未配置或配置不完整，请检查配置文件');
  }

  for (const model of modelsToTry) {
    if (!model) continue;
    
    const modelName = config.needsProviderPrefix ? `${config.providerPrefix}${model}` : model;
    const requestBody = {
      model: modelName,
      messages: [
        { role: 'system', content: AI_PROMPT },
        { role: 'user', content: translationPrompt },
      ],
      ...config.extraParams,
    };
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.key}`,
    };

    try {
      const response = await request(config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        let jsonBody = {};
        try {
          const rawResponseText = await response.clone().text();
          if (rawResponseText) {
            jsonBody = JSON.parse(rawResponseText);
          }
        } catch (parseError) {
          console.error(`未能解析模型 ${model} 的错误响应JSON:`, parseError);
        }
        const error = new Error(`HTTP错误 ${response.status}: ${response.statusText || ''} 模型 ${model}`);
        error.statusCode = response.status;
        error.responseBody = jsonBody;
        throw error;
      }
      
      const jsonBody = await response.json();
      if (!jsonBody.choices?.[0]?.message?.content) {
        throw new Error(`无效的AI翻译响应，模型 ${model}`);
      }
      
      // 成功，使用成功的模型更新状态
      translationState.model = model;
      return jsonBody.choices[0].message.content.trim();
    } catch (e) {
      lastError = e;
      console.error(`模型 '${model}' 翻译失败. 错误: ${e.message}`);
    }
  }

  // 如果循环结束，则所有模型都已失败。
  throw lastError || new Error('所有AI翻译模型都失败');
}

/**
 * 使用谷歌翻译
 * @param {string} text 要翻译的文本
 * @param {string} translateTo 目标语言
 * @param {string} translateFrom 源语言
 * @returns {Promise<string>} 翻译结果
 */
async function translateWithGoogle(text, translateTo, translateFrom) {
  const url = 'https://translate.google.com/translate_a/single'
    + '?client=at&dt=t&dt=ld&dt=qca&dt=rm&dt=bd&dj=1&hl=' + translateTo + '&ie=UTF-8'
    + '&oe=UTF-8&inputm=2&otf=2&iid=1dd3b944-fa62-4b55-b330-74909a99969e';

  const params = new URLSearchParams();
  params.append('sl', translateFrom);
  params.append('tl', translateTo);
  params.append('q', text);

  const response = await request(url, {
    method: 'post',
    body: params,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      'User-Agent': 'AndroidTranslate/5.3.0.RC02.130475354-53000263 5.1 phone TRANSLATE_OPM5_TEST_1',
    },
  });
  
  const jsonBody = JSON.parse(await response.text());
  if (!jsonBody.sentences || !jsonBody.sentences[0] || !jsonBody.sentences[0].trans) {
    throw new Error('Invalid Google translation response');
  }
  
  return jsonBody.sentences[0].trans;
}

/**
 * 更新缓存配置并触发保存
 * @param {Object} config 新的缓存配置
 * @returns {Promise<Object>} 更新后的配置
 */
function updateCacheConfig(config) {
  defaultCacheManager.updateConfig(config);
  return defaultCacheManager.saveToFile().then(() => defaultCacheManager.config);
}

/**
 * 规范化NA区域的文本
 * @param {string} str 原始文本
 * @returns {string} 规范化后的文本
 */
const normalizeNa = (str) => {
  return normalize(str)
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/\s+$/, '');
};

/**
 * 获取当前Gemini API密钥索引
 * @returns {number} 当前密钥索引（已对有效密钥数组长度取模）
 */
function getCurrentGeminiKeyIndex() {
  const validKeys = GEMINI_KEYS.filter(key => key && key.trim() !== "");
  if (validKeys.length === 0) return -1;
  return geminiKeyIndex % validKeys.length;
}

/**
 * 获取有效的Gemini密钥数量
 * @returns {number} 有效密钥数量
 */
function getValidGeminiKeysCount() {
  return GEMINI_KEYS.filter(key => key && key.trim() !== "").length;
}

/**
 * 获取当前正在使用的Gemini密钥(掩码处理)
 * @returns {string} 当前使用的密钥(掩码处理)
 */
function getCurrentGeminiKey() {
  const validKeys = GEMINI_KEYS.filter(key => key && key.trim() !== "");
  if (validKeys.length === 0) return "";
  
  const currentKey = validKeys[geminiKeyIndex % validKeys.length];
  return currentKey ? currentKey.substring(0, 5) + "..." + currentKey.substring(currentKey.length - 5) : "";
}

/**
 * 检查是否有任何有效的Gemini密钥
 * @returns {boolean} 是否有有效密钥
 */
function hasValidGeminiKey() {
  return getValidGeminiKeysCount() > 0;
}

/**
 * 获取翻译引擎状态
 * @returns {Object} 翻译引擎状态信息
 */
function getTranslationState() {
  const provider = AI_PROVIDER;
  const config = AI_CONFIGS[provider];
  
  let state = {
    provider,
    model: translationState.model,
    errorType: translationState.errorType,
    fullDisplayName: getTranslationProvider()
  };
  
  // 针对不同提供商添加特定信息
  if (provider === 'gemini') {
    const geminiKeys = global.modSettings?.translation?.geminiKeys || [];
    state.totalValidKeys = geminiKeys.filter(k => k).length;
    state.currentGeminiKeyIndex = getCurrentGeminiKeyIndex();
    state.availableModels = config.models || [];
    
    // 添加OpenAI兼容模式信息
    state.openAIMode = global.modSettings?.translation?.geminiOpenAIMode;
    
    // 如果是Cloudflare模式，添加账户ID和网关ID信息（掩码处理）
    if (state.openAIMode === "cloudflare") {
      const accountId = global.modSettings?.translation?.cloudflareAccountId;
      const gatewayId = global.modSettings?.translation?.cloudflareGatewayId;
      
      if (accountId) {
        state.cloudflareAccountId = accountId.length > 8 ? 
          `${accountId.substring(0, 4)}...${accountId.substring(accountId.length - 4)}` : 
          accountId;
      }
      
      if (gatewayId) {
        state.cloudflareGatewayId = gatewayId;
      }
    }
    
    // 掩码处理密钥，只显示前4位和后4位
    if (geminiKeys[state.currentGeminiKeyIndex]) {
      const key = geminiKeys[state.currentGeminiKeyIndex];
      state.currentGeminiKey = key.length > 8 ? 
        `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : 
        '****';
    }
  }
  
  return state;
}

/**
 * 获取术语库统计信息
 * @returns {Object} 术语库统计信息
 */
function getTerminologyStats() {
  return terminologyManager.getStats();
}

// 导出函数
module.exports = {
  translate,
  normalizeNa,
  AVAILABLE_LANGUAGES,
  getTranslationProvider,
  getTranslationState,
  // 重新导出错误处理函数
  getErrorType,
  handleTranslationError,
  initTranslationCache,
  updateCacheConfig,
  // 缓存控制函数的代理
  getCacheStats: () => defaultCacheManager.getStats(),
  setCacheEnabled: (enabled) => defaultCacheManager.setEnabled(enabled),
  // 新增缓存管理函数
  searchCache: (keyword, limit) => defaultCacheManager.search(keyword, limit),
  clearSelectedCache: (criteria) => defaultCacheManager.clearSelected(criteria),
  // 新增去重统计函数
  getDuplicateStats: () => defaultCacheManager.getDuplicateStats(),
  // Gemini API相关函数
  getCurrentGeminiKeyIndex,
  getValidGeminiKeysCount,
  getCurrentGeminiKey,
  hasValidGeminiKey,
  // 术语库相关函数
  getTerminologyStats,
  searchTerminology: (keyword, language, limit) => 
    terminologyManager.searchTerminology(keyword, language, limit),
  addOrUpdateTerm: (term, language, translation, confidence) => 
    terminologyManager.addOrUpdateTerm(term, language, translation, confidence),
  // 配置设置
  setModuleSettings
};
