import React from "react";

export function StatusBadge({ status }: { status: string }) {
  const normalized = (status || "submitted").toLowerCase();
  
  const styles: Record<string, string> = {
    submitted: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    in_progress: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    escalated: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800 animate-pulse font-semibold",
    resolved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
  };

  const labels: Record<string, string> = {
    submitted: "Submitted",
    in_progress: "In Progress",
    escalated: "🚨 Escalated",
    resolved: "Resolved"
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[normalized] || styles.submitted}`}>
      {labels[normalized] || status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const normalized = (priority || "MEDIUM").toUpperCase();

  const styles: Record<string, string> = {
    LOW: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    MEDIUM: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/50",
    HIGH: "bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-700/50 font-semibold",
    CRITICAL: "bg-red-100 text-red-800 border-red-400 dark:bg-red-950/60 dark:text-red-300 dark:border-red-700 font-bold animate-pulse"
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${styles[normalized] || styles.MEDIUM}`}>
      {normalized} PRIORITY
    </span>
  );
}
