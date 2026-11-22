import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Globe, Search, ExternalLink, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AttackSurfaceIntelPage() {
  const [domain, setDomain] = useState("");
  const [searchResults, setSearchResults] = useState(null);

  const handleSearch = async () => {
    if (!domain) return;
    // Mock search results
    setSearchResults({
      shodan: { assets: 47, vulnerable: 12, openPorts: 156 },
      censys: { certs: 23, subdomains: 89 },
      crtsh: { historicalCerts: 156, subdomains: 234 },
    });
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Attack Surface Intelligence</h1>
        <p className="text-slate-400">Discover internet-exposed assets with Shodan, Censys, and crt.sh</p>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Domain Search</CardTitle>
          <CardDescription>Discover all assets associated with your domain</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <Button onClick={handleSearch}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>

          {searchResults && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <Card className="border-slate-800 bg-slate-900/50">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-yellow-500" />
                    <CardTitle className="text-white text-sm">Shodan</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Assets Found</span>
                    <span className="text-white font-semibold">{searchResults.shodan.assets}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Vulnerable</span>
                    <span className="text-red-400 font-semibold">{searchResults.shodan.vulnerable}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Open Ports</span>
                    <span className="text-white font-semibold">{searchResults.shodan.openPorts}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Search className="w-5 h-5 text-blue-500" />
                    <CardTitle className="text-white text-sm">Censys</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">TLS Certificates</span>
                    <span className="text-white font-semibold">{searchResults.censys.certs}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Subdomains</span>
                    <span className="text-white font-semibold">{searchResults.censys.subdomains}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <CardTitle className="text-white text-sm">crt.sh (Free)</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Historical Certs</span>
                    <span className="text-white font-semibold">{searchResults.crtsh.historicalCerts}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Subdomains</span>
                    <span className="text-white font-semibold">{searchResults.crtsh.subdomains}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-white text-sm">Shodan</CardTitle>
            <CardDescription>Internet-wide scan data</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-400">
            Discovers internet-exposed assets, open ports, running services, and known vulnerabilities
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-white text-sm">Censys</CardTitle>
            <CardDescription>Certificate transparency + host data</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-400">
            Monitors TLS certificates and discovers shadow IT subdomains you didn't know existed
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-white text-sm">crt.sh</CardTitle>
            <CardDescription>Free certificate search</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-400">
            Search all TLS certificates ever issued — great for discovering forgotten/abandoned subdomains
          </CardContent>
        </Card>
      </div>
    </div>
  );
}