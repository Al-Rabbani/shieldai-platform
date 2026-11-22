import React from "react";
import { Check, Zap, Shield, Building2, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const tiers = [
  {
    name: "Starter",
    price: "£99",
    period: "/month",
    description: "For small teams getting started with cloud security",
    icon: Zap,
    stripeLink: "https://buy.stripe.com/test_3cIfZg0Sh4kJalH12w7Re00",
    popular: false,
    features: [
      "Up to 50 cloud assets",
      "Vulnerability Assessment (AWS, GCP, Azure)",
      "CVE scanning & CVSS scoring",
      "Basic compliance checks (CIS Benchmarks)",
      "Email notifications",
      "1 team member",
    ],
  },
  {
    name: "Professional",
    price: "£299",
    period: "/month",
    description: "For growing security teams protecting AI-native infrastructure",
    icon: Shield,
    stripeLink: "https://buy.stripe.com/test_14A8wO30paJ70L78uY7Re01",
    popular: true,
    features: [
      "Up to 500 cloud assets",
      "Full Vulnerability Assessment + Management lifecycle",
      "AI-powered Penetration Testing (APIs, IAM, LLM injection)",
      "Compliance: SOC 2, ISO 27001, NIST AI RMF, GDPR",
      "Slack + Jira integrations",
      "Up to 10 team members",
    ],
  },
  {
    name: "Enterprise",
    price: "£899",
    period: "/month",
    description: "For enterprises demanding full-spectrum security coverage",
    icon: Building2,
    stripeLink: "https://buy.stripe.com/test_7sYaEW0Sh9F3fG14eI7Re02",
    popular: false,
    features: [
      "Unlimited assets",
      "Full platform access incl. supply chain attack testing",
      "Custom compliance frameworks",
      "Dedicated security engineer support",
      "SSO + RBAC + API access",
      "Unlimited team members",
      "SLA guarantee",
    ],
  },
];

export default function Pricing() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground font-heading">Simple, Transparent Pricing</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto text-sm">
          Choose the plan that fits your team. All plans include core ShieldAI infrastructure scanning and real-time threat detection.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          return (
            <div
              key={tier.name}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-7 transition-all duration-300",
                tier.popular
                  ? "border-primary shadow-[0_0_40px_rgba(59,130,246,0.18)] ring-1 ring-primary/40"
                  : "border-border hover:border-primary/30"
              )}
            >
              {tier.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1 text-xs font-semibold text-primary-foreground shadow-lg">
                    <Star className="w-3 h-3 fill-current" />
                    Most Popular
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="mb-6">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center mb-4",
                  tier.popular ? "bg-primary/20" : "bg-muted"
                )}>
                  <Icon className={cn("w-5 h-5", tier.popular ? "text-primary" : "text-muted-foreground")} />
                </div>
                <h2 className="text-lg font-bold text-foreground">{tier.name}</h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{tier.description}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className={cn("text-4xl font-extrabold font-heading", tier.popular ? "text-primary" : "text-foreground")}>
                    {tier.price}
                  </span>
                  <span className="text-sm text-muted-foreground">{tier.period}</span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className={cn("w-4 h-4 mt-0.5 flex-shrink-0", tier.popular ? "text-primary" : "text-emerald-400")} />
                    <span className="text-foreground/80 leading-snug">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href={tier.stripeLink}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "w-full flex items-center justify-center rounded-lg py-2.5 text-sm font-semibold transition-all duration-200",
                  tier.popular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                    : "bg-secondary text-foreground border border-border hover:border-primary/40 hover:bg-accent"
                )}
              >
                Subscribe Now
              </a>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Secure payment powered by Stripe · Cancel anytime · No hidden fees
      </p>
    </div>
  );
}