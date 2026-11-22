import React, { useState, useEffect } from "react";
import { X, CheckCircle, Loader2 } from "lucide-react";

export function ScanProgressPanel({
  scannerName,
  target,
  progress,
  currentStep,
  elapsedSeconds,
  onCancel,
  onComplete,
}) {
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (progress >= 100) {
      setIsComplete(true);
      const timer = setTimeout(() => {
        onComplete();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [progress, onComplete]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-4xl mx-auto m-4 rounded-xl border border-slate-800 bg-slate-900/95 backdrop-blur shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {isComplete ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
            )}
            <div>
              <div className="text-sm font-bold text-white">{scannerName}</div>
              <div className="text-xs text-slate-400">{target}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-slate-400 font-mono">{formatTime(elapsedSeconds)}</div>
            {!isComplete && (
              <button
                onClick={onCancel}
                className="p-1 hover:bg-slate-800 rounded transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className={isComplete ? "text-green-400 font-bold" : "text-slate-400"}>
              {isComplete ? "✅ Scan complete" : currentStep}
            </span>
            <span className="text-white font-bold">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 relative overflow-hidden"
              style={{
                width: `${progress}%`,
                background: isComplete ? '#22c55e' : '#C9A84C',
              }}
            >
              {!isComplete && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}