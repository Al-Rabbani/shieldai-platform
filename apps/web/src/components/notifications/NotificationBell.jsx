import React, { useState, useEffect } from "react";
import { Bell, Check, X, AlertTriangle, Shield, Info, TrendingUp } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const TYPE_ICONS = {
  critical_threat: AlertTriangle,
  sla_breach: AlertTriangle,
  new_finding: Shield,
  scan_complete: Info,
  integration_error: AlertTriangle,
  ai_insight: TrendingUp,
  compliance_fail: AlertTriangle,
  system: Info,
};

const TYPE_COLORS = {
  critical_threat: "bg-red-500",
  sla_breach: "bg-red-500",
  new_finding: "bg-amber-500",
  scan_complete: "bg-blue-500",
  integration_error: "bg-red-500",
  ai_insight: "bg-purple-500",
  compliance_fail: "bg-amber-500",
  system: "bg-slate-500",
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      try {
        return await base44.entities.Notification.list("-created_at", 50);
      } catch {
        return [];
      }
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Notification.update(id, { read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["notifications"]);
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      await base44.entities.Notification.update(n.id, { read: true }).catch(() => {});
    }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["notifications"]);
    },
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (open && unreadCount > 0) {
      // Mark all as read when opening
      const timer = setTimeout(() => {
        markAllReadMutation.mutate();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-slate-800"
        >
          <Bell className="w-5 h-5 text-slate-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 bg-slate-900 border-slate-800 p-0" align="end">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-white">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              className="text-xs text-slate-400 hover:text-white"
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = TYPE_ICONS[notification.type] || Info;
              const color = TYPE_COLORS[notification.type] || "bg-slate-500";
              
              return (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors cursor-pointer ${
                    !notification.read ? "bg-slate-800/30" : ""
                  }`}
                  onClick={() => {
                    markReadMutation.mutate(notification.id);
                    if (notification.action_url) {
                      window.location.href = notification.action_url;
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4 text-slate-400" />
                        <h4 className="text-sm font-medium text-white truncate">
                          {notification.title}
                        </h4>
                      </div>
                      {notification.message && (
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-slate-500">
                          {getTimeAgo(notification.created_at)}
                        </span>
                        <Badge
                          className={`text-[9px] ${
                            notification.severity === "critical"
                              ? "bg-red-500/20 text-red-400 border-red-500/30"
                              : notification.severity === "high"
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                              : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                          }`}
                        >
                          {notification.severity}
                        </Badge>
                      </div>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}