/**
 * ShieldAI Security Scanner — VS Code Extension
 * Inline SAST diagnostics, Safe Chain package checks, AutoFix PRs
 */

import * as vscode from "vscode";
import * as https from "https";
import * as path from "path";

const EXTENSION_ID = "shieldai";
const DIAG_COLLECTION_NAME = "ShieldAI";
const SUPPORTED_LANGUAGES = ["javascript", "typescript", "python", "java", "go", "php", "ruby"];

// ── API CLIENT
async function apiCall(functionName: string, payload: object): Promise<any> {
  const config = vscode.workspace.getConfiguration(EXTENSION_ID);
  const endpoint = config.get<string>("endpoint") || "https://app.base44.com/api/functions";
  const token = config.get<string>("apiToken") || "";

  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const url = new URL(`${endpoint}/${functionName}`);
    const opts = {
      hostname: url.hostname,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
    };

    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Parse error: ${data.slice(0, 100)}`)); }
      });
    });
    req.on("error", reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error("Timeout")); });
    req.write(body);
    req.end();
  });
}

// ── SEVERITY → VSCODE SEVERITY
function toVscodeSeverity(sev: string): vscode.DiagnosticSeverity {
  switch (sev?.toLowerCase()) {
    case "critical":
    case "high":
      return vscode.DiagnosticSeverity.Error;
    case "medium":
      return vscode.DiagnosticSeverity.Warning;
    default:
      return vscode.DiagnosticSeverity.Information;
  }
}

// ── SCAN A FILE AND CREATE DIAGNOSTICS
async function scanFile(
  document: vscode.TextDocument,
  diagnostics: vscode.DiagnosticCollection,
  statusBar: vscode.StatusBarItem
): Promise<void> {
  const config = vscode.workspace.getConfiguration(EXTENSION_ID);
  const threshold = config.get<string>("severityThreshold") || "high";
  const THRESHOLD_ORDER = ["critical", "high", "medium", "low"];
  const thresholdIndex = THRESHOLD_ORDER.indexOf(threshold);

  statusBar.text = "$(shield~spin) ShieldAI: Scanning...";
  statusBar.show();

  const lang = document.languageId;
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    statusBar.text = "$(shield) ShieldAI";
    return;
  }

  try {
    const result = await apiCall("shieldAISAST", {
      content: document.getText(),
      language: lang,
      filename: path.basename(document.fileName),
      ai_review: true,
    });

    const diags: vscode.Diagnostic[] = [];
    const findings = result.findings || [];

    for (const f of findings) {
      const sevIndex = THRESHOLD_ORDER.indexOf(f.severity?.toLowerCase());
      if (sevIndex > thresholdIndex) continue; // Below threshold

      // Find the line in document
      const lineNum = Math.max(0, (f.line || 1) - 1);
      const line = document.lineAt(Math.min(lineNum, document.lineCount - 1));
      const range = new vscode.Range(
        line.range.start,
        line.range.end
      );

      const diag = new vscode.Diagnostic(
        range,
        `${f.title || f.type}: ${f.description || "Security finding"}${f.cve_id ? ` (${f.cve_id})` : ""}`,
        toVscodeSeverity(f.severity)
      );
      diag.source = "ShieldAI";
      diag.code = {
        value: f.cwe || f.type || "VULN",
        target: vscode.Uri.parse(`https://cwe.mitre.org/data/definitions/${(f.cwe || "").replace("CWE-", "")}.html`),
      };
      // Store finding data for code actions
      (diag as any).shieldFinding = f;
      diags.push(diag);
    }

    diagnostics.set(document.uri, diags);

    const critCount = diags.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
    statusBar.text = critCount > 0
      ? `$(shield) ShieldAI: ${critCount} issue${critCount !== 1 ? "s" : ""}`
      : "$(shield) ShieldAI: ✓ Clean";
    statusBar.show();

    if (findings.length > 0) {
      vscode.window.showInformationMessage(
        `ShieldAI found ${diags.length} issue(s) in ${path.basename(document.fileName)}`,
        "View Findings",
        "Dismiss"
      ).then(action => {
        if (action === "View Findings") {
          vscode.commands.executeCommand("shieldai.showFindings");
        }
      });
    }
  } catch (err: any) {
    statusBar.text = "$(shield) ShieldAI";
    console.error("ShieldAI scan error:", err.message);
  }
}

