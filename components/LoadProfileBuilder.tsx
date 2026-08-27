"use client";

import React, { useState, useMemo } from "react";
import {
  Zap,
  Plus,
  Trash2,
  Tv,
  Refrigerator,
  Wind,
  Lightbulb,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Layers,
  X,
  Clock,
  Sliders,
} from "lucide-react";

export interface ApplianceItem {
  id: string;
  name: string;
  category: "cooling" | "lighting" | "kitchen" | "entertainment" | "utility" | "custom";
  watt: number;
  qty: number;
  hoursPerDay: number;
}

const DEFAULT_APPLIANCES: ApplianceItem[] = [
  { id: "ac-1", name: "AC Inverter 1 PK", category: "cooling", watt: 750, qty: 2, hoursPerDay: 8 },
  { id: "kulkas", name: "Kulkas 2 Pintu Inverter", category: "kitchen", watt: 120, qty: 1, hoursPerDay: 24 },
  { id: "lampu", name: "Lampu LED Rumah", category: "lighting", watt: 12, qty: 10, hoursPerDay: 10 },
  { id: "tv", name: "Smart TV 55 Inch", category: "entertainment", watt: 100, qty: 1, hoursPerDay: 6 },
  { id: "pompa", name: "Pompa Air Otomatis", category: "utility", watt: 350, qty: 1, hoursPerDay: 2 },
  { id: "magiccom", name: "Rice Cooker / Magic Com", category: "kitchen", watt: 380, qty: 1, hoursPerDay: 3 },
  { id: "komputer", name: "PC Komputer / Workstation", category: "entertainment", watt: 200, qty: 1, hoursPerDay: 8 },
  { id: "mesincuci", name: "Mesin Cuci Front Loading", category: "utility", watt: 350, qty: 1, hoursPerDay: 1.5 },
];

const PRESETS: Record<string, { name: string; desc: string; items: ApplianceItem[] }> = {
  small: {
    name: "Rumah Tangga 1.300 - 2.200 VA",
    desc: "1 AC, Kulkas, Lampu LED, TV, Pompa Air",
    items: [
      { id: "p1-ac", name: "AC 0.5 - 1 PK", category: "cooling", watt: 650, qty: 1, hoursPerDay: 8 },
      { id: "p1-kulkas", name: "Kulkas 1-2 Pintu", category: "kitchen", watt: 100, qty: 1, hoursPerDay: 24 },
      { id: "p1-lampu", name: "Lampu LED Hemat Energi", category: "lighting", watt: 10, qty: 8, hoursPerDay: 8 },
      { id: "p1-tv", name: "Smart TV 43 Inch", category: "entertainment", watt: 80, qty: 1, hoursPerDay: 5 },
      { id: "p1-pompa", name: "Pompa Air Sumur", category: "utility", watt: 250, qty: 1, hoursPerDay: 1.5 },
      { id: "p1-rice", name: "Rice Cooker", category: "kitchen", watt: 350, qty: 1, hoursPerDay: 2 },
    ],
  },
  medium: {
    name: "Rumah Menengah 3.500 - 5.500 VA",
    desc: "2-3 AC Inverter, Kulkas Besar, PC, Pompa, Mesin Cuci",
    items: [
      { id: "p2-ac1", name: "AC Inverter 1 PK (Kamar Utama)", category: "cooling", watt: 750, qty: 2, hoursPerDay: 9 },
      { id: "p2-kulkas", name: "Kulkas Side by Side Inverter", category: "kitchen", watt: 150, qty: 1, hoursPerDay: 24 },
      { id: "p2-lampu", name: "Lampu LED Downlight", category: "lighting", watt: 12, qty: 15, hoursPerDay: 10 },
      { id: "p2-tv", name: "Smart TV 55 Inch & Audio", category: "entertainment", watt: 140, qty: 2, hoursPerDay: 6 },
      { id: "p2-pompa", name: "Pompa Booster & Jet Pump", category: "utility", watt: 400, qty: 1, hoursPerDay: 2 },
      { id: "p2-pc", name: "PC Gaming / Workstation", category: "entertainment", watt: 250, qty: 1, hoursPerDay: 8 },
      { id: "p2-cuci", name: "Mesin Cuci & Dryer", category: "utility", watt: 500, qty: 1, hoursPerDay: 1.5 },
      { id: "p2-kitchen", name: "Air Fryer / Microwave", category: "kitchen", watt: 800, qty: 1, hoursPerDay: 0.5 },
    ],
  },
  commercial: {
    name: "Ruko / Kantor Bisnis (7k - 11k VA)",
    desc: "4 AC Kantor, Server/PC, Lampu Kantor, Dispenser",
    items: [
      { id: "p3-ac", name: "AC Cassette / Split 1.5 PK", category: "cooling", watt: 1100, qty: 4, hoursPerDay: 10 },
      { id: "p3-pc", name: "PC Kantor & Laptop Set", category: "entertainment", watt: 150, qty: 8, hoursPerDay: 9 },
      { id: "p3-server", name: "Server Network / CCTV Box", category: "utility", watt: 250, qty: 1, hoursPerDay: 24 },
      { id: "p3-lampu", name: "Lampu Tube LED Kantor", category: "lighting", watt: 18, qty: 20, hoursPerDay: 10 },
      { id: "p3-dispenser", name: "Dispenser Air Komersial", category: "kitchen", watt: 450, qty: 2, hoursPerDay: 8 },
      { id: "p3-printer", name: "Mesin Printer / Fotokopi", category: "utility", watt: 300, qty: 1, hoursPerDay: 3 },
    ],
  },
};

