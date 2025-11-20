/**
 * Translator类
 * 封装翻译核心功能，作为CommandHandler和translate.js之间的中间层
 */

const { 
  AVAILABLE_LANGUAGES, 
  translate, 
  normalizeNa, 
  initTranslationCache,
  getCacheStats, 
  getTranslationProvider, 
  setCacheEnabled, 
  updateCacheConfig, 
  searchCache, 
  clearSelectedCache, 
  getDuplicateStats, 
  getTranslationState, 
  getTerminologyStats,
  searchTerminology, 
  addOrUpdateTerm, 
  setModuleSettings 
} = require('./translate');
const { I18nManager } = require('./i18n');
const CommandHandler = require('./command');

module.exports = class Translator {
  constructor(mod) {
    this.mod = mod;
    this.settings = mod.settings;
    
    // 初始化国际化管理器
    this.i18n = new I18nManager(mod);
    
    // 默认启用缓存
    this.mod.settings.useCache = this.mod.settings.useCache !== undefined ? this.mod.settings.useCache : true;
    // 同步缓存设置到缓存管理器
    setCacheEnabled(this.mod.settings.useCache);
    
    // 将模块配置传递给翻译模块
    setModuleSettings(this.mod.settings);
    
    // 正确处理异步初始化
    (async () => {
      try {
        await initTranslationCache();
        
        // 初始化完成后，设置i18n的翻译器实例
        this.i18n.setTranslator(this);
        
        // 如果有设置界面语言且不是英文，尝试加载或生成翻译
        if (this.mod.settings.interfaceLanguage && 
            this.mod.settings.interfaceLanguage !== 'en') {
          await this.i18n.setLanguage(this.mod.settings.interfaceLanguage);
        }
        
        // 初始化完成后，更新设置，传递i18n实例
        this.updateSettings();
      } catch (e) {
        console.error('Cache init error:', e);
      }
    })();
    
    // 初始化命令处理器
    this.commandHandler = new CommandHandler(mod, this);
    this.commandHandler.registerCommands();
    
    this.setupHooks();

    this.mod.game.on('leave_loading_screen', () => {
      if (mod.settings.sendMode) {
        this.mod.command.message(this.i18n.t('welcomeMessage', this.mod.settings.sendLang));
        this.mod.command.message(this.i18n.t('helpMessage'));
      }
    });
  }

  /**
   * 设置钩子
   */
  setupHooks() {
    const incomingMsgHandler = async (packet, version, event) => {
      if (!this.mod.settings.enabled) return;
      if (this.mod.game.me.is(event.gameId)) return;

      const translated = await this.translate(event.message, { target: this.mod.settings.targetLang, source: this.mod.settings.sourceLang });
      if (!translated) return;

      this.mod.send(packet, version, { ...event, message: `<FONT>(${getTranslationProvider()}) ${translated}</FONT>` });
    };

    const outgoingMessageHandler = (packet, version, event) => {
      if (!this.mod.settings.enabled || !this.mod.settings.sendMode) return;
      
      // 检查消息是否包含游戏特殊链接标签（物品、传送点等），如果是则直接发送
      if (event.message.includes('ChatLinkAction') || event.message.includes('chatLinkAction')) {
        this.mod.send(packet, version, event);
        return false;
      }
      
      // 提取纯文本内容（去除所有HTML标签）用于检测#标记
      const plainText = event.message.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, '');
      
      // 检查纯文本中是否以#结尾（用户手动标记跳过翻译）
      if (plainText.endsWith('#')) {
        // 从纯文本中移除尾部#，但保持原消息的HTML结构
        const newPlainText = plainText.slice(0, -1);
        this.mod.send(packet, version, { ...event, message: event.message.replace(plainText, newPlainText) });
        return false;
      }

      // 异步翻译消息
      (async () => {
        const translated = await this.translate(event.message, { source: 'auto', target: this.mod.settings.sendLang });
        if (!translated) return this.mod.send(packet, version, event);
        this.mod.send(packet, version, { ...event, message: `<FONT>${translated}</FONT>` });
        this.mod.command.message(`(${getTranslationProvider()}) ${event.message.replace(/<(.+?)>|&rt;|&lt;|&gt;|/g, '').replace(/\s+$/, '')}`);
      })();

      return false;
    };

    const CHAT_SERVER_PACKETS = [
        ['S_CHAT', 3],
        ['S_WHISPER', 3],
        ['S_PRIVATE_CHAT', 1]
    ];
    for (const [packet, version] of CHAT_SERVER_PACKETS) this.mod.hook(packet, version, { order: 100 }, event => incomingMsgHandler(packet, version, event));
    const CHAT_CLIENT_PACKETS = [['C_WHISPER', 1], ['C_CHAT', 1]];
    for (const [packet, version] of CHAT_CLIENT_PACKETS) this.mod.hook(packet, version, {}, event => outgoingMessageHandler(packet, version, event));
  }

  /**
   * 更新设置
   */
  updateSettings() {
    // 创建包含i18n实例的设置对象
    const settingsWithI18n = {
      ...this.mod.settings,
      i18n: this.i18n
    };
    
    // 传递更新后的设置对象
    setModuleSettings(settingsWithI18n);
  }

  /**
   * 获取翻译引擎状态
   * @returns {Object} 引擎状态
   */
  getEngineState() {
    return getTranslationState();
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 缓存统计信息
   */
  getCacheStats() {
    return getCacheStats();
  }

  /**
   * 获取去重统计信息
   * @returns {Object} 去重统计信息
   */
  getDuplicateStats() {
    return getDuplicateStats();
  }

  /**
   * 获取术语库统计信息
   * @returns {Object} 术语库统计信息
   */
  getTerminologyStats() {
    return getTerminologyStats();
  }

  /**
   * 搜索术语库
   * @param {string} keyword 关键词
   * @returns {Array} 搜索结果
   */
  searchTerminology(keyword) {
    return searchTerminology(keyword);
  }

  /**
   * 添加或更新术语
   * @param {string} original 原文
   * @param {string} translated 译文
   */
  addOrUpdateTerm(original, translated) {
    return addOrUpdateTerm(original, this.mod.settings.targetLang, translated);
  }

  /**
   * 设置术语库启用状态
   * @param {boolean} enabled 是否启用
   */
  setTerminologyEnabled(enabled) {
    this.mod.settings.useTerminology = enabled;
    return true;
  }

  /**
   * 设置缓存启用状态
   * @param {boolean} enabled 是否启用
   */
  setCacheEnabled(enabled) {
    return setCacheEnabled(enabled);
  }

  /**
   * 更新缓存配置
   * @param {Object} config 配置对象
   * @returns {Promise<Object>} 更新后的配置
   */
  updateCacheConfig(config) {
    return updateCacheConfig(config);
  }

  /**
   * 搜索缓存
   * @param {string} keyword 关键词
   * @param {number} limit 结果限制
   * @returns {Array} 搜索结果
   */
  searchCache(keyword, limit = 5) {
    return searchCache(keyword, limit);
  }

  /**
   * 按语言删除缓存
   * @param {string} lang 语言代码
   */
  removeCacheByLang(lang) {
    return clearSelectedCache({ fromLang: lang });
  }

  /**
   * 按目标语言删除缓存
   * @param {string} lang 语言代码
   */
  removeCacheByTargetLang(lang) {
    return clearSelectedCache({ toLang: lang });
  }

  /**
   * 按关键词删除缓存
   * @param {string} keyword 关键词
   */
  removeCacheByKeyword(keyword) {
    return clearSelectedCache({ keyword: keyword });
  }
  
  /**
   * 设置界面语言
   * @param {string} lang 语言代码
   * @returns {Promise<boolean>} 是否设置成功
   */
  async setInterfaceLanguage(lang) {
    // 更新界面语言
    const result = await this.i18n.setLanguage(lang);
    return result;
  }
  
  /**
   * 获取当前界面语言
   * @returns {string} 当前语言代码
   */
  getInterfaceLanguage() {
    return this.i18n.getLanguage();
  }
  
  /**
   * 获取国际化实例
   */
  getI18n() {
    return this.i18n;
  }

  async translate(message, { target, source }) {
    const sanitized = message.replace(/<(.+?)>|&rt;|&lt;|&gt;|/g, '').replace(/\s+$/, '');
    if (sanitized === '') return;

    try {
      const translated = await translate(sanitized, target, source, this.mod.settings.useCache);
      
      if (translated === sanitized) return;
      if (this.mod.publisher === 'eme') return normalizeNa(translated);
      return translated;
    } catch (e) {
      // 简化错误处理，与原来保持一致
      this.mod.error(
        `翻译过程中发生错误，消息:${message},`,
        `目标语言: ${target},`,
        `源语言: ${source},`,
        '错误: ', e);
      return '';
    }
  }

  /**
   * 翻译文本
   * @param {string} text 要翻译的文本
   * @param {string} targetLang 目标语言
   * @param {string} sourceLang 源语言，默认为'auto'
   * @param {boolean} useCache 是否使用缓存，默认为true
   * @returns {Promise<string>} 翻译结果
   */
  async translateText(text, targetLang, sourceLang = 'auto', useCache = true) {
    return translate(text, targetLang, sourceLang, useCache);
  }

  /**
   * 获取支持的语言列表
   * @returns {Array<string>} 支持的语言代码列表
   */
  getSupportedLanguages() {
    return AVAILABLE_LANGUAGES;
  }

  /**
   * 获取当前翻译提供商名称
   * @returns {string} 翻译提供商名称
   */
  getProvider() {
    return getTranslationProvider();
  }

  /**
   * 手动保存缓存
   * @returns {Promise<Object>} 保存操作的Promise
   */
  saveCache() {
    return updateCacheConfig({});
  }
};