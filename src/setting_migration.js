'use strict';

const DefaultSettings = {
  enabled: false,
  sourceLang: 'auto',
  targetLang: 'en',
  sendMode: false,
  sendLang: 'en',
  useCache: false,
  useTerminology: false,
  cache: {
    maxSize: 20000,
    autoSaveInterval: 10, // 分钟
    deduplicateResults: false,
    cachePath: "../data/translation-cache.json",
    hashLongText: false,
    hashAlgorithm: "md5",
    longTextThreshold: 30,
    logLevel: "info",
    writeThreshold: 100,
    cleanupPercentage: 0.2
  },
  translation: {
    provider: "google", // 可选值: "openai", "hunyuan", "gemini", "google"
    geminiKeys: [""],
    openaiKey: "",
    hunyuanKey: "",
    geminiOpenAIMode: "official", // 可选值: "cloudflare", "official"
    cloudflareAccountId: "", // Cloudflare AI Gateway 账户ID
    cloudflareGatewayId: "",  // Cloudflare AI Gateway 网关ID
    models: {
      openai: "",
      hunyuan: "",
      gemini: ["", "", ""]
    }
  }
};

module.exports = function MigrateSettings(from_ver, to_ver, settings) {
  if (from_ver === undefined) {
    return Object.assign(Object.assign({}, DefaultSettings), settings);
  } else if (from_ver === null) {
    return DefaultSettings;
  } else {
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
          deduplicateResults: false,
          cachePath: "../data/translation-cache.json",
          hashLongText: false,
          hashAlgorithm: "md5",
          longTextThreshold: 30,
          logLevel: "info",
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
    }

    return settings;
  }
};
