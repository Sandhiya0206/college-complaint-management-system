import { Check, Loader2 } from 'lucide-react'

const STEPS = [
  'Loading TF.js models...',
  'Reading image data...',
  'Running MobileNet V2 (top-5)...',
  'Running COCO-SSD detection...',
  'Mapping to campus category...',
]

const AnalyzingAnimation = ({ currentStep = 0 }) => {
  return (
    <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 bg-violet-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-xs">🤖</span>
        </div>
        <span className="text-sm font-semibold text-violet-700">AI Analysis in Progress</span>
        <Loader2 size={14} className="animate-spin text-violet-500 ml-auto" />
      </div>
      <div className="space-y-2">
        {STEPS.map((step, i) => {
          const isDone = i < currentStep
          const isCurrent = i === currentStep - 1
          return (
            <div key={i} className={`flex items-center gap-2 text-xs transition-all duration-300 ${isDone ? 'text-violet-700 font-medium' : isCurrent ? 'text-violet-600' : 'text-gray-400'}`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isDone ? 'bg-violet-600' : isCurrent ? 'bg-violet-300 animate-pulse' : 'bg-gray-200'}`}>
                {isDone ? <Check size={10} className="text-white" /> : isCurrent ? <Loader2 size={10} className="animate-spin text-violet-600" /> : null}
              </div>
              {step}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AnalyzingAnimation
