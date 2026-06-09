# ShieldAI VS Code Extension — Architecture

## Package: shieldai-vscode
## Publisher: shieldai
## Display Name: ShieldAI Security Scanner

### Key Features
1. Inline security diagnostics (red/yellow squiggles on vulnerable code)
2. Hover tooltips with CVE details + remediation
3. Sidebar panel with all findings
4. "Run Scan" command from Command Palette
5. AutoFix code actions (lightbulb)
6. Safe Chain check on package.json save

### Extension Entry Points
- contributes.commands: ShieldAI: Scan Current File, ShieldAI: Scan Workspace, ShieldAI: Show Findings
- contributes.diagnosticCollection: shieldai
- contributes.languages: all
- contributes.configuration: shieldai.apiToken, shieldai.mode, shieldai.severityThreshold

### API Integration
- Calls shieldAISAST with file content + language
- Calls shieldSafeChain on package.json changes
- Calls shieldAutoFix for code action fixes
