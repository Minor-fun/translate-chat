'use strict';

/**
 * Default settings
 * Version 5: Endpoint Manager with fallback
 */
const DefaultSettings = {
  enabled: false,
  sourceLang: 'auto',
  targetLang: 'en',
  sendMode: false,
  sendLang: 'en',
  useCache: false,
  interfaceLanguage: 'en',


  endpoints: {

  },

  // Receive direction configuration
  receive: {
    endpoint: 'google',
    model: ''
  },

  // Send direction configuration
  send: {
    endpoint: 'google',
    model: ''
  },

  // Fallback configuration
  fallback: {
    endpoint: 'google',
    model: ''
  },

  // Cache configuration
  cache: {
    maxSize: 20000,
    autoSaveInterval: 10, // Minutes
    cachePath: "../data/translation-cache.json",
    writeThreshold: 100,
    cleanupPercentage: 0.2
  }
};

/**
 * Settings migration function
 * @param {number} from_ver - Source version
 * @param {number} to_ver - Target version
 * @param {Object} settings - Current settings
 * @returns {Object} Migrated settings
 */
module.exports = function MigrateSettings(from_ver, to_ver, settings) {
  if (from_ver === undefined) {
    // First run, merge default settings
    return Object.assign(Object.assign({}, DefaultSettings), settings);
  } else if (from_ver === null) {
    // Reset to default settings
    return DefaultSettings;
  } else {
    // Recursive migration
    if (from_ver + 1 < to_ver) {
      settings = MigrateSettings(from_ver, from_ver + 1, settings);
      return MigrateSettings(from_ver + 1, to_ver, settings);
    }

    switch (to_ver) {
      case 2:
        settings.sendMode = false;
        settings.sendLang = 'en';
        break;

      case 3:
        settings.useCache = false;
        settings.useTerminology = false;
        settings.cache = {
          maxSize: 20000,
          autoSaveInterval: 10,
          cachePath: "../data/translation-cache.json",
          writeThreshold: 100,
          cleanupPercentage: 0.2
        };
        settings.translation = {
          provider: "google",
          geminiKeys: [""],
          openaiKey: "",
          hunyuanKey: "",
          geminiOpenAIMode: "official",
          cloudflareAccountId: "",
          cloudflareGatewayId: "",
          models: {
            openai: "",
            hunyuan: "",
            gemini: ["", "", ""]
          }
        };
        break;

      case 4:
        settings = migrateToEndpointManager(settings);
        break;

      case 5:
        if (!settings.fallback) {
          if (settings.receiveFallback) {
            settings.fallback = settings.receiveFallback;
          } else if (settings.sendFallback) {
            settings.fallback = settings.sendFallback;
          } else {
            settings.fallback = { endpoint: 'google', model: '' };
          }
        }
        break;
    }

    return settings;
  }
};

/**
 * Clean migration to endpoint manager architecture
 * Instead of complex migration, delete old config and start fresh
 * @param {Object} settings - Old settings
 * @returns {Object} New settings with clean defaults
 */
function migrateToEndpointManager(settings) {
  // Delete old translation config completely
  delete settings.translation;
  delete settings.useTerminology;
  delete settings.geminiKey;
  delete settings.geminiKeys;
  delete settings.geminiModel;
  delete settings.openaiKey;
  delete settings.hunyuanKey;
  delete settings.customUrl;
  delete settings.customKey;
  delete settings.provider;
  delete settings.models;
  delete settings.cloudflareAccountId;
  delete settings.cloudflareGatewayId;
  delete settings.geminiOpenAIMode;

  // Initialize new clean structure
  settings.endpoints = {};
  settings.receive = { endpoint: 'google', model: '' };
  settings.send = { endpoint: 'google', model: '' };
  settings.fallback = { endpoint: 'google', model: '' };

  // Ensure cache config exists
  if (!settings.cache) {
    settings.cache = {
      maxSize: 20000,
      autoSaveInterval: 10,
      cachePath: "../data/translation-cache.json",
      writeThreshold: 100,
      cleanupPercentage: 0.2
    };
  }
  return settings;
}
