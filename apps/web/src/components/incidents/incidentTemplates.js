export const INCIDENT_TEMPLATES = {
  ransomware: {
    label: "🔒 Ransomware",
    matches: ["ransomware"],
    steps: [
      { title: "Isolate affected systems from network", priority: "critical", assignee_name: "Alex Chen (IR Lead)" },
      { title: "Identify ransomware variant & IOCs", priority: "high", assignee_name: "Priya Nair (Senior SOC Analyst)" },
      { title: "Verify backup integrity & recovery point", priority: "critical", assignee_name: "Jordan Lee (SOC Analyst)" },
      { title: "Notify legal & executive leadership", priority: "high", assignee_name: "Sam Rivera (SOC Analyst)" },
    ],
  },
  phishing: {
    label: "🎣 Phishing",
    matches: ["phishing"],
    steps: [
      { title: "Identify scope of phishing campaign", priority: "high", assignee_name: "Jordan Lee (SOC Analyst)" },
      { title: "Reset compromised credentials", priority: "critical", assignee_name: "Alex Chen (IR Lead)" },
      { title: "Block sender domain & malicious links", priority: "high", assignee_name: "Priya Nair (Senior SOC Analyst)" },
      { title: "Send user awareness notification", priority: "medium", assignee_name: "Sam Rivera (SOC Analyst)" },
    ],
  },
  data_breach: {
    label: "📤 Data Breach",
    matches: ["exfiltration", "breach"],
    steps: [
      { title: "Determine scope of data exposed", priority: "critical", assignee_name: "Priya Nair (Senior SOC Analyst)" },
      { title: "Assess regulatory notification requirement", priority: "critical", assignee_name: "Alex Chen (IR Lead)" },
      { title: "Contain exfiltration channel", priority: "critical", assignee_name: "Jordan Lee (SOC Analyst)" },
      { title: "Prepare breach notification draft", priority: "high", assignee_name: "Sam Rivera (SOC Analyst)" },
    ],
  },
  ddos: {
    label: "🌊 DDoS",
    matches: ["ddos"],
    steps: [
      { title: "Engage upstream provider / scrubbing service", priority: "critical", assignee_name: "Alex Chen (IR Lead)" },
      { title: "Identify attack vector & source", priority: "high", assignee_name: "Jordan Lee (SOC Analyst)" },
      { title: "Scale defensive capacity", priority: "high", assignee_name: "Priya Nair (Senior SOC Analyst)" },
    ],
  },
  insider_threat: {
    label: "🕴️ Insider Threat",
    matches: ["insider"],
    steps: [
      { title: "Preserve evidence & access logs", priority: "critical", assignee_name: "Alex Chen (IR Lead)" },
      { title: "Suspend user access", priority: "critical", assignee_name: "Priya Nair (Senior SOC Analyst)" },
      { title: "Interview relevant stakeholders", priority: "high", assignee_name: "Sam Rivera (SOC Analyst)" },
    ],
  },
  malware: {
    label: "🦠 Malware",
    matches: ["malware", "trojan", "worm"],
    steps: [
      { title: "Isolate infected host", priority: "critical", assignee_name: "Jordan Lee (SOC Analyst)" },
      { title: "Identify malware family & behavior", priority: "high", assignee_name: "Alex Chen (IR Lead)" },
      { title: "Scan environment for lateral spread", priority: "critical", assignee_name: "Priya Nair (Senior SOC Analyst)" },
    ],
  },
  general: {
    label: "📌 General Investigation",
    matches: [],
    steps: [
      { title: "Confirm scope & impact", priority: "high", assignee_name: "Jordan Lee (SOC Analyst)" },
      { title: "Gather initial evidence", priority: "high", assignee_name: "Alex Chen (IR Lead)" },
      { title: "Assign IR lead & notify stakeholders", priority: "medium", assignee_name: "Sam Rivera (SOC Analyst)" },
    ],
  },
};

export function suggestedTemplateKey(incidentType) {
  const t = (incidentType || "").toLowerCase();
  for (const [key, tpl] of Object.entries(INCIDENT_TEMPLATES)) {
    if (tpl.matches.some(m => t.includes(m))) return key;
  }
  return "general";
}