"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin, Camera, Upload, AlertCircle, Sparkles, CheckCircle2,
  ArrowRight, Loader2, Info, Mic, MicOff, X, Activity,
  Zap, Building, Users, BarChart3
} from "lucide-react";
import { submitComplaint, uploadPhoto } from "@/lib/api";
import { AgentVisualizer, AgentStep } from "@/components/AgentVisualizer";
import { LeafletMap } from "@/components/LeafletMap";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { getCurrentLocation } from "@/lib/geolocation";

// ── Utility: rough local AI preview (mirrors backend heuristics) ───────────
// Checks the most specific categories first; "road"/"pit" were dropped from
// the pothole trigger because they're generic words that show up in almost
// any location description, which was causing every complaint to preview as
// a pothole regardless of what was actually described.
function localPreview(desc: string) {
  const d = desc.toLowerCase();
  let category = "general_civic";
  if (/garbage|trash|waste|dump|litter|bin|rubbish/.test(d)) category = "garbage";
  else if (/light|lamp|street light|dark|bulb/.test(d)) category = "broken_streetlight";
  else if (/water|leak|pipe|drain|burst|sewage|overflow/.test(d)) category = "water_leakage";
  else if (/paper|document|sheet|note|receipt|letter/.test(d)) category = "general_civic";
  else if (/pothole|asphalt|crater|tarmac|hole in( the)? road/.test(d)) category = "pothole";

  let severity = "medium";
  if (/danger|accident|crash|huge|severe|urgent|emergency|hazardous|overflowing|collapsed/.test(d))
    severity = "high";
  if (/critical|immediate|life-threatening/.test(d)) severity = "critical";

  let priority = "MEDIUM";
  let score = severity === "high" ? 3 : severity === "critical" ? 4 : 2;
  if (/school|college|hospital|gate/.test(d)) { score += 2; }
  if (/main road|highway|junction|intersection/.test(d)) { score += 2; }
  if (/crash|accident|hazard|risk|injury|flooding/.test(d)) { score += 2; }
  if (score >= 7) priority = "CRITICAL";
  else if (score >= 5) priority = "HIGH";
  else if (score >= 3) priority = "MEDIUM";
  else priority = "LOW";

  const deptMap: Record<string, string> = {
    pothole: "Road Maintenance Department",
    garbage: "Municipal Sanitation Department",
    broken_streetlight: "Electrical Infrastructure Division",
    water_leakage: "Water & Sewerage Board",
    general_civic: "General Civic Services"
  };
  const dept = deptMap[category] || "General Civic Services";

  // Estimated community impact
  const severityBase: Record<string, number> = { low: 15, medium: 30, high: 50, critical: 70 };
  let impact = severityBase[severity] || 30;
  if (/school|hospital|main road|hazard/.test(d)) impact += 15;
  impact = Math.max(10, Math.min(100, impact));

  return { category, severity, priority, dept, score, impact };
}

const CATEGORY_LABELS: Record<string, string> = {
  pothole: "🕳️ Pothole / Road Damage",
  garbage: "🗑️ Garbage / Waste",
  broken_streetlight: "💡 Broken Streetlight",
  water_leakage: "💧 Water Leakage",
  general_civic: "📋 General Civic Issue / Other"
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "text-slate-600 bg-slate-100",
  MEDIUM: "text-amber-700 bg-amber-100",
  HIGH: "text-orange-700 bg-orange-100",
  CRITICAL: "text-rose-700 bg-rose-100"
};

