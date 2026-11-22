import React from "react";
import { Clock, AlertTriangle, CheckCircle, TrendingUp, X } from "lucide-react";
import { Card } from "@/components/gds/GDSOSShared";
import { HC_CARD, HC_TEAL, HC_RED, HC_ORANGE, HC_GREEN, BORDER, MUTED, TEXT } from "@/components/gds/HealthcareSecurityShared";

export default function HealthcareIncidentTimeline({ incident, onClose }) {
  if (!incident) return null;

  const events = [];
  
  if (incident.detected_at) {
    events.push({ 
      date: incident.detected_at, 
      type: "detected", 
      label: "Incident Detected", 
      icon: AlertTriangle, 
      color: HC_RED,
      description: incident.detection_source ? `Via ${incident.detection_source}` : "Initial detection"
    });
  }
  
  if (incident.escalated_at) {
    events.push({ 
      date: incident.escalated_at, 
      type: "escalated", 
      label: "Escalated", 
      icon: TrendingUp, 
      color: HC_ORANGE,
      description: incident.escalation_reason || "Priority increased"
    });
  }
  
  if (incident.contained_at) {
    events.push({ 
      date: incident.contained_at, 
      type: "contained", 
      label: "Contained", 
      icon: CheckCircle, 
      color: HC_TEAL,
      description: "Threat contained"
    });
  }
  
  if (incident.resolved_at) {
    events.push({ 
      date: incident.resolved_at, 
      type: "resolved", 
      label: "Resolved", 
      icon: CheckCircle, 
      color: HC_GREEN,
      description: incident.resolution_summary || "Incident closed"
    });
  }

  events.sort((a, b) => new Date(a.date) - new Date(b.date));

  const getStatusDuration = (start, end) => {
    if (!start || !end) return null;
    const diff = new Date(end) - new Date(start);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    return `${hours}h`;
  };

  return (
    <Card className="p-4 h-full" style={HC_CARD}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">Incident Timeline</h3>
        {onClose && (
          <button onClick={onClose} className="text-white/50 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mb-4 pb-4 border-b" style={{ borderColor: BORDER }}>
        <p className="text-xs font-bold text-white mb-1">{incident.incident_ref}</p>
        <p className="text-[10px]" style={{ color: MUTED }}>{incident.title || "Clinical Incident"}</p>
      </div>

      <div className="space-y-4">
        {events.map((event, idx) => {
          const Icon = event.icon;
          const nextEvent = events[idx + 1];
          const duration = nextEvent ? getStatusDuration(event.date, nextEvent.date) : null;
          
          return (
            <div key={event.type} className="relative">
              {idx < events.length - 1 && (
                <div 
                  className="absolute left-2 top-6 w-0.5"
                  style={{ 
                    height: "calc(100% + 16px)", 
                    background: `linear-gradient(to bottom, ${event.color}40, ${events[idx + 1].color}40)` 
                  }} 
                />
              )}
              
              <div className="flex items-start gap-3">
                <div 
                  className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                  style={{ background: event.color, boxShadow: `0 0 12px ${event.color}60` }}
                >
                  <Icon className="w-3 h-3 text-white" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">{event.label}</span>
                    <span className="text-[10px]" style={{ color: MUTED }}>
                      {new Date(event.date).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {event.description && (
                    <p className="text-[10px] mb-1" style={{ color: MUTED }}>{event.description}</p>
                  )}
                  
                  {duration && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Clock className="w-3 h-3" style={{ color: HC_TEAL }} />
                      <span className="text-[9px] font-bold" style={{ color: HC_TEAL }}>
                        {duration} until next stage
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {events.length === 0 && (
          <p className="text-[10px] text-center py-8" style={{ color: MUTED }}>No timeline data available</p>
        )}
      </div>
    </Card>
  );
}