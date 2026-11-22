import React, { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Bell, Search, Menu, X, ChevronRight, Check } from "lucide-react";

const GOLD = "#C9A84C";

const BREADCRUMB_MAP = {
  "/": "Dashboard",
  "/executive-dashboard": "Executive Dashboard",
  "/code": "Code Security",
  "/code/sast": "SAST",
  "/code/sca": "SCA",
  "/code/secrets": "Secrets",
  "/code/autofix": "AutoFix",
  "/cloud": "Cloud Security",
  "/cloud/vms": "Virtual Machines",
  "/cloud/containers": "Containers",
  "/cloud/k8s": "Kubernetes",
  "/attack": "Attack",
  "/attack/pentest": "Pentest",
  "/attack/dast": "DAST",
  "/attack/surface": "Attack Surface",
  "/protect": "Protect",
  "/protect/zen": "Zen Firewall",
  "/protect/supply-chain": "Supply Chain",
  "/governance": "Governance",
  "/governance/compliance": "Compliance",
  "/autotriage": "AutoTriage",
  "/aspm": "ASPM",
  "/ioc-radar": "IOC Radar",
  "/dark-web": "Dark Web Monitor",
  "/identity-intelligence": "Identity Intelligence",
  "/phishing-monitor": "Phishing Monitor",
  "/threat-actors": "Threat Actors",
  "/ransomware-tracker": "Ransomware Tracker",
  "/geo-threat-map": "Geo Threat Map",
  "/ai-agents": "AI Agent Console",
  "/integrations": "Integrations Hub",
  "/audit-log": "Audit Log",
  "/settings": "Settings",
  "/settings/access": "Access Control",
  "/mssp": "MSSP Console",
  "/threat-feed": "Threat Feed",
  "/onboarding": "Onboarding",
};

const NOTIFICATIONS = [
  { id: 1, type: "finding", icon: "🔴", title: "New Critical Finding", desc: "CVE-2024-3094 detected in core-api", time: "2m ago", read: false, link: "/autotriage" },
  { id: 2, type: "scan", icon: "✅", title: "Scan Completed", desc: "Repository scan: al-rabbani/payments-service", time: "12m ago", read: false, link: "/code" },
  { id: 3, type: "alert", icon: "⚡", title: "SLA Breach Alert", desc: "Finding CVE-2024-0099 has breached SLA", time: "1h ago", read: false, link: "/autotriage" },
  { id: 4, type: "system", icon: "🤖", title: "AutoFix PR Opened", desc: "PR #441 — XSS remediation in search", time: "2h ago", read: true, link: "/code/autofix" },
  { id: 5, type: "alert", icon: "🌐", title: "Dark Web Alert", desc: "3 credentials found on BreachForums", time: "3h ago", read: true, link: "/dark-web" },
  { id: 6, type: "system", icon: "📋", title: "Compliance Score Updated", desc: "SOC2 score improved by 3pts to 82%", time: "8h ago", read: true, link: "/governance/compliance" },
];

const NOTIF_TABS = ["All", "Findings", "Scans", "Alerts", "System"];
const TYPE_MAP = { finding: "Findings", scan: "Scans", alert: "Alerts", system: "System" };

