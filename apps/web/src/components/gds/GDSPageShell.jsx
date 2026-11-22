import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, ArrowLeft } from "lucide-react";

const GOLD = "#c9a84c";
const BORDER = "#1a1f2e";

export default function GDSPageShell({ breadcrumbs, title, subtitle, actions, children }) {
  const navigate = useNavigate();
  return (
    <div className="p-6 space-y-5 min-h-screen" style={{ background: "#0a0e17" }}>
      {/* Breadcrumb + back */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)}
          className="flex items-center justify-center w-6 h-6 rounded-md transition-colors hover:bg-white/5 text-slate-600 hover:text-slate-300 flex-shrink-0">
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
          <Link to="/" className="hover:text-slate-400 transition-colors">Command Center</Link>
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              <ChevronRight className="w-3 h-3" />
              {b.path ? (
                <Link to={b.path} className="hover:text-slate-400 transition-colors">{b.label}</Link>
              ) : (
                <span style={{ color: GOLD }}>{b.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-white">{title}</h1>
          {subtitle && <p className="text-[9px] font-bold tracking-widest text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}