/**
 * Translator class
 * Main entry module - Coordinates all sub-modules
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { I18nManager } = require('./managers/i18n-manager');
const EndpointManager = require('./managers/endpoint-manager');
const { TranslationService, AVAILABLE_LANGUAGES } = require('./core/translation-service');
const ChatHooks = require('./core/chat-hooks');
const CommandHandler = require('./command');
const { defaultCacheManager } = require('./managers/cache-manager');

// Legacy files to delete when upgrading from old versions
const LEGACY_FILES = [
  'src/cache-manager.js',
  'src/error-handler.js',
  'src/i18n.js',
  'src/normalize.js',
  'src/terminology-manager.js',
  'src/translate.js'
];

module.exports = class Translator {
  constructor(mod) {
    this.mod = mod;
    this._cleanupLegacyFiles();
    this.i18n = new I18nManager(mod);
    this.endpointManager = new EndpointManager(mod);
    this.translationService = new TranslationService(this.endpointManager, this.i18n);

    // Enable cache by default
    if (this.mod.settings.useCache === undefined) {
      this.mod.settings.useCache = true;
    }
    defaultCacheManager.setEnabled(this.mod.settings.useCache);

    // Build cache path from index.js location (src/) to avoid path issues
    const cacheConfig = Object.assign({}, this.mod.settings.cache || {});
    cacheConfig.cachePath = path.join(__dirname, cacheConfig.cachePath || '../data/translation-cache.json');
    defaultCacheManager.updateConfig(cacheConfig);

    this.chatHooks = new ChatHooks(mod, this.translationService, this.i18n);

    // Async initialization
    this._initAsync();

    // Initialize command handler
    this.commandHandler = new CommandHandler(mod, this);
    this.commandHandler.registerCommands();
    this.chatHooks.setup();

    // In-game welcome message
    this.mod.game.on('leave_loading_screen', () => {
      if (mod.settings.sendMode) {
        this.mod.command.message(this.i18n.t('welcomeMessage', this.mod.settings.sendLang));
        this.mod.command.message(this.i18n.t('helpMessage'));
      }
    });
  }

  async _initAsync() {
    try {
      await defaultCacheManager.init();
      this.i18n.setTranslator(this);
      this.translationService.setI18n(this.i18n);

      if (this.mod.settings.interfaceLanguage && this.mod.settings.interfaceLanguage !== 'en') {
        await this.i18n.setLanguage(this.mod.settings.interfaceLanguage);
      }
    } catch (e) {
      console.error('Translation system init error:', e);
    }
  }

  // Endpoint Management
  getEndpointManager() { return this.endpointManager; }
  addEndpoint(name, url, key) { return this.endpointManager.addEndpoint(name, url, key); }
  removeEndpoint(name) { return this.endpointManager.removeEndpoint(name); }
  setEndpointModels(name, models) { return this.endpointManager.setModels(name, models); }
  listEndpoints() { return this.endpointManager.listEndpoints(); }
  setReceiveEndpoint(name, model) { return this.endpointManager.setReceiveConfig(name, model); }
  setSendEndpoint(name, model) { return this.endpointManager.setSendConfig(name, model); }
  setFallbackEndpoint(name, model) { return this.endpointManager.setFallbackConfig(name, model); }
  getReceiveConfig() { return this.endpointManager.getReceiveConfig(); }
  getSendConfig() { return this.endpointManager.getSendConfig(); }
  getFallbackConfig() { return this.endpointManager.getFallbackConfig(); }

  // Translation
  async translateText(text, targetLang, sourceLang = 'auto', useCache = true) {
    return this.translationService.translate(text, targetLang, sourceLang, useCache);
  }

  getReceiveProvider() { return this.translationService.getReceiveProvider(); }
  getSendProvider() { return this.translationService.getSendProvider(); }

  getEngineState() {
    return {
      receive: this.translationService.getState('receive'),
      send: this.translationService.getState('send'),
      provider: this.endpointManager.getReceiveConfig().endpoint,
      model: this.translationService.getState('receive').model,
      fullDisplayName: this.getReceiveProvider()
    };
  }

  // Cache Management
  getCacheStats() { return this.translationService.getCacheStats(); }

  setCacheEnabled(enabled) {
    this.mod.settings.useCache = enabled;
    return defaultCacheManager.setEnabled(enabled);
  }

  updateCacheConfig(config) {
    defaultCacheManager.updateConfig(config);
    return defaultCacheManager.saveToFile().then(() => defaultCacheManager.config);
  }

  searchCache(keyword, limit = 5) { return defaultCacheManager.search(keyword, limit); }
  removeCacheByLang(lang) { return defaultCacheManager.clearSelected({ fromLang: lang }); }
  removeCacheByTargetLang(lang) { return defaultCacheManager.clearSelected({ toLang: lang }); }
  removeCacheByKeyword(keyword) { return defaultCacheManager.clearSelected({ keyword }); }
  saveCache() { return defaultCacheManager.saveToFile(); }

  // I18n
  async setInterfaceLanguage(lang) { return this.i18n.setLanguage(lang); }
  getInterfaceLanguage() { return this.i18n.getLanguage(); }
  getI18n() { return this.i18n; }

  // Utility
  getSupportedLanguages() { return AVAILABLE_LANGUAGES; }
  getProvider() { return this.getReceiveProvider(); } // Legacy compatibility

  // Destructor - Called when module is unloaded
  destructor() {
    // Save cache to file before unloading
    if (defaultCacheManager.modified) {
      defaultCacheManager.saveToFile().catch(() => { });
    }
    // Stop auto-save timer
    defaultCacheManager.destroy();
  }

  // Private: Clean up legacy files from previous versions
  _cleanupLegacyFiles() {
    const modPath = this.mod.info.path;
    for (const file of LEGACY_FILES) {
      const filePath = path.join(modPath, file);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`[translate-chat] Cleaned up legacy file: ${file}`);
        }
      } catch (e) {
        // Ignore errors (file might be in use or permission denied)
      }
    }
  }
};
