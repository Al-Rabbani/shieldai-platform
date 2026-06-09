// ShieldAI — Onboarding Flow Engine v1
// Handles: GitHub OAuth repo connect, repo selection, trigger first scan
// End-to-end: user connects GitHub → picks repos → live scan fires → findings appear in dashboard

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } });

  const body = await req.json().catch(() => ({}));
  const { action, github_token, repos, repo_full_name } = body;

  const APP_ID  = Deno.env.get("BASE44_APP_ID") || Deno.env.get("APP_ID") || "";
  const API_KEY = Deno.env.get("BASE44_API_KEY") || "";
  const BASE    = `https://app.base44.com/api/apps/${APP_ID}`;
  const DB_H    = { "x-api-key": API_KEY, "Content-Type": "application/json" };
  const GH_TOKEN = github_token || Deno.env.get("GITHUB_TOKEN") || "";

  const gh = async (path: string) => {
    const r = await fetch(`https://api.github.com${path}`, {
      headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }
    });
    return r.json();
  };

  // ── ACTION: list_repos — fetch the user's real GitHub repos
  if (action === "list_repos") {
    if (!GH_TOKEN) return Response.json({ error: "GitHub token required. Add GITHUB_TOKEN to Builder secrets." }, { status: 400 });

    const [userRepos, orgs] = await Promise.all([
      gh("/user/repos?per_page=50&sort=updated&type=owner"),
      gh("/user/orgs"),
    ]);

    // Also fetch org repos
    const orgRepoArrays = await Promise.all(
      (orgs || []).slice(0, 3).map((o: any) => gh(`/orgs/${o.login}/repos?per_page=20&sort=updated`))
    );
    const allRepos = [...(Array.isArray(userRepos) ? userRepos : []), ...orgRepoArrays.flat()];

    return Response.json({
      success: true,
      count: allRepos.length,
      repos: allRepos.map((r: any) => ({
        full_name: r.full_name,
        name: r.name,
        owner: r.owner?.login,
        language: r.language,
        private: r.private,
        default_branch: r.default_branch,
        updated_at: r.updated_at,
        url: r.html_url,
      }))
    });
  }

  // ── ACTION: connect_repos — register selected repos in CodeRepository entity + fire first scan
  if (action === "connect_repos") {
    if (!repos?.length) return Response.json({ error: "repos array required" }, { status: 400 });
    if (!GH_TOKEN) return Response.json({ error: "GitHub token required" }, { status: 400 });

    const results: any[] = [];

    for (const repoName of repos) {
      try {
        // Get real repo metadata from GitHub
        const meta = await gh(`/repos/${repoName}`);
        if (!meta?.full_name) { results.push({ repo: repoName, success: false, error: "Repo not found or no access" }); continue; }

        // Check if already connected
        const existing = await fetch(`${BASE}/entities/CodeRepository?filter=full_name:${encodeURIComponent(repoName)}&limit=1`, { headers: DB_H });
        const existingData = await existing.json().catch(() => []);
        const existingRecords = Array.isArray(existingData) ? existingData : existingData.records || [];

        if (existingRecords.length > 0) {
          results.push({ repo: repoName, success: true, status: "already_connected", id: existingRecords[0].id });
          continue;
        }

        // Create real CodeRepository record
        const record = {
          name: meta.name,
          full_name: meta.full_name,
          provider: "github",
          url: meta.html_url,
          default_branch: meta.default_branch || "main",
          language: meta.language || "Unknown",
          status: "scanning",
          is_private: meta.private,
          stars: meta.stargazers_count,
          open_prs: 0,
          total_findings: 0,
          critical_count: 0,
          high_count: 0,
          medium_count: 0,
          low_count: 0,
          risk_score: 0,
          last_scanned: null,
        };

        const createRes = await fetch(`${BASE}/entities/CodeRepository`, {
          method: "POST", headers: DB_H, body: JSON.stringify(record)
        });
        const created = await createRes.json();

        // Trigger real scan immediately
        const scanRes = await fetch(`https://app.base44.com/api/apps/${APP_ID}/functions/shieldScanRepo`, {
          method: "POST",
          headers: { "x-api-key": API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ repo_full_name: meta.full_name, github_token: GH_TOKEN, branch: meta.default_branch || "main" })
        });
        const scanResult = await scanRes.json().catch(() => ({}));

        results.push({
          repo: repoName,
          success: true,
          status: "connected_and_scanning",
          record_id: created.id,
          scan_triggered: scanRes.ok,
          initial_findings: scanResult.total_findings || 0,
        });
      } catch (e) {
        results.push({ repo: repoName, success: false, error: String(e) });
      }
    }

    return Response.json({ success: true, connected: results.filter((r: any) => r.success).length, results });
  }

  // ── ACTION: onboard_status — check if user has any connected repos/clouds
  if (action === "onboard_status") {
    const [repos, clouds, devices] = await Promise.all([
      fetch(`${BASE}/entities/CodeRepository?limit=1`, { headers: DB_H }).then(r => r.json()).catch(() => []),
      fetch(`${BASE}/entities/CloudAccount?limit=1`, { headers: DB_H }).then(r => r.json()).catch(() => []),
      fetch(`${BASE}/entities/DeviceAgent?limit=1`, { headers: DB_H }).then(r => r.json()).catch(() => []),
    ]);
    const repoCount = Array.isArray(repos) ? repos.length : repos?.count || 0;
    const cloudCount = Array.isArray(clouds) ? clouds.length : clouds?.count || 0;
    const deviceCount = Array.isArray(devices) ? devices.length : devices?.count || 0;

    return Response.json({
      onboarded: repoCount > 0 || cloudCount > 0,
      steps: {
        code: { done: repoCount > 0, label: "Connect a repository", count: repoCount },
        cloud: { done: cloudCount > 0, label: "Connect a cloud account", count: cloudCount },
        device: { done: deviceCount > 0, label: "Install device agent", count: deviceCount },
      },
      next_step: repoCount === 0 ? "connect_repo" : cloudCount === 0 ? "connect_cloud" : deviceCount === 0 ? "install_device_agent" : "complete",
    });
  }

  return Response.json({ error: "Unknown action. Use: list_repos | connect_repos | onboard_status" }, { status: 400 });
});
