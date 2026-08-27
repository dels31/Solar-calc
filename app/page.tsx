"use client";

import React, { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import {
  defaultPanels,
  defaultInverters,
  defaultBatteries,
  defaultKabel,
  defaultFuse,
  type Panel,
  type Inverter,
  type Battery,
  type Kabel,
  type Fuse,
} from "@/lib/defaultData";
import {
  calculateSolarSystem,
  recommendInverter,
  generateBoMData,
  formatRupiah,
  PLN_TARIFF_PRESETS,
} from "@/lib/solarCalculator";
import {
  Sun,
  Moon,
  Laptop,
  Battery as BatteryIcon,
  Zap,
  Settings2,
  ShieldCheck,
  Cpu,
  Box,
  LayoutGrid,
  Clock,
  Weight,
  FileSpreadsheet,
  TrendingUp,
  Leaf,
  Coins,
  PiggyBank,
  Receipt,
  Trees,
} from "lucide-react";

import * as XLSX from "xlsx";

type ThemeMode = "light" | "dark" | "system";

export default function SolarCalculator() {
  // State Database Katalog Komponen
  const [dbPanels, setDbPanels] = useState<Panel[]>(defaultPanels);
  const [dbInverters, setDbInverters] = useState<Inverter[]>(defaultInverters);
  const [dbKabel, setDbKabel] = useState<Kabel[]>(defaultKabel);
  const [dbFuse, setDbFuse] = useState<Fuse[]>(defaultFuse);
  const [dbBateries, setDbBateries] = useState<Battery[]>(defaultBatteries);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(false);

  // State Theme (Light / Dark / System)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("solar_calc_theme") as ThemeMode) || "system";
    }
    return "system";
  });

  // State Input User
  const [dayaVA, setDayaVA] = useState(3000);
  const [psh, setPsh] = useState(4.5);
  const [jamOp, setJamOp] = useState(24);
  const [jarakKeInverter, setJarakKeInverter] = useState(15);
  const [mountingType, setMountingType] = useState<"aluminum" | "iron">("aluminum");
  const [estimationMode, setEstimationMode] = useState<"safety" | "optimized">("safety");
  const [selectedTariffPreset, setSelectedTariffPreset] = useState("R1_1300_2200");
  const [tarifPLN, setTarifPLN] = useState(1444.7);

  const [selectedPanel, setSelectedPanel] = useState<Panel | null>(
    defaultPanels.find((p) => p.pmax === 550) || defaultPanels[0]
  );
  const [selectedBattery, setSelectedBattery] = useState<Battery | null>(
    defaultBatteries.find((b) => b.capacity_ah === 100) || defaultBatteries[0]
  );

  // Penerapan tema ke <html> tag (Dark / Light / System)
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      if (theme === "dark") {
        root.classList.add("dark");
      } else if (theme === "light") {
        root.classList.remove("dark");
      } else {
        if (mediaQuery.matches) {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }
    };

    applyTheme();
    localStorage.setItem("solar_calc_theme", theme);

    const listener = () => {
      if (theme === "system") applyTheme();
    };

    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, [theme]);

  // Fetch live data dari Firebase Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("🔥 Fetching catalog data from Firestore...");
        
        // Fetch Panels
        const panelSnap = await getDocs(collection(db, "database_panel"));
        if (!panelSnap.empty) {
          const p = panelSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Panel[];
          setDbPanels(p);
          setSelectedPanel((prev) => p.find((item) => item.pmax === (prev?.pmax || 550)) || p[0]);
          setIsFirestoreConnected(true);
        }

        // Fetch Inverters
        const inverterSnap = await getDocs(collection(db, "database_inverter"));
        if (!inverterSnap.empty) {
          const i = inverterSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Inverter[];
          setDbInverters(i);
        }

        // Fetch Kabel
        const kabelSnap = await getDocs(query(collection(db, "database_kabel"), orderBy("max_ampere")));
        if (!kabelSnap.empty) {
          const k = kabelSnap.docs.map((d) => ({ ...d.data() })) as Kabel[];
          setDbKabel(k);
        }

        // Fetch Fuse
        const fuseSnap = await getDocs(query(collection(db, "database_fuse"), orderBy("rating_ampere")));
        if (!fuseSnap.empty) {
          const f = fuseSnap.docs.map((d) => ({ ...d.data() })) as Fuse[];
          setDbFuse(f);
        }

        // Fetch Batteries
        const batterySnap = await getDocs(collection(db, "database_batteries"));
        if (!batterySnap.empty) {
          const b = batterySnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Battery[];
          setDbBateries(b);
          setSelectedBattery((prev) => b.find((item) => item.capacity_ah === (prev?.capacity_ah || 100)) || b[0]);
        }
      } catch (error) {
        console.warn("⚠️ Menggunakan local dataset fallback. Error Firestore:", error);
      }
    };
    fetchData();
  }, []);

  // Handler Ganti Golongan Tarif Listrik PLN
  const handleTariffChange = (presetId: string) => {
    setSelectedTariffPreset(presetId);
    const found = PLN_TARIFF_PRESETS.find((p) => p.id === presetId);
    if (found && presetId !== "CUSTOM") {
      setTarifPLN(found.ratePerKwh);
    }
  };

  // Rekomendasi Inverter dinamis
  const selectedInverter = useMemo(() => {
    return recommendInverter(dayaVA, dbInverters);
  }, [dayaVA, dbInverters]);

  // ENGINE KALKULASI UTAMA (Terpisah di lib/solarCalculator.ts)
  const calc = useMemo(() => {
    return calculateSolarSystem({
      dayaVA,
      psh,
      jamOp,
      selectedPanel,
      selectedBattery,
      selectedInverter,
      mountingType,
      jarakKeInverter,
      estimationMode,
      dbKabel,
      dbFuse,
      tarifPLN,
    });
  }, [
    dayaVA,
    psh,
    jamOp,
    selectedPanel,
    selectedBattery,
    selectedInverter,
    mountingType,
    jarakKeInverter,
    estimationMode,
    dbKabel,
    dbFuse,
    tarifPLN,
  ]);

  // Handler Export Excel (Dengan Summary Finansial Lengkap)
  const exportToExcel = () => {
    const bomData = generateBoMData(
      {
        dayaVA,
        psh,
        jamOp,
        selectedPanel,
        selectedBattery,
        selectedInverter,
        mountingType,
        jarakKeInverter,
        estimationMode,
        dbKabel,
        dbFuse,
        tarifPLN,
      },
      calc
    );

    const ws = XLSX.utils.aoa_to_sheet(bomData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quotation");
    XLSX.writeFile(wb, `Quotation_PLTS_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] p-4 lg:p-12 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* TOP NAVBAR & THEME SWITCHER */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-tr from-amber-500 to-orange-400 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 text-white font-black">
              <Sun size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Solar Calc Pro
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                  isFirestoreConnected
                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-300/40 dark:border-emerald-700/40"
                    : "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-300/40 dark:border-blue-700/40"
                }`}>
                  {isFirestoreConnected ? "🔥 Firestore Connected" : "⚡ Ready"}
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Sistem Kalkulator, Analisis ROI & Rekomendasi BoM PLTS
              </p>
            </div>
          </div>

          {/* THEME SELECTOR */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-2xl border border-slate-300/50 dark:border-slate-700/50 backdrop-blur-sm self-end sm:self-auto">
            <button
              onClick={() => setTheme("light")}
              title="Mode Terang (Light)"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                theme === "light"
                  ? "bg-white text-amber-600 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Sun size={14} />
              <span className="hidden sm:inline">Light</span>
            </button>

            <button
              onClick={() => setTheme("dark")}
              title="Mode Gelap (Dark)"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                theme === "dark"
                  ? "bg-slate-900 text-blue-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Moon size={14} />
              <span className="hidden sm:inline">Dark</span>
            </button>

            <button
              onClick={() => setTheme("system")}
              title="Ikuti Tema Perangkat (System)"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                theme === "system"
                  ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Laptop size={14} />
              <span className="hidden sm:inline">System</span>
            </button>
          </div>
        </header>

        {/* MAIN LAYOUT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* SIDEBAR SETTINGS */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800/80 transition-colors">
              <div className="flex items-center gap-3 mb-8">
                <Settings2 className="text-emerald-600 dark:text-emerald-400" size={20} />
                <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  System Settings
                </h2>
              </div>

              {/* ESTIMATION MODE TOGGLE */}
              <div className="flex bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl mb-6 border border-transparent dark:border-slate-700/50">
                <button
                  onClick={() => setEstimationMode("safety")}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                    estimationMode === "safety"
                      ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                      : "text-slate-400 dark:text-slate-400"
                  }`}
                >
                  🛡️ Safety Mode
                </button>
                <button
                  onClick={() => setEstimationMode("optimized")}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                    estimationMode === "optimized"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-400 dark:text-slate-400"
                  }`}
                >
                  ⚡ Optimized
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[15px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-2 block">
                    Beban Sistem (VA)
                  </label>
                  <input
                    type="number"
                    value={dayaVA}
                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500 rounded-2xl font-black text-xl text-slate-800 dark:text-white outline-none transition-all"
                    onChange={(e) => setDayaVA(Number(e.target.value))}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-[15px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-2 block">
                      Solar Panel
                    </label>
                    <select
                      className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-orange-500 rounded-2xl font-bold text-slate-700 dark:text-slate-200 outline-none"
                      onChange={(e) =>
                        setSelectedPanel(
                          dbPanels.find(
                            (p) => p.pmax === Number(e.target.value),
                          ) || null,
                        )
                      }
                      value={selectedPanel?.pmax || ""}
                    >
                      {dbPanels.map((p) => (
                        <option key={p.id} value={p.pmax}>
                          {p.tipe_wp}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="text-[15px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-3">
                    Battery Storage
                  </label>
                  <select
                    value={selectedBattery?.id || ""}
                    onChange={(e) => {
                      const selected =
                        dbBateries.find((item) => item.id === e.target.value) ||
                        null;
                      setSelectedBattery(selected);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {dbBateries.map((bat) => (
                      <option key={bat.id} value={bat.id}>
                        {bat.brand} {bat.model} ({bat.capacity_ah}Ah)
                      </option>
                    ))}
                  </select>
                  {selectedBattery && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                      Weight: {selectedBattery.weight_kg}kg | Type:{" "}
                      {selectedBattery.type}
                    </p>
                  )}
                </div>

                <div className="mb-6">
                  <label className="text-[15px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-[0.2em] ml-1 block mb-3">
                    Mounting Material
                  </label>
                  <select
                    value={mountingType}
                    onChange={(e) =>
                      setMountingType(e.target.value as "aluminum" | "iron")
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                  >
                    <option value="aluminum">🛡️ Aluminium Rail AL6005-T5</option>
                    <option value="iron">🏗️ Besi Siku L40 Galvanized</option>
                  </select>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 italic">
                    *Besi siku menambah beban atap signifikan (+{10 - 4}kg/panel).
                  </p>
                </div>

                {/* TARIF PLN SETTINGS */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <label className="text-[15px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Receipt size={14} className="text-emerald-500" /> Tarif Listrik PLN
                  </label>
                  <select
                    value={selectedTariffPreset}
                    onChange={(e) => handleTariffChange(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                  >
                    {PLN_TARIFF_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                  </select>

                  {selectedTariffPreset === "CUSTOM" && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-bold text-slate-400">Rp</span>
                      <input
                        type="number"
                        value={tarifPLN}
                        onChange={(e) => setTarifPLN(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none border border-slate-200 dark:border-slate-700"
                        placeholder="Tarif per kWh"
                      />
                      <span className="text-xs font-bold text-slate-400">/kWh</span>
                    </div>
                  )}
                </div>

                {/* SLIDERS SECTION */}
                <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[15px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">
                        Peak Sun Hour (PSH)
                      </span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded-md">
                        {psh} H
                      </span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="6"
                      step="0.1"
                      value={psh}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      onChange={(e) => setPsh(Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[15px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Clock size={10} /> Waktu Pakai Harian
                      </span>
                      <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-1 rounded-md">
                        {jamOp} Jam
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="24"
                      step="1"
                      value={jamOp}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      onChange={(e) => setJamOp(Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-3">
                      <label className="text-[15px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-[0.2em] ml-1">
                        Jarak Kabel PV ke Inverter
                      </label>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded-md">
                        {jarakKeInverter} Meter
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="1"
                      value={jarakKeInverter}
                      onChange={(e) => setJarakKeInverter(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-2 italic">
                      *Estimasi jalur kabel dari atap ke ruang mesin.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* HERO CARD - DAILY TARGET */}
            <div className="bg-slate-900 dark:bg-slate-900/90 border border-slate-800 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
              <Zap className="absolute -right-6 -top-6 w-48 h-48 opacity-10 text-emerald-400" />
              <div className="relative z-10">
                <p className="text-emerald-400 font-bold uppercase tracking-[0.3em] text-[10px] mb-2">
                  Daily Energy Target
                </p>
                <div className="flex items-baseline gap-3">
                  <h3 className="text-7xl font-black tracking-tighter italic">
                    {calc.displayTargetKwh.toFixed(2)}
                  </h3>
                  <span className="text-xl font-light text-slate-400 uppercase tracking-widest font-sans">
                    kWh / Day
                  </span>
                </div>
              </div>
            </div>

            {/* METRICS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 p-7 rounded-4xl border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                <Sun className="text-orange-500 mb-4" size={24} />
                <p className="text-slate-400 dark:text-slate-500 text-[12px] font-black uppercase tracking-widest mb-1">
                  Total PV Array
                </p>
                <h4 className="text-2xl font-black text-slate-800 dark:text-white">
                  {calc.jmlPanel}{" "}
                  <span className="text-xs font-bold text-slate-400">Pcs</span>
                </h4>
              </div>

              <div className="bg-white dark:bg-slate-900 p-7 rounded-4xl border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                <BatteryIcon className="text-blue-500 mb-4" size={24} />
                <p className="text-slate-400 dark:text-slate-500 text-[12px] font-black uppercase tracking-widest mb-1">
                  Storage Capacity
                </p>
                <h4 className="text-2xl font-black text-slate-800 dark:text-white">
                  {calc.totalBatteryCapacityAh}{" "}
                  <span className="text-xs font-bold text-slate-400">Ah</span>
                </h4>
              </div>

              <div className="bg-white dark:bg-slate-900 p-7 rounded-4xl border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                <Cpu className="text-purple-500 mb-4" size={24} />
                <p className="text-slate-400 dark:text-slate-500 text-[12px] font-black uppercase tracking-widest mb-1">
                  Recommended Inverter
                </p>
                <h4 className="text-lg font-black text-slate-800 dark:text-white leading-tight">
                  {selectedInverter?.merk_tipe || "Selecting..."}
                </h4>
              </div>
            </div>

            {/* SECTION: FINANCIAL ANALYSIS & ROI (POINT 1 UPGRADE) */}
            <div className="bg-gradient-to-br from-emerald-950/20 via-slate-900/40 to-slate-900/60 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-950 rounded-[3rem] p-10 border border-emerald-500/20 shadow-xl space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/20 dark:border-slate-800 pb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
                    <TrendingUp size={22} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                      Financial Analysis & ROI Projection
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Estimasi Penghematan Tagihan PLN & Masa Balik Modal
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                  <Coins size={14} className="text-emerald-500" />
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    Tarif: Rp {tarifPLN.toLocaleString("id-ID")}/kWh
                  </span>
                </div>
              </div>

              {/* 4 HIGHLIGHT FINANCIAL CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {/* 1. Monthly Savings */}
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Hemat / Bulan
                    </span>
                    <PiggyBank size={18} className="text-emerald-500" />
                  </div>
                  <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {formatRupiah(calc.financial.penghematanBulanRp)}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                    {formatRupiah(calc.financial.penghematanTahunRp)} / tahun
                  </p>
                </div>

                {/* 2. Payback Period */}
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Payback Period
                    </span>
                    <TrendingUp size={18} className="text-blue-500" />
                  </div>
                  <h4 className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    {calc.financial.paybackYears} <span className="text-base font-bold">Tahun</span>
                  </h4>
                  <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-1.5 font-bold">
                    ROI 25 Thn: +{calc.financial.roiPercent25Years}%
                  </p>
                </div>

                {/* 3. Total Capex Investment */}
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Estimasi Capex
                    </span>
                    <Receipt size={18} className="text-purple-500" />
                  </div>
                  <h4 className="text-2xl font-black text-slate-800 dark:text-white">
                    {formatRupiah(calc.financial.totalInvestasi)}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                    Hardware + Aksesoris + Jasa
                  </p>
                </div>

                {/* 4. Green Impact */}
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Green Energy
                    </span>
                    <Leaf size={18} className="text-emerald-500" />
                  </div>
                  <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {calc.green.co2SavedKgPerYear.toLocaleString("id-ID")}{" "}
                    <span className="text-xs font-bold">kg/thn</span>
                  </h4>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1.5 font-bold flex items-center gap-1">
                    <Trees size={12} /> Setara {calc.green.treesEquivalent} Pohon/thn
                  </p>
                </div>
              </div>

              {/* 25-YEAR LIFECYCLE SUMMARY BANNER */}
              <div className="p-6 bg-slate-100/80 dark:bg-slate-900/90 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Total Estimasi Penghematan Bersih (25 Tahun Lifecycle PLTS)
                  </p>
                  <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatRupiah(calc.financial.penghematan25TahunRp - calc.financial.totalInvestasi)}
                  </h4>
                </div>

                <div className="text-left md:text-right text-xs text-slate-500 dark:text-slate-400">
                  <p>Reduksi $CO_2$ 25 Tahun: <span className="font-bold text-slate-800 dark:text-slate-200">{calc.green.co2SavedTon25Years} Ton</span></p>
                  <p>Garansi Panel: <span className="font-bold text-slate-800 dark:text-slate-200">25 Tahun Linear Power Output</span></p>
                </div>
              </div>
            </div>

            {/* INFRASTRUCTURE SPEC */}
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-200/60 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3 mb-10 border-b border-slate-100 dark:border-slate-800 pb-6">
                <ShieldCheck className="text-emerald-500" size={20} />
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">
                  Infrastructure Spec
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* PV Config */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <LayoutGrid size={14} />
                    <span className="text-[12px] font-black uppercase tracking-widest">
                      PV Configuration
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                    <div className="text-3xl font-black text-slate-800 dark:text-white">
                      {calc.finalS}S / {calc.finalP}P
                    </div>
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 inline-block px-2 py-0.5 rounded-md mt-2 uppercase">
                      Voc: {calc.stringVoc.toFixed(1)}V {calc.isVocSafe ? "(Safe)" : "(Over)"} <br />
                      Amp: {calc.arrayIsc.toFixed(1)}A (Array Isc)
                    </p>
                  </div>
                </div>

                {/* Space Required */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <LayoutGrid size={14} />
                    <span className="text-[12px] font-black uppercase tracking-widest">
                      Space Required
                    </span>
                  </div>
                  <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                    <div className="text-3xl font-black text-slate-800 dark:text-white">
                      {calc.totalAreaNeeded} m²
                    </div>
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-2 uppercase">
                      Est. Area (+{estimationMode === "safety" ? "20%" : "5%"} Space)
                    </p>
                  </div>
                </div>

                {/* Total Weight */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                    <LayoutGrid size={14} />
                    <span className="text-[12px] font-black uppercase tracking-widest">
                      Total System Weight
                    </span>
                  </div>
                  <div className="bg-purple-50/70 dark:bg-purple-950/30 p-5 rounded-2xl border border-purple-100 dark:border-purple-900/40">
                    <div className="text-3xl font-black text-slate-800 dark:text-white">
                      {calc.totalWeight} kg
                    </div>
                    <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 mt-2 uppercase">
                      Roof Load:{" "}
                      <span className="text-purple-900 dark:text-purple-200 font-black">{calc.loadPerSqm} kg/m²</span>
                    </p>
                  </div>
                </div>

                {/* Battery Pack Unit */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Box size={14} />
                    <span className="text-[12px] font-black uppercase tracking-widest">
                      Battery Pack
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                    <div className="text-3xl font-black text-slate-800 dark:text-white">
                      {calc.totalPacks} Unit
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-2 uppercase">
                      {selectedBattery?.type || "LiFePO4"} / {selectedBattery?.capacity_ah || 100}Ah
                    </p>
                  </div>
                </div>

                {/* Battery Weight */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Box size={14} />
                    <span className="text-[12px] font-black uppercase tracking-widest">
                      Battery Weight
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                    <div className="text-3xl font-black text-slate-800 dark:text-white">
                      {calc.weightBattery} Kg
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-2 uppercase">
                      Total Pack Weight
                    </p>
                  </div>
                </div>

                {/* Cabling & Protection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Zap size={14} />
                    <span className="text-[12px] font-black uppercase tracking-widest">
                      Cabling & Protection
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                        PV Cable (Min KHA {calc.pvDesignAmpere.toFixed(1)}A)
                      </span>
                      <span className="text-xs font-black text-orange-600 dark:text-orange-400">
                        {calc.pvCableSize} mm²
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                        Battery Cable (Min KHA {calc.batteryDesignAmpere.toFixed(1)}A)
                      </span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        {calc.batteryCableSize} mm²
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                        PV Fuse / Breaker
                      </span>
                      <span className="text-xs font-black text-orange-600 dark:text-orange-400">
                        {calc.pvFuseSize} A
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                        Battery Fuse / Breaker
                      </span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        {calc.batteryFuseSize} A
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* QUICK QUOTATION / BILL OF MATERIALS */}
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-200/60 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-10 border-b border-slate-100 dark:border-slate-800 pb-6">
            <div className="flex items-center gap-3">
              <LayoutGrid className="text-blue-600 dark:text-blue-400" size={20} />
              <h3 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">
                Quick Quotation (BOM & Pricing)
              </h3>
            </div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl italic">
              Project Spec: {new Date().toLocaleDateString("id-ID")}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="pb-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Item Description
                  </th>
                  <th className="pb-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
                    Qty
                  </th>
                  <th className="pb-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Unit
                  </th>
                  <th className="pb-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">
                    Spec Detail
                  </th>
                  <th className="pb-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">
                    Est. Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-5">
                    <p className="font-black text-slate-800 dark:text-white">
                      Solar Panel Mono-Perc
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">
                      Tier 1 Global Brand
                    </p>
                  </td>
                  <td className="py-5 text-center font-black text-slate-700 dark:text-slate-300">
                    {calc.jmlPanel}
                  </td>
                  <td className="py-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    Lembar
                  </td>
                  <td className="py-5 text-right font-bold text-orange-600 dark:text-orange-400">
                    {selectedPanel?.tipe_wp || "N/A"}
                  </td>
                  <td className="py-5 text-right font-black text-slate-900 dark:text-white">
                    {formatRupiah(calc.financial.biayaPanel)}
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-5">
                    <p className="font-black text-slate-800 dark:text-white">
                      Inverter Smart Hybrid
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">
                      Pure Sine Wave / High Voltage
                    </p>
                  </td>
                  <td className="py-5 text-center font-black text-slate-700 dark:text-slate-300">
                    1
                  </td>
                  <td className="py-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    Set
                  </td>
                  <td className="py-5 text-right font-bold text-purple-600 dark:text-purple-400">
                    {selectedInverter?.merk_tipe || "N/A"}
                  </td>
                  <td className="py-5 text-right font-black text-slate-900 dark:text-white">
                    {formatRupiah(calc.financial.biayaInverter)}
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-5">
                    <p className="font-black text-slate-800 dark:text-white">
                      {selectedBattery?.type || "LiFePO4"} Storage Pack
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">
                      {selectedBattery?.brand || ""} {selectedBattery?.model || ""}
                    </p>
                  </td>
                  <td className="py-5 text-center font-black text-slate-700 dark:text-slate-300">
                    {calc.totalPacks}
                  </td>
                  <td className="py-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    Unit
                  </td>
                  <td className="py-5 text-right font-bold text-blue-600 dark:text-blue-400">
                    {selectedBattery?.voltage || 48}V / {selectedBattery?.capacity_ah || 100}Ah
                  </td>
                  <td className="py-5 text-right font-black text-slate-900 dark:text-white">
                    {formatRupiah(calc.financial.biayaBaterai)}
                  </td>
                </tr>

                {/* MOUNTING ROWS */}
                {mountingType === "aluminum" ? (
                  <>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-5">
                        <p className="font-black text-slate-800 dark:text-white">
                          Aluminium Mounting Rails
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">
                          AL6005-T5 Anodized (Standar Industrial)
                        </p>
                      </td>
                      <td className="py-5 text-center font-black text-slate-700 dark:text-slate-300">
                        {Math.ceil(calc.jmlPanel / 2)}
                      </td>
                      <td className="py-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                        Batang
                      </td>
                      <td className="py-5 text-right font-bold text-slate-500 dark:text-slate-400">
                        HD Rail System
                      </td>
                      <td className="py-5 text-right font-bold text-slate-700 dark:text-slate-300">
                        {formatRupiah(Math.ceil(calc.jmlPanel / 2) * 250000)}
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-5">
                        <p className="font-black text-slate-800 dark:text-white">
                          Module Clamps Kit
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">
                          End Clamps & Mid Clamps Set
                        </p>
                      </td>
                      <td className="py-5 text-center font-black text-slate-700 dark:text-slate-300">
                        {calc.jmlPanel * 2 + 4}
                      </td>
                      <td className="py-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                        Pcs
                      </td>
                      <td className="py-5 text-right font-bold text-slate-500 dark:text-slate-400">
                        Universal 35-40mm
                      </td>
                      <td className="py-5 text-right font-bold text-slate-700 dark:text-slate-300">
                        {formatRupiah((calc.jmlPanel * 2 + 4) * 25000)}
                      </td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-5">
                        <p className="font-black text-slate-800 dark:text-white">
                          Besi Siku L40 x 40
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">
                          Custom Fabricated Structure (Hot Dip Galvanized)
                        </p>
                      </td>
                      <td className="py-5 text-center font-black text-slate-700 dark:text-slate-300">
                        {Math.ceil(calc.jmlPanel * 1.2)}
                      </td>
                      <td className="py-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                        Batang
                      </td>
                      <td className="py-5 text-right font-bold text-slate-500 dark:text-slate-400">
                        6 Meter Length
                      </td>
                      <td className="py-5 text-right font-bold text-slate-700 dark:text-slate-300">
                        {formatRupiah(Math.ceil(calc.jmlPanel * 1.2) * 160000)}
                      </td>
                    </tr>
                  </>
                )}

                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-5">
                    <p className="font-black text-slate-800 dark:text-white">
                      Solar PV Cable {calc.pvCableSize}mm² & Conduit
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">
                      XLPO Insulated + Pipa Conduit Rigid 20mm
                    </p>
                  </td>
                  <td className="py-5 text-center font-black text-slate-700 dark:text-slate-300">
                    {Math.ceil(calc.totalKabelPV)}
                  </td>
                  <td className="py-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    Meter
                  </td>
                  <td className="py-5 text-right font-bold text-blue-600 dark:text-blue-400">
                    Double Insulated
                  </td>
                  <td className="py-5 text-right font-bold text-slate-700 dark:text-slate-300">
                    {formatRupiah(Math.ceil(calc.totalKabelPV) * 22000 + calc.estimasiPipaConduit * 38000)}
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-5">
                    <p className="font-black text-slate-800 dark:text-white">
                      Jasa Instalasi, Testing & Commissioning
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">
                      Pemasangan Profesional & Garansi Instalasi 1 Tahun
                    </p>
                  </td>
                  <td className="py-5 text-center font-black text-slate-700 dark:text-slate-300">
                    1
                  </td>
                  <td className="py-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    Lot
                  </td>
                  <td className="py-5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    Industrial Standard
                  </td>
                  <td className="py-5 text-right font-black text-emerald-600 dark:text-emerald-400">
                    {formatRupiah(calc.financial.biayaJasaInstalasi)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <TechnicalSummary
            loadPerSqm={calc.loadPerSqm}
            estimationMode={estimationMode}
            totalPacks={calc.totalPacks}
            pvCableSize={calc.pvCableSize}
          />

          <div className="mt-10 p-8 bg-slate-900 dark:bg-slate-950 border border-transparent dark:border-slate-800 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <p className="text-emerald-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-2">
                Technical & Financial Specification Ready
              </p>
              <h4 className="text-white text-xl font-black italic">
                Total Est. Investasi: {formatRupiah(calc.financial.totalInvestasi)}
              </h4>
            </div>
            <button
              onClick={exportToExcel}
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl transition-all shadow-[0_8px_20px_rgba(16,185,129,0.3)] active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet size={18} />
              Export Full Quotation to Sheet
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function TechnicalSummary({
  loadPerSqm,
  estimationMode,
  totalPacks,
  pvCableSize,
}: {
  loadPerSqm: number | string;
  estimationMode: "safety" | "optimized";
  totalPacks: number;
  pvCableSize: number | string;
}) {
  return (
    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Card 1: Power Reliability */}
      <div className="bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 p-6 rounded-3xl">
        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center mb-4 text-white">
          <Zap size={20} />
        </div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-black text-emerald-900 dark:text-emerald-300 text-sm uppercase tracking-wider">
            Power Reliability
          </h4>
          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded">
            {estimationMode}
          </span>
        </div>
        <p className="text-xs text-emerald-800/90 dark:text-emerald-300/80 leading-relaxed font-medium">
          Sistem dikonfigurasi untuk menangani beban kritis secara kontinyu.
          Dengan {totalPacks} unit LFP Battery, anda punya cadangan energi
          mandiri yang aman untuk siklus harian tanpa merusak umur baterai.
        </p>
      </div>

      {/* Card 2: Structural Safety */}
      <div className="bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 p-6 rounded-3xl">
        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center mb-4 text-white">
          <Weight size={20} />
        </div>
        <h4 className="font-black text-blue-900 dark:text-blue-300 text-sm uppercase tracking-wider mb-2">
          Structural Safety
        </h4>
        <p className="text-xs text-blue-800/90 dark:text-blue-300/80 leading-relaxed font-medium">
          Estimasi beban struktur adalah{" "}
          <span className="font-black text-blue-950 dark:text-blue-200">{loadPerSqm} kg/m²</span>. Menggunakan
          mounting aluminium AL6005-T5 yang standar industrial,
          menjamin atap tetap kokoh dalam jangka panjang.
        </p>
      </div>

      {/* Card 3: Quality Assurance */}
      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 p-6 rounded-3xl">
        <div className="w-10 h-10 bg-slate-800 dark:bg-slate-700 rounded-xl flex items-center justify-center mb-4 text-white">
          <ShieldCheck size={20} />
        </div>
        <h4 className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wider mb-2">
          Engineering Standard
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
          Menggunakan kabel PV {pvCableSize}mm² untuk meminimalkan{" "}
          <span className="italic">voltage drop</span>. Proteksi kelistrikan
          lengkap dengan DC Breaker dan Arrester standar PLTS profesional.
        </p>
      </div>
    </div>
  );
}
