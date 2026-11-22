import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { base44 } from "@/api/base44Client";
import { jsPDF } from "jspdf";
import { FileDown } from "lucide-react";
import DateRangeFilter from "@/components/shared/DateRangeFilter";

export default function ExecutiveSummary() {
  const [topRisks, setTopRisks] = useState([]);
  const [trend, setTrend] = useState([]);
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(30);

  useEffect(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - rangeDays);

    Promise.all([
      base44.entities.TriagedFinding.filter({ severity: "critical", status: "open" }, "-cvss_score", 5).catch(() => []),
      base44.entities.ComplianceTrend.list("assessment_date", 200).catch(() => []),
      base44.entities.GlobalRiskScore.list("-calculated_at", 1).catch(() => []),
    ]).then(([risks, trends, riskList]) => {
      setTopRisks(risks);
      const filtered = trends.filter(t => t.assessment_date && new Date(t.assessment_date) >= cutoff);
      setTrend(filtered.map(t => ({
        date: t.assessment_date ? new Date(t.assessment_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "",
        score: t.overall_score,
      })));
      setRisk(riskList[0] || null);
      setLoading(false);
    });
  }, [rangeDays]);

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("GDS Executive Summary Report", 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);

    doc.setFontSize(12);
    doc.text("Current Risk Score", 14, 38);
    doc.setFontSize(20);
    doc.text(`${risk?.overall_score ?? "—"}/100  (Grade ${risk?.grade ?? "—"})`, 14, 47);
    doc.setFontSize(10);
    doc.text(`Trend: ${risk?.trend ?? "—"}`, 14, 54);

    doc.setFontSize(12);
    doc.text(`Compliance Trend (last ${rangeDays} days)`, 14, 68);
    doc.setFontSize(9);
    let y = 76;
    if (trend.length === 0) {
      doc.text("No compliance trend data available for this period.", 14, y);
      y += 6;
    } else {
      trend.forEach(t => {
        doc.text(`${t.date}: ${t.score}%`, 14, y);
        y += 6;
      });
    }

    y += 6;
    doc.setFontSize(12);
    doc.text("Top Open Critical Risks", 14, y);
    y += 8;
    doc.setFontSize(9);
    if (topRisks.length === 0) {
      doc.text("No open critical risks.", 14, y);
    } else {
      topRisks.forEach(r => {
        doc.text(`• ${r.title} (${r.asset_name || "—"})`, 14, y);
        y += 6;
      });
    }

    doc.save("gds-executive-summary.pdf");
  }

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm font-bold">🧾 EXECUTIVE SUMMARY</span>
        <div className="flex items-center gap-2">
          <DateRangeFilter value={rangeDays} onChange={setRangeDays} />
          <button onClick={exportPDF} className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition">
            <FileDown size={13} /> Export PDF
          </button>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-4 mt-3">
        {/* Top Risks */}
        <div className="col-span-6">
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-2">Top Risks</p>
          {loading ? (
            <div className="animate-pulse h-28 rounded-lg bg-muted" />
          ) : topRisks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No open critical risks.</p>
          ) : (
            <div className="space-y-1.5">
              {topRisks.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs border-b last:border-0 py-1.5">
                  <span className="font-medium truncate flex-1">{r.title}</span>
                  <span className="text-muted-foreground flex-shrink-0 ml-2">{r.asset_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Compliance Trend */}
        <div className="col-span-6">
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-2">Compliance Trend</p>
          {loading ? (
            <div className="animate-pulse h-28 rounded-lg bg-muted" />
          ) : trend.length === 0 ? (
            <p className="text-xs text-muted-foreground">No compliance trend data for this period.</p>
          ) : (
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="score" stroke="#14b8a6" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}