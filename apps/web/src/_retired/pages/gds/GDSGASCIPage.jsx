import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Brain, TrendingUp, Target, Clock3, Zap, Database, BookOpen, Activity, Award, ChevronRight } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, BG,
  Card, Breadcrumb, SevBadge, Skeleton, EmptyState, timeAgo, PAGE_BG, KpiCard
} from "@/components/gds/GDSOSShared";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

function EvolutionMetric({ label, value, sub, icon: Icon, color, trend }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        {trend && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            trend > 0 ? "bg-green-400/15 text-green-400" : "bg-red-400/15 text-red-400"
          }`}>
            {trend > 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
      <p className="text-2xl font-black font-mono" style={{ color }}>{value ?? "—"}</p>
      {sub && <p className="text-[10px] mt-1" style={{ color: MUTED }}>{sub}</p>}
    </Card>
  );
}

function MemoryRecordCard({ record }) {
  const typeColors = {
    semantic: CYAN,
    episodic: HIGH,
    procedural: "#a855f7",
    working: MEDIUM,
  };
  const color = typeColors[record.memory_type] || CYAN;
  
  return (
    <Card className="p-3 hover:scale-[1.01] transition-transform cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
            {record.memory_type || "semantic"}
          </span>
        </div>
        <span className="text-[9px]" style={{ color: MUTED }}>{timeAgo(record.created_at)}</span>
      </div>
      <p className="text-xs font-semibold text-white mb-2 line-clamp-2">{record.content || record.summary || "No content"}</p>
      <div className="flex items-center gap-3 text-[9px]" style={{ color: MUTED }}>
        <span>Confidence: <span className="font-bold" style={{ color: TEXT }}>{record.confidence_score ?? 0}%</span></span>
        {record.access_count != null && <span>Accesses: <span className="font-bold" style={{ color: TEXT }}>{record.access_count}</span></span>}
      </div>
    </Card>
  );
}

function LearningEventRow({ event }) {
  const typeColors = {
    pattern_learned: CYAN,
    skill_acquired: HIGH,
    knowledge_updated: "#10b981",
    correction: DANGER,
    optimization: "#a855f7",
  };
  const color = typeColors[event.event_type] || MUTED;
  
  return (
    <div className="flex items-center gap-3 p-3 hover:bg-white/[0.02] transition-colors">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">{event.description || event.event_type}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[9px]" style={{ color: MUTED }}>{timeAgo(event.created_at)}</span>
          {event.impact_score != null && (
            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${color}15`, color }}>
              Impact: {event.impact_score}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: MUTED }} />
    </div>
  );
}

