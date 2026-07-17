import React from 'react';
import ChatInterface from './components/chat-interface';
import { Award, Code2, Layers, Cpu } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-4 md:p-8">
      {/* Top Banner / Navigation */}
      <header className="w-full max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-violet-600/10 border border-violet-500/20 rounded-xl">
            <Cpu className="w-8 h-8 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              AI Innovation Challenge
            </h1>
            <p className="text-xs text-slate-400 font-mono">VIETNAM 2026 STARTER KIT</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 rounded-full px-4 py-1.5 text-xs text-slate-300">
          <Code2 className="w-4 h-4 text-cyan-400" />
          <span>Frontend: <strong className="text-slate-100">React + Vite + Tailwind</strong></span>
        </div>
      </header>

      {/* Main Sandbox Section */}
      <main className="w-full flex-1 flex flex-col items-center justify-center gap-8 my-4">
        <div className="text-center max-w-2xl space-y-3">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            AI-Native Sandbox Sandbox
          </h2>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed">
            Quickly test prompts, vector search indexing, and integrations. This workspace connects directly to the <span className="text-cyan-400 font-semibold">FPT AI Factory API endpoint</span>.
          </p>
        </div>

        {/* The Chat Application */}
        <ChatInterface />

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl mt-4">
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-2">
            <Layers className="w-5 h-5 text-violet-400" />
            <h4 className="font-semibold text-slate-200">Google ADK 2.0</h4>
            <p className="text-xs text-slate-400">Structured prompt templates loading out of system, planner, and critic config markdown files.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-2">
            <Award className="w-5 h-5 text-cyan-400" />
            <h4 className="font-semibold text-slate-200">FPT Sponsored LLM</h4>
            <p className="text-xs text-slate-400">Grounded answers are verified against approved hospital information.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <h4 className="font-semibold text-slate-200">Fully Containerized</h4>
            <p className="text-xs text-slate-400">Deploy vector databases (Qdrant), databases, and cache layers inside a single Docker network.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mt-12 border-t border-slate-900 pt-6 text-center text-xs text-slate-500 flex flex-col md:flex-row justify-between items-center gap-4">
        <p>© 2026 Vietnam AI Innovation Challenge Team. All rights reserved.</p>
        <div className="flex gap-4">
          <a href="#readme" className="hover:text-slate-300">Documentation</a>
          <a href="#github" className="hover:text-slate-300">GitHub Repo</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
