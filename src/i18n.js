/**
 * i18n.js - 国际化支持模块
 * 为翻译模块提供多语言界面支持，并利用现有翻译功能
 */

const fs = require('fs');
const path = require('path');

// 默认语言
const DEFAULT_LANGUAGE = 'en';

// 基础语言文件（英文）
let baseMessages = {};
try {
  const enPath = path.join(__dirname, 'lang', 'en.json');
  if (fs.existsSync(enPath)) {
    baseMessages = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  } else {
    console.error('Error: en.json not found in lang directory');
  }
} catch (e) {
  console.error('Error loading base messages:', e);
}

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
    const separator = "@@||TRANSLATE_SEPARATOR_TOKEN_DO_NOT_TRANSLATE||@@";
    // 每次翻译的最大字符数，放宽到5000以支持更多条目
    const MAX_BATCH_SIZE = 5000; 
    // 每次翻译的最大条目数
    const MAX_BATCH_COUNT = 50;
    
    // 准备批次
    const keys = Object.keys(messages);
    const batches = [];
    let currentBatchKeys = [];
    let currentBatchText = "";
    
    for (const key of keys) {
      const text = messages[key];
      // 估算添加当前文本后的长度
      const nextLength = currentBatchText.length + (currentBatchText ? separator.length : 0) + text.length;
      
      if ((nextLength > MAX_BATCH_SIZE || currentBatchKeys.length >= MAX_BATCH_COUNT) && currentBatchKeys.length > 0) {
        batches.push({ keys: currentBatchKeys, text: currentBatchText });
        currentBatchKeys = [];
        currentBatchText = "";
      }
      
      if (currentBatchText) {
        currentBatchText += separator;
      }
      currentBatchText += text;
      currentBatchKeys.push(key);
    }
    
    if (currentBatchKeys.length > 0) {
      batches.push({ keys: currentBatchKeys, text: currentBatchText });
    }
    
    this.mod.log(`Translation split into ${batches.length} batches.`);

    // 逐批翻译
    let success = true;
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      let batchSuccess = false;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!batchSuccess && retryCount < maxRetries) {
        try {
          // 翻译当前批次
          const translatedCombined = await this.translator.translateText(batch.text, lang, 'en', true);
          
          // 分割结果
          const translatedArray = translatedCombined.split(separator);
          
          // 验证数量
          if (translatedArray.length === batch.keys.length) {
            batch.keys.forEach((key, index) => {
              translatedMessages[key] = translatedArray[index].trim();
            });
            batchSuccess = true;
          } else {
            throw new Error(`Batch ${i+1} count mismatch: expected ${batch.keys.length}, got ${translatedArray.length}`);
          }
        } catch (err) {
          retryCount++;
          this.mod.error(`Batch ${i+1}/${batches.length} failed (attempt ${retryCount}):`, err);
          if (retryCount < maxRetries) {
            this.mod.log(`Retrying batch ${i+1} in 5 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }
      
      if (!batchSuccess) {
        success = false;
        this.mod.error(`Failed to translate batch ${i+1} after ${maxRetries} attempts.`);
        break;
      }
      
      // 批次之间稍微等待一下，避免速率限制
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
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