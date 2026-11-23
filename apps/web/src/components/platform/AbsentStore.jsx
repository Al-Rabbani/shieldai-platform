import { AlertTriangle } from "lucide-react";
import { absentStoreReason } from "@/api/absentStores";

/* The honest empty state for a store this platform does not have.
 *
 * Use this wherever a module would otherwise print "No <thing> yet" or a zero over an entity the API does not serve.
 * "No phases logged yet" reads as "we looked and found none"; this says the store does not exist and why, which is a
 * different and true statement. The reason comes from the shipped map generated from the coverage baseline.
 */
export default function AbsentStore({ entity, what, className = "" }) {
  const reason = absentStoreReason(entity);
  if (!reason) return null;
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 ${className}`}
         style={{ background: "#1a1405", borderColor: "#4a3600" }}>
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#eab308" }} />
      <div className="text-[11px] leading-relaxed" style={{ color: "#d7c48a" }}>
        <span className="font-semibold">Not recorded on this platform.</span>{" "}
        {what ? <span className="text-slate-300">{what} </span> : null}
        {reason}
      </div>
    </div>
  );
}
