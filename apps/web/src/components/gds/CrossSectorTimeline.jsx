import React, { useState, useMemo } from "react";
import { Card } from "@/components/gds/GDSOSShared";
import { formatDistanceToNow } from "date-fns";
import {
  Activity, AlertTriangle, Shield, DollarSign, Heart, Zap, Factory,
  Radio, Building2, Globe, Crosshair, Clock, Filter
} from "lucide-react";

// Sector colors defined locally
const NATIONAL_AMBER = "#f59e0b";
const HEALTHCARE_TEAL = "#14b8a6";
const FINANCIAL_GREEN = "#10b981";
const OT_AMBER = "#f59e0b";
const TEL_BLUE = "#0ea5e9";
const CYAN_BLUE = "#06b6d4";

const SECTOR_CONFIG = {
  national: { color: NATIONAL_AMBER, icon: Shield, label: "National" },
  mssp: { color: CYAN_BLUE, icon: Activity, label: "MSSP" },
  financial: { color: FINANCIAL_GREEN, icon: DollarSign, label: "Financial" },
  healthcare: { color: HEALTHCARE_TEAL, icon: Heart, label: "Healthcare" },
  critical_infrastructure: { color: OT_AMBER, icon: Zap, label: "Critical Infra" },
  industrial: { color: OT_AMBER, icon: Factory, label: "Industrial" },
  smart_city: { color: CYAN_BLUE, icon: Building2, label: "Smart City" },
  telecom: { color: TEL_BLUE, icon: Radio, label: "Telecom" },
  soc: { color: "#ef4444", icon: AlertTriangle, label: "SOC" },
};

const TIME_RANGES = [
  { label: "6H", value: 6, unit: "hours" },
  { label: "12H", value: 12, unit: "hours" },
  { label: "24H", value: 24, unit: "hours" },
  { label: "48H", value: 48, unit: "hours" },
  { label: "7D", value: 7, unit: "days" },
  { label: "14D", value: 14, unit: "days" },
];

