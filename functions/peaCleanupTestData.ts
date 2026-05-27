import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    // Use service role to access builder app data
    const base44 = createClientFromRequest(req);
    
    const KEEP = ["PEA-2026-871443", "PEA-2026-144173"];
    const BUILDER_APP_ID = "69e2e852c48630e3502f13b1";
    
    // Fetch all applications from the builder app
    const response = await fetch(
      `https://api.base44.com/api/apps/${BUILDER_APP_ID}/entities/Application?limit=500`,
      {
        headers: {
          "Authorization": `Bearer ${Deno.env.get("BASE44_SERVICE_TOKEN")}`,
          "Content-Type": "application/json"
        }
      }
    );
    
    if (!response.ok) {
      const err = await response.text();
      return Response.json({ error: "Failed to fetch applications", detail: err }, { status: 500 });
    }
    
    const data = await response.json();
    const apps = Array.isArray(data) ? data : (data.records || data.data || []);
    const toDelete = apps.filter((a: any) => !KEEP.includes(a.reference_code));
    
    let deleted = 0;
    let failed = 0;
    const results: any[] = [];
    
    for (const app of toDelete) {
      const delRes = await fetch(
        `https://api.base44.com/api/apps/${BUILDER_APP_ID}/entities/Application/${app.id}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${Deno.env.get("BASE44_SERVICE_TOKEN")}`,
          }
        }
      );
      if (delRes.ok || delRes.status === 404) {
        deleted++;
        results.push({ ref: app.reference_code, id: app.id, status: "deleted" });
      } else {
        const errText = await delRes.text();
        failed++;
        results.push({ ref: app.reference_code, id: app.id, status: "failed", error: errText });
      }
    }
    
    return Response.json({ success: true, deleted, failed, kept: KEEP, total_found: apps.length, results });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
