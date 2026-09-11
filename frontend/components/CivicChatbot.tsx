"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Sparkles } from "lucide-react";

// ── Civic Q&A Knowledge Base ──────────────────────────────────────────────
const FAQ: { q: string[]; a: string }[] = [
  {
    q: ["how does civicfix work", "what is civicfix", "explain civicfix", "how it works"],
    a: "CivicFix is an autonomous AI civic platform. When you submit a complaint, the AI agent: (1) classifies category & severity via Gemini, (2) reverse-geocodes your GPS, (3) scores priority deterministically, (4) detects spatial duplicates via Haversine within 100m, (5) routes to the correct department, and (6) sets an SLA deadline."
  },
  {
    q: ["what categories", "types of complaints", "what can i report", "issue types"],
    a: "You can report 4 types of civic issues:\n• 🕳️ Pothole / Road Damage\n• 🗑️ Garbage / Waste Overflow\n• 💡 Broken Streetlight\n• 💧 Water Leakage / Pipe Burst\n\nMore categories will be added in future updates."
  },
  {
    q: ["priority", "how is priority calculated", "priority score", "why critical"],
    a: "Priority is calculated deterministically (not by AI guesswork):\n• Base severity: Low (+1), Medium (+2), High (+3), Critical (+4)\n• Near school/college: +2\n• Near hospital: +2\n• Main road/junction: +2\n• Residential area: +1\n• Safety hazard reported: +2\n\nScore ≥7 = CRITICAL, ≥5 = HIGH, ≥3 = MEDIUM, else LOW."
  },
  {
    q: ["sla", "how long", "resolution time", "deadline", "how many hours"],
    a: "SLA (Service Level Agreement) resolution windows by category:\n• Pothole: 72 hours\n• Garbage: 24 hours\n• Broken Streetlight: 48 hours\n• Water Leakage: 12 hours\n\nBreached SLAs are automatically escalated to CRITICAL priority."
  },
  {
    q: ["duplicate", "same complaint", "duplicate detection", "already reported"],
    a: "CivicFix uses the Haversine formula to search within 100 meters of your GPS location. If a complaint of the same category already exists nearby, your report is consolidated into the master case — increasing the affected citizen count and community impact score, rather than creating a redundant entry."
  },
  {
    q: ["community impact", "impact score", "what is impact score"],
    a: "The Community Impact Score (0–100) reflects how seriously an issue affects the community:\n• Base severity (15–70 pts)\n• +8 per additional citizen/duplicate report (max +35)\n• +10 per critical location (school/hospital/main road, max +20)\n• +0.5 per unresolved hour (max +15)\n\nA higher score means faster escalation priority."
  },
  {
    q: ["gemini", "ai", "gemini vision", "image analysis"],
    a: "CivicFix uses Google's Gemini 1.5 Flash model for:\n• Natural language understanding of your complaint text\n• Vision analysis of uploaded photo evidence\n• Structured extraction of category, severity, and issue summary\n\nIf the Gemini API is unavailable, a local NLU fallback kicks in automatically."
  },
  {
    q: ["escalation", "escalated", "what happens when escalated"],
    a: "When an SLA deadline is breached, CivicFix autonomously:\n1. Elevates priority to CRITICAL\n2. Updates status to 'Escalated'\n3. Sends instant push notification to authorities\n4. Logs the escalation event in the agent activity trace\n\nAdmins can also trigger manual escalation via the Command Center."
  },
  {
    q: ["department", "who handles", "which department", "routing"],
    a: "Department routing is deterministic based on category:\n• 🕳️ Pothole → Road Maintenance Department\n• 🗑️ Garbage → Municipal Sanitation Department\n• 💡 Streetlight → Electrical Infrastructure Division\n• 💧 Water Leakage → Water & Sewerage Board"
  },
  {
    q: ["status", "complaint status", "track complaint", "what does status mean"],
    a: "Complaint statuses in CivicFix:\n• ⚪ Submitted — newly filed, queued for review\n• 🔵 In Progress — department has acknowledged the case\n• 🔴 Escalated — SLA breached, escalated to authority\n• ✅ Resolved — issue has been fixed and closed"
  },
  {
    q: ["photo", "image", "upload photo", "evidence"],
    a: "You can upload photo evidence when submitting a complaint. The image is stored on Cloudinary CDN and analyzed by Gemini Vision to aid in accurate classification. Photos significantly increase the credibility and community impact score of your report."
  },
  {
    q: ["location", "gps", "geolocation", "coordinates"],
    a: "CivicFix uses your browser's GPS to capture precise coordinates. The Nominatim (OpenStreetMap) API reverse-geocodes these to a human-readable address. You can also click on the map to fine-tune your exact location. Accurate GPS is critical for duplicate detection and department routing."
  },
  {
    q: ["voice", "speak", "voice input", "microphone"],
    a: "On the Report page, click the 🎙 Speak button to use your microphone. CivicFix uses the Web Speech API (available in Chrome/Edge) to transcribe your spoken complaint into text. Just describe the issue naturally — the AI agent handles classification."
  },
  {
    q: ["hello", "hi", "hey", "help"],
    a: "👋 Hello! I'm the CivicFix AI Assistant. I can answer questions about:\n• How CivicFix works\n• Complaint categories & departments\n• Priority scoring & SLA deadlines\n• Duplicate detection & escalation\n• Community impact scores\n\nJust type your question!"
  }
];

