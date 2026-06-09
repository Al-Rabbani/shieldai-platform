import * as vscode from 'vscode';
import fetch from 'node-fetch';

interface Finding {
  id: string;
  file: string;
  line: number;
  column: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string; // sqli_001, xss_001, etc
  title: string;
  description: string;
  remediation: string;
  cwe?: string;
  owasp?: string;
  autoFix?: {
    title: string;
    before: string;
    after: string;
  };
}

class ShieldAIExtension {
  private context: vscode.ExtensionContext;
  private diagnosticCollection: vscode.DiagnosticCollection;
  private findingsPanel: vscode.WebviewPanel | null = null;
  private findings: Finding[] = [];
  private enabled: boolean = true;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('shieldai');

    this.registerCommands();
    this.setupFileWatchers();
    this.setupStatusBar();
  }

  private registerCommands() {
    this.context.subscriptions.push(
      vscode.commands.registerCommand('shieldai.scanFolder', () => this.scanFolder()),
      vscode.commands.registerCommand('shieldai.scanFile', () => this.scanFile()),
      vscode.commands.registerCommand('shieldai.showFindings', () => this.showFindingsPanel()),
      vscode.commands.registerCommand('shieldai.toggleEnabled', () => this.toggleEnabled()),
    );
  }

  private setupFileWatchers() {
    // Scan on file save
    const config = vscode.workspace.getConfiguration('shieldai');
    if (config.get('enableOnSave')) {
      this.context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument((doc) => {
          if (this.enabled) this.scanFile(doc);
        }),
      );
    }

    // Optional: scan on change
    if (config.get('enableOnChange')) {
      this.context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((evt) => {
          if (this.enabled) this.scanFile(evt.document);
        }),
      );
    }
  }

  private setupStatusBar() {
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBar.command = 'shieldai.showFindings';
    statusBar.text = '🛡️ ShieldAI';
    statusBar.show();

    this.context.subscriptions.push(statusBar);
  }

  private async scanFile(doc?: vscode.TextDocument) {
    const editor = doc || vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No file open to scan');
      return;
    }

    const fileName = editor.document.fileName;
    const code = editor.document.getText();
    const language = editor.document.languageId;

    vscode.window.withProgress(
      { location: vscode.ProgressLocation.Window, title: 'ShieldAI: Scanning...' },
      async () => {
        try {
          const findings = await this.analyzeCode(fileName, code, language);
          this.displayFindings(fileName, findings);
          this.findings = findings;

          const severity = findings.length > 0
            ? findings.some(f => f.severity === 'critical') ? 'critical'
            : findings.some(f => f.severity === 'high') ? 'high'
            : 'info'
            : 'info';

          const message = findings.length > 0
            ? `Found ${findings.length} issue(s): ${findings.filter(f => f.severity === 'critical').length} critical, ${findings.filter(f => f.severity === 'high').length} high`
            : 'No security issues found ✅';

          if (severity === 'critical') {
            vscode.window.showErrorMessage(message);
          } else if (severity === 'high') {
            vscode.window.showWarningMessage(message);
          } else if (findings.length > 0) {
            vscode.window.showInformationMessage(message);
          }
        } catch (err) {
          vscode.window.showErrorMessage(`ShieldAI scan failed: ${(err as Error).message}`);
        }
      },
    );
  }

  private async scanFolder() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'ShieldAI: Scanning folder...' },
      async () => {
        const files = await vscode.workspace.findFiles('**/*.{js,ts,jsx,tsx,py,java,go,rb,php,cs}', '**/node_modules/**');

        let allFindings: Finding[] = [];
        for (const file of files) {
          const doc = await vscode.workspace.openTextDocument(file);
          const findings = await this.analyzeCode(file.fsPath, doc.getText(), doc.languageId);
          allFindings.push(...findings);
          this.displayFindings(file.fsPath, findings);
        }

        this.findings = allFindings;
        this.showFindingsPanel();

        const summary = `Scanned ${files.length} files — Found ${allFindings.length} issue(s)`;
        vscode.window.showInformationMessage(summary);
      },
    );
  }

  private async analyzeCode(filePath: string, code: string, language: string): Promise<Finding[]> {
    const config = vscode.workspace.getConfiguration('shieldai');
    const apiKey = config.get<string>('apiKey');
    const backendUrl = config.get<string>('backendUrl') || 'https://api.shieldai.com';

    if (apiKey) {
      // Use backend API for analysis
      try {
        const res = await fetch(`${backendUrl}/v1/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ code, language, filePath }),
        });

        if (!res.ok) throw new Error(`API error: ${res.statusText}`);
        const result = await res.json() as any;
        return result.findings || [];
      } catch (err) {
        console.error('Backend analysis failed, falling back to local analysis');
      }
    }

    // Local SAST analysis (fallback or when no API key)
    return this.localAnalysis(code, filePath, language);
  }

  private localAnalysis(code: string, filePath: string, language: string): Finding[] {
    const findings: Finding[] = [];
    const lines = code.split('\n');

    // SQL Injection patterns
    if (['js', 'ts', 'python', 'java', 'php', 'go', 'ruby'].includes(language)) {
      const sqliPatterns = [
        /(\bOR\b|union|select|insert|update|delete|drop|execute)\s*\(/gi,
        /query\s*\(\s*[`"'].*\+/gi,
      ];

      lines.forEach((line, index) => {
        sqliPatterns.forEach((pattern) => {
          if (pattern.test(line)) {
            findings.push({
              id: `sqli_${index}`,
              file: filePath,
              line: index + 1,
              column: line.search(pattern),
              severity: 'critical',
              type: 'sqli_001',
              title: 'SQL Injection Risk',
              description: 'User input concatenated into SQL query without parameterization',
              remediation: 'Use parameterized queries (prepared statements) instead of string concatenation',
              cwe: 'CWE-89',
              owasp: 'A03:2021',
              autoFix: {
                title: 'Use parameterized query',
                before: `db.query("SELECT * FROM users WHERE id = " + userId)`,
                after: `db.query("SELECT * FROM users WHERE id = ?", [userId])`,
              },
            });
          }
        });
      });
    }

    // XSS patterns
    if (['js', 'ts', 'jsx', 'tsx'].includes(language)) {
      const xssPatterns = [
        /\.innerHTML\s*=\s*(?![`"'][^`"']*['"`])/gi,
        /dangerouslySetInnerHTML/gi,
      ];

      lines.forEach((line, index) => {
        xssPatterns.forEach((pattern) => {
          if (pattern.test(line)) {
            findings.push({
              id: `xss_${index}`,
              file: filePath,
              line: index + 1,
              column: line.search(pattern),
              severity: 'high',
              type: 'xss_001',
              title: 'Cross-Site Scripting (XSS)',
              description: 'User input reflected into HTML without sanitization',
              remediation: 'Use textContent instead of innerHTML, or sanitize with DOMPurify',
              cwe: 'CWE-79',
              owasp: 'A03:2021',
            });
          }
        });
      });
    }

    // Hardcoded secrets
    const secretPatterns = [
      /(?:api_?key|password|passwd|secret|token|auth)\s*[:=]\s*["'][^"']{8,}["']/gi,
      /AKIA[0-9A-Z]{16}|sk_live_[0-9a-zA-Z]{24}/g,
      /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY/gi,
    ];

    lines.forEach((line, index) => {
      secretPatterns.forEach((pattern) => {
        if (pattern.test(line)) {
          findings.push({
            id: `secret_${index}`,
            file: filePath,
            line: index + 1,
            column: line.search(pattern),
            severity: 'critical',
            type: 'secret_001',
            title: 'Hardcoded Secret/Credential',
            description: 'API key, password, or private key exposed in source code',
            remediation: 'Move to environment variables or secret management service (AWS Secrets Manager, HashiCorp Vault)',
            cwe: 'CWE-798',
            owasp: 'A07:2021',
          });
        }
      });
    });

    return findings;
  }

  private displayFindings(filePath: string, findings: Finding[]) {
    const diagnostics: vscode.Diagnostic[] = findings.map((finding) => {
      const severity =
        finding.severity === 'critical' ? vscode.DiagnosticSeverity.Error
        : finding.severity === 'high' ? vscode.DiagnosticSeverity.Warning
        : vscode.DiagnosticSeverity.Information;

      const range = new vscode.Range(
        new vscode.Position(finding.line - 1, finding.column),
        new vscode.Position(finding.line - 1, finding.column + 50),
      );

      const diag = new vscode.Diagnostic(range, finding.description, severity);
      diag.code = finding.type;
      diag.source = 'ShieldAI';
      diag.relatedInformation = [
        new vscode.DiagnosticRelatedInformation(
          new vscode.Location(vscode.Uri.file(filePath), range),
          `${finding.cwe} / ${finding.owasp}`,
        ),
      ];

      return diag;
    });

    this.diagnosticCollection.set(vscode.Uri.file(filePath), diagnostics);
  }

  private showFindingsPanel() {
    if (!this.findingsPanel) {
      this.findingsPanel = vscode.window.createWebviewPanel(
        'shieldai-findings',
        'ShieldAI Findings',
        vscode.ViewColumn.Two,
        { enableScripts: true },
      );
    }

    const findings = this.findings;
    const byFile = new Map<string, Finding[]>();
    findings.forEach((f) => {
      if (!byFile.has(f.file)) byFile.set(f.file, []);
      byFile.get(f.file)!.push(f);
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; background: #1e1e1e; color: #ccc; }
          h1 { color: #fff; margin: 0 0 10px; }
          .summary { background: #2d2d30; padding: 10px; margin: 10px 0; border-radius: 4px; }
          .file { background: #252526; padding: 10px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #007acc; }
          .finding { background: #1e1e1e; padding: 10px; margin: 5px 0; border-radius: 3px; border-left: 3px solid #ff6b6b; }
          .finding.high { border-left-color: #ffa500; }
          .finding.medium { border-left-color: #ffd700; }
          .finding.low { border-left-color: #90ee90; }
          .title { font-weight: bold; margin: 5px 0; }
          .description { font-size: 12px; color: #aaa; }
          .remediation { background: #2d2d30; padding: 8px; margin: 5px 0; font-size: 12px; border-radius: 3px; }
          .tag { display: inline-block; font-size: 10px; padding: 2px 6px; margin: 2px; border-radius: 3px; background: #444; }
          .critical { background: #f44747; color: white; }
          .high { background: #ffa500; color: white; }
        </style>
      </head>
      <body>
        <h1>🛡️ ShieldAI Findings</h1>
        <div class="summary">
          <strong>Total Issues:</strong> ${findings.length} | 
          <strong>Critical:</strong> ${findings.filter(f => f.severity === 'critical').length} | 
          <strong>High:</strong> ${findings.filter(f => f.severity === 'high').length} | 
          <strong>Medium:</strong> ${findings.filter(f => f.severity === 'medium').length}
        </div>

        ${Array.from(byFile.entries())
          .map(
            ([file, fileFindings]) => `
          <div class="file">
            <strong>${file}</strong> (${fileFindings.length} issue${fileFindings.length !== 1 ? 's' : ''})
            ${fileFindings
              .map(
                (f) => `
              <div class="finding ${f.severity}">
                <div class="title">
                  Line ${f.line}: ${f.title}
                  <span class="tag critical" style="background: ${f.severity === 'critical' ? '#f44747' : f.severity === 'high' ? '#ffa500' : '#ffd700'}; color: white;">
                    ${f.severity.toUpperCase()}
                  </span>
                </div>
                <div class="description">${f.description}</div>
                <div class="remediation"><strong>Fix:</strong> ${f.remediation}</div>
                <div><small>${f.cwe} / ${f.owasp}</small></div>
              </div>
            `,
              )
              .join('')}
          </div>
        `,
          )
          .join('')}
      </body>
      </html>
    `;

    this.findingsPanel.webview.html = html;
  }

  private toggleEnabled() {
    this.enabled = !this.enabled;
    vscode.window.showInformationMessage(`ShieldAI is now ${this.enabled ? 'enabled' : 'disabled'}`);
  }
}

export function activate(context: vscode.ExtensionContext) {
  new ShieldAIExtension(context);
}

export function deactivate() {}
