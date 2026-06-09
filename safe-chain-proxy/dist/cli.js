#!/usr/bin/env node
"use strict";
/**
 * ShieldAI Safe Chain CLI
 * Usage:
 *   npx @shieldai/safe-chain check lodash
 *   npx @shieldai/safe-chain check lodash@4.17.15
 *   npx @shieldai/safe-chain audit          # scans package-lock.json
 *   npx @shieldai/safe-chain audit --file requirements.txt --type pip
 *
 * Add to package.json to block installs automatically:
 *   "preinstall": "npx @shieldai/safe-chain check $npm_package_name"
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const https = __importStar(require("https"));
const API = process.env.SHIELD_SAFE_CHAIN_ENDPOINT
    || "https://app.base44.com/api/functions/shieldSafeChain";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";
async function apiCall(payload) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const url = new URL(API);
        const opts = {
            hostname: url.hostname, path: url.pathname + url.search,
            method: "POST", headers: { "Content-Type": "application/json", "Content-Length": body.length },
        };
        const req = https.request(opts, (res) => {
            let data = "";
            res.on("data", (chunk) => data += chunk);
            res.on("end", () => { try {
                resolve(JSON.parse(data));
            }
            catch (e) {
                reject(e);
            } });
        });
        req.on("error", reject);
        req.write(body);
        req.end();
    });
}
function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    return dp[m][n];
}
const POPULAR = ["react", "lodash", "express", "axios", "typescript", "webpack", "vue", "angular", "next", "jquery", "moment", "chalk", "uuid", "dotenv", "eslint", "prettier", "jest", "babel", "fastify", "socket.io", "mongoose", "pg", "redis", "jsonwebtoken", "bcrypt", "cors", "helmet", "morgan", "nodemailer", "sharp", "multer", "cheerio", "puppeteer", "playwright", "zod", "prisma", "drizzle-orm", "kysely", "turbo", "vite", "rollup", "esbuild", "swc", "nx", "vitest", "playwright", "storybook"];
function quickCheck(pkgName) {
    for (const p of POPULAR) {
        const d = levenshtein(pkgName.toLowerCase(), p.toLowerCase());
        if (d === 1 && pkgName.toLowerCase() !== p.toLowerCase()) {
            return { verdict: "BLOCKED", reason: `Typosquatting: '${pkgName}' is 1 char from '${p}'` };
        }
    }
    return null;
}
async function checkCommand(args) {
    var _a, _b, _c, _d, _e, _f;
    const rawPkg = args[0];
    if (!rawPkg) {
        console.error(`${RED}Usage: safe-chain check <package[@version]>${RESET}`);
        process.exit(1);
    }
    const [name, version = "latest"] = rawPkg.split("@");
    // Quick local typosquat check first (no network)
    const quick = quickCheck(name);
    if (quick) {
        console.log(`\n${RED}${BOLD}🛑 BLOCKED — ${quick.reason}${RESET}\n`);
        console.log(`${YELLOW}Did you mean one of the popular packages?${RESET}`);
        console.log(`Try: npm install ${POPULAR.find(p => levenshtein(name, p) === 1)}\n`);
        process.exit(1);
    }
    console.log(`${CYAN}Checking ${name}@${version}...${RESET}`);
    try {
        const result = await apiCall({ action: "check", package_name: name, version, ecosystem: "npm" });
        const pkg = (_a = result.results) === null || _a === void 0 ? void 0 : _a[0];
        if (!pkg) {
            console.log(`${YELLOW}⚠️  No result returned${RESET}`);
            process.exit(0);
        }
        if (pkg.block) {
            console.log(`\n${RED}${BOLD}🛑 BLOCKED — ${name}@${version}${RESET}`);
            for (const issue of pkg.issues.filter((i) => i.block)) {
                console.log(`${RED}  ► ${issue.type.toUpperCase()}: ${issue.description}${RESET}`);
            }
            console.log();
            process.exit(1);
        }
        else if (!pkg.safe) {
            console.log(`\n${YELLOW}⚠️  RISKY — ${name}@${version} (score: ${pkg.risk_score})${RESET}`);
            for (const issue of pkg.issues) {
                const icon = issue.severity === "critical" ? "🔴" : issue.severity === "high" ? "🟠" : "🟡";
                console.log(`  ${icon} ${issue.type}: ${(_b = issue.description) === null || _b === void 0 ? void 0 : _b.slice(0, 120)}`);
                if (issue.fix_version)
                    console.log(`     ${GREEN}Fix: upgrade to ${issue.fix_version}${RESET}`);
            }
            console.log();
            process.exit(0); // Risky but not blocked
        }
        else {
            console.log(`\n${GREEN}${BOLD}✅ SAFE — ${name}@${version}${RESET}`);
            if ((_c = pkg.issues) === null || _c === void 0 ? void 0 : _c.length) {
                for (const issue of pkg.issues) {
                    console.log(`  🟡 Note: ${issue.cve_id || issue.type} — ${(_d = issue.description) === null || _d === void 0 ? void 0 : _d.slice(0, 100)}`);
                    if (issue.fix_version)
                        console.log(`     ${GREEN}Upgrade to ${issue.fix_version}${RESET}`);
                }
            }
            console.log(`  Published by: ${((_e = pkg.metadata) === null || _e === void 0 ? void 0 : _e.author) || "unknown"} | Versions: ${((_f = pkg.metadata) === null || _f === void 0 ? void 0 : _f.version_count) || "?"}\n`);
            process.exit(0);
        }
    }
    catch (err) {
        console.error(`${YELLOW}⚠️  Safe Chain API unavailable — proceeding (${err.message})${RESET}`);
        process.exit(0); // Fail open if API down
    }
}
async function auditCommand(args) {
    var _a;
    let filePath = "package-lock.json";
    let lockType = "npm";
    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--file" && args[i + 1]) {
            filePath = args[i + 1];
            i++;
        }
        if (args[i] === "--type" && args[i + 1]) {
            lockType = args[i + 1];
            i++;
        }
    }
    if (!fs.existsSync(filePath)) {
        // Try fallbacks
        const fallbacks = ["package-lock.json", "yarn.lock", "requirements.txt", "Pipfile.lock"];
        const found = fallbacks.find(f => fs.existsSync(f));
        if (!found) {
            console.error(`${RED}No lockfile found. Tried: ${fallbacks.join(", ")}${RESET}`);
            process.exit(0);
        }
        filePath = found;
        lockType = found.includes("requirements") || found.includes("Pipfile") ? "pip" : "npm";
    }
    const content = fs.readFileSync(filePath, "utf8");
    console.log(`${CYAN}Auditing ${filePath} (${lockType})...${RESET}`);
    try {
        const result = await apiCall({ action: "audit_lockfile", lockfile_content: content, lockfile_type: lockType });
        console.log(`\n📦 Packages checked: ${result.checked} of ${result.total_in_lockfile}`);
        console.log(`✅ Safe: ${result.safe}  ⚠️  Risky: ${result.risky}  🛑 Blocked: ${result.blocked}\n`);
        if (result.blocked > 0) {
            console.log(`${RED}${BOLD}🛑 BLOCKED PACKAGES:${RESET}`);
            for (const p of result.blocked_packages || []) {
                console.log(`  ${RED}• ${p.package}@${p.version}: ${(_a = p.reason) === null || _a === void 0 ? void 0 : _a.slice(0, 100)}${RESET}`);
            }
            console.log();
        }
        if (result.risky > 0) {
            console.log(`${YELLOW}⚠️  RISKY PACKAGES:${RESET}`);
            for (const p of result.risky_packages || []) {
                console.log(`  ${YELLOW}• ${p.package}@${p.version} (${p.issues} issues)${RESET}`);
            }
            console.log();
        }
        if (!result.safe_to_deploy) {
            console.log(`${RED}${BOLD}❌ NOT SAFE TO DEPLOY — ${result.blocked} package(s) blocked.${RESET}\n`);
            process.exit(1);
        }
        else {
            console.log(`${GREEN}${BOLD}✅ SAFE TO DEPLOY${RESET}\n`);
            process.exit(0);
        }
    }
    catch (err) {
        console.error(`${YELLOW}⚠️  API unavailable — proceeding (${err.message})${RESET}`);
        process.exit(0);
    }
}
// ── MAIN
const [, , command, ...rest] = process.argv;
if (!command || command === "help" || command === "--help") {
    console.log(`
${BOLD}ShieldAI Safe Chain${RESET} — Block malicious packages before install

${CYAN}Commands:${RESET}
  check <package[@version]>   Check a single package
  audit [--file <path>]       Audit a lockfile (auto-detects package-lock.json)
  setup                       Show integration instructions

${CYAN}Examples:${RESET}
  npx @shieldai/safe-chain check lodash
  npx @shieldai/safe-chain check lodash@4.17.15
  npx @shieldai/safe-chain audit
  npx @shieldai/safe-chain audit --file requirements.txt --type pip

${CYAN}Add to package.json (blocks installs automatically):${RESET}
  "scripts": {
    "preinstall": "npx @shieldai/safe-chain check $npm_package_name"
  }
`);
    process.exit(0);
}
if (command === "check") {
    checkCommand(rest).catch(console.error);
}
else if (command === "audit") {
    auditCommand(rest).catch(console.error);
}
else if (command === "setup") {
    console.log(`
${BOLD}Integration Options:${RESET}

${CYAN}1. Pre-install hook (package.json):${RESET}
   "scripts": { "preinstall": "npx @shieldai/safe-chain check $npm_package_name" }

${CYAN}2. GitHub Actions:${RESET}
   - name: Safe Chain Audit
     run: npx @shieldai/safe-chain audit

${CYAN}3. Pre-commit hook (.git/hooks/pre-commit):${RESET}
   npx @shieldai/safe-chain audit && echo "Safe to commit"

${CYAN}4. CI/CD exit code:${RESET}
   safe-chain audit || exit 1  # blocks pipeline if unsafe
`);
}
else {
    console.error(`${RED}Unknown command: ${command}. Run safe-chain --help${RESET}`);
    process.exit(1);
}
//# sourceMappingURL=cli.js.map