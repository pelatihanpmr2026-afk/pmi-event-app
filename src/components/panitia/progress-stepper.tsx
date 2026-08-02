import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface ProgressStepperProps {
  steps: string[]
  currentStep: number
}

export function ProgressStepper({ steps, currentStep }: ProgressStepperProps) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-3 w-full max-w-2xl mx-auto">
      {steps.map((label, index) => {
        const stepNumber = index + 1
        const isCompleted = stepNumber < currentStep
        const isActive = stepNumber === currentStep

        return (
          <div key={label} className="flex items-center flex-1 last:flex-initial">
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  'w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center border-3 border-event-navy font-heading text-xs transition-all duration-150',
                  isCompleted && 'bg-event-yellow text-event-navy shadow-pixel-yellow',
                  isActive && 'bg-event-pink text-white shadow-pixel-pink scale-110',
                  !isCompleted && !isActive && 'bg-white text-event-navy/40'
                )}
              >
                {isCompleted ? <Check size={16} /> : stepNumber}
              </div>
              <span
                className={cn(
                  'font-body text-[10px] sm:text-xs font-bold text-center hidden sm:block',
                  isActive ? 'text-event-navy' : 'text-event-navy/40'
                )}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-1 mx-1 sm:mx-2 transition-all duration-150',
                  isCompleted ? 'bg-event-yellow' : 'bg-event-navy/20'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}