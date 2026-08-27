"use client";

import React, { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import {
  Sun,
  Moon,
  Laptop,
  Battery,
  Zap,
  Settings2,
  ShieldCheck,
  Cpu,
  Box,
  LayoutGrid,
  Clock,
  Weight,
  FileSpreadsheet,
} from "lucide-react";

import * as XLSX from "xlsx";

// Interfaces agar TypeScript tidak rewel
interface Panel {
  id: string;
  tipe_wp: string;
  pmax: number;
  voc: number;
  isc: number;
  length_mm: number;
  width_mm: number;
  weight_kg: number;
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

interface Battery {
  id: string;
  brand: string;
  model: string;
  type: string;
  voltage: number;
  capacity_ah: number;
  weight_kg: number;
  max_dod: number;
  max_discharge: number;
}
interface Kabel {
  max_ampere: number;
  ukuran_mm2: number;
}
interface Fuse {
  rating_ampere: number;
}

type ThemeMode = "light" | "dark" | "system";

export default function SolarCalculator() {
  const [dbPanels, setDbPanels] = useState<Panel[]>([]);
  const [dbInverters, setDbInverters] = useState<Inverter[]>([]);
  const [dbKabel, setDbKabel] = useState<Kabel[]>([]);
  const [dbFuse, setDbFuse] = useState<Fuse[]>([]);
  const [dbBateries, setDbBateries] = useState<Battery[]>([]);

  // State Theme (Light / Dark / System)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("solar_calc_theme") as ThemeMode) || "system";
    }
    return "system";
  });

  // State Input
  const [dayaVA, setDayaVA] = useState(3000);
  const [psh, setPsh] = useState(4.5);
  const [jamOp, setJamOp] = useState(24);
  const [selectedPanel, setSelectedPanel] = useState<Panel | null>(null);
  const [estimationMode, setEstimationMode] = useState<"safety" | "optimized">(
    "safety",
  );
  const [selectedBattery, setSelectedBattery] = useState<Battery | null>(null);

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
        // Mode System: ikuti preferensi OS
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
      if (theme === "system") {
        applyTheme();
      }
    };

    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, [theme]);

  // Fetch data dari Firebase Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Panels
        const panelSnap = await getDocs(collection(db, "database_panel"));
        const p = panelSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Panel[];

        // Fetch Inverters
        const inverterSnap = await getDocs(collection(db, "database_inverter"));
        const i = inverterSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Inverter[];

        // Fetch Kabel (ordered by max_ampere)
        const kabelSnap = await getDocs(
          query(collection(db, "database_kabel"), orderBy("max_ampere"))
        );
        const k = kabelSnap.docs.map((d) => ({ ...d.data() })) as Kabel[];

        // Fetch Fuse (ordered by rating_ampere)
        const fuseSnap = await getDocs(
          query(collection(db, "database_fuse"), orderBy("rating_ampere"))
        );
        const f = fuseSnap.docs.map((d) => ({ ...d.data() })) as Fuse[];

        // Fetch Batteries
        const batterySnap = await getDocs(collection(db, "database_batteries"));
        const b = batterySnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Battery[];

        if (p.length > 0) {
          setDbPanels(p);
          setSelectedPanel(p.find((item) => item.pmax === 550) || p[0]);
        }
        if (i.length > 0) setDbInverters(i);
        if (k.length > 0) setDbKabel(k);
        if (f.length > 0) setDbFuse(f);
        if (b.length > 0) {
          setDbBateries(b);
          setSelectedBattery(b.find((item) => item.capacity_ah === 100) || b[0]);
        }
      } catch (error) {
        console.error("Error fetching data from Firestore:", error);
      }
    };
    fetchData();
  }, []);

  // LOGIK REKOMENDASI INVERTER (Dinamis mengikuti dayaVA)
  const selectedInverter = useMemo(() => {
    if (dbInverters.length === 0) return null;
    const suitable = dbInverters
      .filter((inv) => inv.rated_power_va >= dayaVA)
      .sort((a, b) => a.rated_power_va - b.rated_power_va)[0];
    return (
      suitable ||
      dbInverters.sort((a, b) => b.rated_power_va - a.rated_power_va)[0]
    );
  }, [dayaVA, dbInverters]);

  // Kalkulasi Utama
  const efisiensi = 0.8;
  const safetyFactor = 1.2;
  const energiHarianWh = dayaVA * efisiensi * jamOp;
  const targetEnergiKwh = energiHarianWh * safetyFactor;

  const jmlPanel = Math.ceil(
    (energiHarianWh * safetyFactor) / (psh * (selectedPanel?.pmax || 550)),
  );

  const energyPerUnitWh =
    (selectedBattery?.voltage || 48) * (selectedBattery?.capacity_ah || 100);

  const usableEnergyPerUnitWh =
    energyPerUnitWh * (selectedBattery?.max_dod || 80);

  const totalPacks =
    usableEnergyPerUnitWh > 0
      ? Math.ceil((targetEnergiKwh / usableEnergyPerUnitWh) * 1.25)
      : 0;

  const displayTargetKwh = targetEnergiKwh / 1000;
  const weightBattery = totalPacks * (selectedBattery?.weight_kg || 0);
  const [jarakKeInverter, setJarakKeInverter] = useState(15); // Default 15 meter

  const [mountingType, setMountingType] = useState<"aluminum" | "iron">(
    "aluminum",
  );

  // Stream & Wiring Logic
  const invMaxVoc = selectedInverter?.max_voc_input || 450;
  const pVoc = selectedPanel?.voc || 49.9;
  const pIsc = selectedPanel?.isc || 14;

  const maxSeri = Math.floor((invMaxVoc * 0.9) / pVoc);
  const finalP = Math.ceil(jmlPanel / maxSeri);
  const finalS = Math.ceil(jmlPanel / finalP);
  const totalIsc = finalP * pIsc * 1.25; // Safety margin 25% untuk arus pendek

  // Hitung Arus Maksimal dari Baterai ke Inverter
  const batteryMaxAmpere =
    (selectedInverter?.rated_power_va || 8000) /
    (selectedBattery?.voltage || 48) /
    0.85;

  // Fungsi hitung penampang kabel dan fuse
  const getCable = (amp: number) => {
    if (!dbKabel || dbKabel.length === 0) return "N/A";
    const suitable = dbKabel
      .filter((k) => k.max_ampere >= amp)
      .sort((a, b) => a.max_ampere - b.max_ampere);
    return suitable.length > 0 ? suitable[0].ukuran_mm2 : "Out of Range";
  };

  const getFuse = (amp: number) => {
    if (!dbFuse || dbFuse.length === 0) return "N/A";
    const targetAmp = amp * 1.25; // Safety margin 25%
    const suitable = dbFuse
      .filter((f) => f.rating_ampere >= targetAmp)
      .sort((a, b) => a.rating_ampere - b.rating_ampere);
    return suitable.length > 0 ? suitable[0].rating_ampere : "Out of Range";
  };

  const batteryCableSize = getCable(batteryMaxAmpere);
  const batteryFuseSize = getFuse(batteryMaxAmpere);
  const pvCableSize = getCable(totalIsc);
  const pvFuseSize = getFuse(totalIsc);

  // Hitung Luas Area
  const panelLengthM = (selectedPanel?.length_mm || 2279) / 1000;
  const panelWidthM = (selectedPanel?.width_mm || 1134) / 1000;
  const pWeight = selectedPanel?.weight_kg ?? 28;
  const areaPerPanel = panelLengthM * panelWidthM;

  // Konfigurasi material mounting
  const mountingOptions = {
    aluminum: {
      name: "Aluminium Rail AL6005-T5",
      weight: 4,
      desc: "High Corrosion Resistance - Standard",
    },
    iron: {
      name: "Besi Siku L40 (Custom)",
      weight: 10,
      desc: "Heavy Duty - Lebih Berat & Ekonomis",
    },
  };

  const currentMounting = mountingOptions[mountingType];
  const totalWeight = jmlPanel * (pWeight + currentMounting.weight);

  const loadPerSqm =
    areaPerPanel > 0
      ? (totalWeight / (jmlPanel * areaPerPanel)).toFixed(2)
      : "0";

  // Faktor pengali berdasarkan mode estimasi
  const cableMargin = estimationMode === "safety" ? 1.1 : 1.03;
  const areaMargin = estimationMode === "safety" ? 1.2 : 1.05;
  const conduitFactor = estimationMode === "safety" ? 0.7 : 0.5;

  const totalKabelPV = jarakKeInverter * 2 * (jmlPanel ?? 1) * cableMargin;
  const totalAreaNeeded = (jmlPanel * areaPerPanel * areaMargin).toFixed(1);
  const estimasiPipaConduit = Math.ceil((totalKabelPV * conduitFactor) / 2.9);

  const exportToExcel = () => {
    const bomData = [
      ["PROJECT QUOTATION - SOLAR PV SYSTEM"],
      ["Lokasi", "Banjarmasin"],
      [
        "Mode Estimasi",
        estimationMode === "safety"
          ? "Safety (Standard 10%)"
          : "Optimized (Competitive 3%)",
      ],
      [],
      ["ITEM DESCRIPTION", "QTY", "UNIT", "SPECIFICATION"],
      [
        "Solar Panel",
        jmlPanel,
        "Pcs",
        selectedPanel?.tipe_wp || "Tier-1 Mono PERC",
      ],
      [
        selectedInverter?.merk_tipe || "N/A",
        1,
        "Unit",
        "Smart Hybrid Inverter",
      ],
      [
        `${selectedBattery?.brand || "N/A"} ${selectedBattery?.model || ""}`,
        totalPacks,
        "Unit",
        "Deep Cycle Lithium Iron Phosphate (LiFePO4)",
      ],
    ];

    if (mountingType === "aluminum") {
      bomData.push(
        [
          "Aluminium Mounting Rails",
          Math.ceil(jmlPanel / 2),
          "Batang",
          "AL6005-T5 Anodized",
        ],
        ["Module Clamps Kit", jmlPanel * 2 + 4, "Pcs", "End & Mid Clamps"],
        [
          "Roof Attachment (L-Feet)",
          Math.ceil(jmlPanel * 1.5),
          "Pcs",
          "Stainless Steel Bolt",
        ],
      );
    } else {
      bomData.push(
        [
          "Besi Siku L40 x 40",
          Math.ceil(jmlPanel * 1.2),
          "Batang",
          "Hot Dip Galvanized",
        ],
        ["Baut & Dynabolt Set", jmlPanel * 6, "Pcs", "High Tensile M10/M12"],
      );
    }

    bomData.push(
      [],
      ["TECHNICAL SUMMARY"],
      ["Total System Weight", `${totalWeight} kg`],
      ["Roof Load Pressure", `${loadPerSqm} kg/m2`],
    );

    const ws = XLSX.utils.aoa_to_sheet(bomData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quotation");
    XLSX.writeFile(wb, `Quotation_PLTS_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] p-4 lg:p-12 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* TOP NAVBAR & THEME CONTROLS */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-tr from-amber-500 to-orange-400 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 text-white font-black">
              <Sun size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Solar Calc Pro
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-300/40 dark:border-emerald-700/40">
                  Firestore Connected
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Sistem Kalkulator & Rekomendasi BoM PLTS
              </p>
            </div>
          </div>

          {/* THEME SWITCHER (Light, Dark, System) */}
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
                    <option value="aluminum">🛡️ Aluminium Rail</option>
                    <option value="iron">🏗️ Besi Siku L40</option>
                  </select>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 italic">
                    *Besi siku menambah beban atap signifikan (+{10 - 4}kg/panel).
                  </p>
                </div>

                {/* SLIDERS SECTION */}
                <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[15px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">
                        Peak Sun Hour
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
                        <Clock size={10} /> Waktu Pakai
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
                        Jarak Kabel PV ke Inverter (M)
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
                    {displayTargetKwh.toFixed(2)}
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
                  {jmlPanel}{" "}
                  <span className="text-xs font-bold text-slate-400">Pcs</span>
                </h4>
              </div>

              <div className="bg-white dark:bg-slate-900 p-7 rounded-4xl border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                <Battery className="text-blue-500 mb-4" size={24} />
                <p className="text-slate-400 dark:text-slate-500 text-[12px] font-black uppercase tracking-widest mb-1">
                  Storage Capacity
                </p>
                <h4 className="text-2xl font-black text-slate-800 dark:text-white">
                  {totalPacks * (selectedBattery?.capacity_ah || 0)}{" "}
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

            {/* INFRASTRUCTURE SPEC */}
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-200/60 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3 mb-10 border-b border-slate-100 dark:border-slate-800 pb-6">
                <ShieldCheck className="text-emerald-500" size={20} />
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">
                  Infrastructure Spec
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <LayoutGrid size={14} />
                    <span className="text-[12px] font-black uppercase tracking-widest">
                      PV Configuration
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                    <div className="text-3xl font-black text-slate-800 dark:text-white">
                      {finalS}S / {finalP}P
                    </div>
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 inline-block px-2 py-0.5 rounded-md mt-2 uppercase">
                      Voc: {(finalS * pVoc).toFixed(1)}V (Safe) <br />
                      Amp: {(finalP * pIsc).toFixed(1)}A (Safe)
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <LayoutGrid size={14} />
                    <span className="text-[12px] font-black uppercase tracking-widest">
                      Space Required
                    </span>
                  </div>
                  <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                    <div className="text-3xl font-black text-slate-800 dark:text-white">
                      {totalAreaNeeded} m²
                    </div>
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-2 uppercase">
                      Est. Area (+{estimationMode === "safety" ? "20%" : "5%"} Space)
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                    <LayoutGrid size={14} />
                    <span className="text-[12px] font-black uppercase tracking-widest">
                      Total System Weight
                    </span>
                  </div>
                  <div className="bg-purple-50/70 dark:bg-purple-950/30 p-5 rounded-2xl border border-purple-100 dark:border-purple-900/40">
                    <div className="text-3xl font-black text-slate-800 dark:text-white">
                      {totalWeight} kg
                    </div>
                    <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 mt-2 uppercase">
                      Roof Load:{" "}
                      <span className="text-purple-900 dark:text-purple-200 font-black">{loadPerSqm} kg/m²</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Box size={14} />
                    <span className="text-[12px] font-black uppercase tracking-widest">
                      Battery Pack
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                    <div className="text-3xl font-black text-slate-800 dark:text-white">
                      {totalPacks} Unit
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-2 uppercase">
                      {selectedBattery?.type || "LiFePO4"} / {selectedBattery?.capacity_ah || 100}Ah
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Box size={14} />
                    <span className="text-[12px] font-black uppercase tracking-widest">
                      Battery Weight
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                    <div className="text-3xl font-black text-slate-800 dark:text-white">
                      {weightBattery} Kg
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-2 uppercase">
                      {selectedBattery?.type || "LiFePO4"} / {selectedBattery?.capacity_ah || 100}Ah
                    </p>
                  </div>
                </div>

                {/* PROTECTION & WIRING */}
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
                        PV Cable
                      </span>
                      <span className="text-xs font-black text-orange-600 dark:text-orange-400">
                        {pvCableSize} mm²
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                        Battery Cable
                      </span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        {batteryCableSize} mm²
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                        PV Fuse
                      </span>
                      <span className="text-xs font-black text-orange-600 dark:text-orange-400">
                        {pvFuseSize} A
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                        Battery Fuse
                      </span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        {batteryFuseSize} A
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
                Quick Quotation (BOM)
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
                    {jmlPanel}
                  </td>
                  <td className="py-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    Lembar
                  </td>
                  <td className="py-5 text-right font-bold text-orange-600 dark:text-orange-400">
                    {selectedPanel?.tipe_wp || "N/A"}
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
                </tr>

                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-5">
                    <p className="font-black text-slate-800 dark:text-white">
                      {selectedBattery?.type || "LiFePO4"}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">
                      {selectedBattery?.type || "LiFePO4"} - {selectedBattery?.brand || ""}
                    </p>
                  </td>
                  <td className="py-5 text-center font-black text-slate-700 dark:text-slate-300">
                    {totalPacks}
                  </td>
                  <td className="py-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    Unit
                  </td>
                  <td className="py-5 text-right font-bold text-blue-600 dark:text-blue-400">
                    {selectedBattery?.voltage || 48}V / {selectedBattery?.capacity_ah || 100}Ah
                  </td>
                </tr>

                {/* --- LOGIKA MOUNTING DINAMIS --- */}
                {mountingType === "aluminum" ? (
                  <>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-5">
                        <p className="font-black text-slate-800 dark:text-white">
                          Aluminium Mounting Rails
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">
                          AL6005-T5 Anodized (Standar 4.2m/6m)
                        </p>
                      </td>
                      <td className="py-5 text-center font-black text-slate-700 dark:text-slate-300">
                        {Math.ceil(jmlPanel / 2)}
                      </td>
                      <td className="py-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                        Batang
                      </td>
                      <td className="py-5 text-right font-bold text-slate-500 dark:text-slate-400">
                        HD Rail System
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
                        {jmlPanel * 2 + 4}
                      </td>
                      <td className="py-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                        Pcs
                      </td>
                      <td className="py-5 text-right font-bold text-slate-500 dark:text-slate-400">
                        Universal 35-40mm
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-5">
                        <p className="font-black text-slate-800 dark:text-white">
                          Roof Attachment (L-Feet)
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">
                          Stainless Steel Bolt + EPDM Rubber
                        </p>
                      </td>
                      <td className="py-5 text-center font-black text-slate-700 dark:text-slate-300">
                        {Math.ceil(jmlPanel * 1.5)}
                      </td>
                      <td className="py-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                        Pcs
                      </td>
                      <td className="py-5 text-right font-bold text-slate-500 dark:text-slate-400">
                        Heavy Duty L-Feet
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
                          Custom Fabricated Support Structure (Hot Dip Galvanized)
                        </p>
                      </td>
                      <td className="py-5 text-center font-black text-slate-700 dark:text-slate-300">
                        {Math.ceil(jmlPanel * 1.2)}
                      </td>
                      <td className="py-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                        Batang
                      </td>
                      <td className="py-5 text-right font-bold text-slate-500 dark:text-slate-400">
                        6 Meter Length
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-5">
                        <p className="font-black text-slate-800 dark:text-white">
                          Baut & Dynabolt Set
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">
                          High Tensile Bolt M10/M12 + Dynabolt Set
                        </p>
                      </td>
                      <td className="py-5 text-center font-black text-slate-700 dark:text-slate-300">
                        {jmlPanel * 6}
                      </td>
                      <td className="py-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                        Pcs
                      </td>
                      <td className="py-5 text-right font-bold text-slate-500 dark:text-slate-400">
                        Kebutuhan Konstruksi
                      </td>
                    </tr>
                  </>
                )}

                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-5">
                    <p className="font-black text-slate-800 dark:text-white">
                      Earthing & Grounding Kit
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">
                      Grounding Lug & Bonding Clips
                    </p>
                  </td>
                  <td className="py-5 text-center font-black text-slate-700 dark:text-slate-300">
                    1
                  </td>
                  <td className="py-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    Lot
                  </td>
                  <td className="py-5 text-right font-bold text-slate-500 dark:text-slate-400">
                    Lightning Protection
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-5">
                    <p className="font-black text-slate-800 dark:text-white">
                      MC4 Connector Pair
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">
                      IP68 Waterproof / 1500V Rated
                    </p>
                  </td>
                  <td className="py-5 text-center font-black text-slate-700 dark:text-slate-300">
                    {jmlPanel * 2 + 2}
                  </td>
                  <td className="py-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    Pair
                  </td>
                  <td className="py-5 text-right font-bold text-slate-500 dark:text-slate-400">
                    Multicontact Standard
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-5">
                    <p className="font-black text-slate-800 dark:text-white">
                      PV Cable Management Kit
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">
                      Stainless Steel Clips & UV Resistant Ties
                    </p>
                  </td>
                  <td className="py-5 text-center font-black text-slate-700 dark:text-slate-300">
                    {jmlPanel * 2}
                  </td>
                  <td className="py-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    Pcs
                  </td>
                  <td className="py-5 text-right font-bold text-slate-500 dark:text-slate-400">
                    Anti-Corrosive Clips
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-5">
                    <p className="font-black text-slate-800 dark:text-white">
                      Solar PV Cable {getCable(totalIsc)}mm²
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">
                      XLPO Insulated / Halogen Free (Red & Black)
                    </p>
                  </td>
                  <td className="py-5 text-center font-black text-slate-700 dark:text-slate-300">
                    {Math.ceil(totalKabelPV)}
                  </td>
                  <td className="py-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    Meter
                  </td>
                  <td className="py-5 text-right font-bold text-blue-600 dark:text-blue-400">
                    Double Insulated
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-5">
                    <p className="font-black text-slate-800 dark:text-white">
                      Pipa Conduit Rigid 20mm
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">
                      High Impact PVC - Putih
                    </p>
                  </td>
                  <td className="py-5 text-center font-black text-slate-700 dark:text-slate-300">
                    {estimasiPipaConduit}
                  </td>
                  <td className="py-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    Batang
                  </td>
                  <td className="py-5 text-right font-bold text-slate-500 dark:text-slate-400">
                    Clips & Socks Incl.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <TechnicalSummary
            loadPerSqm={loadPerSqm}
            estimationMode={estimationMode}
            totalPacks={totalPacks}
            pvCableSize={pvCableSize}
          />

          <div className="mt-10 p-8 bg-slate-900 dark:bg-slate-950 border border-transparent dark:border-slate-800 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <p className="text-emerald-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-2">
                Technical Specification Ready
              </p>
              <h4 className="text-white text-xl font-black italic">
                Banjarmasin Solar Project Standard
              </h4>
            </div>
            <button
              onClick={exportToExcel}
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl transition-all shadow-[0_8px_20px_rgba(16,185,129,0.3)] active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet size={18} />
              Export Data to Sheet
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
