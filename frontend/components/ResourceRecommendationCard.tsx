"use client";

import React, { useState } from "react";
import { Wrench, Users2, AlertOctagon, Info } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getResourceRecommendation } from "@/lib/api";

export function ResourceRecommendationCard({ complaintId }: { complaintId: string }) {
  const { userProfile } = useAuth();
  const isAuthority = userProfile?.role === "authority" || userProfile?.role === "admin";

  const [rec, setRec] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isAuthority) return null;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setRec(await getResourceRecommendation(complaintId));
    } catch (err: any) {
      setError(err.message || "Failed to load recommendation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
            <Wrench className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Resource Recommendation Agent</h3>
        </div>
        {!rec && (
          <button onClick={load} disabled={loading} className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold disabled:opacity-50">
            {loading ? "Analyzing..." : "Get Recommendation"}
          </button>
        )}
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium">{error}</div>}

      {rec && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
              <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1 mb-1"><Users2 className="w-3.5 h-3.5" /> Manpower</p>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{rec.recommendedManpower}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
              <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1 mb-1"><Wrench className="w-3.5 h-3.5" /> Equipment</p>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{rec.recommendedEquipment}</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 shrink-0" /> {rec.urgency}
          </div>

          <p className="text-xs text-slate-500">
            {rec.similarOpenIssuesInArea} similar open issue(s) in this area · {rec.communitySupportCount} community supports
            {rec.isRecurrence && " · ♻️ recurring problem"}
          </p>

          <p className="text-[11px] text-slate-400 flex items-start gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {rec.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}
