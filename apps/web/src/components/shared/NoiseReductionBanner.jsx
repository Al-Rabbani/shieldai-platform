import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function NoiseReductionBanner({ filteredCount, showingCount, pageType }) {
  const [showAll, setShowAll] = useState(false);

  return (
    <div className="mb-4 p-3 rounded-lg bg-indigo-900/20 border border-indigo-700/50 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-lg">🔇</span>
        <div className="text-sm">
          <span className="text-indigo-300 font-semibold">
            ShieldAI filtered out {filteredCount.toLocaleString()} theoretical {pageType}.
          </span>
          <span className="text-gray-400 ml-2">
            Showing only {showingCount.toLocaleString()} findings that are confirmed or likely exploitable in your environment.
          </span>
        </div>
      </div>
      <button
        onClick={() => setShowAll(!showAll)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors"
      >
        {showAll ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        {showAll ? "Hide theoretical" : "Show all findings"}
      </button>
    </div>
  );
}

export default NoiseReductionBanner;