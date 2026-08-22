import { Suspense, lazy } from 'react'

const RRexCore = lazy(() => import('./RRexCore'))

function LoadingCore({ className }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="h-40 w-40 animate-pulseSlow rounded-full border border-amber-500/20 bg-obsidian-800/50" />
    </div>
  )
}

export default function RRexCoreLazy({ className = '', variant = 'hero' }) {
  return (
    <Suspense fallback={<LoadingCore className={className} />}>
      <RRexCore className={className} variant={variant} />
    </Suspense>
  )
}
