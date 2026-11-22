import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BookOpen, X, Copy, CheckCircle, Code, Link, Lightbulb, Shield, AlertTriangle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card } from "@/components/gds/GDSOSShared";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

export default function RemediationGuidancePopup({ finding, onClose }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [copied, setCopied] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["remediation-templates-popup"],
    queryFn: () => base44.entities.RemediationTemplate.list("-created_date").catch(() => []),
    enabled: !!finding,
  });

  const filteredTemplates = templates.filter(t => {
    if (!t.is_active) return false;
    
    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        t.template_name?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.vulnerability_type?.toLowerCase().includes(query) ||
        t.remediation_steps?.toLowerCase().includes(query) ||
        (t.references || []).some(ref => ref.toLowerCase().includes(query));
      
      if (!matchesSearch) return false;
    }
    
    if (!finding) return true;
    const matchesSeverity = !t.severity || t.severity === finding.severity;
    const matchesType = !t.vulnerability_type || 
      finding.title?.toLowerCase().includes(t.vulnerability_type.toLowerCase()) ||
      finding.cve_id?.toLowerCase().includes(t.vulnerability_type.toLowerCase());
    return matchesSeverity || matchesType;
  }).slice(0, 10);

  const handleCopy = async (text, type) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!finding) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" style={{ background: "#0a1628", border: `1px solid ${CYAN}30` }}>
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b flex-shrink-0" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
              <Lightbulb className="w-5 h-5" style={{ color: CYAN }} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Remediation Guidance</h3>
              <p className="text-xs" style={{ color: MUTED }}>Standard fix instructions for this vulnerability</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: MUTED }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Finding Info */}
          <Card className="p-4" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: CYAN }} />
              <div className="flex-1">
                <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>Vulnerability</p>
                <p className="text-sm font-bold text-white mb-2">{finding.title}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded uppercase font-bold" 
                    style={{ 
                      background: finding.severity === 'critical' ? `${DANGER}15` :
                        finding.severity === 'high' ? `${HIGH}15` :
                          finding.severity === 'medium' ? `${MEDIUM}15` : `${LOW}15`,
                      color: finding.severity === 'critical' ? DANGER :
                        finding.severity === 'high' ? HIGH :
                          finding.severity === 'medium' ? MEDIUM : LOW,
                      border: `1px solid ${finding.severity === 'critical' ? DANGER + '30' :
                        finding.severity === 'high' ? HIGH + '30' :
                          finding.severity === 'medium' ? MEDIUM + '30' : LOW + '30'}`
                    }}>
                    {finding.severity}
                  </span>
                  {finding.cve_id && (
                    <span className="text-[10px] font-mono" style={{ color: CYAN }}>CVE: {finding.cve_id}</span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Templates */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4" style={{ color: CYAN }} />
              <h4 className="text-sm font-bold text-white">Fix Templates</h4>
              <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(0,212,255,0.1)", color: CYAN, border: `1px solid ${CYAN}30` }}>
                {filteredTemplates.length} {filteredTemplates.length === 1 ? 'result' : 'results'}
              </span>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by vulnerability type, CVE, or keywords..."
                  className="w-full px-4 py-2.5 pl-10 rounded-xl text-sm outline-none transition-all"
                  style={{ 
                    background: "rgba(0,212,255,0.04)", 
                    border: `1px solid ${searchQuery ? CYAN + '40' : BORDER}`,
                    color: TEXT,
                    boxShadow: searchQuery ? `0 0 0 2px ${CYAN}20` : 'none'
                  }}
                />
                <svg 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
                  style={{ color: MUTED }}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/5"
                    style={{ color: MUTED }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-24 rounded-lg animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />
                ))}
              </div>
            ) : filteredTemplates.length === 0 ? (
              <Card className="p-6 text-center" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <AlertTriangle className="w-8 h-8 mx-auto mb-3" style={{ color: MUTED }} />
                <p className="text-sm font-bold" style={{ color: MUTED }}>No matching templates</p>
                <p className="text-xs mt-1" style={{ color: MUTED }}>Create templates in the Fix Templates library</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className={`p-4 cursor-pointer transition-all border ${
                      selectedTemplate?.id === template.id 
                        ? 'bg-cyan-500/10 border-cyan-400/40' 
                        : 'bg-white/2 border-white/5 hover:border-white/10'
                    }`}
                    onClick={() => setSelectedTemplate(selectedTemplate?.id === template.id ? null : template)}
                    style={{ 
                      background: selectedTemplate?.id === template.id ? `${CYAN}10` : "rgba(255,255,255,0.02)",
                      border: selectedTemplate?.id === template.id ? `1px solid ${CYAN}40` : `1px solid ${BORDER}`
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-xs font-bold text-white">{template.template_name}</h4>
                          {template.severity && (
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase" 
                              style={{ 
                                background: template.severity === 'critical' ? `${DANGER}15` :
                                  template.severity === 'high' ? `${HIGH}15` :
                                    template.severity === 'medium' ? `${MEDIUM}15` : `${LOW}15`,
                                color: template.severity === 'critical' ? DANGER :
                                  template.severity === 'high' ? HIGH :
                                    template.severity === 'medium' ? MEDIUM : LOW,
                                border: `1px solid ${template.severity === 'critical' ? DANGER + '30' :
                                  template.severity === 'high' ? HIGH + '30' :
                                    template.severity === 'medium' ? MEDIUM + '30' : LOW + '30'}`
                              }}>
                              {template.severity}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px]" style={{ color: MUTED }}>{template.description}</p>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]" style={{ color: MUTED }}>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {template.usage_count || 0} uses
                        </span>
                      </div>
                    </div>

                    {selectedTemplate?.id === template.id && (
                      <div className="mt-3 space-y-3 pt-3 border-t" style={{ borderColor: BORDER }}>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Remediation Steps</p>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopy(template.remediation_steps, `template-${template.id}-steps`)}
                              className="h-6 px-2 text-[9px]"
                              style={{ color: CYAN }}
                            >
                              {copied === `template-${template.id}-steps` ? <><CheckCircle className="w-3 h-3 mr-1" /> Copied!</> : <><Copy className="w-3 h-3 mr-1" /> Copy</>}
                            </Button>
                          </div>
                          <div className="p-3 rounded-lg text-xs" style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${BORDER}` }}>
                            <ReactMarkdown className="prose prose-sm max-w-none" style={{ color: TEXT }}>
                              {template.remediation_steps}
                            </ReactMarkdown>
                          </div>
                        </div>

                        {template.code_example && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Code Example</p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCopy(template.code_example, `template-${template.id}-code`)}
                                className="h-6 px-2 text-[9px]"
                                style={{ color: CYAN }}
                              >
                                {copied === `template-${template.id}-code` ? <><CheckCircle className="w-3 h-3 mr-1" /> Copied!</> : <><Code className="w-3 h-3 mr-1" /> Copy</>}
                              </Button>
                            </div>
                            <pre className="p-3 rounded-lg text-[10px] overflow-x-auto" style={{ background: "#0a0e1a", border: `1px solid ${BORDER}`, color: TEXT, fontFamily: 'monospace' }}>
                              <code>{template.code_example}</code>
                            </pre>
                          </div>
                        )}

                        {template.testing_guidance && (
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: MUTED }}>Testing Guidance</p>
                            <p className="text-xs" style={{ color: TEXT }}>{template.testing_guidance}</p>
                          </div>
                        )}

                        {(template.references || []).length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {template.references.map((ref, i) => (
                              <a
                                key={i}
                                href={ref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] flex items-center gap-1 hover:underline"
                                style={{ color: CYAN }}
                              >
                                <Link className="w-3 h-3" />
                                Reference {i + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t flex-shrink-0" style={{ borderColor: BORDER }}>
          <Button
            onClick={onClose}
            variant="ghost"
            className="px-4 py-2 rounded-xl text-xs font-bold"
            style={{ color: MUTED }}
          >
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}