// ── SAFE CHAIN: Check packages in package.json / requirements.txt
async function checkPackageSafety(document: vscode.TextDocument): Promise<void> {
  const config = vscode.workspace.getConfiguration(EXTENSION_ID);
  if (!config.get<boolean>("enableSafeChain")) return;

  const fileName = path.basename(document.fileName);
  if (!["package.json", "requirements.txt", "Pipfile"].includes(fileName)) return;

  const isNode = fileName === "package.json";
  const lockType = isNode ? "npm" : "pip";

  try {
    const result = await apiCall("shieldSafeChain", {
      action: "audit_lockfile",
      lockfile_content: document.getText(),
      lockfile_type: lockType,
    });

    if (result.blocked > 0) {
      const blocked = result.blocked_packages || [];
      const msg = `🛑 ShieldAI Safe Chain: ${result.blocked} BLOCKED package(s) in ${fileName}!`;
      vscode.window.showErrorMessage(msg, "View Details").then(action => {
        if (action === "View Details") {
          const detail = blocked.map((p: any) => `• ${p.package}@${p.version}: ${p.reason}`).join("\n");
          vscode.window.showErrorMessage(`Blocked packages:\n${detail}`);
        }
      });
    } else if (result.risky > 0) {
      vscode.window.showWarningMessage(
        `⚠️ ShieldAI: ${result.risky} risky package(s) found in ${fileName}. Check dashboard for details.`
      );
    }
  } catch (_) {
    // Silently fail — don't disrupt dev workflow
  }
}

// ── AUTOFIX CODE ACTION PROVIDER
class ShieldAutoFixProvider implements vscode.CodeActionProvider {
  static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const config = vscode.workspace.getConfiguration(EXTENSION_ID);
    if (!config.get<boolean>("enableAutoFix")) return [];
    if (!config.get<string>("githubToken")) return [];

    return context.diagnostics
      .filter(d => d.source === "ShieldAI")
      .map(diag => {
        const action = new vscode.CodeAction(
          `🛡️ ShieldAI AutoFix: Create GitHub PR`,
          vscode.CodeActionKind.QuickFix
        );
        action.command = {
          command: "shieldai.autoFix",
          title: "ShieldAI AutoFix",
          arguments: [document.uri, diag],
        };
        action.diagnostics = [diag];
        action.isPreferred = false;
        return action;
      });
  }
}

// ── FINDINGS TREE VIEW
class FindingsTreeProvider implements vscode.TreeDataProvider<FindingItem> {
  private _findings: any[] = [];
  private _onDidChange = new vscode.EventEmitter<FindingItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  update(findings: any[]) {
    this._findings = findings;
    this._onDidChange.fire(undefined);
  }

  getTreeItem(el: FindingItem): vscode.TreeItem {
    return el;
  }

  getChildren(el?: FindingItem): FindingItem[] {
    if (!el) {
      return this._findings.map(f => new FindingItem(
        f.title || f.type,
        f.severity,
        f.file || "unknown",
        f.line || 0,
        f.description || "",
        vscode.TreeItemCollapsibleState.None
      ));
    }
    return [];
  }
}

class FindingItem extends vscode.TreeItem {
  constructor(
    label: string,
    severity: string,
    public readonly file: string,
    public readonly line: number,
    public readonly description: string,
    collapsible: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsible);
    const icons: Record<string, string> = {
      critical: "$(error)", high: "$(error)", medium: "$(warning)", low: "$(info)"
    };
    this.iconPath = new vscode.ThemeIcon(
      severity === "critical" || severity === "high" ? "error" : severity === "medium" ? "warning" : "info"
    );
    this.tooltip = `${severity.toUpperCase()}: ${description}`;
    this.description = `${severity} | ${file}:${line}`;
  }
}

