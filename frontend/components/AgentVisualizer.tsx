"use client";

import React from "react";
import { CheckCircle2, Loader2, Sparkles, AlertCircle, ArrowRight } from "lucide-react";

export interface AgentStep {
  label: string;
  detail?: string;
  status: "pending" | "running" | "completed";
}

interface AgentVisualizerProps {
  steps: AgentStep[];
  isProcessing: boolean;
  onComplete?: () => void;
}

export function AgentVisualizer({ steps, isProcessing }: AgentVisualizerProps) {
  return (
    <div className="w-full bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl overflow-hidden relative">
      
      {/* Glow highlight */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              CivicFix Agent Workflow
            </h3>
            <p className="text-xs text-slate-400">LangGraph Autonomous Execution Chain</p>
          </div>
        </div>

        {isProcessing && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Agent Working...
          </div>
        )}
      </div>

      <div className="space-y-3">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3.5 p-3 rounded-xl transition-all ${
              step.status === "running"
                ? "bg-blue-950/60 border border-blue-800/80 shadow-md"
                : step.status === "completed"
                ? "bg-slate-800/40 border border-slate-800/40"
                : "opacity-40"
            }`}
          >
            <div className="mt-0.5">
              {step.status === "completed" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : step.status === "running" ? (
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-slate-600 shrink-0" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${step.status === "completed" ? "text-slate-200" : step.status === "running" ? "text-blue-300 font-semibold" : "text-slate-400"}`}>
                  {step.label}
                </span>
                {step.status === "completed" && (
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Done</span>
                )}
              </div>
              {step.detail && (
                <p className="text-xs text-slate-400 mt-1 font-mono break-all leading-relaxed">
                  {step.detail}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
