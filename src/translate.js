const request = require('request-promise-native');
module.exports.AVAILABLE_LANGUAGES = ['af', 'sq', 'ar', 'az', 'eu', 'bn', 'be', 'bg', 'ca', 'zh-CN', 'zh-TW', 'hr', 'cs', 'da', 'nl', 'en', 'eo', 'et', 'tl', 'fi', 'fr', 'gl', 'ka', 'de', 'el', 'gu', 'ht', 'iw', 'hi', 'hu', 'is', 'id', 'ga', 'it', 'ja', 'kn', 'ko', 'la', 'lv', 'lt', 'mk', 'ms', 'mt', 'no', 'fa', 'pl', 'pt', 'ro', 'ru', 'sr', 'sk', 'sl', 'es', 'sw', 'sv', 'ta', 'te', 'th', 'tr', 'uk', 'ur', 'vi', 'cy', 'yi', 'any'];

module.exports.translate = async function translate(text, translateTo, translateFrom = 'auto') {
  const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl='
    + translateFrom + '&tl=' + translateTo + '&dt=t&q=' + encodeURI(text);

  const body = await request.get(url, {json:true});
  return body[0][0][0];
};
