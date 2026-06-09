#!/usr/bin/env node
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
export {};
