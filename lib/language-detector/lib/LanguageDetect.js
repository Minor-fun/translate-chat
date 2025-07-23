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

    if (sample === '' || String(sample).length < 3) return [];

    var detected = eld.detect(sample);
    var scores = [];

    // eld.detect() 返回一个对象，例如 { language: 'es', getScores(): { 'es': 0.5, 'et': 0.2 }, isReliable(): true }
    // 如果 eld 成功检测到语言且不是 'und' (unidentified)，则处理其得分
    if (detected && detected.language !== 'und') {
        var eldScores = detected.getScores();
        for (var langCode in eldScores) {
            if (eldScores.hasOwnProperty(langCode)) {
                // 直接使用 ISO 639-1 代码，不需要转换为完整的语言名称
                scores.push([langCode, eldScores[langCode]]);
            }
        }
    }

    // 按照分数降序排序数组
    scores.sort(function (a, b) { return b[1] - a[1]; });

    // 不再需要根据languageType进行额外转换，因为我们已经使用了ISO 639-1代码
    // 但保留原有逻辑以便将来可能的扩展
    switch (this.languageType) {
      case 'iso3':
        for (var i = scores.length; i--;) {
          scores[i][0] = ISO639.getCode3(scores[i][0]);
        }
        break;
    }

    // 限制返回的分数数量
    return limit > 0 ? scores.slice(0, limit) : scores;
  }
};
