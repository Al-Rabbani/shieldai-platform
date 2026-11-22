import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import GDSSidebar from "./GDSSidebar";
import GDSTopBar from "./GDSTopBar";
// AskGDSWidget removed — replaced by GDS OS v3 layout
import CommandPalette from "@/components/layout/CommandPalette";
import KeyboardShortcuts from "@/components/global/KeyboardShortcuts";
import SessionTimeout from "@/components/global/SessionTimeout";

const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

export default function AppLayout() {
  const location = useLocation();
  const isAuth = AUTH_PATHS.some(p => location.pathname.startsWith(p));

  if (isAuth) {
    return (
      <div className="min-h-screen" style={{ background: "#0a0e17" }}>
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: "#0a0e17" }}>
      <GDSSidebar />
      <CommandPalette />
      <div className="flex-1 flex flex-col min-w-0 ml-0 md:ml-60" id="main-content">
        <GDSTopBar />
        <main className="flex-1 overflow-auto" style={{ background: "#0a0e17" }}>
          <Outlet />
        </main>
      </div>
      {/* GDS OS v3 — AskGDS widget retired */}
      <KeyboardShortcuts />
      <SessionTimeout />
    </div>
  );
}