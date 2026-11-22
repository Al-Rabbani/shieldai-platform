import React, { useState, useMemo } from "react";
import { Network, Plus, X, Trash2, Link2, Target } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, LOW, MEDIUM, MUTED, TEXT, Card, EmptyState } from "@/components/gds/GDSOSShared";

const GOAL_TYPE_COLORS = {
  security_scan: "#3b82f6", threat_hunt: DANGER, incident_response: HIGH,
  compliance_audit: LOW, remediation: "#f59e0b", risk_assessment: "#6366f1",
  executive_report: "#14b8a6", agent_orchestration: "#a855f7"
};

export default function GoalDependencyMap({ goals, onAddDependency, onDeleteDependency }) {
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showAddLink, setShowAddLink] = useState(false);
  const [targetGoal, setTargetGoal] = useState("");
  const [linkType, setLinkType] = useState("supports");

  const dependencies = useMemo(() => {
    const deps = [];
    goals.forEach(goal => {
      if (goal.dependencies) {
        goal.dependencies.forEach(dep => {
          deps.push({ from: goal, to: goals.find(g => g.goal_id === dep.target_goal_id), type: dep.type });
        });
      }
    });
    return deps.filter(d => d.to);
  }, [goals]);

  const goalsWithDependencies = useMemo(() => {
    const map = {};
    goals.forEach(g => {
      map[g.goal_id] = {
        incoming: dependencies.filter(d => d.to?.goal_id === g.goal_id),
        outgoing: dependencies.filter(d => d.from?.goal_id === g.goal_id)
      };
    });
    return map;
  }, [dependencies, goals]);

  const handleAddLink = () => {
    if (selectedGoal && targetGoal && targetGoal !== selectedGoal.goal_id) {
      onAddDependency && onAddDependency({
        from_goal_id: selectedGoal.goal_id,
        to_goal_id: targetGoal,
        type: linkType
      });
      setShowAddLink(false);
      setTargetGoal("");
      setLinkType("supports");
    }
  };

  const linkTypes = [
    { value: "supports", label: "Supports", color: CYAN },
    { value: "enables", label: "Enables", color: LOW },
    { value: "blocks", label: "Blocks", color: DANGER },
    { value: "requires", label: "Requires", color: HIGH },
    { value: "related", label: "Related", color: MUTED }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Goal Dependency Map</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Visualize how security goals connect and enable each other</p>
        </div>
        <button
          onClick={() => setShowAddLink(true)}
          disabled={!selectedGoal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-80 disabled:opacity-40"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          <Plus className="w-3.5 h-3.5" />
          Add Dependency
        </button>
      </div>

      {goals.length === 0 ? (
        <EmptyState icon={Network} title="No goals yet" description="Create security goals to map dependencies" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Goals List */}
          <div className="lg:col-span-1 space-y-3">
            <h4 className="text-xs font-bold" style={{ color: MUTED }}>Security Goals</h4>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2" style={{ scrollbarWidth: "thin" }}>
              {goals.map(goal => {
                const depInfo = goalsWithDependencies[goal.goal_id] || { incoming: [], outgoing: [] };
                const totalDeps = depInfo.incoming.length + depInfo.outgoing.length;
                const isSelected = selectedGoal?.goal_id === goal.goal_id;
                const typeColor = GOAL_TYPE_COLORS[goal.goal_type] || MUTED;
                
                return (
                  <div
                    key={goal.goal_id}
                    onClick={() => setSelectedGoal(goal)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? "scale-[1.02]" : ""}`}
                    style={{
                      background: isSelected ? `${CYAN}08` : "rgba(255,255,255,0.02)",
                      borderColor: isSelected ? CYAN : BORDER
                    }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase"
                            style={{ color: typeColor, background: `${typeColor}18`, border: `1px solid ${typeColor}30` }}>
                            {(goal.goal_type || "unknown").replace("_", " ")}
                          </span>
                          {totalDeps > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                              style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
                              {totalDeps} links
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-white truncate">{goal.goal_statement || "Untitled Goal"}</p>
                        <p className="text-[10px] mt-1" style={{ color: MUTED }}>
                          {depInfo.incoming.length} incoming · {depInfo.outgoing.length} outgoing
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dependency Details */}
          <div className="lg:col-span-2 space-y-4">
            {selectedGoal ? (
              <>
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Target className="w-4 h-4" style={{ color: CYAN }} />
                    <h4 className="text-sm font-bold text-white">Selected Goal</h4>
                  </div>
                  <p className="text-xs" style={{ color: TEXT }}>{selectedGoal.goal_statement || "No description"}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-[10px] px-2 py-1 rounded"
                      style={{ color: GOAL_TYPE_COLORS[selectedGoal.goal_type] || MUTED, background: "rgba(255,255,255,0.04)" }}>
                      {(selectedGoal.goal_type || "unknown").replace("_", " ")}
                    </span>
                    <span className="text-[10px] px-2 py-1 rounded"
                      style={{ color: selectedGoal.priority === "P0" ? DANGER : selectedGoal.priority === "P1" ? HIGH : MUTED, background: "rgba(255,255,255,0.04)" }}>
                      {selectedGoal.priority || "P2"}
                    </span>
                    <span className="text-[10px] px-2 py-1 rounded"
                      style={{ color: selectedGoal.status === "completed" ? LOW : selectedGoal.status === "failed" ? DANGER : MUTED, background: "rgba(255,255,255,0.04)" }}>
                      {selectedGoal.status || "pending"}
                    </span>
                  </div>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  {/* Incoming Dependencies */}
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Link2 className="w-4 h-4" style={{ color: LOW }} />
                      <h4 className="text-xs font-bold text-white">Incoming Links</h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: LOW, background: `${LOW}15` }}>
                        {goalsWithDependencies[selectedGoal.goal_id]?.incoming.length || 0}
                      </span>
                    </div>
                    {goalsWithDependencies[selectedGoal.goal_id]?.incoming.length === 0 ? (
                      <p className="text-[11px]" style={{ color: MUTED }}>No incoming dependencies</p>
                    ) : (
                      <div className="space-y-2">
                        {goalsWithDependencies[selectedGoal.goal_id].incoming.map((dep, idx) => (
                          <div key={idx} className="p-2 rounded" style={{ background: "rgba(255,255,255,0.03)" }}>
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-bold" style={{ color: TEXT }}>{dep.from.goal_statement || "Unknown"}</p>
                              <span className="text-[9px] px-1.5 py-0.5 rounded"
                                style={{ color: linkTypes.find(t => t.value === dep.type)?.color || MUTED, background: "rgba(255,255,255,0.04)" }}>
                                {dep.type}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Outgoing Dependencies */}
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Link2 className="w-4 h-4" style={{ color: CYAN }} />
                      <h4 className="text-xs font-bold text-white">Outgoing Links</h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: CYAN, background: `${CYAN}15` }}>
                        {goalsWithDependencies[selectedGoal.goal_id]?.outgoing.length || 0}
                      </span>
                    </div>
                    {goalsWithDependencies[selectedGoal.goal_id]?.outgoing.length === 0 ? (
                      <p className="text-[11px]" style={{ color: MUTED }}>No outgoing dependencies</p>
                    ) : (
                      <div className="space-y-2">
                        {goalsWithDependencies[selectedGoal.goal_id].outgoing.map((dep, idx) => (
                          <div key={idx} className="p-2 rounded" style={{ background: "rgba(255,255,255,0.03)" }}>
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-bold" style={{ color: TEXT }}>{dep.to.goal_statement || "Unknown"}</p>
                              <button
                                onClick={() => onDeleteDependency && onDeleteDependency(selectedGoal.goal_id, dep.to.goal_id)}
                                className="p-1 rounded hover:bg-white/10 transition-colors">
                                <Trash2 className="w-3 h-3" style={{ color: DANGER }} />
                              </button>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] px-1.5 py-0.5 rounded"
                                style={{ color: linkTypes.find(t => t.value === dep.type)?.color || MUTED, background: "rgba(255,255,255,0.04)" }}>
                                {dep.type}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>

                {/* Visualization */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Network className="w-4 h-4" style={{ color: CYAN }} />
                    <h4 className="text-xs font-bold text-white">Dependency Network</h4>
                  </div>
                  <div className="relative h-64 rounded-lg overflow-hidden" style={{ background: "rgba(0,0,0,0.3)" }}>
                    {/* Central node */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full flex items-center justify-center text-center p-2"
                      style={{ background: `${CYAN}20`, border: `2px solid ${CYAN}`, boxShadow: `0 0 30px ${CYAN}40` }}>
                      <span className="text-[10px] font-bold text-white">{selectedGoal.goal_statement?.slice(0, 20) || "Goal"}</span>
                    </div>
                    
                    {/* Incoming nodes (left) */}
                    {goalsWithDependencies[selectedGoal.goal_id]?.incoming.slice(0, 4).map((dep, idx) => {
                      const angle = (idx / 4) * Math.PI - Math.PI / 2;
                      const x = 15 + Math.cos(angle) * 35;
                      const y = 50 + Math.sin(angle) * 35;
                      const color = GOAL_TYPE_COLORS[dep.from.goal_type] || MUTED;
                      return (
                        <div key={`in-${idx}`}
                          className="absolute w-16 h-16 rounded-full flex items-center justify-center text-center p-1"
                          style={{
                            left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)",
                            background: `${color}20`, border: `2px solid ${color}`
                          }}>
                          <span className="text-[9px] font-bold text-white">{dep.from.goal_statement?.slice(0, 15) || "Goal"}</span>
                        </div>
                      );
                    })}
                    
                    {/* Outgoing nodes (right) */}
                    {goalsWithDependencies[selectedGoal.goal_id]?.outgoing.slice(0, 4).map((dep, idx) => {
                      const angle = (idx / 4) * Math.PI - Math.PI / 2;
                      const x = 85 + Math.cos(angle) * 35;
                      const y = 50 + Math.sin(angle) * 35;
                      const color = GOAL_TYPE_COLORS[dep.to.goal_type] || MUTED;
                      return (
                        <div key={`out-${idx}`}
                          className="absolute w-16 h-16 rounded-full flex items-center justify-center text-center p-1"
                          style={{
                            left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)",
                            background: `${color}20`, border: `2px solid ${color}`
                          }}>
                          <span className="text-[9px] font-bold text-white">{dep.to.goal_statement?.slice(0, 15) || "Goal"}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </>
            ) : (
              <EmptyState icon={Target} title="Select a goal" description="Choose a goal to view its dependencies" />
            )}
          </div>
        </div>
      )}

      {/* Add Link Modal */}
      {showAddLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Add Dependency Link</h3>
              <button onClick={() => { setShowAddLink(false); setTargetGoal(""); }} className="hover:text-white transition-colors" style={{ color: MUTED }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-bold mb-1" style={{ color: MUTED }}>From Goal</p>
                <p className="text-xs" style={{ color: TEXT }}>{selectedGoal?.goal_statement || "Unknown"}</p>
              </div>
              
              <div>
                <label className="text-[11px] font-bold mb-1 block" style={{ color: MUTED }}>To Goal</label>
                <select
                  value={targetGoal}
                  onChange={e => setTargetGoal(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                  <option value="">Select a goal...</option>
                  {goals.filter(g => g.goal_id !== selectedGoal?.goal_id).map(g => (
                    <option key={g.goal_id} value={g.goal_id}>{g.goal_statement || "Untitled"}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-[11px] font-bold mb-1 block" style={{ color: MUTED }}>Relationship Type</label>
                <div className="grid grid-cols-1 gap-2">
                  {linkTypes.map(type => (
                    <label key={type.value} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all"
                      style={{
                        background: linkType === type.value ? `${type.color}10` : "rgba(255,255,255,0.02)",
                        border: `1px solid ${linkType === type.value ? type.color + "40" : BORDER}`
                      }}>
                      <input
                        type="radio"
                        name="linkType"
                        value={type.value}
                        checked={linkType === type.value}
                        onChange={e => setLinkType(e.target.value)}
                        className="w-3 h-3 accent-cyan-400"
                      />
                      <span className="text-xs font-bold" style={{ color: type.color }}>{type.label}</span>
                      <span className="text-[10px]" style={{ color: MUTED }}>
                        {type.value === "supports" && "This goal helps achieve the target"}
                        {type.value === "enables" && "This goal makes the target possible"}
                        {type.value === "blocks" && "This goal prevents the target"}
                        {type.value === "requires" && "This goal needs the target first"}
                        {type.value === "related" && "These goals are connected"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowAddLink(false); setTargetGoal(""); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>
                Cancel
              </button>
              <button
                onClick={handleAddLink}
                disabled={!targetGoal}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-40"
                style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                Add Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}