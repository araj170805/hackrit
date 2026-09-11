"use client";

import React, { useState } from "react";
import { ShieldCheck, Camera, MapPin, Clock, Sparkles, CheckCircle2, XCircle, RotateCcw, KeyRound, ThumbsUp, ThumbsDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  requestVerification,
  submitResolutionEvidence,
  confirmResolution,
  submitCitizenFeedback,
  uploadPhoto
} from "@/lib/api";

interface Props {
  complaint: any;
  onUpdated: (updated: any) => void;
}

function CheckPill({ label, result }: { label: string; result?: string }) {
  const r = (result || "").toUpperCase();
  const style =
    r === "PASS" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    r === "FAIL" ? "bg-rose-50 text-rose-700 border-rose-200" :
    "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold ${style}`}>
      <span>{label}</span>
      <span>{result || "—"}</span>
    </div>
  );
}

export function ResolutionVerificationPanel({ complaint, onUpdated }: Props) {
  const { user, userProfile } = useAuth();
  const isAuthority = userProfile?.role === "authority" || userProfile?.role === "admin";
  const isReporter = user?.uid === complaint.userId;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [issuedToken, setIssuedToken] = useState<string | null>(null);

  const [token, setToken] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  const verificationStatus = complaint.verificationStatus || "NONE";

  const handleRequestVerification = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await requestVerification(complaint.complaintId);
      setIssuedToken(res.token);
      onUpdated({ ...complaint, verificationStatus: "PENDING_EVIDENCE" });
    } catch (err: any) {
      setError(err.message || "Failed to request verification.");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceFile) {
      setError("Please attach a photo of the resolved issue.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });

      const uploaded = await uploadPhoto(evidenceFile);
      const res = await submitResolutionEvidence(complaint.complaintId, {
        token,
        imageUrl: uploaded.imageUrl,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        capturedAt: new Date().toISOString()
      });

      onUpdated({
        ...complaint,
        verificationStatus: res.verificationStatus,
        verificationResult: res.verificationResult,
        resolutionEvidence: res.resolutionEvidence
      });
      setToken("");
      setEvidenceFile(null);
    } catch (err: any) {
      setError(err.message || "Failed to submit resolution evidence. Check your GPS permission and token.");
    } finally {
      setBusy(false);
    }
  };

  const handleAuthorityAction = async (action: "confirm" | "reject" | "request_new") => {
    setBusy(true);
    setError("");
    try {
      const updated = await confirmResolution(complaint.complaintId, action);
      setIssuedToken(action === "request_new" ? updated.verificationToken?.token || null : null);
      onUpdated(updated);
    } catch (err: any) {
      setError(err.message || "Failed to record decision.");
    } finally {
      setBusy(false);
    }
  };

  const handleCitizenFeedback = async (fixed: boolean) => {
    setBusy(true);
    setError("");
    try {
      const updated = await submitCitizenFeedback(complaint.complaintId, fixed);
      onUpdated(updated);
    } catch (err: any) {
      setError(err.message || "Failed to submit feedback.");
    } finally {
      setBusy(false);
    }
  };

  // Nothing relevant to show yet.
  if (complaint.status !== "resolved" && complaint.status !== "closed" && verificationStatus === "NONE") {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Resolution Verification</h3>
          <p className="text-xs text-slate-500">Status: <strong>{verificationStatus.replace(/_/g, " ")}</strong></p>
        </div>
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium">{error}</div>}

      {/* Authority: request verification once resolved */}
      {isAuthority && complaint.status === "resolved" && verificationStatus === "NONE" && (
        <button
          onClick={handleRequestVerification}
          disabled={busy}
          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50"
        >
          Request Resolution Verification
        </button>
      )}

      {isAuthority && issuedToken && (
        <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold"><KeyRound className="w-3.5 h-3.5" /> One-time verification token</div>
          <div className="font-mono text-sm bg-white px-2 py-1 rounded-lg border border-indigo-200">{issuedToken}</div>
          <p>Share this with whoever is capturing resolution evidence (citizen or field worker). It expires in 24 hours and can only be used once.</p>
        </div>
      )}

      {/* Anyone with the token: submit evidence */}
      {verificationStatus === "PENDING_EVIDENCE" && (
        <form onSubmit={handleSubmitEvidence} className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Camera className="w-4 h-4" /> Submit Resolution Evidence
          </p>
          <input
            type="text"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Verification token (e.g. CFV-...)"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
          />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            required
            onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
            className="w-full text-xs"
          />
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> Your current GPS location will be captured and compared against the original issue location.
          </p>
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50"
          >
            {busy ? "Submitting..." : "Capture & Submit Evidence"}
          </button>
        </form>
      )}

      {/* Verification result */}
      {complaint.verificationResult && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <CheckPill label="GPS Location" result={complaint.verificationResult.locationCheck} />
            <CheckPill label="Timestamp" result={complaint.verificationResult.timestampCheck} />
            <CheckPill label="Token" result={complaint.verificationResult.tokenCheck} />
            <CheckPill label="AI Vision" result={complaint.verificationResult.visionCheck} />
          </div>
          <div className={`p-3 rounded-xl text-xs font-bold text-center ${
            complaint.verificationResult.recommendation === "VERIFICATION_RECOMMENDED"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}>
            {complaint.verificationResult.recommendation === "VERIFICATION_RECOMMENDED"
              ? "✅ Verification Recommended"
              : "⚠️ Needs Manual Review"}
          </div>
          {complaint.resolutionEvidence?.visionCheck?.explanation && (
            <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {complaint.resolutionEvidence.visionCheck.explanation}
            </p>
          )}
          {complaint.resolutionEvidence?.imageUrl && (
            <img src={complaint.resolutionEvidence.imageUrl} alt="Resolution evidence" className="rounded-xl max-h-48 object-cover border border-slate-200" />
          )}
        </div>
      )}

      {/* Authority final decision */}
      {isAuthority && verificationStatus === "PENDING_REVIEW" && (
        <div className="flex flex-wrap gap-2 pt-2">
          <button onClick={() => handleAuthorityAction("confirm")} disabled={busy} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50">
            <CheckCircle2 className="w-4 h-4" /> Confirm Resolution
          </button>
          <button onClick={() => handleAuthorityAction("reject")} disabled={busy} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50">
            <XCircle className="w-4 h-4" /> Reject Evidence
          </button>
          <button onClick={() => handleAuthorityAction("request_new")} disabled={busy} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold disabled:opacity-50">
            <RotateCcw className="w-4 h-4" /> Request New Evidence
          </button>
        </div>
      )}

      {/* Citizen feedback once closed */}
      {isReporter && complaint.status === "closed" && complaint.citizenConfirmedFixed === undefined && (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-3">
          <p className="text-xs font-bold text-blue-900">Is this issue actually fixed?</p>
          <div className="flex gap-2">
            <button onClick={() => handleCitizenFeedback(true)} disabled={busy} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50">
              <ThumbsUp className="w-4 h-4" /> Yes, it's fixed
            </button>
            <button onClick={() => handleCitizenFeedback(false)} disabled={busy} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50">
              <ThumbsDown className="w-4 h-4" /> No, still unresolved
            </button>
          </div>
        </div>
      )}

      {complaint.citizenConfirmedFixed === true && (
        <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Reporter confirmed the issue is fixed.</div>
      )}
    </div>
  );
}
