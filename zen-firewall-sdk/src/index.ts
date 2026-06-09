// ShieldAI Zen Firewall SDK v1.0.0
// Production-grade runtime protection middleware
// Detects and blocks: SQLi, XSS, path traversal, SSRF, XXE, command injection, rate limit abuse, bot attacks

import { Request, Response, NextFunction } from 'express';

export interface ZenConfig {
  enabled?: boolean;
  mode?: 'block' | 'monitor'; // 'block' stops attack, 'monitor' logs only
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  webhookUrl?: string; // Send findings to ShieldAI backend
  apiKey?: string; // ShieldAI API key for webhook auth
  allowedOrigins?: string[];
  rateLimit?: {
    enabled: boolean;
    windowMs: number; // 60000 = 1 minute
    maxRequests: number; // max requests per window
    keyGenerator?: (req: Request) => string; // custom key (default: IP)
  };
  skipPaths?: string[]; // paths to skip protection (e.g. /health, /metrics)
  customRules?: Rule[];
}

export interface Rule {
  id: string;
  name: string;
  pattern: RegExp | string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'block' | 'monitor' | 'custom';
  checkLocations: ('body' | 'query' | 'headers' | 'path' | 'cookies')[];
}

export interface ThreatEvent {
  id: string;
  timestamp: string;
  threat_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  endpoint: string;
  method: string;
  source_ip: string;
  user_agent: string;
  payload: string;
  rule_triggered: string;
  action_taken: 'blocked' | 'monitored';
  response_time_ms: number;
  country?: string; // from IP geolocation
  fingerprint?: string; // bot fingerprint
}

class ZenFirewall {
  private config: ZenConfig;
  private threatLog: ThreatEvent[] = [];
  private rateLimitTracker: Map<string, { count: number; resetTime: number }> = new Map();

