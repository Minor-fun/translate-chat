const https = require('https');
module.exports.AVAILABLE_LANGUAGES = ['af', 'sq', 'ar', 'az', 'eu', 'bn', 'be', 'bg', 'ca', 'zh-CN', 'zh-TW', 'hr', 'cs', 'da', 'nl', 'en', 'eo', 'et', 'tl', 'fi', 'fr', 'gl', 'ka', 'de', 'el', 'gu', 'ht', 'iw', 'hi', 'hu', 'is', 'id', 'ga', 'it', 'ja', 'kn', 'ko', 'la', 'lv', 'lt', 'mk', 'ms', 'mt', 'no', 'fa', 'pl', 'pt', 'ro', 'ru', 'sr', 'sk', 'sl', 'es', 'sw', 'sv', 'ta', 'te', 'th', 'tr', 'uk', 'ur', 'vi', 'cy', 'yi', 'any'];

async function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, response => {
        let body = '';
        response.on('data', d => body += d);
        response.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

module.exports.translate = async function translate(text, translateTo, translateFrom = 'auto') {
  const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl='
    + translateFrom + '&tl=' + translateTo + '&dt=t&q=' + encodeURI(text);

  const body = await get(url);
  return body[0][0][0];
};
/*
 // usage
 async function main() {
 const result = await translate(
 'ru',
 'i like carrots'
 );
 console.log(`result: ${result}`);
 }

 main();
 */
