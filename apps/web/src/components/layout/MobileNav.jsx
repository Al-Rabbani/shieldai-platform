import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Code, Cloud, Shield, Settings } from "lucide-react";

const GOLD = "#C9A84C";

const TABS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Code", icon: Code, path: "/code" },
  { label: "Cloud", icon: Cloud, path: "/cloud" },
  { label: "Threats", icon: Shield, path: "/threat-feed" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export default function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center border-t md:hidden"
      style={{ background: "#111827", borderColor: "#1F2937", height: 64 }}>
      {TABS.map(tab => {
        const isActive = tab.path === "/" ? location.pathname === "/" : location.pathname.startsWith(tab.path);
        return (
          <Link key={tab.path} to={tab.path}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-all"
            style={{ color: isActive ? GOLD : "#6B7280" }}>
            <div className="relative">
              <tab.icon className="w-5 h-5" />
              {isActive && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full" style={{ background: GOLD }} />}
            </div>
            <span className="text-[9px] font-semibold">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}