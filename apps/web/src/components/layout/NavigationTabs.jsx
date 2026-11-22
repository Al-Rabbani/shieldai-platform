import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const NAV_HISTORY = [
  { label: "Executive Dashboard", path: "/executive-dashboard" },
  { label: "Code Security", path: "/code" },
  { label: "Cloud Findings", path: "/cloud/findings" },
  { label: "Threat Intel", path: "/threat-intel" },
  { label: "Compliance", path: "/governance/compliance" },
  { label: "ASPM", path: "/aspm" },
  { label: "Pentest", path: "/attack/pentest" },
  { label: "EDR", path: "/edr" },
  { label: "Settings", path: "/settings" },
  { label: "Billing", path: "/settings/billing" },
];

export default function NavigationTabs() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentIndex = NAV_HISTORY.findIndex(item => 
    location.pathname === item.path || 
    (item.path !== "/" && location.pathname.startsWith(item.path))
  );

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex >= 0 && currentIndex < NAV_HISTORY.length - 1;

  const handleBack = () => {
    if (canGoBack) {
      navigate(NAV_HISTORY[currentIndex - 1].path);
    }
  };

  const handleForward = () => {
    if (canGoForward) {
      navigate(NAV_HISTORY[currentIndex + 1].path);
    }
  };

  const currentLabel = currentIndex >= 0 ? NAV_HISTORY[currentIndex].label : "Current Page";

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ 
      background: "#070B14", 
      borderColor: "#1a2235",
      position: "fixed",
      top: 0,
      left: "240px",
      right: 0,
      zIndex: 40
    }}>
      <button
        onClick={handleBack}
        disabled={!canGoBack}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5"
        style={{ background: "rgba(201,168,76,0.1)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.3)" }}
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Back
      </button>
      <button
        onClick={handleForward}
        disabled={!canGoForward}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5"
        style={{ background: "rgba(201,168,76,0.1)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.3)" }}
      >
        Forward
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
      
      <div className="flex-1 flex items-center gap-2 ml-4">
        <div className="h-4 w-[1px] bg-slate-800" />
        <span className="text-xs text-slate-400 font-medium">Quick Nav:</span>
        <span className="text-xs font-semibold" style={{ color: "#C9A84C" }}>{currentLabel}</span>
      </div>

      <div className="flex items-center gap-1">
        {NAV_HISTORY.slice(0, 6).map((item, i) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-2 h-2 rounded-full transition-all ${isActive ? "scale-125" : "opacity-40 hover:opacity-70"}`}
              style={{ background: isActive ? "#C9A84C" : "#374151" }}
              title={item.label}
            />
          );
        })}
      </div>
    </div>
  );
}