  // ── BUILT-IN DETECTION RULES
  private readonly DETECTION_RULES: Rule[] = [
    // SQL Injection
    {
      id: 'sqli_001',
      name: 'SQL Injection — OR Clause',
      pattern: /(\bOR\b|union|select|insert|update|delete|drop|exec|execute)/i,
      severity: 'critical',
      action: 'block',
      checkLocations: ['body', 'query', 'path'],
    },
    {
      id: 'sqli_002',
      name: 'SQL Injection — Comment Escape',
      pattern: /(--|#|\/\*|\*\/|xp_|sp_)/,
      severity: 'critical',
      action: 'block',
      checkLocations: ['body', 'query'],
    },
    // Cross-Site Scripting (XSS)
    {
      id: 'xss_001',
      name: 'XSS — Script Tag Injection',
      pattern: /<script[^>]*>|javascript:|onerror=|onload=|onclick=/i,
      severity: 'high',
      action: 'block',
      checkLocations: ['body', 'query', 'path'],
    },
    {
      id: 'xss_002',
      name: 'XSS — Event Handler Injection',
      pattern: /on\w+\s*=|<iframe|<embed|<object/i,
      severity: 'high',
      action: 'block',
      checkLocations: ['body', 'query'],
    },
    // Path Traversal
    {
      id: 'pt_001',
      name: 'Path Traversal — Directory Escape',
      pattern: /\.\.\%2f|\.\.\\/,
      severity: 'high',
      action: 'block',
      checkLocations: ['path', 'query'],
    },
    {
      id: 'pt_002',
      name: 'Path Traversal — Null Byte Injection',
      pattern: /%00|\\x00/,
      severity: 'high',
      action: 'block',
      checkLocations: ['path', 'query'],
    },
    // Server-Side Request Forgery (SSRF)
    {
      id: 'ssrf_001',
      name: 'SSRF — Local Network Access Attempt',
      pattern: /(localhost|127\.0\.0\.1|192\.168|10\.0|172\.1[6-9]|169\.254|0\.0\.0\.0)/,
      severity: 'critical',
      action: 'block',
      checkLocations: ['body', 'query'],
    },
    {
      id: 'ssrf_002',
      name: 'SSRF — Metadata Service Access',
      pattern: /(metadata\.google|169\.254\.169\.254|ec2\.amazonaws|vault\.hashicorp)/i,
      severity: 'critical',
      action: 'block',
      checkLocations: ['body', 'query'],
    },
    // Command Injection
    {
      id: 'cmd_001',
      name: 'Command Injection — Shell Metacharacters',
      pattern: /[;&|`$(){}[\]<>\\]/,
      severity: 'critical',
      action: 'block',
      checkLocations: ['body', 'query'],
    },
    // XXE (XML External Entity)
    {
      id: 'xxe_001',
      name: 'XXE — DOCTYPE Declaration',
      pattern: /<!DOCTYPE|<!ENTITY/i,
      severity: 'high',
      action: 'block',
      checkLocations: ['body'],
    },
    // Bot / Automated Attack Detection
    {
      id: 'bot_001',
      name: 'Bot — Scanning User Agent',
      pattern: /(sqlmap|nikto|nmap|masscan|nessus|scanner|crawler|bot|spider)/i,
      severity: 'medium',
      action: 'monitor',
      checkLocations: ['headers'],
    },
  ];

  constructor(config: ZenConfig = {}) {
    this.config = {
      enabled: true,
      mode: 'block',
      logLevel: 'info',
      rateLimit: { enabled: true, windowMs: 60000, maxRequests: 100 },
      skipPaths: ['/health', '/metrics', '/status'],
      ...config,
    };

    if (config.customRules) {
      this.DETECTION_RULES.push(...config.customRules);
    }
  }

  // ── MIDDLEWARE FACTORY
  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enabled) return next();
      if (this.config.skipPaths?.some(p => req.path.startsWith(p))) return next();

      const startTime = Date.now();
      let threatDetected: ThreatEvent | null = null;

      // Rate limiting check
      if (this.config.rateLimit?.enabled) {
        const key = this.config.rateLimit.keyGenerator?.(req) || req.ip || 'unknown';
        const now = Date.now();
        const tracker = this.rateLimitTracker.get(key) || { count: 0, resetTime: now + this.config.rateLimit.windowMs };

        if (now > tracker.resetTime) {
          tracker.count = 0;
          tracker.resetTime = now + this.config.rateLimit.windowMs;
        }

        tracker.count++;
        this.rateLimitTracker.set(key, tracker);

        if (tracker.count > (this.config.rateLimit.maxRequests || 100)) {
          threatDetected = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            threat_type: 'rate_limit_abuse',
            severity: 'medium',
            endpoint: req.path,
            method: req.method,
            source_ip: req.ip || 'unknown',
            user_agent: req.get('user-agent') || 'unknown',
            payload: `${tracker.count} requests in ${this.config.rateLimit.windowMs}ms`,
            rule_triggered: 'rate_limit_exceeded',
            action_taken: this.config.mode === 'block' ? 'blocked' : 'monitored',
            response_time_ms: Date.now() - startTime,
          };
        }
      }

      // Pattern-based threat detection
      if (!threatDetected) {
        for (const rule of this.DETECTION_RULES) {
          const pattern = typeof rule.pattern === 'string' ? new RegExp(rule.pattern) : rule.pattern;
          let matched = false;

          if (rule.checkLocations.includes('body') && req.body) {
            matched = this.checkValue(JSON.stringify(req.body), pattern);
          }
          if (!matched && rule.checkLocations.includes('query') && req.query) {
            matched = this.checkValue(JSON.stringify(req.query), pattern);
          }
          if (!matched && rule.checkLocations.includes('path')) {
            matched = this.checkValue(req.path, pattern);
          }
          if (!matched && rule.checkLocations.includes('headers')) {
            matched = this.checkValue(JSON.stringify(req.headers), pattern);
          }

          if (matched) {
            threatDetected = {
              id: this.generateId(),
              timestamp: new Date().toISOString(),
              threat_type: rule.id,
              severity: rule.severity,
              endpoint: req.path,
              method: req.method,
              source_ip: req.ip || 'unknown',
              user_agent: req.get('user-agent') || 'unknown',
              payload: this.sanitizePayload(JSON.stringify(req.body || req.query || {})),
              rule_triggered: rule.name,
              action_taken: this.config.mode === 'block' ? 'blocked' : 'monitored',
              response_time_ms: Date.now() - startTime,
            };
            break;
          }
        }
      }

      // Log threat event
      if (threatDetected) {
        this.logThreat(threatDetected);
        this.sendToWebhook(threatDetected);

        if (this.config.mode === 'block') {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Request blocked by Zen Firewall',
            threat_id: threatDetected.id,
            timestamp: threatDetected.timestamp,
          });
        }
      }

      next();
    };
  }

  // ── HELPER METHODS
  private checkValue(value: string, pattern: RegExp): boolean {
    try {
      return pattern.test(value);
    } catch {
      return false;
    }
  }

  private sanitizePayload(payload: string): string {
    return payload.length > 500 ? payload.slice(0, 500) + '...' : payload;
  }

  private generateId(): string {
    return `zen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logThreat(event: ThreatEvent): void {
    this.threatLog.push(event);
    const logFn = console[this.config.logLevel || 'info'];
    logFn(`[ZenFirewall] ${event.severity.toUpperCase()} — ${event.threat_type} from ${event.source_ip}`);
  }

  private async sendToWebhook(event: ThreatEvent): Promise<void> {
    if (!this.config.webhookUrl) return;

    try {
      await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey || ''}`,
        },
        body: JSON.stringify(event),
      });
    } catch (err) {
      console.error('[ZenFirewall] Webhook send failed:', err);
    }
  }

  public getThreatLog(): ThreatEvent[] {
    return this.threatLog;
  }

  public getStats() {
    return {
      total_threats_detected: this.threatLog.length,
      critical: this.threatLog.filter(t => t.severity === 'critical').length,
      high: this.threatLog.filter(t => t.severity === 'high').length,
      medium: this.threatLog.filter(t => t.severity === 'medium').length,
      low: this.threatLog.filter(t => t.severity === 'low').length,
      threats_blocked: this.threatLog.filter(t => t.action_taken === 'blocked').length,
    };
  }
}

export default ZenFirewall;
