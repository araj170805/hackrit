"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  MapPin, Calendar, Clock, AlertTriangle, Shield, CheckCircle2,
  Building, Users, Activity, Sparkles, ArrowLeft, HelpCircle,
  ChevronDown, ChevronUp, TrendingUp, Zap, Info, ArrowUpCircle
} from "lucide-react";
import { getComplaintDetails, upvoteComplaint } from "@/lib/api";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { LeafletMap } from "@/components/LeafletMap";
import { ResolutionVerificationPanel } from "@/components/ResolutionVerificationPanel";
import { ResourceRecommendationCard } from "@/components/ResourceRecommendationCard";
import { useAuth } from "@/context/AuthContext";

// ── Priority color helpers ──────────────────────────────────────────────────
const PRIORITY_GRADIENT: Record<string, string> = {
  LOW: "from-slate-400 to-slate-500",
  MEDIUM: "from-amber-400 to-amber-500",
  HIGH: "from-orange-500 to-orange-600",
  CRITICAL: "from-rose-500 to-rose-600"
};

const IMPACT_COLOR = (score: number) => {
  if (score >= 70) return { bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", label: "Critical Impact" };
  if (score >= 50) return { bar: "bg-orange-500", text: "text-orange-600 dark:text-orange-400", label: "High Impact" };
  if (score >= 30) return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", label: "Moderate Impact" };
  return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "Low Impact" };
};

const EVT_ICON: Record<string, React.ReactNode> = {
  location: <MapPin className="w-4 h-4 text-blue-400" />,
  classification: <Sparkles className="w-4 h-4 text-violet-400" />,
  priority: <Zap className="w-4 h-4 text-amber-400" />,
  impact: <Activity className="w-4 h-4 text-emerald-400" />,
  sla: <Clock className="w-4 h-4 text-sky-400" />,
  duplicate: <Users className="w-4 h-4 text-indigo-400" />,
  routing: <Building className="w-4 h-4 text-purple-400" />,
  creation: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  escalation: <AlertTriangle className="w-4 h-4 text-rose-400" />,
  status_update: <TrendingUp className="w-4 h-4 text-blue-400" />
};

