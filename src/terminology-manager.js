const fs = require('fs').promises;
const path = require('path');

class GameTerminologyManager {
  constructor() {
    this.terminology = new Map();
    this.confidenceScores = new Map();
    this.terminologyPath = path.join(__dirname, '../data/game-terminology.json');
    this.initialized = false;
    this.regexCache = new Map();
    this.sortedTerms = [];
  }

  async init() {
    if (this.initialized) return true;
    try {
      await this.loadTerminology();
      this.preSortTerminology();
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('[术语管理] 初始化失败:', error);
      this.initialized = true;
      return false;
    }
  }

  async loadTerminology() {
    try {
      const data = await fs.readFile(this.terminologyPath, 'utf8');
      this.terminology.clear();
      this.confidenceScores.clear();
      this.regexCache.clear();
      this.sortedTerms = [];
      
      // 按行读取文件
      const lines = data.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        try {
          // 每行是一个JSON对象
          const entry = JSON.parse(line);
          if (entry.term && entry.translations) {
            this.terminology.set(entry.term, entry.translations);
            this.confidenceScores.set(
              entry.term, 
              'confidence' in entry && typeof entry.confidence === 'number' ? entry.confidence : 0.5
            );
            this._cacheRegexSet(entry.term, entry.translations);
          }
        } catch (lineError) {
          console.error('[术语管理] 解析行失败:', line, lineError);
          // 继续处理下一行，不中断整个加载过程
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      await this.saveTerminology();
    }
  }

  preSortTerminology() {
    this.sortedTerms = Array.from(this.terminology.entries())
      .sort((a, b) => b[0].length - a[0].length);
  }

  _cacheRegexSet(term, translations) {
    const escaped = this.escapeRegExp(term);
    this.regexCache.set(term, {
      boundary: new RegExp(`\\b${escaped}\\b`, 'gi')
    });
    
    for (const [lang, translation] of Object.entries(translations)) {
      if (typeof translation === 'string') {
        const key = `${term}:${lang}`;
        const escapedTrans = this.escapeRegExp(translation);
        this.regexCache.set(key, {
          boundary: new RegExp(`\\b${escapedTrans}\\b`, 'gi')
        });
      }
    }
  }

  _getAndResetRegex(str, key = str) {
    let regex = this.regexCache.get(key);
    if (!regex) {
      const escaped = this.escapeRegExp(str);
      regex = {
        boundary: new RegExp(`\\b${escaped}\\b`, 'gi')
      };
      this.regexCache.set(key, regex);
    }
    
    regex.boundary.lastIndex = 0;
    return regex;
  }

  async saveTerminology() {
    try {
      await fs.mkdir(path.dirname(this.terminologyPath), { recursive: true });
      
      // 将每个术语转换为JSON字符串，每行一个
      const lines = Array.from(this.terminology.entries()).map(([term, translations]) => {
        const entry = {
          term,
          translations,
          confidence: this.confidenceScores.get(term) ?? 0.5
        };
        return JSON.stringify(entry);
      });
      
      // 将所有行连接成一个字符串，每行一个术语
      const content = lines.join('\n');
      
      await fs.writeFile(this.terminologyPath, content, 'utf8');
      
      this.preSortTerminology();
    } catch (error) {
      console.error('[术语管理] 保存失败:', error);
      throw error;
    }
  }

  _applyReplacement(text, regexes, replacement) {
    if (regexes.boundary.test(text)) {
      regexes.boundary.lastIndex = 0;
      return { text: text.replace(regexes.boundary, replacement), matched: true };
    }
    
    return { text, matched: false };
  }

  preProcessText(text, from) {
    if (!this.initialized || !this.terminology.size) return text;
    
    let processedText = text;
    
    for (const [term, translations] of this.sortedTerms) {
      if (this.confidenceScores.get(term) < 0.5) continue;
      
      const termRegexes = this._getAndResetRegex(term);
      const result = this._applyReplacement(processedText, termRegexes, `[TERM:${term}]`);
      if (result.matched) {
        processedText = result.text;
        continue;
      }
      
      if (translations[from] && translations[from] !== term) {
        const translationKey = `${term}:${from}`;
        const translationRegexes = this._getAndResetRegex(translations[from], translationKey);
        const result = this._applyReplacement(processedText, translationRegexes, `[TERM:${term}]`);
        if (result.matched) {
          processedText = result.text;
        }
      }
    }
    
    return processedText;
  }

  postProcessText(text, from, to) {
    if (!this.initialized || !this.terminology.size) return text;
    
    let processedText = text;
    
    processedText = processedText.replace(/\[TERM:([^\]]+)\]/g, (match, term) => {
      const translations = this.terminology.get(term);
      if (translations && translations[to]) {
        return translations[to];
      }
      return /^[a-zA-Z0-9\s]+$/.test(term) ? term : term;
    });
    
    for (const [term, translations] of this.sortedTerms) {
      if (!translations[from] || !translations[to] || this.confidenceScores.get(term) < 0.5) continue;
      
      const translationKey = `${term}:${from}`;
      const translationRegexes = this._getAndResetRegex(translations[from], translationKey);
      const result = this._applyReplacement(processedText, translationRegexes, translations[to]);
      if (result.matched) {
        processedText = result.text;
      }
    }
    
    return processedText;
  }

