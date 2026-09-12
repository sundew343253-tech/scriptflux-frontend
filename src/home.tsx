import { useState } from "react";
import { Sparkles, LayoutDashboard, FolderKanban, WandSparkles } from "lucide-react";

export default function HomeStudio() {
  const [topic, setTopic] = useState("");
  const [script, setScript] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!topic) return alert("Please enter a topic");
    setLoading(true);
    try {
      const res = await fetch("https://onrender.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, target_audience: "General", tone: "Professional", format: "Reel" })
      });
      const data = await res.json();
      setScript(data.script);
    } catch (err) {
      alert("Backend connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070c] text-slate-100 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-purple-500/10 bg-[#090911] p-4 flex flex-col gap-6">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500 text-white">
            <WandSparkles size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">ScriptFlux AI</h2>
            <span className="text-[10px] uppercase text-purple-400/70">Creative OS</span>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          <div className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm bg-purple-600/15 text-purple-200 border-l-2 border-purple-500">
            <Sparkles size={16} className="text-purple-400" />
            Script-to-Content
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-gradient-to-b from-[#090912] to-[#07070c] p-8 overflow-y-auto">
        <div className="max-w-3xl space-y-6">
          <div>
            <span className="font-mono text-[10px] uppercase text-cyan-300/80">Script Studio / 01</span>
            <h1 className="text-2xl font-bold text-white mt-1">Script-to-Content</h1>
          </div>
          
          <div className="rounded-2xl border border-purple-500/10 bg-[#0d0d18]/60 p-6 space-y-4">
            <textarea 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Type your Hinglish/English topic here... (e.g., College students ke liye top 3 gadgets)" 
              className="w-full min-h-[120px] p-3 rounded-xl bg-black/30 border border-purple-500/15 text-slate-200 focus:outline-none focus:border-purple-500" 
            />
            <button 
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 font-medium text-white hover:opacity-90 transition"
            >
              {loading ? "Generating Core Strategy..." : "Generate Core Strategy"}
            </button>
          </div>

          {/* Output Display */}
          {script && (
            <div className="rounded-2xl border border-purple-500/10 bg-[#121220]/75 p-6 space-y-4">
              <h3 className="text-lg font-bold text-cyan-300">🔥 Generated Hook:</h3>
              <p className="text-slate-200 bg-black/20 p-3 rounded-xl border border-white/5">{script.hook}</p>
              <h3 className="text-lg font-bold text-purple-400">📝 Script Body:</h3>
              <p className="text-slate-200 bg-black/20 p-3 rounded-xl border border-white/5 whitespace-pre-line">{script.body}</p>
              <h3 className="text-lg font-bold text-slate-400">💡 CTA & Hashtags:</h3>
              <p className="text-slate-400 bg-black/20 p-3 rounded-xl border border-white/5">{script.cta} {script.hashtags?.join(" ")}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
