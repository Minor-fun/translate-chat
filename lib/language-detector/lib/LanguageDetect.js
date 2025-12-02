/**
 *
 * Detects the language of a given piece of text.
 *
 * Attempts to detect the language of a sample of text using the Efficient Language Detector (ELD) library.
 *
 * @author Francois-Guillaume Ribreau - @FGRibreau
 * @author Ruslan Zavackiy - @Chaoser
 * @author Gemini AI (for integration of ELD)
 *
 * @see https://github.com/nitotm/efficient-language-detector-js
 *
 * @example
 * <code>
 * var LanguageDetect = require("./LanguageDetect");
 * var d = new LanguageDetect().detect('This is a test');
 * // d[0] == 'english'
 * // d[1] == score
 * // Good score are over 0.3
 * </code>
 */

var eld = require('./eld'); // Import the eld library
var ISO639 = require('./ISO639'); // Keep ISO639 for code conversion

var LanguageDetect = module.exports = function (languageType) {
  // eld 库在初始化时不需要语言数据库或阈值
  this.languageType = languageType || null;
};

LanguageDetect.prototype = {

  /**
   * Returns the number of languages that this object can detect
   *
   * @access public
   * @return int the number of languages
   */
  getLanguageCount:function () {
    return eld.info().languages.length;
  },

  setLanguageType:function (type) {
    this.languageType = type;
    return this.languageType;
  },

  /**
   * Returns the list of detectable languages
   *
   * @access public
   * @return object the names of the languages known to this object
   */
  getLanguages:function () {
    // eld.info().languages 返回 ISO 639-1 代码数组 (例如: ['en', 'zh'])
    // 直接返回ISO 639-1代码数组，无需转换为完整语言名称
    return eld.info().languages;
  },

  /**
   * Detects the closeness of a sample of text to the known languages
   *
   * @access  public
   * @param   sample  a sample of text to compare.
   * @param   limit  if specified, return an array of the most likely
   *                  $limit languages and their scores.
   * @return  Array   sorted array of language scores, blank array if no
   *                  useable text was found
   */
  detect:function (sample, limit) {
    limit = +limit || 0;
	
	// 1. 强制转为字符串
	sample = String(sample); 

    if (sample === '' || sample.length < 3) return [];

    var detected = eld.detect(sample);
    var scores = [];


    if (detected && detected.language !== 'und') {
        var eldScores = detected.getScores();
        for (var langCode in eldScores) {
            if (eldScores.hasOwnProperty(langCode)) {

                scores.push([langCode, eldScores[langCode]]);
            }
        }
    }

    // 按照分数降序排序数组
    scores.sort(function (a, b) { return b[1] - a[1]; });

    // 繁体中文检测:
    if (scores.length > 0 && scores[0][0] === 'zh') {
        var traditionalRatio = this._getTraditionalChineseRatio(sample);
        // 如果繁体字符占比超过10%,判定为繁体中文
        if (traditionalRatio > 0.1) {
            scores[0][0] = 'zh-TW';
        }
    }


    switch (this.languageType) {
      case 'iso3':
        for (var i = scores.length; i--;) {
          scores[i][0] = ISO639.getCode3(scores[i][0]);
        }
        break;
    }

    // 限制返回的分数数量
    return limit > 0 ? scores.slice(0, limit) : scores;
  },


  _getTraditionalChineseRatio: function(text) {
    var traditionalChars = /[繁體簡単個們這裡語說話時間長開關無愛業學習頭產國際點網電話買賣車門問題應該對會經過麼東華樂標準確認選擇習慣機會覺際區實際際際際傳統處備戲劇態護際際際際際際際際際際際際際際際際際際際際际际对简单个们这里语说话时间长开关无爱业学习头产国际点网电话买卖车门问题应该对会经过么东华乐标准确认选择习惯机会觉]/g;
    
    var traditionalSpecific = /[會備傳處標樂華東過經對應該問題門車賣買話電網點際國產頭習學業愛無關開長間時說語裡這們個單簡體繁]/g;
    var simplifiedSpecific = /[会备传处标乐华东过经对应该问题门车卖买话电网点际国产头习学业爱无关开长间时说语里这们个单简体繁]/g;
    
    var traditionalMatches = text.match(traditionalSpecific);
    var simplifiedMatches = text.match(simplifiedSpecific);
    var chineseChars = text.match(/[\u4e00-\u9fff]/g);
    
    if (!chineseChars || chineseChars.length === 0) {
      return 0;
    }
    
    var traditionalCount = traditionalMatches ? traditionalMatches.length : 0;
    var simplifiedCount = simplifiedMatches ? simplifiedMatches.length : 0;
    
    if (traditionalCount > simplifiedCount) {
      return traditionalCount / chineseChars.length;
    }
    
    return 0;
  }
};