export default function ReportProblemPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Geolocation
  const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState("");

  // Voice input
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Smart confirmation preview
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [preview, setPreview] = useState<ReturnType<typeof localPreview> | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [createdComplaintId, setCreatedComplaintId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login/citizen");
    }
  }, [user, authLoading, router]);

  // ── Voice Input Setup ───────────────────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-IN";

      rec.onresult = (e: any) => {
        const transcript = Array.from(e.results)
          .map((r: any) => r[0].transcript)
          .join("");
        setDescription(transcript);
      };
      rec.onend = () => setIsListening(false);
      rec.onerror = () => setIsListening(false);
      recognitionRef.current = rec;
    }
  }, []);

  const toggleVoice = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (isListening) {
      rec.stop();
      setIsListening(false);
    } else {
      setDescription("");
      rec.start();
      setIsListening(true);
    }
  }, [isListening]);

  // ── GPS ─────────────────────────────────────────────────────────────────
  const handleGetLocation = () => {
    setLocLoading(true);
    setLocError("");
    getCurrentLocation()
      .then((loc) => setLocation(loc))
      .catch((err) => setLocError(err.message || "Could not determine your location. You can set it manually on the map below."))
      .finally(() => setLocLoading(false));
  };

  useEffect(() => { handleGetLocation(); }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // ── Pre-Submission Confirmation ──────────────────────────────────────────
  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) { setErrorMsg("Please describe the issue first."); return; }
    if (!location) { setErrorMsg("GPS location is required to route the case."); return; }
    setErrorMsg("");
    setPreview(localPreview(description));
    setShowConfirmation(true);
  };

  // ── Final Submit ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setShowConfirmation(false);
    setIsSubmitting(true);
    setErrorMsg("");

    const initialSteps: AgentStep[] = [
      { label: "1. Capturing GPS & Reverse-Geocoding", detail: `${location!.latitude.toFixed(4)}, ${location!.longitude.toFixed(4)}`, status: "running" },
      { label: "2. Gemini NLU & Vision Classification", detail: "Analyzing text + image evidence...", status: "pending" },
      { label: "3. Deterministic Priority Scoring Engine", detail: "Applying location-aware modifiers...", status: "pending" },
      { label: "4. Community Impact Score Calculation", detail: "Measuring affected citizen density...", status: "pending" },
      { label: "5. Spatial Duplicate Detection (Haversine)", detail: "Searching 100m radius...", status: "pending" },
      { label: "6. Department Routing & SLA Assignment", detail: "Identifying responsible authority...", status: "pending" },
      { label: "7. Registering Civic Case in Database", detail: "Generating case ID & notification...", status: "pending" }
    ];
    setAgentSteps(initialSteps);

    try {
      let imageUrl: string | null = null;
      if (photoFile) {
        try {
          const up = await uploadPhoto(photoFile);
          imageUrl = up.imageUrl;
        } catch { console.warn("Image upload fallback."); }
      }

      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("You must be logged in to report a problem.");
      
      const payload = {
        description,
        location,
        imageUrl,
        userId: currentUser.uid,
        userEmail: currentUser.email || undefined
      };

      const step = (idx: number, detail: string) =>
        setAgentSteps(prev =>
          prev.map((s, i) =>
            i === idx - 1 ? { ...s, status: "completed", detail } :
            i === idx ? { ...s, status: "running" } : s
          )
        );

      await new Promise(r => setTimeout(r, 600));
      step(1, "Location reverse-geocoded successfully");

      const agentResult = await submitComplaint(payload);
      const c = agentResult.complaint;

      await new Promise(r => setTimeout(r, 500));
      step(2, `Classified: ${c.category?.replace("_", " ").toUpperCase()} (${c.severity?.toUpperCase()} severity)`);

      await new Promise(r => setTimeout(r, 400));
      step(3, `Priority: ${c.priority} (Score: ${c.priorityScore})`);

      await new Promise(r => setTimeout(r, 400));
      step(4, `Community Impact: ${c.communityImpactScore ?? "–"}/100`);

      await new Promise(r => setTimeout(r, 400));
      step(5, c.duplicateOf ? `Linked to master case ${c.duplicateOf}` : "No duplicate match found");

      await new Promise(r => setTimeout(r, 400));
      step(6, `Assigned to ${c.department}`);

      await new Promise(r => setTimeout(r, 400));
      setAgentSteps(prev => prev.map(s => ({ ...s, status: "completed" })));
      setCreatedComplaintId(c.complaintId);

      setTimeout(() => router.push(`/complaint/${c.complaintId}`), 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit complaint.");
      setIsSubmitting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

      {/* Header */}
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 justify-center sm:justify-start">
          <Sparkles className="w-7 h-7 text-emerald-600" />
          Report a Civic Problem
        </h1>
        <p className="text-slate-600 text-sm">
          Describe the issue via text or voice. CivicFix AI agent will autonomously classify, score, detect duplicates, and route your request.
        </p>
      </div>

      {authLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      )}

      {(!authLoading && user) && (
        <>
          {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Smart Confirmation Modal */}
      {showConfirmation && preview && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-[slideUp_0.25s_ease]">
            
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-sm">AI Classification Preview</h2>
                  <p className="text-[11px] text-slate-500">Review before submitting your complaint</p>
                </div>
              </div>
              <button onClick={() => setShowConfirmation(false)} className="text-slate-400 hover:text-slate-700:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview Grid */}
            <div className="p-6 grid grid-cols-2 gap-3">

              {/* Category */}
              <div className="col-span-2 bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center text-lg">
                  {preview.category === "pothole" ? "🕳️" :
                   preview.category === "garbage" ? "🗑️" :
                   preview.category === "broken_streetlight" ? "💡" : "💧"}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Detected Category</p>
                  <p className="font-bold text-slate-900 text-sm">{CATEGORY_LABELS[preview.category]}</p>
                </div>
              </div>

              {/* Priority */}
              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Priority
                </p>
                <span className={`inline-block px-2.5 py-1 rounded-lg font-bold text-xs ${PRIORITY_COLORS[preview.priority]}`}>
                  {preview.priority}
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Score: {preview.score}</p>
              </div>

              {/* Community Impact */}
              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Est. Impact
                </p>
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-black text-slate-900">{preview.impact}</span>
                  <span className="text-xs text-slate-500 mb-0.5">/100</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1.5">
                  <div
                    className={`h-full rounded-full transition-all ${preview.impact >= 70 ? "bg-rose-500" : preview.impact >= 50 ? "bg-orange-500" : preview.impact >= 30 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${preview.impact}%` }}
                  />
                </div>
              </div>

              {/* Department */}
              <div className="col-span-2 bg-emerald-50 rounded-2xl p-4 border border-emerald-200 flex items-center gap-3">
                <Building className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Routing To</p>
                  <p className="font-bold text-slate-900 text-sm">{preview.dept}</p>
                </div>
              </div>

              <p className="col-span-2 text-[10px] text-slate-400 text-center">
                ⚙️ Final values are computed by the AI agent on submission. Preview is estimated locally.
              </p>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50:bg-slate-800 transition-colors"
              >
                Edit Report
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Submit & Start Agent
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {isSubmitting ? (
        <div className="space-y-6">
          <AgentVisualizer steps={agentSteps} isProcessing={!createdComplaintId} />
          {createdComplaintId && (
            <div className="text-center p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 font-medium">
              🎉 Case <span className="font-mono font-bold">{createdComplaintId}</span> created! Redirecting to case tracking...
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handlePreview} className="space-y-6">

          {/* 1. Description + Voice */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-bold text-slate-900">
                Describe what&apos;s happening
              </label>
              {voiceSupported && (
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    isListening
                      ? "bg-rose-500 text-white border-rose-500 animate-pulse shadow-lg shadow-rose-500/30"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-400 hover:text-emerald-600"
                  }`}
                >
                  {isListening ? <><MicOff className="w-3.5 h-3.5" /> Stop Listening</> : <><Mic className="w-3.5 h-3.5" /> 🎙 Speak</>}
                </button>
              )}
            </div>

            {isListening && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                <span className="flex gap-0.5">
                  {[1,2,3,4].map(i => (
                    <span key={i} className="w-1 bg-rose-500 rounded-full animate-[bounce_0.8s_ease-in-out_infinite]" style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </span>
                Listening... Speak your complaint clearly.
              </div>
            )}

            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. There is a dangerous large pothole near the college main gate. Two motorcycles almost lost control here today."
              className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed resize-none"
            />

            {/* Live mini-preview tags */}
            {description.length > 20 && (() => {
              const p = localPreview(description);
              return (
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 text-[11px] font-semibold border border-indigo-200">
                    {CATEGORY_LABELS[p.category]}
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${PRIORITY_COLORS[p.priority]}`}>
                    {p.priority} Priority
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 text-[11px] font-semibold border border-slate-200">
                    Impact: {p.impact}/100
                  </span>
                </div>
              );
            })()}
          </div>

          {/* 2. Photo Upload */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <label className="block text-sm font-bold text-slate-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-600" />
              Add Photo Evidence (Optional)
            </label>
            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden max-h-60 border border-slate-200">
                <img src={photoPreview} alt="Preview" className="w-full object-cover max-h-60" />
                <button
                  type="button"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                  className="absolute top-2 right-2 bg-slate-900/80 text-white text-xs px-2.5 py-1 rounded-lg hover:bg-slate-900 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50:bg-slate-800/50 transition-colors">
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-xs font-semibold text-slate-700">Click to upload photo evidence</span>
                <span className="text-[11px] text-slate-400 mt-0.5">PNG, JPG, WebP up to 10MB — analyzed by Gemini Vision</span>
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
            )}
          </div>

          {/* 3. Location */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" />
                  Captured Geolocation
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  {location
                    ? `GPS: ${location.latitude.toFixed(4)}°, ${location.longitude.toFixed(4)}° (±${Math.round(location.accuracy)}m)`
                    : "Detecting GPS location..."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={locLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-60"
              >
                {locLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                {locLoading ? "Detecting..." : "Use My Location"}
              </button>
            </div>

            {locError && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                {locError}
              </div>
            )}

            {location && (
              <LeafletMap
                center={[location.latitude, location.longitude]}
                selectedLocation={[location.latitude, location.longitude]}
                onLocationSelect={(lat, lng) => setLocation({ latitude: lat, longitude: lng, accuracy: 5 })}
                height="280px"
              />
            )}
          </div>

          {/* Preview & Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-base shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
          >
            <BarChart3 className="w-5 h-5" />
            Preview AI Classification
            <ArrowRight className="w-5 h-5 ml-1" />
          </button>

        </form>
      )}
      </>
      )}
    </div>
  );
}
