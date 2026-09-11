import React from "react";

export function StatusBadge({ status }: { status: string }) {
  const normalized = (status || "submitted").toLowerCase();

  const styles: Record<string, string> = {
    submitted: "bg-canvas text-muted border-line",
    in_progress: "bg-high-soft text-high border-transparent",
    escalated: "bg-crit-soft text-crit border-transparent font-semibold",
    resolved: "bg-citizen-soft text-citizen-ink border-transparent",
    closed: "bg-canvas text-ink border-line font-semibold",
    reopened: "bg-crit-soft text-crit border-transparent font-semibold"
  };

  const labels: Record<string, string> = {
    submitted: "Submitted",
    in_progress: "In progress",
    escalated: "Escalated",
    resolved: "Resolved",
    closed: "Closed",
    reopened: "Reopened"
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${styles[normalized] || styles.submitted}`}>
      {labels[normalized] || status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const normalized = (priority || "MEDIUM").toUpperCase();

  const styles: Record<string, string> = {
    LOW: "bg-canvas text-muted border-line",
    MEDIUM: "bg-med-soft text-med border-transparent",
    HIGH: "bg-high-soft text-high border-transparent font-semibold",
    CRITICAL: "bg-crit-soft text-crit border-transparent font-semibold"
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border ${styles[normalized] || styles.MEDIUM}`}>
      {normalized}
    </span>
  );
}