export default function CrossSectorTimeline({
  nationalIncidents = [],
  msspIncidents = [],
  financialIncidents = [],
  healthcareIncidents = [],
  criticalIncidents = [],
  industrialIncidents = [],
  smartCityIncidents = [],
  telecomIncidents = [],
  socIncidents = []
}) {
  const [selectedRange, setSelectedRange] = useState(24);
  const [selectedSectors, setSelectedSectors] = useState(Object.keys(SECTOR_CONFIG));
  const [hoveredEvent, setHoveredEvent] = useState(null);

  // Merge all incidents with sector tagging
  const allIncidents = useMemo(() => {
    const incidents = [
      ...nationalIncidents.map(i => ({ ...i, sector: "national" })),
      ...msspIncidents.map(i => ({ ...i, sector: "mssp" })),
      ...financialIncidents.map(i => ({ ...i, sector: "financial" })),
      ...healthcareIncidents.map(i => ({ ...i, sector: "healthcare" })),
      ...criticalIncidents.map(i => ({ ...i, sector: "critical_infrastructure" })),
      ...industrialIncidents.map(i => ({ ...i, sector: "industrial" })),
      ...smartCityIncidents.map(i => ({ ...i, sector: "smart_city" })),
      ...telecomIncidents.map(i => ({ ...i, sector: "telecom" })),
      ...socIncidents.map(i => ({ ...i, sector: "soc" })),
    ];

    // Filter by time range
    const cutoff = new Date();
    if (selectedRange < 24) {
      cutoff.setHours(cutoff.getHours() - selectedRange);
    } else {
      cutoff.setDate(cutoff.getDate() - (selectedRange / 24));
    }

    return incidents
      .filter(i => {
        const incidentDate = new Date(i.detected_at || i.created_at || i.started_at || 0);
        return incidentDate >= cutoff && selectedSectors.includes(i.sector);
      })
      .sort((a, b) => new Date(b.detected_at || b.created_at || b.started_at || 0) - new Date(a.detected_at || a.created_at || a.started_at || 0));
  }, [nationalIncidents, msspIncidents, financialIncidents, healthcareIncidents, criticalIncidents, industrialIncidents, smartCityIncidents, telecomIncidents, socIncidents, selectedRange, selectedSectors]);

  // Calculate timeline positions
  const timelineData = useMemo(() => {
    if (allIncidents.length === 0) return [];
    
    const now = new Date();
    const oldest = new Date(allIncidents[allIncidents.length - 1]?.detected_at || allIncidents[allIncidents.length - 1]?.created_at || now);
    const timeframe = now - oldest;

    return allIncidents.map(incident => {
      const incidentTime = new Date(incident.detected_at || incident.created_at || incident.started_at || now);
      const position = timeframe > 0 ? ((now - incidentTime) / timeframe) * 100 : 0;
      const config = SECTOR_CONFIG[incident.sector] || SECTOR_CONFIG.soc;
      
      return {
        ...incident,
        position: Math.min(95, Math.max(5, position)),
        config,
        timeAgo: formatDistanceToNow(incidentTime, { addSuffix: true }),
      };
    });
  }, [allIncidents]);

  // Count by sector
  const sectorCounts = useMemo(() => {
    const counts = {};
    Object.keys(SECTOR_CONFIG).forEach(k => counts[k] = 0);
    allIncidents.forEach(i => { counts[i.sector] = (counts[i.sector] || 0) + 1; });
    return counts;
  }, [allIncidents]);

  const toggleSector = (sector) => {
    setSelectedSectors(prev => 
      prev.includes(sector) 
        ? prev.filter(s => s !== sector)
        : [...prev, sector]
    );
  };

  return (
    <Card className="p-5" glow>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Globe className="w-4 h-4" style={{ color: CYAN_BLUE }} />
          Cross-Sector Threat Timeline
        </h3>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5" style={{ color: "#64748b" }} />
          <span className="text-[10px] font-bold" style={{ color: "#64748b" }}>
            {allIncidents.length} events
          </span>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center gap-2 mb-4">
        {TIME_RANGES.map(range => (
          <button
            key={range.value}
            onClick={() => setSelectedRange(range.value)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
              selectedRange === range.value ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-400' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
            }`}
            style={{ border: `1px solid ${selectedRange === range.value ? '#22d3ee40' : 'rgba(255,255,255,0.1)'}` }}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* Sector Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(SECTOR_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = selectedSectors.includes(key);
          const count = sectorCounts[key] || 0;
          return (
            <button
              key={key}
              onClick={() => toggleSector(key)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all ${
                isActive ? 'ring-1 ring-white/20' : 'opacity-50 grayscale'
              }`}
              style={{ 
                background: isActive ? `${config.color}15` : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isActive ? config.color + '30' : 'rgba(255,255,255,0.1)'}`,
                color: isActive ? config.color : '#64748b'
              }}
            >
              <Icon className="w-3 h-3" />
              <span>{config.label}</span>
              <span className="px-1.5 py-0.5 rounded-full" style={{ background: `${config.color}20`, color: config.color }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Timeline Visualization */}
      <div className="relative h-48 mb-4">
        {/* Timeline axis */}
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "rgba(255,255,255,0.2)" }} />
        
        {/* Time markers */}
        {[0, 25, 50, 75, 100].map(pos => (
          <div key={pos} className="absolute bottom-0 flex flex-col items-center" style={{ left: `${pos}%` }}>
            <div className="h-2 w-px" style={{ background: "rgba(255,255,255,0.3)" }} />
            <span className="text-[8px] mt-1" style={{ color: "#64748b" }}>
              {pos === 0 ? 'Now' : pos === 100 ? 'Start' : `${Math.round((pos / 100) * selectedRange)}${selectedRange >= 24 ? 'd' : 'h'}`}
            </span>
          </div>
        ))}

        {/* Event dots */}
        {timelineData.map((event, idx) => {
          const Icon = event.config.icon;
          return (
            <div
              key={event.id || idx}
              className="absolute cursor-pointer transition-transform hover:scale-125"
              style={{ 
                left: `${event.position}%`, 
                bottom: `${20 + (idx % 3) * 25}px`,
                transform: 'translateX(-50%)'
              }}
              onMouseEnter={() => setHoveredEvent(event)}
              onMouseLeave={() => setHoveredEvent(null)}
            >
              <div 
                className="w-3 h-3 rounded-full flex items-center justify-center animate-pulse"
                style={{ 
                  background: event.config.color,
                  boxShadow: `0 0 12px ${event.config.color}80`,
                  border: '2px solid white'
                }}
              />
              {hoveredEvent?.id === event.id && (
                <div 
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2.5 rounded-lg shadow-xl z-50 min-w-[200px] pointer-events-none"
                  style={{ 
                    background: '#0a1628', 
                    border: `1px solid ${event.config.color}40`,
                    boxShadow: `0 4px 24px rgba(0,0,0,0.4)`
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-3.5 h-3.5" style={{ color: event.config.color }} />
                    <span className="text-[10px] font-bold" style={{ color: event.config.color }}>{event.config.label}</span>
                  </div>
                  <p className="text-xs font-semibold text-white mb-1 truncate">
                    {event.title || event.incident_ref || event.name || 'Unknown Event'}
                  </p>
                  <div className="flex items-center justify-between text-[9px]" style={{ color: '#94a3b8' }}>
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {event.timeAgo}
                    </span>
                    <span className="px-1.5 py-0.5 rounded" style={{ 
                      background: `${event.severity === 'critical' ? '#ef4444' : event.severity === 'high' ? '#f97316' : '#eab308'}20`,
                      color: event.severity === 'critical' ? '#ef4444' : event.severity === 'high' ? '#f97316' : '#eab308'
                    }}>
                      {event.severity || 'UNKNOWN'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {timelineData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm" style={{ color: '#64748b' }}>No incidents in selected time range</p>
          </div>
        )}
      </div>

      {/* Pattern Analysis */}
      {allIncidents.length > 5 && (
        <div className="grid grid-cols-3 gap-3 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div>
            <p className="text-[9px] font-bold uppercase mb-1" style={{ color: '#64748b' }}>Peak Activity</p>
            <p className="text-sm font-black" style={{ color: CYAN_BLUE }}>
              {(() => {
                const hours = {};
                allIncidents.forEach(i => {
                  const h = new Date(i.detected_at || i.created_at || 0).getHours();
                  hours[h] = (hours[h] || 0) + 1;
                });
                const peakHour = Object.entries(hours).sort((a, b) => b[1] - a[1])[0];
                return peakHour ? `${peakHour[0]}:00 UTC` : 'N/A';
              })()}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase mb-1" style={{ color: '#64748b' }}>Most Active Sector</p>
            <p className="text-sm font-black" style={{ color: Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])[0] ? SECTOR_CONFIG[Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])[0][0]].color : '#64748b' }}>
              {(() => {
                const top = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])[0];
                return top && top[1] > 0 ? SECTOR_CONFIG[top[0]].label : 'N/A';
              })()}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase mb-1" style={{ color: '#64748b' }}>Event Rate</p>
            <p className="text-sm font-black" style={{ color: '#10b981' }}>
              {(allIncidents.length / selectedRange).toFixed(1)}/hr
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}