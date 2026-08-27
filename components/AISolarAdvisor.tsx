"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Brain,
  Zap,
  Weight,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  Award,
  ChevronDown,
  ChevronUp,
  Lock,
  Crown,
  Loader2,
  Bot,
} from "lucide-react";
import type { SolarCalcResults, SolarCalcInputs } from "@/lib/solarCalculator";
import { formatRupiah } from "@/lib/solarCalculator";
import { useAuth } from "@/context/AuthContext";

interface AISolarAdvisorProps {
  inputs: SolarCalcInputs;
  results: SolarCalcResults;
  onOpenUpgradeModal?: () => void;
  onOpenAuthModal?: () => void;
}

interface GeminiAdvisorData {
  aiScore: number;
  summary: string;
  powerAutonomy: string;
  structuralInsight: string;
  electricalCompliance: string;
  financialProjection: string;
  actionableTips: string[];
}

export default function AISolarAdvisor({
  inputs,
  results,
  onOpenUpgradeModal,
  onOpenAuthModal,
}: AISolarAdvisorProps) {
  const { user, userProfile, isSuperAdmin } = useAuth();
  const isProMember = Boolean(userProfile?.isPro || isSuperAdmin);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [geminiData, setGeminiData] = useState<GeminiAdvisorData | null>(null);

  const { dayaVA, psh, jamOp, mountingType, selectedPanel, selectedBattery, tarifPLN = 1444.7 } = inputs;
  const { jmlPanel, totalPacks, loadPerSqm, stringVoc, isVocSafe, pvCableSize, batteryCableSize, pvFuseSize, batteryFuseSize, financial } = results;

  // Fallback Heuristic Analysis
  const roofLoadNum = Number(loadPerSqm);
  const isRoofVerySafe = roofLoadNum <= 15;
  const totalCapacityKwh = (totalPacks * (selectedBattery?.voltage || 48) * (selectedBattery?.capacity_ah || 100)) / 1000;
  const dailyKwhDemand = (dayaVA * 0.8 * jamOp) / 1000;
  const autonomyHours = dailyKwhDemand > 0 ? ((totalCapacityKwh * (selectedBattery?.max_dod || 0.8) / (dayaVA * 0.8)) * 1000).toFixed(1) : "24";

  let defaultScore = 96;
  if (!isVocSafe) defaultScore -= 20;
  if (roofLoadNum > 20) defaultScore -= 10;
  if (financial.paybackYears > 8) defaultScore -= 5;

  const fetchGeminiAnalysis = useCallback(async () => {
    if (!isProMember) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/ai/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs, results, isPro: true }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setGeminiData(json.data);
      }
    } catch (err) {
      console.warn("Fallback to client heuristic AI:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [inputs, results, isProMember]);

  useEffect(() => {
    let isMounted = true;
    if (isProMember && !geminiData) {
      const timer = setTimeout(() => {
        if (isMounted) {
          fetchGeminiAnalysis();
        }
      }, 50);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [isProMember, fetchGeminiAnalysis, geminiData]);

  const activeScore = geminiData?.aiScore || defaultScore;

  // -------------------------------------------------------------
  // FREE MEMBER PAYWALL VIEW
  // -------------------------------------------------------------
  if (!isProMember) {
    return (
      <div className="mt-8 bg-linear-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-700/80 dark:border-slate-800 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        
        {/* GLOW DECORATIONS */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-linear-to-tr from-purple-600 via-indigo-600 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25 shrink-0">
              <Bot size={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  7 Layers AI Solar Advisor
                </h3>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-linear-to-r from-purple-500 to-indigo-500 text-white uppercase tracking-wider">
                  ✨ Gemini LLM Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Analisis kelayakan otomatis & rekomendasi instalasi berbasis Google Gemini AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
            <Crown size={15} className="text-amber-400" />
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
              PRO EXCLUSIVE
            </span>
          </div>
        </div>

        {/* BLURRED PREVIEW WITH OVERLAY CARD */}
        <div className="relative mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 filter blur-sm select-none pointer-events-none opacity-25">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-5 bg-slate-800 rounded-3xl space-y-3 h-48 border border-slate-700" />
            ))}
          </div>

          {/* LOCK OVERLAY */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-slate-950/60 backdrop-blur-xs rounded-3xl border border-slate-800">
            <div className="w-14 h-14 bg-linear-to-tr from-amber-500 to-orange-500 text-slate-950 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-orange-500/25">
              <Lock size={26} />
            </div>
            <h4 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Analisa AI Gemini Terkunci Khusus Pro Member
            </h4>
            <p className="text-xs text-slate-300 max-w-md mt-1.5 mb-5 font-medium leading-relaxed">
              Dapatkan analisis kelayakan mendalam, audit struktural & kelistrikan, serta rekomendasi teknis otomatis yang dihasilkan oleh model <strong>Google Gemini AI</strong> untuk rancangan PLTS Anda.
            </p>
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  onOpenAuthModal?.();
                } else {
                  onOpenUpgradeModal?.();
                }
              }}
              className="px-6 py-3.5 bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Crown size={16} />
              <span>Buka Akses Analisa AI (Upgrade Pro)</span>
            </button>
          </div>
        </div>

      </div>
    );
  }

  // -------------------------------------------------------------
  // PRO MEMBER FULL GEMINI AI VIEW
  // -------------------------------------------------------------
  return (
    <div className="mt-8 bg-linear-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-700/80 dark:border-slate-800 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
      
      {/* GLOW DECORATIONS */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-linear-to-tr from-purple-600 via-indigo-600 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25 shrink-0 animate-pulse">
            <Brain size={24} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                7 Layers AI Solar Engine Advisor
              </h3>
              <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full bg-linear-to-r from-purple-500 via-indigo-500 to-emerald-500 text-white uppercase tracking-wider shadow-xs flex items-center gap-1">
                <Sparkles size={10} /> Google Gemini AI
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Analisis kelayakan teknis, audit keselamatan elektrik & proyeksi ROI bertenaga Google Gemini
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* AI SCORE BADGE */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-2xl">
            <Award size={16} className="text-amber-400" />
            <div className="text-left">
              <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">AI Score</p>
              <p className="text-xs font-black text-amber-400 leading-tight">
                {activeScore}/100 <span className="text-[10px] text-slate-300">({activeScore >= 90 ? "Grade A+" : "Grade A"})</span>
              </p>
            </div>
          </div>

          {/* RE-ANALYZE BUTTON */}
          <button
            type="button"
            onClick={fetchGeminiAnalysis}
            disabled={isAnalyzing}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
            title="Analisa Ulang dengan Gemini AI"
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={13} className="animate-spin text-purple-400" />
                <span className="hidden sm:inline">Gemini Menganalisa...</span>
              </>
            ) : (
              <>
                <RefreshCw size={13} className="text-purple-400" />
                <span className="hidden sm:inline">Re-Analyze AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* EXECUTIVE SUMMARY IF AVAILABLE FROM GEMINI */}
      {geminiData?.summary && (
        <div className="mt-4 p-4 bg-purple-950/30 border border-purple-800/40 rounded-2xl text-xs text-purple-200 leading-relaxed relative z-10 flex items-start gap-2.5">
          <Sparkles size={16} className="text-purple-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white font-bold block mb-0.5">Gemini Executive Summary:</strong>
            {geminiData.summary}
          </div>
        </div>
      )}

      {/* 4 AI INSIGHT PILLARS */}
      <div className={`mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10 transition-opacity duration-300 ${
        isAnalyzing ? "opacity-40" : "opacity-100"
      }`}>
        
        {/* CARD 1: POWER RELIABILITY & AUTONOMY */}
        <div className="p-5 bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/60 rounded-3xl transition-all space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
                <Zap size={18} />
              </div>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 rounded-md">
                HIGH RELIABILITY
              </span>
            </div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 mb-1">
              Power Autonomy & Yield
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {geminiData?.powerAutonomy || (
                <>
                  Array <strong className="text-slate-200">{jmlPanel} panel ({jmlPanel * (selectedPanel?.pmax || 550)} Wp)</strong> menghasilkan est. <strong className="text-emerald-400">{results.financial.produksiHarianKwh.toFixed(1)} kWh/hari</strong>.
                  Cadangan <strong className="text-slate-200">{totalPacks} unit baterai</strong> mem-backup beban kritis selama <strong className="text-slate-200">~{autonomyHours} Jam</strong>.
                </>
              )}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-700/40 flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold">
            <CheckCircle2 size={13} />
            <span>Siklus DoD 80% Aman (6000+ Cycles)</span>
          </div>
        </div>

        {/* CARD 2: STRUCTURAL SAFETY */}
        <div className="p-5 bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/60 rounded-3xl transition-all space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center">
                <Weight size={18} />
              </div>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                isRoofVerySafe
                  ? "bg-blue-950/80 text-blue-400 border-blue-800/60"
                  : "bg-amber-950/80 text-amber-400 border-amber-800/60"
              }`}>
                {isRoofVerySafe ? "STRUCTURAL SAFE" : "NEEDS VERIFICATION"}
              </span>
            </div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 mb-1">
              Structural & Roof Load
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {geminiData?.structuralInsight || (
                <>
                  Beban terdistribusi atap adalah <strong className="text-blue-400 font-bold">{loadPerSqm} kg/m²</strong> (Total: {results.totalWeight} kg).
                  {mountingType === "aluminum"
                    ? " Menggunakan rel Aluminium AL6005-T5 Anodized berdaya tahan korosi tinggi."
                    : " Menggunakan struktur Besi Siku Galvanis kokoh untuk atap dak beton."}
                </>
              )}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-700/40 flex items-center gap-1.5 text-[11px] text-blue-400 font-bold">
            <CheckCircle2 size={13} />
            <span>Beban di Bawah Batas Rangka Atap (≤25 kg/m²)</span>
          </div>
        </div>

        {/* CARD 3: ELECTRICAL & PROTECTION */}
        <div className="p-5 bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/60 rounded-3xl transition-all space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center">
                <ShieldCheck size={18} />
              </div>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-purple-950/80 text-purple-400 border border-purple-800/60 rounded-md">
                PUIL & NEC READY
              </span>
            </div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 mb-1">
              Electrical Compliance
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {geminiData?.electricalCompliance || (
                <>
                  Tegangan String Voc <strong className="text-slate-200">{stringVoc.toFixed(1)}V</strong> ({results.finalS} Seri x {results.finalP} Paralel) {isVocSafe ? "berada dalam batas aman MPPT." : "melebihi batas Inverter!"}
                  Kabel PV <strong className="text-slate-200">{pvCableSize} mm²</strong> & Baterai <strong className="text-slate-200">{batteryCableSize} mm²</strong> terproteksi Sekring {pvFuseSize}A & {batteryFuseSize}A.
                </>
              )}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-700/40 flex items-center gap-1.5 text-[11px] text-purple-400 font-bold">
            <CheckCircle2 size={13} />
            <span>Koordinasi KHA & Proteksi Terpenuhi</span>
          </div>
        </div>

        {/* CARD 4: FINANCIAL & ROI OPTIMIZATION */}
        <div className="p-5 bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/60 rounded-3xl transition-all space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center">
                <TrendingUp size={18} />
              </div>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-950/80 text-amber-400 border border-amber-800/60 rounded-md">
                HIGH ROI
              </span>
            </div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 mb-1">
              Financial Payback
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {geminiData?.financialProjection || (
                <>
                  Dengan radiasi PSH <strong className="text-slate-200">{psh} jam/hari</strong> dan tarif PLN <strong className="text-slate-200">Rp {tarifPLN.toLocaleString("id-ID")}/kWh</strong>, penghematan tahunan <strong className="text-amber-400">{formatRupiah(financial.penghematanTahunRp)}/thn</strong>.
                  Masa balik modal tercapai dalam <strong className="text-amber-400">{financial.paybackYears} Tahun</strong>.
                </>
              )}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-700/40 flex items-center gap-1.5 text-[11px] text-amber-400 font-bold">
            <CheckCircle2 size={13} />
            <span>ROI 25 Tahun: +{financial.roiPercent25Years}% ({formatRupiah(financial.penghematan25TahunRp)})</span>
          </div>
        </div>

      </div>

      {/* TOGGLE EXPANDED AI RECOMMENDATION ACCORDION */}
      <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col items-center">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-bold text-slate-400 hover:text-purple-400 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Sparkles size={14} className="text-purple-400" />
          <span>{isExpanded ? "Sembunyikan Rekomendasi Teknis AI" : "Lihat Detail Rekomendasi Teknis Lapangan dari Gemini AI"}</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {isExpanded && (
          <div className="w-full mt-4 p-5 bg-slate-800/40 border border-slate-700/50 rounded-2xl text-xs space-y-2 text-slate-300 animate-in fade-in duration-200">
            <p className="font-bold text-white flex items-center gap-2">
              💡 Actionable AI Recommendations for Site Engineer:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-[11px] text-slate-400 leading-relaxed">
              {geminiData?.actionableTips && geminiData.actionableTips.length > 0 ? (
                geminiData.actionableTips.map((tip, idx) => (
                  <li key={idx}>
                    <strong className="text-slate-200">{tip.split(":")[0]}:</strong>{" "}
                    {tip.split(":").slice(1).join(":") || tip}
                  </li>
                ))
              ) : (
                <>
                  <li><strong>Kemiringan Optimal Atap:</strong> Pasang modul surya dengan sudut kemiringan 10° – 15° menghadap Utara atau Selatan untuk memaksimalkan self-cleaning air hujan dan paparan sinar matahari ekuator.</li>
                  <li><strong>Sistem Pembumian (Grounding):</strong> Pastikan tahanan pembumian frame panel dan inverter &le; 5 Ohm menggunakan Grounding Rod tembaga solid dan SPD Type II.</li>
                  <li><strong>Ventilasi Ruang Baterai:</strong> Pasang baterai LiFePO4 pada ruangan bersuhu &le; 30°C dengan sirkulasi udara baik untuk menjaga cycle life mencapai 15 tahun.</li>
                  <li><strong>Pemeriksaan Kabel Rutin:</strong> Gunakan conduit pelindung PVC high impact untuk seluruh tarikan kabel PV outdoor guna mencegah gigitan hewan dan degradasi sinar UV.</li>
                </>
              )}
            </ul>
          </div>
        )}
      </div>

    </div>
  );
}
