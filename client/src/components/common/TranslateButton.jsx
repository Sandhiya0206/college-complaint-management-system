import { useState } from 'react'
import { Globe, ChevronDown, Loader2 } from 'lucide-react'
import { translateText, LANGUAGES } from '../../utils/translator'

/**
 * TranslateButton
 * Props:
 *  - text: string to translate
 *  - onTranslated(translatedText): callback with result
 */
const TranslateButton = ({ text, onTranslated }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedLang, setSelectedLang] = useState(null)
  const [error, setError] = useState('')

  const handleTranslate = async (lang) => {
    setIsOpen(false)
    setSelectedLang(lang)
    setIsLoading(true)
    setError('')
    try {
      const result = await translateText(text, lang.code)
      onTranslated(result, lang.label)
    } catch (e) {
      setError('Translation failed. Try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!text?.trim()) return null

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        disabled={isLoading}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-60"
      >
        {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
        {isLoading ? `Translating to ${selectedLang?.label}...` : 'Translate'}
        {!isLoading && <ChevronDown size={10} />}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[140px]">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleTranslate(lang)}
              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center justify-between"
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-[10px] text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}

export default TranslateButton
