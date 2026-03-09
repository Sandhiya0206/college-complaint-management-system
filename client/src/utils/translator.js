/**
 * translator.js — Translate text using MyMemory free API
 * https://api.mymemory.translated.net/get?q={text}&langpair=en|hi
 */

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get'

/**
 * Translate a string from sourceLang to targetLang.
 * @param {string} text
 * @param {string} targetLang  e.g. 'hi' for Hindi, 'gu' for Gujarati
 * @param {string} sourceLang  default 'en'
 * @returns {Promise<string>}  translated text
 */
export const translateText = async (text, targetLang = 'hi', sourceLang = 'en') => {
  if (!text?.trim()) return text
  try {
    const url = `${MYMEMORY_URL}?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`
    const res = await fetch(url)
    const json = await res.json()
    if (json.responseStatus === 200) {
      return json.responseData.translatedText
    }
    throw new Error(json.responseDetails || 'Translation failed')
  } catch (err) {
    console.error('Translation error:', err)
    throw err
  }
}

export const LANGUAGES = [
  { code: 'hi', label: 'Hindi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'mr', label: 'Marathi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'bn', label: 'Bengali' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'ur', label: 'Urdu' },
]
