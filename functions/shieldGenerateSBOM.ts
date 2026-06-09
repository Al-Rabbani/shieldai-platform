// ShieldAI — SBOM Generator (Phase 1, Step 1.9)
// Generates a real CycloneDX or SPDX Software Bill of Materials from a repo's dependency files
// Uses: GitHub API to read dependency files, OSV.dev to enrich with CVE data

Deno.serve(async (req) => {
  const { repo_full_name, github_token, format = "cyclonedx" } = await req.json().catch(() => ({}));

  if (!repo_full_name || !github_token) {
    return Response.json({ error: "repo_full_name and github_token are required" }, { status: 400 });
  }

  const GH = (path: string) => fetch(`https://api.github.com${path}`, {
    headers: { Authorization: `Bearer ${github_token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }
  }).then(r => r.json());

  try {
    const repoInfo = await GH(`/repos/${repo_full_name}`);
    const branch = repoInfo.default_branch || "main";
    const tree = await GH(`/repos/${repo_full_name}/git/trees/${branch}?recursive=1`);
    const files = (tree.tree || []).filter((f: any) => f.type === "blob");

    const components: any[] = [];
    const vulnerabilities: any[] = [];

    // Parse package.json
    const pkgJson = files.find((f: any) => f.path === "package.json");
    if (pkgJson) {
      const blob = await GH(`/repos/${repo_full_name}/git/blobs/${pkgJson.sha}`);
      const pkg = JSON.parse(atob(blob.content.replace(/\n/g, "")));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

      for (const [name, version] of Object.entries(allDeps)) {
        const cleanVer = String(version).replace(/[\^~>=<]/g, "").trim();
        const component: any = {
          type: "library",
          name,
          version: cleanVer,
          purl: `pkg:npm/${name}@${cleanVer}`,
          ecosystem: "npm",
          scope: pkg.devDependencies?.[name] ? "optional" : "required",
        };

        // Enrich with OSV CVE data
        const osvRes = await fetch("https://api.osv.dev/v1/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ package: { name, ecosystem: "npm" }, version: cleanVer })
        }).then(r => r.json()).catch(() => ({ vulns: [] }));

        if (osvRes.vulns?.length > 0) {
          component.vulnerabilities_count = osvRes.vulns.length;
          for (const v of osvRes.vulns.slice(0, 2)) {
            vulnerabilities.push({
              id: v.id,
              component: name,
              version: cleanVer,
              summary: v.summary,
              aliases: v.aliases || [],
              published: v.published,
            });
          }
        }
        components.push(component);
      }
    }

    // Parse requirements.txt
    const reqTxt = files.find((f: any) => f.path === "requirements.txt");
    if (reqTxt) {
      const blob = await GH(`/repos/${repo_full_name}/git/blobs/${reqTxt.sha}`);
      const content = atob(blob.content.replace(/\n/g, ""));
      for (const line of content.split("\n").filter((l: string) => l && !l.startsWith("#"))) {
        const [name, version] = line.split(/[==>=<]+/);
        if (!name) continue;
        const cleanName = name.trim();
        const cleanVer = (version || "latest").trim();
        components.push({
          type: "library",
          name: cleanName,
          version: cleanVer,
          purl: `pkg:pypi/${cleanName}@${cleanVer}`,
          ecosystem: "PyPI",
          scope: "required",
        });
      }
    }

    const now = new Date().toISOString();
    const serialNumber = `urn:uuid:${crypto.randomUUID()}`;

    let sbom: any;

    if (format === "cyclonedx") {
      sbom = {
        bomFormat: "CycloneDX",
        specVersion: "1.5",
        serialNumber,
        version: 1,
        metadata: {
          timestamp: now,
          tools: [{ vendor: "ShieldAI", name: "ShieldAI SBOM Generator", version: "1.0.0" }],
          component: {
            type: "application",
            name: repo_full_name.split("/")[1],
            version: "HEAD",
            purl: `pkg:github/${repo_full_name}`,
          }
        },
        components: components.map(c => ({
          type: c.type,
          name: c.name,
          version: c.version,
          purl: c.purl,
          scope: c.scope,
          ...(c.vulnerabilities_count ? { properties: [{ name: "shieldai:vuln_count", value: String(c.vulnerabilities_count) }] } : {})
        })),
        vulnerabilities: vulnerabilities.map(v => ({
          id: v.id,
          source: { url: `https://osv.dev/vulnerability/${v.id}` },
          description: v.summary,
          published: v.published,
          affects: [{ ref: components.find(c => c.name === v.component)?.purl || v.component }],
        }))
      };
    } else {
      // SPDX format
      sbom = {
        spdxVersion: "SPDX-2.3",
        dataLicense: "CC0-1.0",
        SPDXID: "SPDXRef-DOCUMENT",
        name: `${repo_full_name.split("/")[1]}-sbom`,
        documentNamespace: `https://shieldai.app/sbom/${repo_full_name}/${Date.now()}`,
        creationInfo: {
          created: now,
          creators: ["Tool: ShieldAI SBOM Generator-1.0.0"]
        },
        packages: components.map((c, i) => ({
          SPDXID: `SPDXRef-Package-${i}`,
          name: c.name,
          versionInfo: c.version,
          downloadLocation: `https://www.npmjs.com/package/${c.name}`,
          externalRefs: [{ referenceCategory: "PACKAGE-MANAGER", referenceType: "purl", referenceLocator: c.purl }],
          ...(c.vulnerabilities_count ? { comment: `${c.vulnerabilities_count} known vulnerabilities` } : {})
        }))
      };
    }

    return Response.json({
      success: true,
      repo: repo_full_name,
      format,
      generated_at: now,
      component_count: components.length,
      vulnerability_count: vulnerabilities.length,
      sbom,
    });

  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
