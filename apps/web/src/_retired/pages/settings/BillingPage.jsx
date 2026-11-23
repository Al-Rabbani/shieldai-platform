import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CreditCard, Download, TrendingUp, Users, GitBranch, Cloud, Clock, Loader2, Sword, AlertTriangle, Copy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const PLANS = [
  {
    name: "Starter",
    price: 99,
    period: "month",
    description: "For small teams getting started",
    features: [
      "Up to 5 repositories",
      "SAST + SCA + Secrets scanning",
      "1 cloud account",
      "5 users",
      "Community support",
      "14-day free trial",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Professional",
    price: 299,
    period: "month",
    description: "For growing security teams",
    features: [
      "Unlimited repositories",
      "All Code Security scanners",
      "3 cloud accounts (AWS, Azure, GCP)",
      "DAST scanning (10 targets)",
      "Pentest (2 jobs/month)",
      "Autonomous SOC",
      "Threat Intel feeds",
      "20 users",
      "Slack + Jira integrations",
      "Email support (24h response)",
    ],
    cta: "Upgrade to Professional",
    popular: true,
  },
  {
    name: "Enterprise",
    price: 999,
    period: "month",
    description: "For large organizations",
    features: [
      "Everything in Professional",
      "Unlimited cloud accounts",
      "Unlimited DAST targets",
      "Unlimited pentest jobs",
      "MSSP multi-tenant mode",
      "Custom rules engine",
      "On-prem broker",
      "SSO / SAML",
      "Dedicated Slack channel",
      "SLA: 4h response",
      "Custom contract + invoicing",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const INVOICES = [
  { id: "INV-2026-001", date: "2026-06-01", amount: 299, status: "paid", plan: "Professional" },
  { id: "INV-2026-002", date: "2026-05-01", amount: 299, status: "paid", plan: "Professional" },
  { id: "INV-2026-003", date: "2026-04-01", amount: 299, status: "paid", plan: "Professional" },
];

export default function BillingPage() {
  const [selectedPlan, setSelectedPlan] = useState(null);

  const { data: usageData, isLoading: isLoadingUsage } = useQuery({
    queryKey: ["billing-usage"],
    queryFn: async () => {
      const res = await base44.functions.invoke("shieldRevenue", { action: "get_usage" });
      return res.data;
    },
    initialData: null,
  });

  const { data: plansData } = useQuery({
    queryKey: ["billing-plans"],
    queryFn: async () => {
      const res = await base44.functions.invoke("shieldRevenue", { action: "get_plans" });
      return res.data?.plans || PLANS;
    },
    initialData: PLANS,
  });

  const handleUpgrade = async (planName) => {
    try {
      const res = await base44.functions.invoke("shieldRevenue", { action: "create_checkout", plan: planName });
      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      }
    } catch (error) {
      console.error("Checkout failed:", error);
    }
  };

  const usage = usageData?.usage || {
    repos: { used: 3, limit: 5, pct: 60 },
    cloudAccounts: { used: 1, limit: 1, pct: 100 },
    scansToday: { used: 2, limit: 3, pct: 67 },
    pentestJobs: { used: 0, limit: 1, pct: 0 },
  };

  const currentPlan = usageData?.plan || "Free";
  const atLimit = usageData?.at_limit || false;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Billing & Plan</h1>
        <p className="text-slate-400">Manage your subscription, usage, and invoices</p>
      </div>

      {/* Usage Alert */}
      {atLimit && (
        <div className="rounded-xl border p-4 flex items-center gap-3" style={{ background: "rgba(234,179,8,0.1)", borderColor: "#eab30866" }}>
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-yellow-400 font-bold text-sm">⚠️ You've reached your plan limit. </span>
            <span className="text-slate-300 text-sm">Upgrade to continue scanning.</span>
          </div>
          <Button size="sm" onClick={() => document.getElementById("upgrade-dialog")?.click()} style={{ background: "#eab308", color: "#000" }}>
            Upgrade Now
          </Button>
        </div>
      )}

      {/* Current Plan */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Current Plan</CardTitle>
              <CardDescription>Your subscription and usage</CardDescription>
            </div>
            <Badge className={currentPlan === "Free" ? "bg-slate-700/50 text-slate-300 border-slate-600" : "bg-primary/10 text-primary border-primary/20"}>{currentPlan}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoadingUsage ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <GitBranch className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-400">Repositories</span>
                </div>
                <div className="text-2xl font-bold text-white">{usage.repos?.used || 0} / {usage.repos?.limit || 5}</div>
                <Progress value={usage.repos?.pct || 0} className={`mt-2 ${usage.repos?.pct >= 80 ? "[&>div]:bg-red-500" : usage.repos?.pct >= 60 ? "[&>div]:bg-amber-500" : "[&>div]:bg-green-500"}`} />
                {usage.repos?.pct >= 100 && <Badge className="mt-2 bg-red-500/20 text-red-400 border-red-500/30 text-xs">AT LIMIT</Badge>}
              </div>
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <Cloud className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-400">Cloud Accounts</span>
                </div>
                <div className="text-2xl font-bold text-white">{usage.cloudAccounts?.used || 0} / {usage.cloudAccounts?.limit || 1}</div>
                <Progress value={usage.cloudAccounts?.pct || 0} className={`mt-2 ${usage.cloudAccounts?.pct >= 80 ? "[&>div]:bg-red-500" : usage.cloudAccounts?.pct >= 60 ? "[&>div]:bg-amber-500" : "[&>div]:bg-green-500"}`} />
                {usage.cloudAccounts?.pct >= 100 && <Badge className="mt-2 bg-red-500/20 text-red-400 border-red-500/30 text-xs">AT LIMIT</Badge>}
              </div>
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-400">Scans Today</span>
                </div>
                <div className="text-2xl font-bold text-white">{usage.scansToday?.used || 0} / {usage.scansToday?.limit || 3}</div>
                <Progress value={usage.scansToday?.pct || 0} className={`mt-2 ${usage.scansToday?.pct >= 80 ? "[&>div]:bg-red-500" : usage.scansToday?.pct >= 60 ? "[&>div]:bg-amber-500" : "[&>div]:bg-green-500"}`} />
              </div>
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <Sword className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-400">Pentest Jobs</span>
                </div>
                <div className="text-2xl font-bold text-white">{usage.pentestJobs?.used || 0} / {usage.pentestJobs?.limit || 1}</div>
                <Progress value={usage.pentestJobs?.pct || 0} className={`mt-2 ${usage.pentestJobs?.pct >= 80 ? "[&>div]:bg-red-500" : usage.pentestJobs?.pct >= 60 ? "[&>div]:bg-amber-500" : "[&>div]:bg-green-500"}`} />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button id="upgrade-dialog">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Upgrade Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800">
                <DialogHeader>
                  <DialogTitle className="text-white">Choose Your Plan</DialogTitle>
                  <DialogDescription>Select the plan that fits your team</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {plansData.map((plan) => (
                    <Card key={plan.name} className={`border-slate-700 bg-slate-800/50 ${plan.popular ? "border-primary ring-2 ring-primary/20" : ""} ${plan.current ? "ring-2 ring-green-500/50" : ""}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-white">{plan.name}</CardTitle>
                          {plan.popular && <Badge className="bg-primary text-white">Most Popular</Badge>}
                          {plan.current && <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Current</Badge>}
                        </div>
                        <div className="text-3xl font-bold text-white">
                          {plan.contact ? "Contact Sales" : plan.price === 0 ? "Free" : `$${plan.price}`}
                          {!plan.contact && plan.price > 0 && <span className="text-sm text-slate-400">/{plan.period}</span>}
                        </div>
                        <CardDescription>{plan.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm text-slate-400 mb-4">
                          {plan.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <Button 
                          className="w-full" 
                          variant={plan.popular ? "default" : "outline"}
                          disabled={plan.current}
                          onClick={() => !plan.current && handleUpgrade(plan.name)}
                        >
                          {plan.current ? "Current Plan" : plan.cta}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10">
              Cancel Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Payment Method</CardTitle>
          <CardDescription>Manage your billing details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-slate-400" />
              <div>
                <div className="text-white font-medium">•••• •••• •••• 4242</div>
                <div className="text-xs text-slate-400">Expires 12/2027</div>
              </div>
            </div>
            <Button variant="outline" size="sm">Update</Button>
          </div>
        </CardContent>
      </Card>

      {/* Stripe Webhook Setup */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Stripe Setup Guide</CardTitle>
              <CardDescription>Configure webhooks for payment events</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Webhook Endpoint URL:</span>
              <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText("https://app.base44.com/api/apps/6a22a773bb173a975d8337f9/functions/shieldStripeWebhook")}>
                <Copy className="w-3 h-3 mr-2" /> Copy
              </Button>
            </div>
            <code className="block p-3 rounded bg-slate-900 text-xs text-blue-400 font-mono break-all">
              https://app.base44.com/api/apps/6a22a773bb173a975d8337f9/functions/shieldStripeWebhook
            </code>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <h4 className="text-sm font-semibold text-white mb-2">Events to subscribe to:</h4>
            <ul className="text-xs text-slate-400 space-y-1 font-mono">
              <li>• checkout.session.completed</li>
              <li>• customer.subscription.updated</li>
              <li>• customer.subscription.deleted</li>
              <li>• invoice.payment_succeeded</li>
              <li>• invoice.payment_failed</li>
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <p className="text-xs text-slate-300">
              <strong className="text-blue-400">Instructions:</strong> Add the webhook URL above to your Stripe Dashboard → Developers → Webhooks. Copy the webhook signing secret and add it to Builder secrets as <code className="bg-slate-900 px-2 py-0.5 rounded text-blue-400 font-mono">SHIELD_STRIPE_WEBHOOK_SECRET</code>.
            </p>
          </div>
          <Button variant="outline" onClick={() => window.open("https://dashboard.stripe.com/webhooks", "_blank")}>
            Open Stripe Dashboard →
          </Button>
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Invoice History</CardTitle>
          <CardDescription>Last 12 months of billing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {INVOICES.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <div>
                  <div className="text-white font-medium">{invoice.id}</div>
                  <div className="text-xs text-slate-400">{invoice.date} • {invoice.plan}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-white font-medium">${invoice.amount}</div>
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20">{invoice.status}</Badge>
                  <Button variant="ghost" size="icon">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stripe Webhook Setup Guide */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Stripe Webhook Setup</CardTitle>
          <CardDescription>Configure Stripe to send payment events to ShieldAI</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-400 font-mono">Webhook Endpoint URL</p>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigator.clipboard.writeText("https://app.base44.com/api/apps/6a22a773bb173a975d8337f9/functions/shieldStripeWebhook")}>
                <Copy className="w-3 h-3 mr-1" /> Copy
              </Button>
            </div>
            <code className="text-xs text-white font-mono break-all">https://app.base44.com/api/apps/6a22a773bb173a975d8337f9/functions/shieldStripeWebhook</code>
          </div>
          
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <p className="text-xs text-slate-400 mb-2 font-semibold">Events to subscribe to:</p>
            <ul className="text-xs text-slate-300 space-y-1 font-mono">
              <li>• checkout.session.completed</li>
              <li>• customer.subscription.updated</li>
              <li>• customer.subscription.deleted</li>
              <li>• invoice.payment_succeeded</li>
              <li>• invoice.payment_failed</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <p className="text-xs text-blue-300">
              <strong className="block mb-1">Setup Instructions:</strong>
              1. Open your Stripe Dashboard → Developers → Webhooks<br/>
              2. Add the webhook URL above<br/>
              3. Select the events listed above<br/>
              4. Copy the webhook signing secret and add it to Builder secrets as <code className="bg-slate-900 px-1.5 py-0.5 rounded">SHIELD_STRIPE_WEBHOOK_SECRET</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}