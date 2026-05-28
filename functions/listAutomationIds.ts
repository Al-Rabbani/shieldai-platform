export default async function handler(req: Request): Promise<Response> {
  // Use the internal base44 API to list all automations for this app
  const appId = "6a14246111a4fa5e22999619";
  const serviceToken = Deno.env.get("BASE44_SERVICE_TOKEN") || "";
  
  const url = `https://base44.app/api/apps/${appId}/automations?limit=50&sort=-created_date`;
  
  const resp = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${serviceToken}`,
      "Content-Type": "application/json",
    },
  });
  
  const data = await resp.json();
  
  if (!Array.isArray(data)) {
    return Response.json({ error: data, token_prefix: serviceToken.slice(0, 20) });
  }
  
  const summary = data.map(a => ({
    id: a.id,
    name: a.name,
    active: a.is_active,
    archived: a.is_archived,
    interval: a.repeat_interval ? `${a.repeat_interval}${a.repeat_unit}` : a.automation_type,
    total_runs: a.total_runs,
    created: a.created_date?.slice(0, 16),
  }));
  
  return Response.json({ count: data.length, automations: summary });
}
