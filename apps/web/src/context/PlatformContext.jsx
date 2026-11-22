import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const PlatformContext = createContext(null);

export function PlatformProvider({ children }) {
  const [intel, setIntel] = useState(null);
  const [cleanupDone, setCleanupDone] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await base44.functions.invoke("gdsMasterOrchestrator", { action: "platform_intel" });
      setIntel(r.data);
    } catch {}
  }, []);

  useEffect(() => {
    // Run cleanup once on startup, then refresh intel
    base44.functions.invoke("gdsCleanup", {}).catch(() => {}).finally(() => {
      setCleanupDone(true);
      refresh();
    });
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [refresh]);

  return <PlatformContext.Provider value={{ intel, refresh }}>{children}</PlatformContext.Provider>;
}

export const usePlatform = () => useContext(PlatformContext);