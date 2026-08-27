"use client";

import React, { useState } from "react";
import { SolarCalcInputs, SolarCalcResults } from "@/lib/solarCalculator";
import {
  Sun,
  Battery as BatteryIcon,
  Home,
  ShieldAlert,
  ArrowRight,
  ArrowLeftRight,
  Activity,
  Layers,
  Cpu,
  Info,
} from "lucide-react";

interface SystemSchematicProps {
  inputs: SolarCalcInputs;
  results: SolarCalcResults;
}

export default function SystemSchematicDiagram({ inputs, results }: SystemSchematicProps) {
  const [activeTab, setActiveTab] = useState<"sld" | "flow">("sld");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const {
    jmlPanel,
    finalS,
    finalP,
    stringVoc,
    arrayIsc,
    pvCableSize,
    pvFuseSize,
    batteryCableSize,
    batteryFuseSize,
    totalPacks,
    totalBatteryCapacityAh,
    displayTargetKwh,
  } = results;

  const panelWp = inputs.selectedPanel?.pmax || 550;
  const totalWp = jmlPanel * panelWp;
  const invName = inputs.selectedInverter?.merk_tipe || "Smart Hybrid Inverter";
  const batBrand = inputs.selectedBattery?.brand || "LiFePO4";
  const batModel = inputs.selectedBattery?.model || "48V 100Ah";
  const batVolt = inputs.selectedBattery?.voltage || 48;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-6 lg:p-10 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-8 transition-all">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20">
            <Activity size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              System Schematic & Wiring Diagram (SLD)
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                ⚡ Dynamic Single Line
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visualisasi Alur Daya, Konfigurasi Stringing, dan Titik Proteksi Kelistrikan
            </p>
          </div>
        </div>

        {/* TABS: SLD vs POWER FLOW */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("sld")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "sld"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Layers size={14} />
            <span>Single Line Diagram</span>
          </button>
          <button
            onClick={() => setActiveTab("flow")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "flow"
                ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Activity size={14} />
            <span>Power Flow Animation</span>
          </button>
        </div>
      </div>

      {/* SCHEMATIC CANVAS / FLOW CONTAINER */}
      <div className="relative p-6 sm:p-8 bg-slate-50/70 dark:bg-[#060911] rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800/80 overflow-x-auto">
        <div className="min-w-[780px] flex flex-col gap-8">
          
          {/* TOP ROW: PV ARRAY -> DC COMBINER -> HYBRID INVERTER -> AC LOAD / PLN */}
          <div className="grid grid-cols-12 gap-3 items-center">
            
            {/* 1. NODE: SOLAR PV ARRAY (3 Cols) */}
            <div
              onClick={() => setSelectedNode("pv")}
              className={`col-span-3 p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group ${
                selectedNode === "pv"
                  ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30"
                  : "bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-amber-500/50 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1">
                  <Sun size={14} /> PV Array
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                  {totalWp.toLocaleString("id-ID")} Wp
                </span>
              </div>
              <h4 className="text-base font-black text-slate-800 dark:text-white leading-tight">
                {jmlPanel}x {panelWp} Wp
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Config: <strong className="text-amber-600 dark:text-amber-400">{finalS} Seri x {finalP} Paralel</strong>
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 flex justify-between">
                <span>Voc: <strong className="text-slate-700 dark:text-slate-300">{stringVoc.toFixed(1)}V</strong></span>
                <span>Isc: <strong className="text-slate-700 dark:text-slate-300">{arrayIsc.toFixed(1)}A</strong></span>
              </div>
            </div>

            {/* CONNECTOR 1: PV -> COMBINER BOX (1 Col) */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              <div className="w-full flex items-center justify-center relative">
                <div className="h-0.5 w-full bg-orange-400 dark:bg-orange-500 relative">
                  {activeTab === "flow" && (
                    <span className="absolute -top-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
                  )}
                </div>
                <ArrowRight size={14} className="text-orange-500 absolute" />
              </div>
              <span className="text-[9px] font-black text-orange-600 dark:text-orange-400 mt-1.5 uppercase">
                DC PV
              </span>
            </div>

            {/* 2. NODE: DC COMBINER & PROTECTION (2.5 Cols) */}
            <div
              onClick={() => setSelectedNode("protection")}
              className={`col-span-3 p-4 rounded-3xl border transition-all cursor-pointer ${
                selectedNode === "protection"
                  ? "bg-rose-50 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/30"
                  : "bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-rose-500/50 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest flex items-center gap-1">
                  <ShieldAlert size={13} /> DC Protection
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300">
                  IP65 Box
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">DC Breaker:</span>
                  <span className="font-black text-rose-600 dark:text-rose-400">{pvFuseSize} A</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Kabel PV:</span>
                  <span className="font-black text-slate-800 dark:text-slate-200">{pvCableSize} mm²</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span>SPD Arrester:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">1000V DC</span>
                </div>
              </div>
            </div>

            {/* CONNECTOR 2: COMBINER -> INVERTER (1 Col) */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              <div className="w-full flex items-center justify-center relative">
                <div className="h-0.5 w-full bg-orange-400 dark:bg-orange-500 relative">
                  {activeTab === "flow" && (
                    <span className="absolute -top-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
                  )}
                </div>
                <ArrowRight size={14} className="text-orange-500 absolute" />
              </div>
              <span className="text-[9px] font-black text-orange-600 dark:text-orange-400 mt-1.5 uppercase">
                MPPT In
              </span>
            </div>

            {/* 3. NODE: SMART HYBRID INVERTER (4 Cols) */}
            <div
              onClick={() => setSelectedNode("inverter")}
              className={`col-span-4 p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden shadow-md ${
                selectedNode === "inverter"
                  ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/30"
                  : "bg-white dark:bg-slate-900 border-purple-500/30 hover:border-purple-500/60"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Cpu size={15} /> Hybrid Inverter Hub
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300">
                  {inputs.selectedInverter?.rated_power_va || inputs.dayaVA} VA
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                {invName}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Pure Sine Wave • MPPT Controller • Bi-directional Charger
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 flex justify-between">
                <span>Max Input: <strong className="text-slate-700 dark:text-slate-200">{inputs.selectedInverter?.max_voc_input || 450}V DC</strong></span>
                <span>System: <strong className="text-purple-600 dark:text-purple-400">48V DC / 220V AC</strong></span>
              </div>
            </div>

          </div>

          {/* MIDDLE CONNECTOR (VERTICAL BUS: INVERTER <-> BATTERY & AC LOAD) */}
          <div className="grid grid-cols-12 gap-3 items-center">
            
            <div className="col-span-8">
              {/* Empty left spacing */}
            </div>

            {/* VERTICAL BIDIRECTIONAL DC LINE TO BATTERY */}
            <div className="col-span-2 flex flex-col items-center">
              <div className="h-10 w-0.5 bg-blue-500 relative flex items-center justify-center">
                <ArrowLeftRight size={14} className="text-blue-500 rotate-90" />
              </div>
              <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                DC 48V Bus
              </span>
            </div>

            {/* VERTICAL AC LINE TO AC LOAD */}
            <div className="col-span-2 flex flex-col items-center">
              <div className="h-10 w-0.5 bg-emerald-500 relative flex items-center justify-center">
                <ArrowRight size={14} className="text-emerald-500 rotate-90" />
              </div>
              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                AC 220V Out
              </span>
            </div>

          </div>

          {/* BOTTOM ROW: BATTERY STORAGE BANK & AC LOAD / PLN GRID */}
          <div className="grid grid-cols-12 gap-6 items-stretch">
            
            {/* 4. NODE: BATTERY ENERGY STORAGE (6 Cols) */}
            <div
              onClick={() => setSelectedNode("battery")}
              className={`col-span-6 p-6 rounded-3xl border transition-all cursor-pointer ${
                selectedNode === "battery"
                  ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/30"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-500/50 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                  <BatteryIcon size={16} /> Battery Storage Bank
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                  {totalBatteryCapacityAh} Ah @ {batVolt}V
                </span>
              </div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white">
                {totalPacks}x {batBrand} {batModel}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Deep Cycle LiFePO4 • 80% DoD • High Discharge Protection
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Kabel Baterai:</span>
                  <strong className="text-slate-800 dark:text-white">{batteryCableSize} mm²</strong>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Fuse Pengaman:</span>
                  <strong className="text-blue-600 dark:text-blue-400">{batteryFuseSize} A DC</strong>
                </div>
              </div>
            </div>

            {/* 5. NODE: AC DISTRIBUTION & ESSENTIAL LOAD (6 Cols) */}
            <div
              onClick={() => setSelectedNode("load")}
              className={`col-span-6 p-6 rounded-3xl border transition-all cursor-pointer ${
                selectedNode === "load"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Home size={16} /> AC Distribution / Load
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  {inputs.dayaVA} VA Max
                </span>
              </div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white">
                Main Panel Box & Essential Load
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Kebutuhan Harian: <strong className="text-emerald-600 dark:text-emerald-400">{displayTargetKwh.toFixed(1)} kWh/hari</strong> (220V / 50Hz)
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Grid PLN Backup:</span>
                  <strong className="text-slate-800 dark:text-white">ATS Auto Transfer</strong>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">AC Output:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400">Pure Sine Wave</strong>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* INTERACTIVE INSPECTOR FOOTER */}
      <div className="p-5 bg-blue-50/70 dark:bg-blue-950/20 rounded-3xl border border-blue-200/60 dark:border-blue-900/40 flex items-start gap-3.5">
        <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
          <Info size={18} />
        </div>
        <div className="text-xs space-y-1">
          <h5 className="font-black text-blue-900 dark:text-blue-200 uppercase tracking-wider">
            Petunjuk Standar Instalasi & Proteksi PLTS (PUIL / NEC)
          </h5>
          <p className="text-blue-800/90 dark:text-blue-300/80 leading-relaxed">
            Diagram satu garis (SLD) di atas mengilustrasikan jalur arus listrik dari <strong>Solar Array</strong> menuju <strong>DC Combiner Protection</strong>, <strong>Inverter Hybrid</strong>, <strong>Battery Bank</strong>, hingga <strong>Panel Distribusi AC Rumah</strong>. Seluruh penampang kabel ({pvCableSize} mm² PV / {batteryCableSize} mm² Battery) dan rating pengaman ({pvFuseSize}A PV / {batteryFuseSize}A Bat) terkalkulasi secara otomatis mengikuti kapasitas arus kontinu sistem.
          </p>
        </div>
      </div>
    </div>
  );
}
