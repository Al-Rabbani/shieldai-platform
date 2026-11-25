import React, { useEffect, useState } from "react";
import { AlertOctagon, X } from "lucide-react";
import { WRITE_FAILED_EVENT } from "@/lib/writeFailure";

/**
 * The visible half of attemptWrite(). Mounted in the shell so no page can quietly drop a failed write.
 * Deliberately not auto-dismissing: a discarded write is not a transient message.
 */
export default function WriteFailureBanner() {
  const [failure, setFailure] = useState(null);

  useEffect(() => {
    const onFail = (event) => setFailure(event.detail);
    window.addEventListener(WRITE_FAILED_EVENT, onFail);
    return () => window.removeEventListener(WRITE_FAILED_EVENT, onFail);
  }, []);

  if (!failure) return null;

  return (
    <div className="w-full px-6 py-2 text-[11px] flex items-start gap-2" style={{ background: "#2a0b0b", borderBottom: "1px solid #5a1a1a" }}>
      <AlertOctagon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#f87171" }} />
      <div className="flex-1">
        <p className="font-bold" style={{ color: "#fca5a5" }}>Not saved: {failure.what}</p>
        <p style={{ color: "#e5b4b4" }}>{failure.message}</p>
      </div>
      <button onClick={() => setFailure(null)} className="flex-shrink-0" title="Dismiss">
        <X className="w-3.5 h-3.5" style={{ color: "#e5b4b4" }} />
      </button>
    </div>
  );
}
