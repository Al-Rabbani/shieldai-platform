export const ACTION_STYLE = {
  created: { label: "Created", className: "text-emerald-400", dot: "#10b981" },
  viewed: { label: "Accessed", className: "text-blue-400", dot: "#3b82f6" },
  verified: { label: "Verified", className: "text-purple-400", dot: "#8b5cf6" },
  modified: { label: "Modified", className: "text-orange-400", dot: "#f97316" },
  exported: { label: "Exported", className: "text-amber-400", dot: "#f59e0b" },
};

export const ACTION_ORDER = ["created", "viewed", "modified", "verified", "exported"];

export function actionStyle(action) {
  return ACTION_STYLE[action] || { label: action || "Event", className: "text-slate-400", dot: "#64748b" };
}