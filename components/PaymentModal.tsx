"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  X,
  Crown,
  QrCode,
  FileText,
  FileSpreadsheet,
  Zap,
  ShieldCheck,
  Loader2,
  Sparkles,
} from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentModal({ isOpen, onClose, onSuccess }: PaymentModalProps) {
  const { upgradeToPro } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<"project" | "unlimited">("unlimited");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    try {
      await upgradeToPro();
      setTimeout(() => {
        setIsProcessing(false);
        onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative space-y-6 max-h-[92vh] overflow-y-auto">
        
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* HEADER */}
        <div className="text-center space-y-2 pt-2">
          <div className="w-14 h-14 bg-linear-to-tr from-amber-500 to-orange-500 text-slate-950 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Crown size={28} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2">
            Upgrade ke 7 Layers Pro
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300/40">
              PREMIUM ACCESS
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Buka akses penuh ekspor dokumen resmi engineering proposal PDF & spreadsheet BoM untuk klien Anda
          </p>
        </div>

        {/* FEATURE HIGHLIGHTS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-3">
            <div className="w-8 h-8 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center shrink-0">
              <FileText size={16} />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">PDF Proposal Resmi</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Kop & logo 7 Layers, analisis ROI & tabel teknis garansi 25 tahun</p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-3">
            <div className="w-8 h-8 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center shrink-0">
              <FileSpreadsheet size={16} />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">Excel Bill of Materials</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Rincian itemized BoM lengkap beserta estimasi harga pasar real-time</p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
              <Zap size={16} />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">Single Line Diagram</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Visualisasi alur daya stringing dan titik proteksi standar PUIL/NEC</p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">Unlimited Projects</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Kalkulasi dan buat penawaran tanpa batas untuk seluruh klien Anda</p>
            </div>
          </div>
        </div>

        {/* PRICING OPTIONS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => setSelectedPlan("project")}
            className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${
              selectedPlan === "project"
                ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/30"
                : "bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-400"
            }`}
          >
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
              Paket Single Export
            </span>
            <div className="flex items-baseline gap-1">
              <h4 className="text-2xl font-black text-slate-900 dark:text-white">Rp 25.000</h4>
              <span className="text-xs text-slate-400">/ proyek</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Cocok untuk instalasi 1 unit rumah atau estimasi cepat individual.
            </p>
          </div>

          <div
            onClick={() => setSelectedPlan("unlimited")}
            className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${
              selectedPlan === "unlimited"
                ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/30"
                : "bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-400"
            }`}
          >
            <div className="absolute -top-2.5 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-sm">
              PALING POPULER
            </div>
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider block mb-1">
              Paket Pro Unlimited
            </span>
            <div className="flex items-baseline gap-1">
              <h4 className="text-2xl font-black text-slate-900 dark:text-white">Rp 99.000</h4>
              <span className="text-xs text-slate-400">/ bulan</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Akses download tak terbatas untuk kontraktor, engineer & sales PLTS.
            </p>
          </div>
        </div>

        {/* QRIS / PAYMENT METHOD TOGGLE */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <QrCode size={16} className="text-amber-500" /> Metode Pembayaran Otomatis
            </span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
              ⚡ QRIS & Virtual Account
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Mendukung:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">GoPay, OVO, Dana, ShopeePay, BCA, Mandiri, BRI, BNI</span>
          </div>
        </div>

        {/* ACTION BUTTON */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleSimulatePayment}
            disabled={isProcessing}
            className="w-full py-4 bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-orange-500/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Memproses Verifikasi Pembayaran...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Konfirmasi Pembayaran ({selectedPlan === "unlimited" ? "Rp 99.000" : "Rp 25.000"})</span>
              </>
            )}
          </button>
          
          <p className="text-[10px] text-slate-400 text-center">
            *Simulasi pembayaran instan sandbox aktif untuk testing & presentasi
          </p>
        </div>

      </div>
    </div>
  );
}
