// ShieldAI — Agent Simulator (RETIRED)
// ⚠️  This function is PERMANENTLY DISABLED.
// All simulation logic (rand/randInt/randBool) has been removed.
// Real data flows exclusively from live scanner engines:
//   - Code:    shieldScanRepo, shieldAISAST, shieldSafeChain
//   - Cloud:   shieldScanAWS, shieldScanAzure, shieldScanGCP
//   - Attack:  shieldDASTScan, shieldAIPentest, shieldAPIFuzzer
//   - Runtime: shieldZenFirewall (real telemetry only)
//   - Protect: shieldDeviceProtection, shieldSafeChain
// Do NOT re-enable or call this function.

Deno.serve(async (_req) => {
  return Response.json({
    status: "retired",
    message: "Simulation engine permanently disabled. All data is sourced from live scanner APIs.",
    real_engines: [
      "shieldScanRepo", "shieldAISAST", "shieldSafeChain",
      "shieldScanAWS", "shieldScanAzure", "shieldScanGCP",
      "shieldDASTScan", "shieldAIPentest", "shieldAPIFuzzer",
      "shieldZenFirewall", "shieldDeviceProtection"
    ],
    retired_at: new Date().toISOString(),
  }, { status: 410 }); // 410 Gone
});
