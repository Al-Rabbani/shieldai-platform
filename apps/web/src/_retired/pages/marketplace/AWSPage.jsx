import React from "react";
import { ExternalLink, Cloud } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AWSPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <Cloud className="w-16 h-16 text-orange-500 mx-auto" />
        <h1 className="text-3xl font-bold text-white">ShieldAI on AWS Marketplace</h1>
        <p className="text-slate-400">Coming Soon — Join the waitlist</p>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardContent className="p-8 space-y-6">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-800/50">
            <div className="text-2xl font-bold text-white">AWS Marketplace</div>
            <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">Coming Soon</Badge>
          </div>

          <div className="space-y-4">
            <h3 className="text-white font-semibold">Benefits of deploying via AWS:</h3>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                Consolidated AWS billing — charge to your AWS commit
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                1-click deploy to your VPC
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                AWS-native IAM integration
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                Private pricing available
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-white font-semibold">Deployment Options:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-slate-800/50">
                <div className="text-white font-medium">SaaS (Cloud-hosted)</div>
                <div className="text-slate-400 text-sm">Managed by ShieldAI, data in your AWS region</div>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/50">
                <div className="text-white font-medium">AMI (Self-hosted)</div>
                <div className="text-slate-400 text-sm">Deploy on your EC2 instances, full control</div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <div className="text-slate-400 mb-4">Notify me when ShieldAI launches on AWS Marketplace:</div>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 bg-slate-800 border-slate-700 rounded px-4 py-2 text-white"
              />
              <Button>Join Waitlist</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}