interface LoadProfileBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (calculatedVA: number, effectiveHours: number) => void;
}

export default function LoadProfileBuilder({ isOpen, onClose, onApply }: LoadProfileBuilderProps) {
  const [appliances, setAppliances] = useState<ApplianceItem[]>(DEFAULT_APPLIANCES);
  const [diversityFactor, setDiversityFactor] = useState(0.85); // 85% faktor simultanitas

  // Custom Item Form State
  const [newName, setNewName] = useState("");
  const [newWatt, setNewWatt] = useState<number | "">("");
  const [newQty, setNewQty] = useState(1);
  const [newHours, setNewHours] = useState(6);

  // Kalkulasi Total
  const summary = useMemo(() => {
    let totalInstalledWatt = 0;
    let totalDailyWh = 0;

    appliances.forEach((item) => {
      const itemTotalWatt = item.watt * item.qty;
      const itemDailyWh = itemTotalWatt * item.hoursPerDay;
      totalInstalledWatt += itemTotalWatt;
      totalDailyWh += itemDailyWh;
    });

    // Daya Puncak Simultan (Peak VA) dengan faktor diversitas dan power factor 0.9
    const simultaneousWatt = totalInstalledWatt * diversityFactor;
    const recommendedVA = Math.ceil((simultaneousWatt / 0.85) / 100) * 100; // Round up ke ratusan

    // Jam Operasi Efektif (Equivalent Full Load Hours)
    const effectiveHours = simultaneousWatt > 0
      ? Number((totalDailyWh / simultaneousWatt).toFixed(1))
      : 24;

    return {
      totalInstalledWatt,
      simultaneousWatt: Math.round(simultaneousWatt),
      totalDailyWh,
      totalDailyKwh: Number((totalDailyWh / 1000).toFixed(2)),
      recommendedVA: Math.max(1000, recommendedVA),
      effectiveHours: Math.min(24, Math.max(1, effectiveHours)),
    };
  }, [appliances, diversityFactor]);

  // Update Qty
  const handleQtyChange = (id: string, qty: number) => {
    setAppliances((prev) =>
      prev.map((item) => (item.id === id ? { ...item, qty: Math.max(0, qty) } : item))
    );
  };

  // Update Hours
  const handleHoursChange = (id: string, hours: number) => {
    setAppliances((prev) =>
      prev.map((item) => (item.id === id ? { ...item, hoursPerDay: Math.min(24, Math.max(0.5, hours)) } : item))
    );
  };

  // Delete Item
  const handleDelete = (id: string) => {
    setAppliances((prev) => prev.filter((item) => item.id !== id));
  };

  // Add Custom Item
  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newWatt || Number(newWatt) <= 0) return;

    const newItem: ApplianceItem = {
      id: `custom-${Date.now()}`,
      name: newName,
      category: "custom",
      watt: Number(newWatt),
      qty: Math.max(1, newQty),
      hoursPerDay: Math.min(24, Math.max(0.5, newHours)),
    };

    setAppliances((prev) => [newItem, ...prev]);
    setNewName("");
    setNewWatt("");
    setNewQty(1);
    setNewHours(6);
  };

  // Load Preset
  const handleLoadPreset = (key: string) => {
    if (PRESETS[key]) {
      setAppliances(PRESETS[key].items);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-linear-to-tr from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-orange-500/20">
              <Sliders size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                Load Profile Builder
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300/40">
                  ⚡ Kalkulator Beban Riil
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hitung kebutuhan daya VA dan kWh harian secara presisi dari inventaris elektronik Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* PRESET TEMPLATES BAR */}
        <div className="px-6 py-3 bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Layers size={13} className="text-amber-500" /> Template Preset:
          </span>
          <button
            onClick={() => handleLoadPreset("small")}
            className="px-3 py-1 bg-white dark:bg-slate-700 hover:bg-amber-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-600 transition-all cursor-pointer"
          >
            🏠 Rumah 1.300-2.200 VA
          </button>
          <button
            onClick={() => handleLoadPreset("medium")}
            className="px-3 py-1 bg-white dark:bg-slate-700 hover:bg-amber-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-600 transition-all cursor-pointer"
          >
            🏡 Rumah 3.500-5.500 VA
          </button>
          <button
            onClick={() => handleLoadPreset("commercial")}
            className="px-3 py-1 bg-white dark:bg-slate-700 hover:bg-amber-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-600 transition-all cursor-pointer"
          >
            🏢 Ruko / Kantor 7k-11k VA
          </button>
          <button
            onClick={() => setAppliances(DEFAULT_APPLIANCES)}
            title="Reset ke Default"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg ml-auto cursor-pointer"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* MAIN BODY (2 COLUMNS: TABLE APPLIANCES & SUMMARY) */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: APPLIANCES LIST & ADD FORM (7 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* ADD CUSTOM FORM */}
            <form onSubmit={handleAddCustom} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex flex-wrap sm:flex-nowrap items-end gap-2.5">
              <div className="flex-1 min-w-35">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Nama Peralatan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Water Heater"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 outline-none focus:border-amber-500"
                />
              </div>

              <div className="w-20">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Daya (W)
                </label>
                <input
                  type="number"
                  placeholder="Watt"
                  value={newWatt}
                  onChange={(e) => setNewWatt(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 outline-none focus:border-amber-500"
                />
              </div>

              <div className="w-16">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Qty
                </label>
                <input
                  type="number"
                  min="1"
                  value={newQty}
                  onChange={(e) => setNewQty(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 outline-none focus:border-amber-500"
                />
              </div>

              <div className="w-20">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Jam/Hari
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={newHours}
                  onChange={(e) => setNewHours(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus size={14} /> Tambah
              </button>
            </form>

            {/* APPLIANCES TABLE */}
            <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Peralatan
                    </th>
                    <th className="py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">
                      Daya (W)
                    </th>
                    <th className="py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">
                      Qty
                    </th>
                    <th className="py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">
                      Jam/Hari
                    </th>
                    <th className="py-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">
                      Wh/Hari
                    </th>
                    <th className="py-3 px-2 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {appliances.map((item) => {
                    const itemDailyWh = item.watt * item.qty * item.hoursPerDay;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3.5 font-bold text-slate-800 dark:text-slate-200">
                          <div className="flex items-center gap-2">
                            {item.category === "cooling" && <Wind size={14} className="text-blue-500" />}
                            {item.category === "kitchen" && <Refrigerator size={14} className="text-orange-500" />}
                            {item.category === "lighting" && <Lightbulb size={14} className="text-amber-500" />}
                            {item.category === "entertainment" && <Tv size={14} className="text-purple-500" />}
                            {item.category === "utility" && <Zap size={14} className="text-emerald-500" />}
                            {item.category === "custom" && <Sparkles size={14} className="text-pink-500" />}
                            <span>{item.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-600 dark:text-slate-300">
                          {item.watt} W
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.qty}
                            onChange={(e) => handleQtyChange(item.id, Number(e.target.value))}
                            className="w-12 py-1 px-1 text-center font-bold bg-slate-100 dark:bg-slate-800 rounded-lg outline-none text-slate-800 dark:text-white"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            max="24"
                            value={item.hoursPerDay}
                            onChange={(e) => handleHoursChange(item.id, Number(e.target.value))}
                            className="w-14 py-1 px-1 text-center font-bold bg-slate-100 dark:bg-slate-800 rounded-lg outline-none text-slate-800 dark:text-white"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                          {itemDailyWh.toLocaleString("id-ID")}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-slate-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>

          {/* RIGHT: LIVE RESULT SUMMARY & APPLY ACTION (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-linear-to-br from-amber-500/10 via-slate-900/40 to-slate-900/60 dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-950 p-6 rounded-3xl border border-amber-500/30 space-y-5">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block">
                Hasil Analisis Beban
              </span>

              {/* Card 1: Rekomendasi Daya VA */}
              <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Rekomendasi Daya Sistem
                </span>
                <div className="flex items-baseline gap-1.5">
                  <h4 className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                    {summary.recommendedVA.toLocaleString("id-ID")}
                  </h4>
                  <span className="text-sm font-bold text-slate-400">VA</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  Beban Puncak Simultan: {summary.simultaneousWatt} W
                </p>
              </div>

              {/* Card 2: Total Energi Harian */}
              <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Konsumsi Energi Harian
                </span>
                <div className="flex items-baseline gap-1.5">
                  <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                    {summary.totalDailyKwh}
                  </h4>
                  <span className="text-xs font-bold text-slate-400">kWh / hari</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  Total {summary.totalDailyWh.toLocaleString("id-ID")} Wh per 24 jam
                </p>
              </div>

              {/* Card 3: Waktu Operasi Efektif */}
              <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Clock size={11} /> Waktu Pakai Efektif
                </span>
                <div className="flex items-baseline gap-1.5">
                  <h4 className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                    {summary.effectiveHours}
                  </h4>
                  <span className="text-xs font-bold text-slate-400">Jam / hari</span>
                </div>
              </div>

              {/* Faktor Simultanitas Slider */}
              <div className="pt-2">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Faktor Simultanitas</span>
                  <span className="font-black text-amber-500">{Math.round(diversityFactor * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.05"
                  value={diversityFactor}
                  onChange={(e) => setDiversityFactor(Number(e.target.value))}
                  className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <p className="text-[9px] text-slate-400 mt-1 italic">
                  *Asumsi tidak semua alat elektronik menyala 100% bersamaan.
                </p>
              </div>

              {/* APPLY BUTTON */}
              <button
                onClick={() => {
                  onApply(summary.recommendedVA, summary.effectiveHours);
                  onClose();
                }}
                className="w-full py-3.5 bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-orange-500/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                Terapkan ke Kalkulator PLTS
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