  addOrUpdateTerm(term, language, translation, confidence = 0.1) {
    if (!term || !language || !translation) return false;
    
    if (!this.terminology.has(term)) {
      this.terminology.set(term, {});
      this.confidenceScores.set(term, 0.5);
    }
    
    this.terminology.get(term)[language] = translation;
    
    const currentConfidence = this.confidenceScores.get(term) ?? 0.5;
    this.confidenceScores.set(term, Math.min(1.0, currentConfidence + confidence));
    
    const key = `${term}:${language}`;
    const escaped = this.escapeRegExp(translation);
    this.regexCache.set(key, {
      boundary: new RegExp(`\\b${escaped}\\b`, 'gi')
    });
    
    this.saveTerminology().catch(err => console.error('[术语管理] 保存失败:', err));
    
    return true;
  }

  addUserFeedback(originalText, correctedText, from, to) {
    const term = originalText.trim();
    const correction = correctedText.trim();
    
    if (!term || !correction || term === correction) {
      return { success: false, reason: '无效的修正' };
    }
    
    this.addOrUpdateTerm(term, to, correction, 0.3);
    
    return { success: true, term, correction, accepted: true, currentVotes: 1 };
  }

  searchTerminology(keyword, language = null, limit = 10) {
    if (!keyword) return [];
    
    const results = [];
    const lowerKeyword = keyword.toLowerCase();
    
    for (const [term, translations] of this.terminology.entries()) {
      if (term.toLowerCase().includes(lowerKeyword)) {
        results.push(this.formatTermResult(term, translations, language));
        if (results.length >= limit) break;
        continue;
      }
      
      for (const [lang, translation] of Object.entries(translations)) {
        if ((!language || lang === language) && 
            translation.toLowerCase().includes(lowerKeyword)) {
          results.push(this.formatTermResult(term, translations, language));
          break;
        }
      }
      
      if (results.length >= limit) break;
    }
    
    return results;
  }

  formatTermResult(term, translations, focusLanguage) {
    const confidence = this.confidenceScores.get(term) ?? 0;
    
    if (focusLanguage && translations[focusLanguage]) {
      const result = { term, confidence, translations: { ...translations } };
      // 确保焦点语言排在前面（通过对象顺序）
      const focusValue = result.translations[focusLanguage];
      delete result.translations[focusLanguage];
      result.translations = { [focusLanguage]: focusValue, ...result.translations };
      return result;
    }
    
    return { term, confidence, translations };
  }

  getStats() {
    const languageCoverage = {};
    for (const translations of this.terminology.values()) {
      for (const lang of Object.keys(translations)) {
        languageCoverage[lang] = (languageCoverage[lang] || 0) + 1;
      }
    }
    
    const confidenceDistribution = { high: 0, medium: 0, low: 0 };
    
    for (const score of this.confidenceScores.values()) {
      if (score >= 0.8) confidenceDistribution.high++;
      else if (score >= 0.5) confidenceDistribution.medium++;
      else confidenceDistribution.low++;
    }
    
    return {
      totalTerms: this.terminology.size,
      languageCoverage,
      confidenceDistribution,
      regexCacheSize: this.regexCache.size,
      sortedTermsCount: this.sortedTerms.length,
      initialized: this.initialized
    };
  }

  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

const terminologyManager = new GameTerminologyManager();

module.exports = { GameTerminologyManager, terminologyManager }; 