export default function ComplaintDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<{ complaint: any; agentLog: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPriorityPanel, setShowPriorityPanel] = useState(false);
  const [upvoting, setUpvoting] = useState(false);
  const { user } = useAuth();

  const handleUpvote = async () => {
    if (!data || !user) return;
    try {
      setUpvoting(true);
      const res = await upvoteComplaint(id);
      if (res.success) {
        setData((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            complaint: {
              ...prev.complaint,
              upvotes: res.upvotes,
              communityImpactScore: res.communityImpactScore,
              priority: res.priority,
              upvotedBy: [...(prev.complaint.upvotedBy || []), user.uid]
            }
          };
        });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to upvote. Please try again.");
    } finally {
      setUpvoting(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const res = await getComplaintDetails(id);
        setData(res);
      } catch (err: any) {
        setError(err.message || "Failed to load complaint details.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-slate-400">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        Loading complaint metadata...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm">{error || "Complaint not found."}</div>
        <Link href="/dashboard" className="text-blue-600 font-semibold text-sm hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  const { complaint, agentLog } = data;
  const loc = complaint.location || { latitude: 22.2505, longitude: 84.9011 };
  const impact = complaint.communityImpactScore ?? 25;
  const impactMeta = IMPACT_COLOR(impact);
  const priorityReasons: string[] = complaint.priorityReason || [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

      {/* Back Button */}
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* ── Main Header Card ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                {complaint.complaintId}
              </span>
              <PriorityBadge priority={complaint.priority} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white capitalize">
              {complaint.category?.replace(/_/g, " ")}
            </h1>
          </div>
          <StatusBadge status={complaint.status} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div className="md:col-span-2 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Complaint Description</h3>
              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{complaint.description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                <MapPin className="w-4 h-4 text-red-500" />
                {complaint.address || "Captured Location"}
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                <Building className="w-4 h-4 text-indigo-500" />
                <strong className="text-slate-900 dark:text-white">{complaint.department}</strong>
              </div>
              {(complaint.affectedCitizens > 1 || complaint.duplicateCount > 0) && (
                <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 font-semibold">
                  <Users className="w-4 h-4" />
                  {complaint.affectedCitizens || (complaint.duplicateCount + 1)} Citizens Affected
                </div>
              )}
            </div>

            {complaint.imageUrl && (
              <div className="pt-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Submitted Photo Evidence</h3>
                <img src={complaint.imageUrl} alt="Complaint Photo" className="rounded-2xl max-h-64 object-cover border border-slate-200 dark:border-slate-800 shadow-sm" />
              </div>
            )}

            {complaint.resolutionEvidence?.imageUrl && (
              <div className="pt-2">
                <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Proof of Resolution
                </h3>
                <img
                  src={complaint.resolutionEvidence.imageUrl}
                  alt="Resolution proof submitted by authority"
                  className="rounded-2xl max-h-64 object-cover border border-emerald-200 dark:border-emerald-900 shadow-sm"
                />
              </div>
            )}
          </div>

          {/* Right sidebar: SLA + Community Impact */}
          <div className="space-y-4">

            {/* SLA Card */}
            <div className="bg-slate-50 dark:bg-slate-950/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                SLA Resolution Window
              </h3>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{complaint.slaHours} Hours</div>
              <div className="text-xs text-slate-500 space-y-1">
                <div>Created: <span className="font-mono text-slate-700 dark:text-slate-300">{new Date(complaint.createdAt).toLocaleDateString()}</span></div>
                <div>Deadline: <span className="font-mono text-slate-700 dark:text-slate-300">{complaint.deadline ? new Date(complaint.deadline).toLocaleDateString() : "Pending"}</span></div>
              </div>
              {complaint.escalated && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold animate-pulse">
                  🚨 SLA Breached — Escalated to Authority
                </div>
              )}
            </div>

            {/* Community Impact Score Card */}
            <div className="bg-slate-50 dark:bg-slate-950/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  Community Impact
                </h3>
                {user && (
                  <button 
                    onClick={handleUpvote}
                    disabled={upvoting || (complaint.upvotedBy?.includes(user.uid))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                      (complaint.upvotedBy?.includes(user.uid))
                        ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300 cursor-default' 
                        : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-blue-600 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <ArrowUpCircle className={`w-4 h-4 ${(complaint.upvotedBy?.includes(user.uid)) ? 'text-violet-500' : ''} ${upvoting ? 'animate-pulse' : ''}`} />
                    {(complaint.upvotedBy?.includes(user.uid)) ? 'Voted' : 'Upvote'}
                    <span className="ml-1 bg-slate-200 dark:bg-slate-700 px-1.5 rounded-md text-[10px]">{complaint.upvotes || complaint.upvotedBy?.length || 0}</span>
                  </button>
                )}
              </div>
              <div className="flex items-end gap-2 pt-2">
                <span className={`text-4xl font-black ${impactMeta.text}`}>{impact}</span>
                <span className="text-slate-400 text-sm mb-1">/100</span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${impactMeta.bar}`}
                  style={{ width: `${impact}%` }}
                />
              </div>
              <p className={`text-xs font-semibold ${impactMeta.text}`}>{impactMeta.label}</p>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Determined by severity, affected citizens, spatial density, and location criticality.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* ── Why This Priority? Panel ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowPriorityPanel(v => !v)}
          className="w-full px-6 sm:px-8 py-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${PRIORITY_GRADIENT[complaint.priority] || "from-slate-400 to-slate-500"} flex items-center justify-center`}>
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Why This Priority?</h3>
              <p className="text-xs text-slate-500">
                Explainable AI — {priorityReasons.length} scoring factor{priorityReasons.length !== 1 ? "s" : ""} applied
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-lg bg-gradient-to-r ${PRIORITY_GRADIENT[complaint.priority] || "from-slate-400 to-slate-500"} text-white`}>
              Score: {complaint.priorityScore}
            </span>
            {showPriorityPanel ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {showPriorityPanel && (
          <div className="px-6 sm:px-8 pb-6 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-5">
            <p className="text-xs text-slate-500 mb-4">
              CivicFix uses a <strong className="text-slate-700 dark:text-slate-300">deterministic priority engine</strong> — not black-box AI.
              Each factor contributes a quantified score increment:
            </p>
            {priorityReasons.length > 0 ? (
              <div className="space-y-2">
                {priorityReasons.map((reason, i) => {
                  // Extract the +N from the reason string
                  const match = reason.match(/\+(\d+)\)/);
                  const points = match ? parseInt(match[1]) : null;
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex-1">{reason}</span>
                      {points !== null && (
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
                          +{points}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Info className="w-4 h-4" /> Priority reasoning data not available for this complaint.
              </div>
            )}
            <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
              <strong>Total Score: {complaint.priorityScore}</strong> → Priority Level: <strong>{complaint.priority}</strong>
              <span className="ml-2 text-blue-500">(LOW &lt;3 | MEDIUM 3–4 | HIGH 5–6 | CRITICAL ≥7)</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Map Section ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            Location & Estimated Impact Zone
          </h3>
          <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
            Impact Radius: {complaint.impactRadius || 100}m
          </span>
        </div>
        <LeafletMap
          center={[loc.latitude, loc.longitude]}
          selectedLocation={[loc.latitude, loc.longitude]}
          impactRadiusMeters={complaint.impactRadius || 100}
          height="350px"
        />
      </div>

      {/* ── Resource Recommendation Agent (authority only) ── */}
      <ResourceRecommendationCard complaintId={complaint.complaintId} />

      {/* ── Resolution Verification Panel ── */}
      <ResolutionVerificationPanel
        complaint={complaint}
        onUpdated={(updated) => setData((prev: any) => prev ? { ...prev, complaint: updated } : prev)}
      />

      {/* ── Agent Activity Trace Log ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900">Agent Activity Trace</h3>
            <p className="text-xs text-slate-500">Autonomous tool calls executed by CivicFix Agent • {agentLog.length} steps</p>
          </div>
        </div>

        <div className="space-y-3">
          {agentLog.length === 0 ? (
            <div className="text-xs text-slate-400">No agent log recorded.</div>
          ) : (
            agentLog.map((evt: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3 text-xs group">
                <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-emerald-200 group-hover:bg-emerald-50 transition-colors">
                  {EVT_ICON[evt.type] || <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="font-medium text-slate-700 leading-relaxed">{evt.message}</p>
                  <span className="text-[10px] text-slate-400 font-mono">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono bg-slate-50 border border-slate-200 px-2 py-0.5 rounded shrink-0">
                  #{String(idx + 1).padStart(2, "0")}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
