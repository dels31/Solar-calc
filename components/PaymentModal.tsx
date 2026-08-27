"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import {
  X,
  Crown,
  QrCode,
  MessageCircle,
} from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentModal({ isOpen, onClose }: PaymentModalProps) {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<"project" | "unlimited">("unlimited");

  if (!isOpen) return null;

  const planPrice = selectedPlan === "unlimited" ? "Rp 99.000" : "Rp 25.000";
  const planName = selectedPlan === "unlimited" ? "Pro Unlimited (1 Bulan)" : "Single Project Export";

  const waMessage = `Halo Admin 7 Layers IT Solutions, saya sudah transfer/scan QRIS untuk aktivasi akun Solar Calc Pro:
- Nama: ${user?.displayName || "Pengguna"}
- Email Akun: ${user?.email || "-"}
- Pilihan Paket: ${planName} (${planPrice})

Mohon bantuannya untuk di-ACC / aktivasi paket Pro saya ya min. Terima kasih! 🙏`;

  const waUrl = `https://wa.me/6281993507390?text=${encodeURIComponent(waMessage)}`;

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
            Buka akses penuh ekspor proposal PDF resmi ber-KOP & spreadsheet Excel BoM lengkap
          </p>
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
            <div className="absolute -top-2.5 right-4 bg-linear-to-r from-amber-500 to-orange-500 text-slate-950 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-sm">
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

        {/* OFFICIAL QRIS PAYMENT SECTION */}
        <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-700/80 pb-3">
            <div className="flex items-center gap-2">
              <QrCode size={18} className="text-amber-500" />
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                QRIS Pembayaran Resmi (7 Layers IT Solutions)
              </span>
            </div>
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 rounded-xl border border-emerald-300/40">
              Total Bayar: {planPrice}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* QRIS IMAGE */}
            <div className="p-2 bg-white rounded-2xl border-2 border-slate-200 shadow-md shrink-0 w-48 h-64 relative flex flex-col items-center justify-center">
              <Image
                src="/qris-7layers.jpg"
                alt="QRIS 7 Layers IT Solutions"
                width={180}
                height={240}
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            {/* PAYMENT INSTRUCTIONS */}
            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 flex-1">
              <p className="font-bold text-slate-800 dark:text-slate-100">
                Langkah Pembayaran & Aktivasi:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                <li>Buka aplikasi m-Banking (BCA, Mandiri, BRI, BNI) atau E-Wallet (GoPay, OVO, Dana, ShopeePay).</li>
                <li>Scan barcode QRIS <strong>7 Layers IT Solution</strong> di samping.</li>
                <li>Masukkan nominal sesuai paket: <strong className="text-slate-900 dark:text-white font-bold">{planPrice}</strong>.</li>
                <li>Selesai transfer, klik tombol WhatsApp di bawah untuk kirim bukti transfer ke admin.</li>
              </ol>

              {/* WHATSAPP CONFIRMATION BUTTON */}
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full mt-3 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 text-center"
              >
                <MessageCircle size={17} />
                <span>Konfirmasi Bukti Transfer via WhatsApp (0819-9350-7390)</span>
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
