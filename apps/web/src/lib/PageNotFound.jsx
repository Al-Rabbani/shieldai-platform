import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

const GOLD = "#C9A84C";

export default function PageNotFound() {
  useEffect(() => { document.title = "ShieldAI | Page Not Found"; }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center" style={{ background: "#0A0E1A" }}>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}.float{animation:float 3s ease-in-out infinite}@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fadeUp 0.5s ease both}`}</style>
      <div className="float mb-8">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto relative"
          style={{ background: "linear-gradient(135deg,rgba(201,168,76,0.15),rgba(201,168,76,0.05))", border: `2px solid ${GOLD}33` }}>
          <Shield className="w-12 h-12" style={{ color: GOLD, opacity: 0.6 }} />
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
            style={{ background: "#ef4444", color: "white" }}>404</div>
        </div>
      </div>
      <div className="fu">
        <h1 className="text-4xl font-black text-white mb-3">Page Not Found</h1>
        <p className="text-slate-400 max-w-md mb-8">The page you're looking for doesn't exist or has been moved. Check the URL or return to the dashboard.</p>
        <div className="flex items-center gap-3 justify-center flex-wrap">
          <Link to="/" className="px-6 py-3 rounded-xl font-bold text-black transition-all hover:scale-105"
            style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>Return to Dashboard</Link>
          <button onClick={() => window.history.back()}
            className="px-6 py-3 rounded-xl font-bold border text-slate-300 transition-all hover:bg-white/5"
            style={{ borderColor: "#374151" }}>Go Back</button>
        </div>
      </div>
      <div className="fu mt-12 text-[10px] text-slate-700" style={{ animationDelay: "200ms" }}>ShieldAI Sovereign Platform v2.0</div>
    </div>
  );
}