export default function TopBar() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifTab, setNotifTab] = useState("All");
  const [notifs, setNotifs] = useState(NOTIFICATIONS);
  const notifRef = useRef(null);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);
  useEffect(() => {
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = notifs.filter(n => !n.read).length;

  const segments = location.pathname.split("/").filter(Boolean);
  const breadcrumbs = [
    { label: "GDS", path: "/" },
    ...segments.map((_, i) => {
      const path = "/" + segments.slice(0, i + 1).join("/");
      return { label: BREADCRUMB_MAP[path] || segments[i], path };
    })
  ];

  const filteredNotifs = notifTab === "All" ? notifs : notifs.filter(n => TYPE_MAP[n.type] === notifTab);

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));

  return (
    <header className="flex items-center gap-4 px-6 py-3 border-b flex-shrink-0 sticky top-0 z-40" style={{ background: "rgba(10,14,26,0.95)", backdropFilter: "blur(12px)", borderColor: "#1a2235" }}>
      {/* Breadcrumb — hidden on mobile */}
      <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 flex-1 min-w-0 overflow-hidden">
        {breadcrumbs.map((b, i) => (
          <React.Fragment key={b.path}>
            {i > 0 && <ChevronRight className="w-3 h-3 flex-shrink-0" />}
            <Link to={b.path}
              className={`truncate transition-colors hover:text-white ${i === breadcrumbs.length - 1 ? "font-semibold" : ""}`}
              style={{ color: i === breadcrumbs.length - 1 ? GOLD : undefined }}>{b.label}</Link>
          </React.Fragment>
        ))}
      </div>

      {/* Page title — mobile only */}
      <div className="flex md:hidden flex-1 text-sm font-bold text-white truncate">
        {BREADCRUMB_MAP[location.pathname] || "GDS"}
      </div>

      {/* Search hint */}
      <button className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-slate-500 border transition-colors hover:text-slate-300"
        style={{ background: "#111827", borderColor: "#1F2937" }}
        onClick={() => { const e = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }); document.dispatchEvent(e); }}>
        <Search className="w-3.5 h-3.5" />
        <span>Search...</span>
        <kbd className="text-[10px] font-mono px-1 rounded" style={{ background: "#1F2937" }}>⌘K</kbd>
      </button>

      {/* Notification Bell */}
      <div className="relative" ref={notifRef}>
        <button onClick={() => setShowNotifs(!showNotifs)}
          className="relative p-2 rounded-xl transition-colors hover:bg-white/5">
          <Bell className="w-5 h-5 text-slate-400" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-black text-black flex items-center justify-center"
              style={{ background: "#ef4444" }}>{unread}</span>
          )}
        </button>

        {showNotifs && (
          <div className="absolute right-0 top-full mt-2 w-96 rounded-2xl border shadow-2xl z-50 overflow-hidden"
            style={{ background: "#111827", borderColor: "#374151" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#1F2937" }}>
              <h4 className="font-bold text-white text-sm">Notifications</h4>
              {unread > 0 && <button onClick={markAllRead} className="text-[10px] font-bold" style={{ color: GOLD }}>Mark all read</button>}
            </div>
            <div className="flex gap-1 px-3 py-2 border-b overflow-x-auto" style={{ borderColor: "#1F2937" }}>
              {NOTIF_TABS.map(t => (
                <button key={t} onClick={() => setNotifTab(t)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all flex-shrink-0"
                  style={{ background: notifTab === t ? GOLD : "transparent", color: notifTab === t ? "#0A0E1A" : "#9CA3AF" }}>{t}</button>
              ))}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {filteredNotifs.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="text-2xl mb-2">🎉</div>
                  <div className="text-sm font-semibold text-slate-400">You're all caught up!</div>
                </div>
              ) : filteredNotifs.map(n => (
                <Link key={n.id} to={n.link} onClick={() => { setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x)); setShowNotifs(false); }}
                  className={`flex items-start gap-3 px-4 py-3 border-b hover:bg-white/5 transition-colors ${!n.read ? "bg-white/[0.03]" : ""}`}
                  style={{ borderColor: "#1F2937" }}>
                  <span className="text-base flex-shrink-0 mt-0.5">{n.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{n.title}</span>
                      {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{n.desc}</p>
                    <span className="text-[10px] text-slate-600">{n.time}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User Avatar */}
      {user && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-black"
            style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
            {user.full_name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="hidden lg:block">
            <div className="text-xs font-semibold text-white">{user.full_name?.split(" ")[0] || "User"}</div>
            <div className="text-[10px] capitalize" style={{ color: GOLD }}>{user.role || "admin"}</div>
          </div>
        </div>
      )}
    </header>
  );
}