interface Message {
  role: "user" | "bot";
  text: string;
  time: string;
}

function getAnswer(input: string): string {
  const q = input.toLowerCase().trim();
  for (const faq of FAQ) {
    if (faq.q.some(kw => q.includes(kw))) return faq.a;
  }
  return "I don't have a specific answer for that, but I'm here to help with CivicFix questions! Try asking about:\n• Priority scoring\n• SLA deadlines\n• Duplicate detection\n• Community impact scores\n• How to report an issue";
}

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const QUICK_PROMPTS = [
  "How is priority calculated?",
  "What is the impact score?",
  "How does duplicate detection work?",
  "What are the SLA deadlines?"
];

export function CivicChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "👋 Hi! I'm CivicFix Assistant. Ask me anything about how the platform works — priorities, SLAs, duplicate detection, and more.", time: now() }
  ]);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = (text?: string) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput("");

    const userMsg: Message = { role: "user", text: msg, time: now() };
    setMessages(prev => [...prev, userMsg]);
    setTyping(true);

    setTimeout(() => {
      const answer = getAnswer(msg);
      setMessages(prev => [...prev, { role: "bot", text: answer, time: now() }]);
      setTyping(false);
    }, 600 + Math.random() * 400);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setOpen(v => !v)}
        id="civic-chatbot-toggle"
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          open
            ? "bg-slate-700 hover:bg-slate-600 rotate-90"
            : "bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/40"
        }`}
        aria-label="Open CivicFix chatbot"
      >
        {open ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
        {!open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-950 rounded-full" />
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-h-[560px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden"
          style={{ animation: "slideUp 0.2s ease" }}>

          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">CivicFix Assistant</h3>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                <span className="text-blue-100 text-[11px]">Online — Ask me anything</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "bot" ? "bg-gradient-to-br from-blue-500 to-indigo-500" : "bg-slate-200 dark:bg-slate-700"
                }`}>
                  {msg.role === "bot" ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
                </div>
                <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                  <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm"
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-slate-400">{msg.time}</span>
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1 items-center">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-none">
            {QUICK_PROMPTS.map((p, i) => (
              <button key={i} onClick={() => sendMessage(p)}
                className="shrink-0 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-300 hover:text-blue-600 transition-colors whitespace-nowrap">
                {p}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about CivicFix..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim()}
              className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center disabled:opacity-40 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
