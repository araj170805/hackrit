import React from "react";
import Link from "next/link";
import { Shield, Sparkles, MapPin, Zap } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-12 text-slate-600 dark:text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2 font-bold text-lg text-slate-900 dark:text-white">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Shield className="w-4 h-4" />
              </div>
              CivicFix
            </div>
            <p className="text-sm text-slate-500 max-w-sm">
              Geo-aware autonomous AI civic issue resolution platform. Empowering citizens and streamlining civic authority action through intelligent agentic workflows.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white mb-3">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/report" className="hover:text-blue-600 transition-colors">Report a Problem</Link></li>
              <li><Link href="/dashboard" className="hover:text-blue-600 transition-colors">Citizen Dashboard</Link></li>
              <li><Link href="/admin" className="hover:text-blue-600 transition-colors">Admin Command Center</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white mb-3">Architecture</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-blue-500" /> Gemini & LangGraph</li>
              <li className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-indigo-500" /> OpenStreetMap & Nominatim</li>
              <li className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-500" /> Autonomous SLA Escalation</li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} CivicFix. From civic complaint to civic action.</p>
          <p className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Agent Systems Operational
          </p>
        </div>
      </div>
    </footer>
  );
}
