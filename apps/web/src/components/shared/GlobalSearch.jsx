import React, { useState, useEffect, useRef } from "react";
import { Search, X, AlertTriangle, Server, Clock, Shield } from "lucide-react";

const MOCK_RESULTS = [
  { id: '1', type: 'finding', title: 'SQL Injection in login endpoint', subtitle: 'src/auth/login.ts:47', severity: 'critical' },
  { id: '2', type: 'finding', title: 'Hardcoded AWS credentials', subtitle: 'config/database.js:12', severity: 'critical' },
  { id: '3', type: 'asset', title: 'production-api-cluster', subtitle: 'AWS • us-east-1' },
  { id: '4', type: 'scan', title: 'SAST Scan - shieldai-platform', subtitle: 'Completed 2 hours ago' },
  { id: '5', type: 'policy', title: 'Require MFA for all users', subtitle: 'Policy #47 • 84% compliant' },
];

const SEVERITY_COLORS = {
  critical: { bg: "bg-red-600" },
  high: { bg: "bg-orange-500" },
  medium: { bg: "bg-yellow-500" },
  low: { bg: "bg-blue-500" },
  info: { bg: "bg-gray-500" },
};

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function GlobalSearch({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results.length, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      const filtered = MOCK_RESULTS.filter(r =>
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.subtitle.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
      setSelectedIndex(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative max-w-2xl mx-auto mt-[20vh] rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center gap-3 p-4 border-b border-slate-800">
          <Search className="w-5 h-5 text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search findings, assets, scans, policies..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-slate-500"
          />
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">⌘</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">K</kbd>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {results.length > 0 && (
          <div className="max-h-[60vh] overflow-y-auto p-2">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
              Results ({results.length})
            </div>
            {results.map((result, index) => (
              <button
                key={result.id}
                onClick={() => {
                  console.log('Navigate to:', result.id);
                  onClose();
                }}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all",
                  index === selectedIndex ? "bg-slate-800" : "hover:bg-slate-800/50"
                )}
              >
                {result.severity && (
                  <div className={cn("w-2 h-2 rounded-full mt-1.5", SEVERITY_COLORS[result.severity].bg)} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{result.title}</div>
                  <div className="text-xs text-slate-400 truncate">{result.subtitle}</div>
                </div>
                {result.type === 'finding' && <AlertTriangle className="w-4 h-4 text-slate-500" />}
                {result.type === 'asset' && <Server className="w-4 h-4 text-slate-500" />}
                {result.type === 'scan' && <Clock className="w-4 h-4 text-slate-500" />}
                {result.type === 'policy' && <Shield className="w-4 h-4 text-slate-500" />}
              </button>
            ))}
          </div>
        )}

        {!query.trim() && (
          <div className="p-8 text-center">
            <div className="text-sm text-slate-400 mb-2">Recent searches</div>
            <div className="space-y-2">
              {['SQL injection', 'AWS credentials', 'production-api'].map(search => (
                <button
                  key={search}
                  onClick={() => setQuery(search)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/50 text-sm text-slate-400"
                >
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}

        {query.trim() && results.length === 0 && (
          <div className="p-8 text-center">
            <div className="text-sm text-slate-400">No results found for "{query}"</div>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-[10px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">↵</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">esc</kbd>
              close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}