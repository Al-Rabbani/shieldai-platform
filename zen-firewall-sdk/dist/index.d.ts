/**
 * @shieldai/zen — Runtime Application Self-Protection (RASP) Middleware
 * Blocks SQLi, XSS, Path Traversal, Command Injection, SSRF, Prototype Pollution
 * Zero production dependencies. <1ms overhead. Reports to ShieldAI dashboard.
 *
 * Quick start:
 *   npm install @shieldai/zen
 *
 *   // Express
 *   const { zen } = require('@shieldai/zen');
 *   app.use(zen({ token: process.env.SHIELD_ZEN_TOKEN }));
 *
 *   // FastAPI (Python): pip install shieldai-zen
 */
declare const RULES: Record<string, RegExp[]>;
export interface ZenOptions {
    /** Your ShieldAI token — get one at shieldai.dev */
    token?: string;
    /** "block" (default) | "monitor" (log only, never block) */
    mode?: "block" | "monitor";
    /** Minimum risk score to block (0–100). Default: 60 */
    threshold?: number;
    /** Your app name — shows in ShieldAI dashboard */
    appName?: string;
    /** ShieldAI report endpoint override */
    reportEndpoint?: string;
    /** Categories to enable. Default: all */
    rules?: Array<keyof typeof RULES>;
    /** Custom allowlist patterns (regex strings) */
    allowlist?: string[];
}
export interface ThreatEvent {
    threat_type: string;
    severity: "critical" | "high" | "medium";
    param: string;
    value_snippet: string;
    risk_score: number;
    source_ip?: string;
    endpoint?: string;
    method?: string;
    matched_rule?: string;
    action_taken: "blocked" | "logged";
    detected_at: string;
}
declare function scan(value: string, enabledRules: string[]): {
    risk: number;
    type: string;
    matched: string;
} | null;
export declare function zen(options?: ZenOptions): (req: any, res: any, next: any) => void;
export declare function scanValue(value: string, rules?: Array<keyof typeof RULES>): ReturnType<typeof scan>;
export declare function zenFastify(options?: ZenOptions): (fastify: any, _opts: any, done: any) => void;
declare const _default: {
    zen: typeof zen;
    scanValue: typeof scanValue;
    zenFastify: typeof zenFastify;
};
export default _default;
//# sourceMappingURL=index.d.ts.map