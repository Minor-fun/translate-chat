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
  // ELD library doesn't require language database or threshold at initialization
  this.languageType = languageType || null;
};

LanguageDetect.prototype = {

  /**
   * Returns the number of languages that this object can detect
   *
   * @access public
   * @return int the number of languages
   */
  getLanguageCount: function () {
    return eld.info().languages.length;
  },

  setLanguageType: function (type) {
    this.languageType = type;
    return this.languageType;
  },

  /**
   * Returns the list of detectable languages
   *
   * @access public
   * @return object the names of the languages known to this object
   */
  getLanguages: function () {
    // eld.info().languages returns ISO 639-1 code array (e.g., ['en', 'zh'])
    // Returns ISO 639-1 code array directly, no need to convert to full language names
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
  detect: function (sample, limit) {
    limit = +limit || 0;

    // Force convert to string
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

    scores.sort(function (a, b) { return b[1] - a[1]; });

    if (scores.length > 0 && scores[0][0] === 'zh') {

      if (this._hasTraditionalChineseChar(sample)) {
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

    return limit > 0 ? scores.slice(0, limit) : scores;
  },


  /**
   * Check if text contains any Traditional Chinese specific characters
   * @param {string} text
   * @returns {boolean}
   */
  _hasTraditionalChineseChar: function (text) {
    var traditionalSpecific = /[會備傳處標樂華東過經對應問題門車賣買話電網點際國產頭習學業愛無關開長間時說語裡這們個單體繁發為從來後與給還進種見實現將無過開關經過電話買賣問題車門會經產業國際東華標準對話門問過經際國業產頭學習愛無關開長間時話說語裡這們個單簡繁體內容顯示設置選項確認區域連接過濾視頻圖書類別專輯聯繫電郵辦網頁瀏覽書籍貨幣錯誤訊息記錄廣場競爭優勢權限圖像圖標預覽縮略圖歷史紀錄儲存檔案隊列隨機搜尋數據統計資訊預設預約處理幫助說明報導請求張貼發佈編輯複製連結觸發錯誤]/;

    return traditionalSpecific.test(text);
  }
};