// ── EXTENSION ACTIVATION
export function activate(context: vscode.ExtensionContext) {
  const diagnostics = vscode.languages.createDiagnosticCollection(DIAG_COLLECTION_NAME);
  const findingsProvider = new FindingsTreeProvider();

  // Status bar
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.text = "$(shield) ShieldAI";
  statusBar.tooltip = "ShieldAI Security Scanner";
  statusBar.command = "shieldai.showFindings";
  statusBar.show();

  // Tree view
  vscode.window.createTreeView("shieldai.findingsView", {
    treeDataProvider: findingsProvider,
    showCollapseAll: true,
  });

  // ── COMMANDS

  context.subscriptions.push(
    vscode.commands.registerCommand("shieldai.scanFile", async () => {
      const doc = vscode.window.activeTextEditor?.document;
      if (!doc) return;
      await scanFile(doc, diagnostics, statusBar);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("shieldai.scanWorkspace", async () => {
      const files = await vscode.workspace.findFiles(
        "**/*.{js,ts,py,java,go,php,rb}",
        "**/node_modules/**"
      );
      vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: "ShieldAI: Scanning workspace..." },
        async (progress) => {
          for (let i = 0; i < files.length; i++) {
            progress.report({ increment: (100 / files.length), message: files[i].fsPath.split("/").pop() });
            const doc = await vscode.workspace.openTextDocument(files[i]);
            await scanFile(doc, diagnostics, statusBar);
          }
        }
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("shieldai.checkPackage", async () => {
      const pkg = await vscode.window.showInputBox({
        prompt: "Enter package name (e.g. lodash or lodash@4.17.15)",
        placeHolder: "package-name[@version]",
      });
      if (!pkg) return;
      const [name, version = "latest"] = pkg.split("@");
      try {
        const result = await apiCall("shieldSafeChain", { action: "check", package_name: name, version });
        const r = result.results?.[0];
        if (r?.block) {
          vscode.window.showErrorMessage(`🛑 BLOCKED: ${name}@${version} — ${r.issues[0]?.description}`);
        } else if (r && !r.safe) {
          vscode.window.showWarningMessage(`⚠️ RISKY: ${name}@${version} — ${r.issues.length} issue(s). Risk score: ${r.risk_score}`);
        } else {
          vscode.window.showInformationMessage(`✅ SAFE: ${name}@${version} — No blocking issues found`);
        }
      } catch (err: any) {
        vscode.window.showErrorMessage(`ShieldAI: API error — ${err.message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("shieldai.autoFix", async (uri: vscode.Uri, diag: vscode.Diagnostic) => {
      const config = vscode.workspace.getConfiguration(EXTENSION_ID);
      const githubToken = config.get<string>("githubToken");
      if (!githubToken) {
        const action = await vscode.window.showWarningMessage(
          "ShieldAI AutoFix requires a GitHub token. Add it in settings.",
          "Open Settings"
        );
        if (action === "Open Settings") {
          vscode.commands.executeCommand("workbench.action.openSettings", "shieldai.githubToken");
        }
        return;
      }
      vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: "ShieldAI: Creating AutoFix PR..." },
        async () => {
          try {
            const result = await apiCall("shieldAutoFix", {
              finding: (diag as any).shieldFinding,
              github_token: githubToken,
              repo: vscode.workspace.workspaceFolders?.[0]?.name || "unknown",
            });
            if (result.pr_url) {
              const action = await vscode.window.showInformationMessage(
                `✅ AutoFix PR created!`,
                "Open PR"
              );
              if (action === "Open PR") {
                vscode.env.openExternal(vscode.Uri.parse(result.pr_url));
              }
            }
          } catch (err: any) {
            vscode.window.showErrorMessage(`AutoFix failed: ${err.message}`);
          }
        }
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("shieldai.showFindings", () => {
      vscode.commands.executeCommand("shieldai.findingsView.focus");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("shieldai.configure", () => {
      vscode.commands.executeCommand("workbench.action.openSettings", "shieldai");
    })
  );

  // ── AUTO-SCAN ON SAVE
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (doc) => {
      const config = vscode.workspace.getConfiguration(EXTENSION_ID);
      if (!config.get<boolean>("scanOnSave")) return;
      if (SUPPORTED_LANGUAGES.includes(doc.languageId)) {
        await scanFile(doc, diagnostics, statusBar);
      }
      await checkPackageSafety(doc);
    })
  );

  // ── SAFE CHAIN ON EDIT (debounced)
  let safeChainTimer: NodeJS.Timeout;
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      const fileName = path.basename(e.document.fileName);
      if (["package.json", "requirements.txt"].includes(fileName)) {
        clearTimeout(safeChainTimer);
        safeChainTimer = setTimeout(() => checkPackageSafety(e.document), 2000);
      }
    })
  );

  // ── REGISTER CODE ACTION PROVIDER
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      SUPPORTED_LANGUAGES.map(lang => ({ language: lang })),
      new ShieldAutoFixProvider(),
      { providedCodeActionKinds: ShieldAutoFixProvider.providedCodeActionKinds }
    )
  );

  context.subscriptions.push(diagnostics, statusBar);

  // Check token on startup
  const config = vscode.workspace.getConfiguration(EXTENSION_ID);
  if (!config.get<string>("apiToken")) {
    vscode.window.showInformationMessage(
      "ShieldAI: Add your API token to enable security scanning.",
      "Configure Now",
      "Get Token"
    ).then(action => {
      if (action === "Configure Now") vscode.commands.executeCommand("shieldai.configure");
      if (action === "Get Token") vscode.env.openExternal(vscode.Uri.parse("https://shieldai.dev"));
    });
  }
}

export function deactivate() {}
