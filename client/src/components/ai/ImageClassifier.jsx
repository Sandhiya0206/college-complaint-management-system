import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { useImageClassification } from '../../hooks/useImageClassification'
import AnalyzingAnimation from './AnalyzingAnimation'
import AIResultCard from './AIResultCard'
import { CATEGORIES } from '../../utils/constants'

const ImageClassifier = ({ onCategoryDetected, onFilesChange }) => {
  const [files, setFiles] = useState([])
  const [showOverride, setShowOverride] = useState(false)
  const { analyzeImage, isAnalyzing, analysisStep, result, error, reset } = useImageClassification()

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return

    const newFiles = acceptedFiles.slice(0, 5)
    setFiles(newFiles)
    onFilesChange?.(newFiles)

    // Analyze first image
    const aiResult = await analyzeImage(newFiles[0])
    if (aiResult && onCategoryDetected) {
      onCategoryDetected(aiResult)
    }
  }, [analyzeImage, onCategoryDetected, onFilesChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    maxFiles: 5,
    maxSize: 5 * 1024 * 1024
  })

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    onFilesChange?.(newFiles)
    if (newFiles.length === 0) reset()
  }

  const handleOverride = (category) => {
    if (result && onCategoryDetected) {
      onCategoryDetected({ ...result, category, studentOverrode: true })
    }
    setShowOverride(false)
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-indigo-500 bg-indigo-50 scale-[1.01]'
            : files.length > 0
            ? 'border-green-400 bg-green-50'
            : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDragActive ? 'bg-indigo-600' : 'bg-gray-100'}`}>
            {isDragActive ? (
              <Upload size={24} className="text-white" />
            ) : (
              <ImageIcon size={24} className={files.length > 0 ? 'text-green-600' : 'text-gray-400'} />
            )}
          </div>
          {isDragActive ? (
            <p className="text-indigo-600 font-semibold">Drop image here!</p>
          ) : (
            <>
              <div>
                <p className="text-gray-700 font-semibold">Drop an image — AI will detect the issue automatically</p>
                <p className="text-gray-400 text-sm mt-1">or click to select • JPEG, PNG, GIF, WebP • max 5MB • up to 5 images</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-violet-600 bg-violet-50 px-3 py-1.5 rounded-full border border-violet-200">
                <span>🤖</span>
                <span>AI auto-fills Category + Priority + Assignment</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Image preview grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {files.map((file, i) => (
            <div key={i} className="relative group aspect-square">
              <img
                src={URL.createObjectURL(file)}
                alt={`Upload ${i + 1}`}
                className="w-full h-full object-cover rounded-lg border border-gray-200"
              />
              <button
                onClick={() => removeFile(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
              >
                <X size={10} />
              </button>
              {i === 0 && (
                <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] rounded px-1">Primary</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AI error */}
      {error && !isAnalyzing && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          ⚠️ {error}
        </div>
      )}

      {/* AI Analysis */}
      {isAnalyzing && <AnalyzingAnimation currentStep={analysisStep} />}

      {result && !isAnalyzing && (
        <>
          <AIResultCard
            result={result}
            onOverride={() => setShowOverride(!showOverride)}
          />

          {/* Category override dropdown */}
          {showOverride && (
            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 animate-slide-up">
              <p className="text-xs text-gray-500 mb-2 font-medium">Select correct category:</p>
              <div className="grid grid-cols-2 gap-1.5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleOverride(cat)}
                    className={`text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                      result.category === cat
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ImageClassifier
