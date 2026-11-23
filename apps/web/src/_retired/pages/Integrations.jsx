import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";

const integrations = [
  { name: "AWS", category: "Cloud", icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Amazon_Web_Services_Logo.svg/1024px-Amazon_Web_Services_Logo.svg.png", description: "Scan EC2, S3, RDS, Lambda, IAM, and more", connected: true },
  { name: "GCP", category: "Cloud", icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Google_Cloud_logo.svg/1024px-Google_Cloud_logo.svg.png", description: "Scan GCE, GCS, Cloud SQL, Cloud Functions", connected: true },
  { name: "Azure", category: "Cloud", icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Microsoft_Azure.svg/1024px-Microsoft_Azure.svg.png", description: "Scan VMs, Blob Storage, Azure SQL, Functions", connected: false },
  { name: "GitHub", category: "Code", icon: "https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png", description: "Scan repos for secrets, dependencies, and IaC", connected: true },
  { name: "GitLab", category: "Code", icon: "https://about.gitlab.com/images/press/press-kit-icon.svg", description: "CI/CD pipeline scanning and secret detection", connected: false },
  { name: "Jira", category: "Ticketing", icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Jira_Logo.svg/1024px-Jira_Logo.svg.png", description: "Auto-create tickets for new vulnerabilities", connected: true },
  { name: "Slack", category: "Notifications", icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Slack_icon_2019.svg/1024px-Slack_icon_2019.svg.png", description: "Real-time alerts for critical findings", connected: true },
  { name: "PagerDuty", category: "Notifications", icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/PagerDuty_Logo.svg/1024px-PagerDuty_Logo.svg.png", description: "Incident escalation for critical vulnerabilities", connected: false },
  { name: "Terraform Cloud", category: "IaC", icon: "https://www.vectorlogo.zone/logos/terraformio/terraformio-icon.svg", description: "Pre-plan scanning for infrastructure changes", connected: false },
];

export default function Integrations() {
  const [items, setItems] = useState(integrations);
  const categories = [...new Set(items.map(i => i.category))];

  const toggleConnection = (name) => {
    setItems(items.map(i => i.name === name ? { ...i, connected: !i.connected } : i));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-heading">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">Connect your cloud providers, code repos, and workflow tools</p>
      </div>

      {categories.map((cat) => (
        <div key={cat}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{cat}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.filter(i => i.category === cat).map((integration) => (
              <Card key={integration.name} className="p-4 bg-card border-border hover:border-primary/20 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img src={integration.icon} alt={integration.name} className="w-6 h-6 object-contain" onError={(e) => e.target.style.display = 'none'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">{integration.name}</h4>
                      {integration.connected ? (
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Connected</Badge>
                      ) : (
                        <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">Not Connected</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{integration.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <Switch checked={integration.connected} onCheckedChange={() => toggleConnection(integration.name)} />
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
                        Configure <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}