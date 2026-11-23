import { useState, useEffect, useRef } from "react";
import { invokeAction } from "@/lib/invokeAction";
import { base44 } from "@/api/base44Client";
import AgentFleetPanel from "@/components/copilot/AgentFleetPanel";
import LiveIntelligencePanel from "@/components/copilot/LiveIntelligencePanel";
import CoPilotTopBar from "@/components/copilot/CoPilotTopBar";
import AgentStatusTicker from "@/components/copilot/AgentStatusTicker";
import WelcomeState from "@/components/copilot/WelcomeState";
import MissionControlPanel from "@/components/copilot/MissionControlPanel";
import ChatMessage from "@/components/copilot/ChatMessage";
import ChatInputBar from "@/components/copilot/ChatInputBar";

function detectCommandType(text) {
  const t = text.toLowerCase();
  if (t.match(/cloud|aws|rds|s3|ec2|bucket|lambda|ecs|guard/)) return "cloud_review";
  if (t.match(/vulnerabilit|cve|patch|exploit|sca|npm|pip/)) return "vulnerability_scan";
  if (t.match(/incident|breach|attack|investigate|compromise/)) return "investigate_incident";
  if (t.match(/board|executive|ciso|c-suite|quarter/)) return "board_report";
  if (t.match(/mssp|customer health|churn|revenue/)) return "mssp_review";
  if (t.match(/compli|soc2|iso27|gdpr|pci|nist|dora/)) return "compliance_check";
  if (t.match(/threat|hunt|ioc|mitre|ttp|actor/)) return "threat_hunt";
  if (t.match(/identity|iam|privilege|ciem|mfa|role/)) return "identity_analysis";
  if (t.match(/dark web|credential|leak/)) return "dark_web_scan";
  if (t.match(/risk|fair|exposure|financial/)) return "risk_assessment";
  if (t.match(/code|script|cli|terraform|bash|fix|remedi/)) return "code_generation";
  return "auto";
}

export default function GDSCoPilotPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [priority, setPriority] = useState("normal");
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [risk, setRisk] = useState(null);
  /* What the browser can actually observe about a mission: which agent and command type were sent, and when. The
   * panel used to be handed a fake "thinking agent" list and animate invented progress over it. */
  const [mission, setMission] = useState(null);
  const [version, setVersion] = useState(null);
  const [unread, setUnread] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    base44.entities.GlobalRiskScore.list("-calculated_at", 1).then(r => setRisk(r[0] || null)).catch(() => {});
    base44.platform.version().then(setVersion).catch(() => setVersion(null));
    base44.platform.unreadNotificationCount().then(setUnread).catch(() => setUnread(null));
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function sendMessage(overrideInput, overrideType) {
    const raw = overrideInput ?? input;
    if (!raw.trim() || loading) return;
    const userInput = raw.trim();
    const commandType = overrideType || detectCommandType(userInput);

    setInput("");
    setLoading(true);
    setMessages(prev => [...prev, { role: "user", content: userInput }]);

    setMission({ agentLabel: selectedAgent || null, commandType, startedAt: Date.now() });

    try {
      const result = await invokeAction("gdsAgentOS", {
      goal: userInput,
      command_type: commandType,
      priority,
      /* The fleet panel selects by the registry's stable_key, which is the id the engine accepts. */
      agent_id: selectedAgent || undefined,
    });

      setMessages(prev => [...prev, {
        role: "assistant",
        content: result.response || "No response received.",
        code_output: result.code_output || null,
        agent_steps: result.agent_steps || [],
        agents_used: result.agents_used || [],
        agents_count: result.agents_count,
        mission_id: result.mission_id,
        command_type: result.command_type || commandType,
        version: result.version,
        total_duration_ms: result.total_duration_ms,
        source_input: userInput,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "error", content: `Mission failed: ${err.message}. The GDS Agent OS encountered an error.` }]);
    } finally {
      setLoading(false);
      setMission(null);
      /* A mission can raise a notification; the badge is re-read rather than assumed unchanged. */
      base44.platform.unreadNotificationCount().then(setUnread).catch(() => {});
    }
  }

  function agentNameToKey(name) {
    return name.replace(/^AI\s+/, "").toLowerCase().split(" ")[0];
  }

  function regenerate(msg) {
    if (msg.source_input) sendMessage(msg.source_input, msg.command_type);
  }

  return (
    <div className="flex" style={{ height: "100vh", background: "#050b14", color: "white" }}>
      <AgentFleetPanel selectedAgent={selectedAgent} onSelectAgent={(name) => setSelectedAgent(prev => prev === name ? null : name)} />

      <div className="flex-1 flex flex-col min-w-0">
        <CoPilotTopBar risk={risk} unreadCount={unread} version={version} />
        <AgentStatusTicker activeAgents={loading && mission ? ["Mission in flight"] : []} />

        <div className="flex-1 overflow-y-auto flex flex-col px-4 py-4">
          {messages.length === 0 ? (
            <WelcomeState onSelect={(c) => sendMessage(c.prompt || c.label, c.command_type)} />
          ) : (
            <>
              {messages.map((m, i) => (
                <ChatMessage key={i} message={m} onRegenerate={m.source_input ? () => regenerate(m) : null} />
              ))}
              {loading && <MissionControlPanel agentLabel={mission?.agentLabel} commandType={mission?.commandType} startedAt={mission?.startedAt} />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <ChatInputBar
          input={input}
          setInput={setInput}
          onSend={() => sendMessage()}
          loading={loading}
          selectedAgent={selectedAgent}
          priority={priority}
          setPriority={setPriority}
          onQuickAction={(a) => sendMessage(a.prompt || a.input || a.label, a.command_type)}
        />
      </div>

      <LiveIntelligencePanel />
    </div>
  );
}