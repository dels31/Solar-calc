"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Sun,
  Battery,
  Zap,
  Settings2,
  ShieldCheck,
  Cpu,
  Box,
  LayoutGrid,
  Clock,
} from "lucide-react";

// Interfaces agar TypeScript tidak rewel
interface Panel {
  id: string;
  tipe_wp: string;
  pmax: number;
  voc: number;
  isc: number;
}
interface Inverter {
  id: string;
  merk_tipe: string;
  rated_power_va: number;
  max_voc_input: number;
  max_isc_input: number;
  system_voltage: number;
  price_estimate: number;
}
interface Kabel {
  max_ampere: number;
  ukuran_mm2: number;
}
interface Fuse {
  rating_ampere: number;
}

export default function SolarCalculator() {
  const [dbPanels, setDbPanels] = useState<Panel[]>([]);
  const [dbInverters, setDbInverters] = useState<Inverter[]>([]);
  const [dbKabel, setDbKabel] = useState<Kabel[]>([]);
  const [dbFuse, setDbFuse] = useState<Fuse[]>([]);

  // State Input
  const [dayaVA, setDayaVA] = useState(3000);
  const [psh, setPsh] = useState(4.5);
  const [jamOp, setJamOp] = useState(24); // Waktu pakai sudah kembali
  const [selectedPanel, setSelectedPanel] = useState<Panel | null>(null);
  const [selectedPackCap, setSelectedPackCap] = useState(100);

  useEffect(() => {
    const fetchData = async () => {
      const { data: p } = await supabase.from("database_panel").select("*");
      const { data: i } = await supabase
        .from("database_inverter")
        .select("*, price_estimate");
      const { data: k } = await supabase
        .from("database_kabel")
        .select("*")
        .order("max_ampere");
      const { data: f } = await supabase
        .from("database_fuse")
        .select("*")
        .order("rating_ampere");

      if (p) {
        setDbPanels(p);
        setSelectedPanel(p.find((item) => item.pmax === 550) || p[0]);
      }
      if (i) setDbInverters(i);
      if (k) setDbKabel(k);
      if (f) setDbFuse(f);
    };
    fetchData();
  }, []);

  // LOGIK REKOMENDASI INVERTER (Fixed: Sekarang dinamis mengikuti dayaVA)
  const selectedInverter = useMemo(() => {
    if (dbInverters.length === 0) return null;
    // Cari inverter terkecil yang masih sanggup menghandle dayaVA
    const suitable = dbInverters
      .filter((inv) => inv.rated_power_va >= dayaVA)
      .sort((a, b) => a.rated_power_va - b.rated_power_va)[0];
    return (
      suitable ||
      dbInverters.sort((a, b) => b.rated_power_va - a.rated_power_va)[0]
    );
  }, [dayaVA, dbInverters]);

  // Kalkulasi Utama sesuai Excel lu
  const efisiensi = 0.8;
  const safetyFactor = 1.2;
  const energiHarianWh = dayaVA * efisiensi * jamOp;
  const targetEnergiKwh = (energiHarianWh * safetyFactor) / 1000;

  const jmlPanel = Math.ceil(
    (energiHarianWh * safetyFactor) / (psh * (selectedPanel?.pmax || 550)),
  );
  const battAh = Math.ceil(((energiHarianWh * safetyFactor) / 48) * 1.25);
  const totalPacks = Math.ceil(battAh / selectedPackCap);

  // Stream & Wiring Logic
  const invMaxVoc = selectedInverter?.max_voc_input || 450;
  const pVoc = selectedPanel?.voc || 49.9;
  const pIsc = selectedPanel?.isc || 14;

  const maxSeri = Math.floor((invMaxVoc * 0.9) / pVoc);
  const finalP = Math.ceil(jmlPanel / maxSeri);
  const finalS = Math.ceil(jmlPanel / finalP);
  const totalIsc = finalP * pIsc;

  const getCable = (amp: number) =>
    dbKabel.find((k) => k.max_ampere >= amp)?.ukuran_mm2 || "N/A";
  const getFuse = (amp: number) =>
    dbFuse.find((f) => f.rating_ampere >= amp * 1.25)?.rating_ampere || "N/A";

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-12 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* SIDEBAR SETTINGS */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
            <div className="flex items-center gap-3 mb-8">
              <Settings2 className="text-green-600" size={20} />
              <h2 className="text-xl font-black uppercase tracking-tight">
                System Settings
              </h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Beban Sistem (VA)
                </label>
                <input
                  type="number"
                  value={dayaVA}
                  className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-green-500 rounded-2xl font-black text-xl text-slate-800 outline-none transition-all"
                  onChange={(e) => setDayaVA(Number(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                    Solar Panel
                  </label>
                  <select
                    className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-2xl font-bold text-slate-700 outline-none"
                    onChange={(e) =>
                      setSelectedPanel(
                        dbPanels.find(
                          (p) => p.pmax === Number(e.target.value),
                        ) || null,
                      )
                    }
                  >
                    {dbPanels.map((p) => (
                      <option key={p.id} value={p.pmax}>
                        {p.tipe_wp}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                    Battery LFP Pack
                  </label>
                  <select
                    className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold text-slate-700 outline-none"
                    value={selectedPackCap}
                    onChange={(e) => setSelectedPackCap(Number(e.target.value))}
                  >
                    <option value={50}>48V 50Ah</option>
                    <option value={100}>48V 100Ah</option>
                    <option value={200}>48V 200Ah</option>
                  </select>
                </div>
              </div>

              {/* SLIDERS SECTION */}
              <div className="space-y-6 pt-4 border-t border-slate-50">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Peak Sun Hour
                    </span>
                    <span className="text-xs font-black text-green-600 bg-green-50 px-2 py-1 rounded-md">
                      {psh} H
                    </span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="6"
                    step="0.1"
                    value={psh}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-green-600"
                    onChange={(e) => setPsh(Number(e.target.value))}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Clock size={10} /> Waktu Pakai
                    </span>
                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                      {jamOp} Jam
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="24"
                    step="1"
                    value={jamOp}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    onChange={(e) => setJamOp(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
            <Zap className="absolute -right-6 -top-6 w-48 h-48 opacity-5 text-green-400" />
            <div className="relative z-10">
              <p className="text-green-400 font-bold uppercase tracking-[0.3em] text-[10px] mb-2">
                Daily Energy Target
              </p>
              <div className="flex items-baseline gap-3">
                <h3 className="text-7xl font-black tracking-tighter italic">
                  {targetEnergiKwh.toFixed(1)}
                </h3>
                <span className="text-xl font-light text-slate-500 uppercase tracking-widest font-sans">
                  kWh / Day
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-7 rounded-4xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all">
              <Sun className="text-orange-500 mb-4" size={24} />
              <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">
                Total PV Array
              </p>
              <h4 className="text-2xl font-black text-slate-800">
                {jmlPanel}{" "}
                <span className="text-xs font-bold text-slate-400">Pcs</span>
              </h4>
            </div>
            <div className="bg-white p-7 rounded-4xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all">
              <Battery className="text-blue-500 mb-4" size={24} />
              <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">
                Storage Capacity
              </p>
              <h4 className="text-2xl font-black text-slate-800">
                {battAh}{" "}
                <span className="text-xs font-bold text-slate-400">Ah</span>
              </h4>
            </div>
            <div className="bg-white p-7 rounded-4xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all">
              <Cpu className="text-purple-500 mb-4" size={24} />
              <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">
                Recommended Inverter
              </p>
              <h4 className="text-lg font-black text-slate-800 leading-tight">
                {selectedInverter?.merk_tipe || "Selecting..."}
              </h4>
            </div>
          </div>

          <div className="bg-white rounded-[3rem] p-10 border border-slate-200/60 shadow-sm">
            <div className="flex items-center gap-3 mb-10 border-b border-slate-50 pb-6">
              <ShieldCheck className="text-green-500" size={20} />
              <h3 className="text-xl font-black uppercase tracking-tight text-slate-800">
                Infrastructure Spec
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-orange-600">
                  <LayoutGrid size={14} />
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    PV Configuration
                  </span>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div className="text-3xl font-black text-slate-800">
                    {finalS}S / {finalP}P
                  </div>
                  <p className="text-[10px] font-bold text-green-600 bg-green-50 inline-block px-2 py-0.5 rounded-md mt-2 uppercase">
                    Voc: {(finalS * pVoc).toFixed(1)}V (Safe)
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-blue-600">
                  <Box size={14} />
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    Battery Pack
                  </span>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div className="text-3xl font-black text-slate-800">
                    {totalPacks} Unit
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase">
                    LFP 48V / {selectedPackCap}Ah
                  </p>
                </div>
              </div>

              {/* PROTECTION & WIRING */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800">
                  <Zap size={14} />
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    Cabling & Protection
                  </span>
                </div>
                <div className="bg-slate-900 p-6 rounded-3xl space-y-4">
                  {/* Baris Kabel */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-white border-b border-slate-800 pb-2">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                        PV Cable
                      </span>
                      <span className="text-xs font-black">
                        {getCable(totalIsc)} mm²
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-white border-b border-slate-800 pb-2">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                        Battery Cable
                      </span>
                      <span className="text-xs font-black">
                        {getCable(battAh / 5)} mm²
                      </span>
                    </div>
                  </div>

                  {/* Baris Fuse */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-white border-b border-slate-800 pb-2">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                        PV Fuse
                      </span>
                      <span className="text-xs font-black text-orange-400">
                        {getFuse(totalIsc)} A
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-white">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                        Battery Fuse
                      </span>
                      <span className="text-xs font-black text-green-400">
                        {getFuse(battAh / 5)} A
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* QUICK QUOTATION / BILL OF MATERIALS */}
      {/* QUICK QUOTATION / BILL OF MATERIALS (VERSION 1 - CLEAN) */}
      <div className="bg-white rounded-[3rem] p-10 border border-slate-200/60 shadow-sm mt-10">
        <div className="flex justify-between items-center mb-10 border-b border-slate-50 pb-6">
          <div className="flex items-center gap-3">
            <LayoutGrid className="text-blue-600" size={20} />
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-800">
              Quick Quotation (BOM)
            </h3>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-xl italic">
            Project Spec: {new Date().toLocaleDateString("id-ID")}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Item Description
                </th>
                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                  Qty
                </th>
                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Unit
                </th>
                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                  Spec Detail
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-5">
                  <p className="font-black text-slate-800">
                    Solar Panel Mono-Perc
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                    Tier 1 Global Brand
                  </p>
                </td>
                <td className="py-5 text-center font-black text-slate-700">
                  {jmlPanel}
                </td>
                <td className="py-5 text-[11px] font-bold text-slate-400 uppercase">
                  Lembar
                </td>
                <td className="py-5 text-right font-bold text-orange-600">
                  {selectedPanel?.tipe_wp || "N/A"}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-5">
                  <p className="font-black text-slate-800">
                    Inverter Smart Hybrid
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                    Pure Sine Wave / High Voltage
                  </p>
                </td>
                <td className="py-5 text-center font-black text-slate-700">
                  1
                </td>
                <td className="py-5 text-[11px] font-bold text-slate-400 uppercase">
                  Set
                </td>
                <td className="py-5 text-right font-bold text-purple-600">
                  {selectedInverter?.merk_tipe || "N/A"}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-5">
                  <p className="font-black text-slate-800">
                    Battery LFP Package
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                    Deep Cycle Lithium Iron Phosphate
                  </p>
                </td>
                <td className="py-5 text-center font-black text-slate-700">
                  {totalPacks}
                </td>
                <td className="py-5 text-[11px] font-bold text-slate-400 uppercase">
                  Unit
                </td>
                <td className="py-5 text-right font-bold text-blue-600">
                  48V / {selectedPackCap}Ah
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-5">
                  <p className="font-black text-slate-800">
                    Mounting & Rail System
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                    AL-6005-T5 Anodized Aluminum
                  </p>
                </td>
                <td className="py-5 text-center font-black text-slate-700">
                  {jmlPanel}
                </td>
                <td className="py-5 text-[11px] font-bold text-slate-400 uppercase">
                  Set
                </td>
                <td className="py-5 text-right font-bold text-slate-500">
                  Universal L-Feet/Hanger
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-10 p-8 bg-slate-900 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <p className="text-green-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-2">
              Technical Specification Ready
            </p>
            <h4 className="text-white text-xl font-black italic">
              Banjarmasin Solar Project Standard
            </h4>
          </div>
          <button className="px-10 py-4 bg-green-500 hover:bg-green-400 text-slate-900 font-black rounded-2xl transition-all shadow-[0_8px_20px_rgba(34,197,94,0.3)] active:scale-95">
            Export Data to Sheet
          </button>
        </div>
      </div>
    </div>
  );
}
