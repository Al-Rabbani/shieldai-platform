import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Search } from "lucide-react";

export default function VulnFilterBar({ severity, setSeverity, pkg, setPkg, packages, exploitedOnly, setExploitedOnly, slaOnly, setSlaOnly, search, setSearch }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input placeholder="Search CVE, title, asset..." value={search} onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9 bg-slate-900 border-slate-700 text-white text-sm" />
      </div>

      <Select value={severity} onValueChange={setSeverity}>
        <SelectTrigger className="w-36 h-9 bg-slate-900 border-slate-700 text-white text-xs"><SelectValue placeholder="Severity" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Severities</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      <Select value={pkg} onValueChange={setPkg}>
        <SelectTrigger className="w-40 h-9 bg-slate-900 border-slate-700 text-white text-xs"><SelectValue placeholder="Package" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Packages</SelectItem>
          {packages.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
        </SelectContent>
      </Select>

      <label className="flex items-center gap-2 text-xs text-slate-300">
        <Switch checked={exploitedOnly} onCheckedChange={setExploitedOnly} /> Exploited only
      </label>
      <label className="flex items-center gap-2 text-xs text-slate-300">
        <Switch checked={slaOnly} onCheckedChange={setSlaOnly} /> SLA breached
      </label>
    </div>
  );
}