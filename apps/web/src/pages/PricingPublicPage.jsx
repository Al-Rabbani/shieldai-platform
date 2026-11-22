import React, { useState } from "react";
import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const PLANS = [
  {
    name: "Free Forever",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "For individuals and small projects",
    features: {
      repos: "1 repository",
      scanners: "SAST + SCA only",
      cloud: "—",
      users: "1 user",
      support: "Community support",
      trial: "No credit card required",
    },
    cta: "Start Free",
    popular: false,
  },
  {
    name: "Starter",
    monthlyPrice: 99,
    annualPrice: 950,
    description: "For small teams getting started",
    features: {
      repos: "5 repositories",
      scanners: "SAST + SCA + Secrets",
      cloud: "1 cloud account",
      users: "5 users",
      support: "Community support",
      trial: "14-day free trial",
    },
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Professional",
    monthlyPrice: 299,
    annualPrice: 2870,
    description: "For growing security teams",
    features: {
      repos: "Unlimited repositories",
      scanners: "All Code Security scanners",
      cloud: "3 cloud accounts",
      users: "20 users",
      support: "Email + Chat (24h)",
      trial: "14-day free trial",
    },
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    monthlyPrice: 999,
    annualPrice: 9590,
    description: "For large organizations",
    features: {
      repos: "Unlimited",
      scanners: "Everything + Custom rules",
      cloud: "Unlimited cloud accounts",
      users: "Unlimited",
      support: "Dedicated Slack + 4h SLA",
      trial: "Custom contract",
    },
    cta: "Contact Sales",
    popular: false,
  },
];

const FAQ = [
  {
    q: "Can I scan unlimited repos on Professional?",
    a: "Yes! Professional includes unlimited repositories. Starter is limited to 5 repos.",
  },
  {
    q: "Do you store my source code?",
    a: "No. We scan code in-memory and never store your source code. Only scan metadata and findings are retained.",
  },
  {
    q: "What happens after the free trial?",
    a: "You can choose a paid plan to continue using all features, or downgrade to Free Forever to keep basic scanning.",
  },
  {
    q: "Do you offer a free tier?",
    a: "Yes! Free Forever includes 1 repository, SAST + SCA scanning, and community support — no credit card required.",
  },
  {
    q: "Can I get a demo?",
    a: "Absolutely! Book a personalized demo with our security team. We'll show you ShieldAI in action on your own codebase.",
  },
];

export default function PricingPublicPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50">
        <div className="p-8 max-w-7xl mx-auto">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-white">Simple, Transparent Pricing</h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Start free, scale as you grow. No hidden fees, no surprises.
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className={`text-sm ${!annual ? "text-white" : "text-slate-400"}`}>Monthly</span>
              <Switch checked={annual} onCheckedChange={setAnnual} />
              <span className={`text-sm ${annual ? "text-white" : "text-slate-400"}`}>
                Annual <span className="text-green-500">(Save 20%)</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="p-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={`border-slate-800 bg-slate-900/50 ${plan.popular ? "border-primary ring-2 ring-primary/20" : ""}`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">{plan.name}</CardTitle>
                  {plan.popular && <Badge className="bg-primary text-white">Most Popular</Badge>}
                </div>
                <div className="text-3xl font-bold text-white">
                  ${annual ? plan.annualPrice : plan.monthlyPrice}
                  <span className="text-sm text-slate-400 font-normal">/{annual ? "year" : "month"}</span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3 text-sm">
                  {Object.entries(plan.features).map(([key, value]) => (
                    <li key={key} className="flex items-start gap-2">
                      {value !== "—" ? (
                        <Check className="w-4 h-4 text-green-500 mt-0.5" />
                      ) : (
                        <X className="w-4 h-4 text-slate-600 mt-0.5" />
                      )}
                      <span className={value === "—" ? "text-slate-600" : "text-slate-300"}>{value}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {FAQ.map((item, i) => (
              <Card key={i} className="border-slate-800 bg-slate-900/50">
                <CardContent className="p-6">
                  <h3 className="text-white font-semibold mb-2">{item.q}</h3>
                  <p className="text-slate-400">{item.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Enterprise CTA */}
        <div className="mt-16 text-center">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-white mb-2">Need more?</h2>
              <p className="text-slate-400 mb-4">
                Talk to us about Enterprise custom pricing, on-premise deployment, and dedicated support.
              </p>
              <Button>Contact Sales</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}