import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { QUICK_ACTIONS } from "./agentFleetData";

/* Voice in. The browser records, the platform transcribes through POST /copilot/voice/transcribe, and the transcript
 * is placed in the box for review - it is never sent on its own. A spoken instruction is not an approval, and a
 * misheard one should not start a mission before the operator has read it.
 *
 * Not claimed: no wake word and no always-on listening. The microphone is opened only while the button is recording,
 * and the track is stopped the moment recording ends.
 */
export default function ChatInputBar({ input, setInput, onSend, loading, selectedAgent, priority, setPriority, onQuickAction }) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [lastTranscript, setLastTranscript] = useState(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  async function toggleRecording() {
    setVoiceError(null);
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError("This browser exposes no microphone API, so nothing can be recorded here.");
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setVoiceError(`Microphone refused: ${err.message}`);
      return;
    }
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => { if (event.data && event.data.size) chunksRef.current.push(event.data); };
    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      setRecording(false);
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      if (!blob.size) { setVoiceError("Nothing was recorded."); return; }
      setBusy(true);
      try {
        const result = await base44.platform.transcribe(blob, "speech.webm");
        if (!result || !result.text) {
          setVoiceError("The transcript came back empty - the recording may be silent or too short.");
        } else {
          setInput(result.text);
          setLastTranscript({
            seconds: result.audio_seconds,
            model: result.model,
            latency: result.latency_ms,
            recorded: result.cost_recorded,
          });
        }
      } catch (err) {
        setVoiceError(err.message || "Transcription failed.");
      } finally {
        setBusy(false);
      }
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  }

  const micLabel = recording ? "■ Stop" : busy ? "…" : "🎙 Speak";
  const micColour = recording ? "#ef4444" : "#1e3a5f";

  return (
    <div className="flex-shrink-0" style={{ background: "#0d1428", borderTop: "1px solid #1e3a5f" }}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg text-blue-300" style={{ background: "#141d35", border: "1px solid #1e3a5f" }}>
            {selectedAgent ? `${selectedAgent.replace(/^AI\s+/, "")}` : "🔮 GASCI Auto-Route"} ▾
          </span>
          <select value={priority} onChange={e => setPriority(e.target.value)} style={{ background: "#141d35", border: "1px solid #1e3a5f", borderRadius: 8, color: "#94a3b8", padding: "4px 8px", fontSize: 11 }}>
            <option value="normal">⚡ Priority: Normal</option>
            <option value="high">⚡ Priority: High</option>
            <option value="emergency">⚡ Priority: Emergency</option>
          </select>
        </div>

        <div className="rounded-xl p-2 flex items-end gap-2" style={{ background: "#141d35", border: "1px solid #1e3a5f" }}>
          <button
            onClick={toggleRecording}
            disabled={busy}
            title="Records from this microphone, transcribes it on the platform, and puts the words in the box for you to review before sending."
            className="px-3 py-2.5 rounded-lg text-[11px] font-bold text-white flex-shrink-0 transition"
            style={{ background: micColour, cursor: busy ? "wait" : "pointer" }}
          >
            {micLabel}
          </button>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            placeholder="Ask anything, or press Speak and talk — threat hunting, cloud risks, incidents, compliance gaps..."
            rows={2}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none resize-none px-2 py-1.5"
          />
          <button
            onClick={onSend}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 rounded-lg text-sm font-bold text-white flex-shrink-0 transition"
            style={{ background: loading || !input.trim() ? "#1e3a5f" : "#3b82f6", cursor: loading || !input.trim() ? "not-allowed" : "pointer" }}
          >
            {loading ? "..." : "Enter ↵"}
          </button>
        </div>

        {(recording || busy || voiceError || lastTranscript) && (
          <div className="mt-2 text-[10px] leading-relaxed">
            {recording && <span className="text-red-400">● Recording. Press Stop when you have finished speaking.</span>}
            {busy && <span className="text-blue-400">Transcribing the recording…</span>}
            {voiceError && <span className="text-amber-400">{voiceError}</span>}
            {!recording && !busy && !voiceError && lastTranscript && (
              <span className="text-slate-500">
                Transcribed {lastTranscript.seconds}s of audio with {lastTranscript.model} in {lastTranscript.latency}ms
                {lastTranscript.recorded === false ? " (the cost row could not be written)" : ""}. Review it, then send.
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap px-4 pb-3">
        {QUICK_ACTIONS.map(a => (
          <button
            key={a.command_type}
            onClick={() => onQuickAction(a)}
            className="text-[11px] font-medium px-2.5 py-1.5 rounded-full text-slate-400 hover:text-white hover:bg-[#1e3a5f] transition whitespace-nowrap"
            style={{ background: "#141d35", border: "1px solid #1e3a5f" }}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
