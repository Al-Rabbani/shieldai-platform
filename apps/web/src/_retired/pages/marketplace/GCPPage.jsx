import React from "react";
import { Cloud } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function GCPPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <Cloud className="w-16 h-16 text-red-500 mx-auto" />
        <h1 className="text-3xl font-bold text-white">ShieldAI on Google Cloud Marketplace</h1>
        <p className="text-slate-400">Coming Soon — Join the waitlist</p>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardContent className="p-8 space-y-6">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-800/50">
            <div className="text-2xl font-bold text-white">Google Cloud Marketplace</div>
            <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Coming Soon</Badge>
          </div>

          <div className="space-y-4 text-slate-400">
            <p>ShieldAI will be available on Google Cloud Marketplace with:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Cloud Identity integration</li>
              <li>Google Workspace SSO</li>
              <li>Consolidated GCP billing</li>
              <li>1-click deploy to your GCP project</li>
            </ul>
          </div>

          <div className="text-center">
            <p className="text-slate-500">Email capture form coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}