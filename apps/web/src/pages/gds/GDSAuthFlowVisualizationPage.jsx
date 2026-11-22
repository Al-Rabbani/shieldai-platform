import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  Shield, AlertTriangle, CheckCircle, X, Eye, Key, Lock, 
  Smartphone, Clock, AlertCircle, TrendingUp, Activity
} from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Card, Breadcrumb, AnimatedArc
} from "@/components/gds/GDSOSShared";
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";


export default function GDSAuthFlowVisualizationPage() {
  const [selectedApp, setSelectedApp] = useState("all");
  const [selectedFlowType, setSelectedFlowType] = useState("all");

  const { data: authFlows = [], isLoading } = useQuery({
    queryKey: ["auth-flows-viz"],
    queryFn: () => base44.entities.AuthenticationFlow.list("-risk_score", 200).catch(() => []),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["session-records"],
    queryFn: () => base44.entities.SessionRecord.list("-last_analyzed", 200).catch(() => []),
  });

  const { data: headers = [] } = useQuery({
    queryKey: ["security-headers"],
    queryFn: () => base44.entities.SecurityHeader.list("-last_scanned", 200).catch(() => []),
  });

  // Calculate risk distribution
  const riskDistribution = authFlows.reduce((acc, flow) => {
    const grade = flow.risk_grade || 'C';
    acc[grade] = (acc[grade] || 0) + 1;
    return acc;
  }, {});

  const riskChartData = Object.entries(riskDistribution).map(([grade, count]) => ({
    grade,
    count,
    color: grade === 'A' ? LOW : grade === 'B' ? CYAN : grade === 'C' ? MEDIUM : grade === 'D' ? HIGH : DANGER
  }));

  // Security weak points analysis
  const weakPoints = authFlows.filter(flow => {
    const hasWeakness = !flow.mfa_enabled || 
                        !flow.brute_force_protection || 
                        !flow.account_lockout ||
                        flow.username_enumerable ||
                        !flow.captcha_enabled;
    return hasWeakness;
  });

  // Missing security headers by app
  const appHeaders = headers.reduce((acc, header) => {
    const appName = header.app_name || 'Unknown';
    if (!acc[appName]) acc[appName] = { missing: [], grade: header.overall_grade };
    if (!header.hsts_enabled) acc[appName].missing.push('HSTS');
    if (!header.csp_enabled) acc[appName].missing.push('CSP');
    if (!header.x_frame_options) acc[appName].missing.push('X-Frame-Options');
    if (!header.x_content_type_options) acc[appName].missing.push('X-Content-Type-Options');
    return acc;
  }, {});

  const stats = {
    total: authFlows.length,
    highRisk: authFlows.filter(f => f.risk_grade === 'F' || f.risk_grade === 'D').length,
    noMFA: authFlows.filter(f => !f.mfa_enabled).length,
    bruteForceVuln: authFlows.filter(f => !f.brute_force_protection).length,
    usernameEnum: authFlows.filter(f => f.username_enumerable).length,
  };

  const flowTypes = [...new Set(authFlows.map(f => f.flow_type))].filter(Boolean);
  const apps = [...new Set(authFlows.map(f => f.app_name))].filter(Boolean);

  const filteredFlows = authFlows.filter(flow => {
    const matchesApp = selectedApp === "all" || flow.app_name === selectedApp;
    const matchesType = selectedFlowType === "all" || flow.flow_type === selectedFlowType;
    return matchesApp && matchesType;
  });

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[
        { label: "Web Security", path: "/web" },
        { label: "Auth Flow Visualization" }
      ]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${HIGH}15`, border: `1px solid ${HIGH}40` }}>
            <Shield className="w-6 h-6" style={{ color: HIGH }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Authentication Flow Visualization</h1>
            <p className="text-sm mt-0.5" style={{ color: MUTED }}>Identify weak points in login and session security</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Flows</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}30` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>High Risk</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{stats.highRisk}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${HIGH}08`, border: `1px solid ${HIGH}30` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>No MFA</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{stats.noMFA}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${MEDIUM}08`, border: `1px solid ${MEDIUM}30` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Brute Force Risk</p>
          <p className="text-2xl font-black font-mono" style={{ color: MEDIUM }}>{stats.bruteForceVuln}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${LOW}08`, border: `1px solid ${LOW}30` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Secure</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{stats.total - stats.highRisk}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Chart */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: CYAN }} />
            Risk Grade Distribution
          </h3>
          {riskChartData.length === 0 ? (
            <div className="text-center py-12" style={{ color: MUTED }}>No risk data available</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskChartData}>
                  <XAxis dataKey="grade" stroke={MUTED} fontSize={10} />
                  <YAxis stroke={MUTED} fontSize={10} />
                  <Tooltip
                    contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {riskChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Security Headers Overview */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4" style={{ color: CYAN }} />
            Missing Security Headers by App
          </h3>
          {Object.keys(appHeaders).length === 0 ? (
            <div className="text-center py-12" style={{ color: MUTED }}>No header data available</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(appHeaders).slice(0, 8).map(([appName, data]) => (
                <div key={appName} className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">{appName}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      data.grade === 'A' || data.grade === 'A+' ? 'bg-green-400/15 text-green-400' :
                      data.grade === 'B' ? 'bg-blue-400/15 text-blue-400' :
                      data.grade === 'C' ? 'bg-yellow-400/15 text-yellow-400' :
                      'bg-red-400/15 text-red-400'
                    }`}>
                      Grade: {data.grade}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {data.missing.map(header => (
                      <span key={header} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER, border: `1px solid ${DANGER}30` }}>
                        Missing: {header}
                      </span>
                    ))}
                    {data.missing.length === 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${LOW}15`, color: LOW }}>
                        All headers present
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Weak Points Analysis */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: HIGH }} />
            Security Weak Points
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={selectedFlowType}
              onChange={(e) => setSelectedFlowType(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
            >
              <option value="all">All Flow Types</option>
              {flowTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
        </div>

        {weakPoints.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: LOW }} />
            <p className="text-sm font-bold" style={{ color: LOW }}>No weak points detected — excellent security posture!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {weakPoints.map(flow => (
              <Card key={flow.id} className="p-4" style={{ border: `1px solid ${flow.risk_grade === 'F' || flow.risk_grade === 'D' ? DANGER + "30" : HIGH + "30"}` }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-bold text-white">{flow.app_name}</p>
                    <p className="text-[9px]" style={{ color: MUTED }}>{flow.flow_type}</p>
                  </div>
                  <div className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    flow.risk_grade === 'A' ? 'bg-green-400/15 text-green-400' :
                    flow.risk_grade === 'B' ? 'bg-blue-400/15 text-blue-400' :
                    flow.risk_grade === 'C' ? 'bg-yellow-400/15 text-yellow-400' :
                    'bg-red-400/15 text-red-400'
                  }`}>
                    Grade: {flow.risk_grade}
                  </div>
                </div>

                <div className="space-y-2">
                  {!flow.mfa_enabled && (
                    <div className="flex items-center gap-2 text-[10px]" style={{ color: DANGER }}>
                      <X className="w-3 h-3" />
                      <span>MFA Not Enabled</span>
                    </div>
                  )}
                  {!flow.brute_force_protection && (
                    <div className="flex items-center gap-2 text-[10px]" style={{ color: DANGER }}>
                      <X className="w-3 h-3" />
                      <span>No Brute Force Protection</span>
                    </div>
                  )}
                  {!flow.account_lockout && (
                    <div className="flex items-center gap-2 text-[10px]" style={{ color: HIGH }}>
                      <AlertCircle className="w-3 h-3" />
                      <span>No Account Lockout</span>
                    </div>
                  )}
                  {flow.username_enumerable && (
                    <div className="flex items-center gap-2 text-[10px]" style={{ color: HIGH }}>
                      <AlertTriangle className="w-3 h-3" />
                      <span>Username Enumerable</span>
                    </div>
                  )}
                  {!flow.captcha_enabled && (
                    <div className="flex items-center gap-2 text-[10px]" style={{ color: MEDIUM }}>
                      <AlertCircle className="w-3 h-3" />
                      <span>No CAPTCHA</span>
                    </div>
                  )}
                  {!flow.secure_password_storage && (
                    <div className="flex items-center gap-2 text-[10px]" style={{ color: DANGER }}>
                      <Lock className="w-3 h-3" />
                      <span>Insecure Password Storage</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t" style={{ borderColor: BORDER }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold" style={{ color: MUTED }}>RISK SCORE</span>
                    <span className="text-sm font-black" style={{ color: flow.risk_score >= 70 ? DANGER : flow.risk_score >= 40 ? HIGH : MEDIUM }}>
                      {flow.risk_score || 0}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Session Security Analysis */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" style={{ color: CYAN }} />
          Session Security Analysis
        </h3>
        {sessions.length === 0 ? (
          <div className="text-center py-12" style={{ color: MUTED }}>No session data available</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.slice(0, 9).map(session => (
              <div key={session.id} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-white">{session.app_name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: `${CYAN}15`, color: CYAN }}>
                    {session.session_type}
                  </span>
                </div>
                <div className="space-y-2 text-[10px]">
                  <div className="flex items-center justify-between">
                    <span style={{ color: MUTED }}>Entropy</span>
                    <span className={session.entropy_bits >= 128 ? 'text-green-400' : 'text-red-400'}>
                      {session.entropy_bits || 0} bits
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: MUTED }}>Secure Flag</span>
                    {session.secure_flag ? <CheckCircle className="w-3 h-3 text-green-400" /> : <X className="w-3 h-3 text-red-400" />}
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: MUTED }}>HttpOnly</span>
                    {session.httponly_flag ? <CheckCircle className="w-3 h-3 text-green-400" /> : <X className="w-3 h-3 text-red-400" />}
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: MUTED }}>SameSite</span>
                    <span className={session.samesite === 'strict' ? 'text-green-400' : session.samesite === 'lax' ? 'text-yellow-400' : 'text-red-400'}>
                      {session.samesite || 'missing'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: MUTED }}>Session Fixation</span>
                    {session.session_fixation_risk ? <AlertTriangle className="w-3 h-3 text-red-400" /> : <CheckCircle className="w-3 h-3 text-green-400" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}