function GoalProgressCard({ goal }) {
  const progress = goal.progress_percentage || 0;
  const statusColors = {
    active: CYAN,
    completed: LOW,
    paused: MEDIUM,
    failed: DANGER,
  };
  const color = statusColors[goal.status] || CYAN;
  
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase" style={{ background: `${color}15`, color }}>
              {goal.status || "active"}
            </span>
            {goal.priority && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${MUTED}15`, color: MUTED }}>
                {goal.priority}
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold text-white truncate">{goal.title || goal.name || "Untitled Goal"}</h4>
        </div>
      </div>
      
      <div className="mb-2">
        <div className="flex items-center justify-between text-[9px] mb-1">
          <span style={{ color: MUTED }}>Progress</span>
          <span className="font-bold" style={{ color }}>{progress}%</span>
        </div>
        <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: color }}
          />
        </div>
      </div>
      
      <div className="flex items-center gap-3 text-[9px]" style={{ color: MUTED }}>
        <span className="flex items-center gap-1">
          <Clock3 className="w-3 h-3" />
          {timeAgo(goal.created_at)}
        </span>
        {goal.deadline && (
          <span className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            Due {timeAgo(goal.deadline)}
          </span>
        )}
      </div>
    </Card>
  );
}

export default function GDSGASCIPage() {
  const { data: memories = [], isLoading: loadMemories } = useQuery({
    queryKey: ["gasci-memories"],
    queryFn: () => base44.entities.MemoryRecord.list("-created_at", 50).catch(() => []),
  });

  const { data: learningEvents = [], isLoading: loadLearning } = useQuery({
    queryKey: ["gasci-learning"],
    queryFn: () => base44.entities.LearningEvent.list("-created_at", 50).catch(() => []),
  });

  const { data: goals = [], isLoading: loadGoals } = useQuery({
    queryKey: ["gasci-goals"],
    queryFn: () => base44.entities.Goal.list("-created_at", 50).catch(() => []),
  });

  const { data: reasoningRecords = [], isLoading: loadReasoning } = useQuery({
    queryKey: ["gasci-reasoning"],
    queryFn: () => base44.entities.ReasoningRecord.list("-created_at", 30).catch(() => []),
  });

  // Calculate metrics
  const memoryStats = {
    total: memories.length,
    byType: memories.reduce((acc, m) => {
      acc[m.memory_type || "semantic"] = (acc[m.memory_type || "semantic"] || 0) + 1;
      return acc;
    }, {}),
    avgConfidence: memories.length > 0
      ? Math.round(memories.reduce((sum, m) => sum + (m.confidence_score || 0), 0) / memories.length)
      : 0,
  };

  const learningStats = {
    total: learningEvents.length,
    last24h: learningEvents.filter(e => {
      const eventDate = new Date(e.created_at);
      const now = new Date();
      const hoursDiff = (now - eventDate) / (1000 * 60 * 60);
      return hoursDiff <= 24;
    }).length,
    byType: learningEvents.reduce((acc, e) => {
      acc[e.event_type || "general"] = (acc[e.event_type || "general"] || 0) + 1;
      return acc;
    }, {}),
  };

  const goalStats = {
    total: goals.length,
    active: goals.filter(g => g.status === "active").length,
    completed: goals.filter(g => g.status === "completed").length,
    avgProgress: goals.length > 0
      ? Math.round(goals.reduce((sum, g) => sum + (g.progress_percentage || 0), 0) / goals.length)
      : 0,
  };

  // Generate trend data for charts
  const learningTrendData = React.useMemo(() => {
    const days = 7;
    const data = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const dayEvents = learningEvents.filter(e => {
        const eventDate = new Date(e.created_at);
        return eventDate.toDateString() === date.toDateString();
      });
      
      data.push({
        date: dateStr,
        events: dayEvents.length,
        impact: dayEvents.reduce((sum, e) => sum + (e.impact_score || 1), 0),
      });
    }
    
    return data;
  }, [learningEvents]);

  const isLoading = loadMemories || loadLearning || loadGoals || loadReasoning;

  return (
    <div className="space-y-6" style={PAGE_BG}>
      <Breadcrumb items={[{ label: "GASCI AI BRAIN", path: "/gasci" }, { label: "Evolution Dashboard" }]} />
      
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">AI Brain Evolution</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>
            Track memory growth, learning patterns, and goal progression
          </p>
        </div>
      </div>
      
      {/* Hero Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <EvolutionMetric
          label="Memory Records"
          value={memoryStats.total}
          sub={`${memoryStats.avgConfidence}% avg confidence`}
          icon={Database}
          color={CYAN}
          trend={12}
        />
        <EvolutionMetric
          label="Learning Events"
          value={learningStats.total}
          sub={`${learningStats.last24h} in last 24h`}
          icon={Zap}
          color={HIGH}
          trend={8}
        />
        <EvolutionMetric
          label="Active Goals"
          value={goalStats.active}
          sub={`${goalStats.completed} completed`}
          icon={Target}
          color={LOW}
          trend={5}
        />
        <EvolutionMetric
          label="Reasoning Chains"
          value={reasoningRecords.length}
          sub="Decision records"
          icon={Brain}
          color="#a855f7"
          trend={15}
        />
      </div>
      
      {/* Learning Trend Chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Learning Activity (7 Days)</h3>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: CYAN }} />
              <span style={{ color: MUTED }}>Events</span>
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: HIGH }} />
              <span style={{ color: MUTED }}>Impact Score</span>
            </span>
          </div>
        </div>
        
        {isLoading ? (
          <Skeleton lines={4} />
        ) : learningTrendData.length === 0 ? (
          <EmptyState icon={Activity} title="No learning data" description="Learning events will appear here" />
        ) : (
          <div style={{ height: "200px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={learningTrendData}>
                <defs>
                  <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CYAN} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={CYAN} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorImpact" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={HIGH} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={HIGH} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="date" stroke={MUTED} fontSize={10} />
                <YAxis stroke={MUTED} fontSize={10} />
                <Area type="monotone" dataKey="events" stroke={CYAN} fillOpacity={1} fill="url(#colorEvents)" />
                <Area type="monotone" dataKey="impact" stroke={HIGH} fillOpacity={1} fill="url(#colorImpact)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
      
      {/* Memory Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Memories */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5" style={{ color: CYAN }} />
              <h3 className="text-sm font-bold text-white">Recent Memories</h3>
            </div>
            <span className="text-[10px]" style={{ color: MUTED }}>{memoryStats.total} total</span>
          </div>
          
          {isLoading ? (
            <Skeleton lines={5} />
          ) : memories.length === 0 ? (
            <EmptyState icon={Database} title="No memories" description="Memory records will appear here" />
          ) : (
            <div className="space-y-2">
              {memories.slice(0, 5).map(record => (
                <MemoryRecordCard key={record.id} record={record} />
              ))}
            </div>
          )}
        </Card>
        
        {/* Learning Events Feed */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" style={{ color: HIGH }} />
              <h3 className="text-sm font-bold text-white">Learning Feed</h3>
            </div>
            <span className="text-[10px]" style={{ color: MUTED }}>{learningStats.total} events</span>
          </div>
          
          {isLoading ? (
            <Skeleton lines={5} />
          ) : learningEvents.length === 0 ? (
            <EmptyState icon={Zap} title="No learning events" description="Learning activity will appear here" />
          ) : (
            <div className="space-y-1">
              {learningEvents.slice(0, 6).map(event => (
                <LearningEventRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </Card>
      </div>
      
      {/* Goal Progress */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5" style={{ color: LOW }} />
            <h3 className="text-sm font-bold text-white">Active Goals</h3>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span style={{ color: MUTED }}>Avg Progress: <span className="font-bold" style={{ color: CYAN }}>{goalStats.avgProgress}%</span></span>
          </div>
        </div>
        
        {isLoading ? (
          <Skeleton lines={4} />
        ) : goals.length === 0 ? (
          <EmptyState icon={Target} title="No goals" description="Create goals to track AI brain evolution" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.filter(g => g.status === "active").slice(0, 6).map(goal => (
              <GoalProgressCard key={goal.id} goal={goal} />
            ))}
          </div>
        )}
      </Card>
      
      {/* Memory Type Distribution */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" style={{ color: "#a855f7" }} />
            <h3 className="text-sm font-bold text-white">Memory Distribution</h3>
          </div>
        </div>
        
        {isLoading ? (
          <Skeleton lines={3} />
        ) : Object.keys(memoryStats.byType).length === 0 ? (
          <EmptyState icon={BookOpen} title="No memory types" description="Memory categorization will appear here" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(memoryStats.byType).map(([type, count]) => (
              <Card key={type} className="p-4 text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>
                  {type.replace(/_/g, " ")}
                </p>
                <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{count}</p>
                <div className="mt-2 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(count / memoryStats.total) * 100}%`,
                      background: CYAN
                    }}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}