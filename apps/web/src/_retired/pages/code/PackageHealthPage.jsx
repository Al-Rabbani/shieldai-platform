import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, Package, Shield, Clock, Users, Download, AlertTriangle, CheckCircle, ExternalLink, Eye, GitCompare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const POPULAR_PACKAGES = [
  { name: "express", registry: "npm", downloads: "45M", age: "11 years", maintainers: 3, health: 92 },
  { name: "lodash", registry: "npm", downloads: "52M", age: "12 years", maintainers: 5, health: 88 },
  { name: "requests", registry: "pypi", downloads: "280M", age: "13 years", maintainers: 4, health: 90 },
  { name: "django", registry: "pypi", downloads: "18M", age: "16 years", maintainers: 8, health: 95 },
  { name: "spring-boot", registry: "maven", downloads: "12M", age: "10 years", maintainers: 12, health: 94 },
  { name: "log4j", registry: "maven", downloads: "8M", age: "20 years", maintainers: 2, health: 28, critical: true },
  { name: "axios", registry: "npm", downloads: "48M", age: "9 years", maintainers: 4, health: 85 },
];

const registryColors = {
  npm: "bg-red-500/20 text-red-400 border-red-500/30",
  pypi: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  maven: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  rubygems: "bg-red-600/20 text-red-400 border-red-600/30",
  nuget: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

function HealthGauge({ score, size = "large" }) {
  const getColor = (s) => {
    if (s >= 70) return "#10b981";
    if (s >= 40) return "#f59e0b";
    return "#ef4444";
  };
  
  const color = getColor(score);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  
  return (
    <div className={`relative flex items-center justify-center ${size === "large" ? "w-32 h-32" : "w-16 h-16"}`}>
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="50%"
          cy="50%"
          r="45"
          fill="none"
          stroke="#1e293b"
          strokeWidth="8"
        />
        <circle
          cx="50%"
          cy="50%"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-bold ${size === "large" ? "text-3xl" : "text-sm"}`} style={{ color }}>
          {score}
        </span>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, icon: Icon, description, color = "#3b82f6" }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
          <span className="text-slate-300">{label}</span>
        </div>
        <span className="text-slate-400 text-xs">{description}</span>
      </div>
      <Progress value={value} className="h-2" style={{ "--progress-background": color }} />
    </div>
  );
}

function PackageCard({ pkg, onClick }) {
  return (
    <Card 
      className="cursor-pointer transition-all hover:border-slate-600 hover:shadow-lg"
      style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)", border: "1px solid #1e3a5f" }}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,0.15)" }}>
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                {pkg.name}
                <Badge className={registryColors[pkg.registry]}>
                  {pkg.registry}
                </Badge>
              </CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">{pkg.downloads} weekly downloads</p>
            </div>
          </div>
          <HealthGauge score={pkg.health} size="small" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-xs">
          <Clock className="w-3 h-3 text-slate-500" />
          <span className="text-slate-400">{pkg.age}</span>
          <Users className="w-3 h-3 text-slate-500 ml-2" />
          <span className="text-slate-400">{pkg.maintainers} maintainers</span>
        </div>
        {pkg.critical && (
          <div className="flex items-center gap-2 text-xs bg-red-500/10 text-red-400 px-2 py-1.5 rounded border border-red-500/20">
            <AlertTriangle className="w-3 h-3" />
            <span>3 CVEs — 1 critical</span>
          </div>
        )}
        {!pkg.critical && (
          <div className="flex items-center gap-2 text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1.5 rounded border border-emerald-500/20">
            <CheckCircle className="w-3 h-3" />
            <span>0 known CVEs</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PackageDetailModal({ pkg, onClose }) {
  const [maintenance] = useState(85);
  const [trust] = useState(92);
  const [scripts] = useState(100);
  const [build] = useState(88);
  const [popularity] = useState(95);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl"
        style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)", border: "1px solid #1e3a5f" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-700/50 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.15)" }}>
              <Package className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {pkg.name}
                <Badge className={registryColors[pkg.registry]}>{pkg.registry}</Badge>
              </h2>
              <p className="text-slate-400 text-sm mt-1">v4.18.2 • Released 3 days ago • MIT License</p>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
            <Eye className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overall Score */}
          <Card className="lg:col-span-1" style={{ background: "#0a0f1e", border: "1px solid #1e3a5f" }}>
            <CardHeader>
              <CardTitle className="text-slate-300 text-sm">Overall Health Score</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <HealthGauge score={pkg.health} size="large" />
              <p className="text-slate-400 text-sm mt-3">
                {pkg.health >= 70 ? "Healthy ✓" : pkg.health >= 40 ? "Moderate ⚠️" : "At Risk ❌"}
              </p>
            </CardContent>
          </Card>

          {/* Sub-scores */}
          <Card className="lg:col-span-2 space-y-4" style={{ background: "#0a0f1e", border: "1px solid #1e3a5f" }}>
            <CardHeader>
              <CardTitle className="text-slate-300 text-sm">Security & Quality Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScoreBar 
                label="Maintenance" 
                value={maintenance} 
                icon={Clock}
                description="Last updated 3 days ago — active ✓"
                color="#10b981"
              />
              <ScoreBar 
                label="Maintainer Trust" 
                value={trust} 
                icon={Users}
                description="3 verified maintainers — 2FA enabled ✓"
                color="#3b82f6"
              />
              <ScoreBar 
                label="Install Scripts" 
                value={scripts} 
                icon={Shield}
                description="No suspicious postinstall scripts ✓"
                color="#10b981"
              />
              <ScoreBar 
                label="Build Verifiability" 
                value={build} 
                icon={Package}
                description="Reproducible builds verified ✓"
                color="#8b5cf6"
              />
              <ScoreBar 
                label="Popularity & Longevity" 
                value={popularity} 
                icon={Download}
                description="12M weekly downloads — 8 years old ✓"
                color="#f59e0b"
              />
            </CardContent>
          </Card>
        </div>

        <div className="p-6 border-t border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">0 known CVEs</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">MIT License ✓</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2">
              <GitCompare className="w-4 h-4" />
              Compare versions
            </Button>
            <Button className="gap-2" style={{ background: "#3b82f6" }}>
              <Eye className="w-4 h-4" />
              Add to Watchlist
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PackageHealthPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState(["express", "lodash", "react"]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length > 2) {
        setIsSearching(true);
        // Simulated search - in production this would call an API
        setTimeout(() => {
          const results = POPULAR_PACKAGES.filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
          setSearchResults(results);
          setIsSearching(false);
        }, 500);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handlePackageClick = (pkg) => {
    setSelectedPackage(pkg);
    if (!recentSearches.includes(pkg.name)) {
      setRecentSearches([pkg.name, ...recentSearches.slice(0, 4)]);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Package Health Database</h1>
          <p className="text-slate-400 mt-2">
            Search and compare 3 million+ open source packages. Know if a dependency is safe, well-maintained, and trustworthy before you install it.
          </p>
        </div>

        {/* Search Bar */}
        <Card style={{ background: "#0f172a", border: "1px solid #1e3a5f" }}>
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <Input
                placeholder="Search packages — e.g. lodash, express, requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-lg bg-[#0a0f1e] border-slate-700 text-white"
                style={{ background: "#0a0f1e" }}
              />
              {isSearching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Recent Searches */}
            {!searchQuery && recentSearches.length > 0 && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs text-slate-500">Recent:</span>
                <div className="flex gap-2">
                  {recentSearches.map((term) => (
                    <Badge
                      key={term}
                      variant="outline"
                      className="cursor-pointer hover:bg-slate-700"
                      onClick={() => setSearchQuery(term)}
                    >
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-6 space-y-3">
                {searchResults.map((pkg) => (
                  <PackageCard key={pkg.name} pkg={pkg} onClick={() => handlePackageClick(pkg)} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Popular Packages */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" />
            Popular Packages
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {POPULAR_PACKAGES.map((pkg) => (
              <PackageCard key={pkg.name} pkg={pkg} onClick={() => handlePackageClick(pkg)} />
            ))}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedPackage && (
        <PackageDetailModal pkg={selectedPackage} onClose={() => setSelectedPackage(null)} />
      )}
    </div>
  );
}