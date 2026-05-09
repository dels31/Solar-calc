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

export default function SolarCalculator() {
  const [dbPanels, setDbPanels] = useState<Panel[]>([]);
  const [dbInverters, setDbInverters] = useState<Inverter[]>([]);
  const [dbKabel, setDbKabel] = useState<Kabel[]>([]);
  const [dbFuse, setDbFuse] = useState<Fuse[]>([]);
  const [dbBateries, setDbBateries] = useState<Battery[]>([]);

  // State Input
  const [dayaVA, setDayaVA] = useState(3000);
  const [psh, setPsh] = useState(4.5);
  const [jamOp, setJamOp] = useState(24); // Waktu pakai sudah kembali
  const [selectedPanel, setSelectedPanel] = useState<Panel | null>(null);
  const [selectedPackCap, setSelectedPackCap] = useState(100);
  // 'safety' = Margin Engineer (Standard), 'optimized' = Margin Tipis (Competitive)
  const [estimationMode, setEstimationMode] = useState<"safety" | "optimized">(
    "safety",
  );
  const [selectedBattery, setSelectedBattery] = useState<Battery | null>(null);
  //const [jmlBattery, setJmlBattery] = useState(0);

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
      const { data: b } = await supabase.from("database_batteries").select("*");

      if (p) {
        setDbPanels(p);
        setSelectedPanel(p.find((item) => item.pmax === 550) || p[0]);
      }
      if (i) setDbInverters(i);
      if (k) setDbKabel(k);
      if (f) setDbFuse(f);
      if (b) {
        setDbBateries(b);
        setSelectedBattery(b.find((item) => item.capacity_ah === 100) || b[0]);
      }
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
  // Rumus: (Daya Inverter VA / Voltase Baterai) / Efisiensi
  const batteryMaxAmpere =
    (selectedInverter?.rated_power_va || 8000) /
    (selectedBattery?.voltage || 48) /
    0.85;

  // const getCable = (amp: number) =>
  //   dbKabel.find((k) => k.max_ampere >= amp)?.ukuran_mm2 || "N/A";
  // const getFuse = (amp: number) =>
  //   dbFuse.find((f) => f.rating_ampere >= amp * 1.25)?.rating_ampere || "N/A";

  // const batteryCableSize = getCable(batteryMaxAmpere);
  // const batteryFuseSize = getFuse(batteryMaxAmpere);

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

  // Hitung Luas Area (dalam Meter Persegi)
  const panelLengthM = (selectedPanel?.length_mm || 2279) / 1000;
  const panelWidthM = (selectedPanel?.width_mm || 1134) / 1000;
  const pWeight = selectedPanel?.weight_kg ?? 28;
  const areaPerPanel = panelLengthM * panelWidthM;

  // Luas Total dengan Safety Factor 20% untuk ruang maintenance/jalan teknisi
  //const totalAreaNeeded = (jmlPanel * areaPerPanel * 1.2).toFixed(1);

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

  //const areaM2 = (panelLengthM / 1000) * (panelWidthM / 1000);

  // Hitung Berat Total (Panel + Mounting Spesifik)
  const totalWeight = jmlPanel * (pWeight + currentMounting.weight);

  // Hitung Load per SQM yang akurat
  const loadPerSqm =
    areaPerPanel > 0
      ? (totalWeight / (jmlPanel * areaPerPanel)).toFixed(2)
      : "0";

  // Tentukan faktor pengali berdasarkan mode
  const cableMargin = estimationMode === "safety" ? 1.1 : 1.03; // 10% vs 3%
  const areaMargin = estimationMode === "safety" ? 1.2 : 1.05; // 20% vs 5%
  const conduitFactor = estimationMode === "safety" ? 0.7 : 0.5; // 70% vs 50% masuk pipa

  // Hitung ulang variabel utama
  const totalKabelPV = jarakKeInverter * 2 * (jmlPanel ?? 1) * cableMargin;
  const totalAreaNeeded = (jmlPanel * areaPerPanel * areaMargin).toFixed(1);
  const estimasiPipaConduit = Math.ceil((totalKabelPV * conduitFactor) / 2.9);

  const exportToExcel = () => {
    // 1. Siapkan Data untuk BOM
    const bomData = [
      ["PROJECT QUOTATION - SOLAR PV SYSTEM"], // Judul
      ["Lokasi", "Banjarmasin"],
      [
        "Mode Estimasi",
        estimationMode === "safety"
          ? "Safety (Standard 10%)"
          : "Optimized (Competitive 3%)",
      ],
      [], // Baris Kosong
      ["ITEM DESCRIPTION", "QTY", "UNIT", "SPECIFICATION"], // Header Tabel
      [
        "Solar Panel 550Wp",
        jmlPanel,
        "Pcs",
        selectedPanel?.tipe_wp || "Tier-1 Mono PERC",
      ],
      [
        selectedInverter?.merk_tipe || "N/A",
        1,
        "Unit",
        "3.5kW Off-Grid Storage",
      ],
      [
        `${selectedBattery?.brand || "N/A"} ${selectedBattery?.model || ""}`,
        totalPacks,
        "Unit",
        "Deep Cycle Lithium Iron Phosphate",
      ],
    ];

    // 2. Tambahkan Mounting secara Dinamis sesuai pilihan lu
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

    // 3. Tambahkan Data Teknis (Summary)
    bomData.push(
      [],
      ["TECHNICAL SUMMARY"],
      ["Total System Weight", `${totalWeight} kg`],
      ["Roof Load Pressure", `${loadPerSqm} kg/m2`],
    );

    // 4. Proses Create File
    const ws = XLSX.utils.aoa_to_sheet(bomData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quotation");

    // 5. Download File
    XLSX.writeFile(wb, `Quotation_PLTS_${new Date().getTime()}.xlsx`);
  };

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

            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
              <button
                onClick={() => setEstimationMode("safety")}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${estimationMode === "safety" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400"}`}
              >
                🛡️ Safety Mode
              </button>
              <button
                onClick={() => setEstimationMode("optimized")}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${estimationMode === "optimized" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}
              >
                ⚡ Optimized
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[15px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
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
                  <label className="text-[15px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
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
              </div>

              <div className="mb-6">
                <label className="text-[15px] font-black text-slate-400 uppercase tracking-widest block mb-3">
                  Battery Storage
                </label>
                <select
                  value={selectedBattery?.id}
                  onChange={(e) => {
                    const selected =
                      dbBateries.find((item) => item.id === e.target.value) ||
                      null;

                    setSelectedBattery(selected);
                  }}
                  className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {dbBateries.map((bat) => (
                    <option key={bat.id} value={bat.id}>
                      {bat.brand} {bat.model} ({bat.capacity_ah}Ah)
                    </option>
                  ))}
                </select>
                {selectedBattery && (
                  <p className="text-[10px] text-slate-500 mt-2 font-medium">
                    Weight: {selectedBattery.weight_kg}kg | Type:{" "}
                    {selectedBattery.type}
                  </p>
                )}
              </div>

              <div className="mb-6">
                <label className="text-[15px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 block mb-3">
                  Mounting Material
                </label>
                <select
                  value={mountingType}
                  onChange={(e) =>
                    setMountingType(e.target.value as "aluminum" | "iron")
                  }
                  className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                >
                  <option value="aluminum">🛡️ Aluminium Rail</option>
                  <option value="iron">🏗️ Besi Siku L40</option>
                </select>
                <p className="text-[10px] text-slate-600 mt-2 italic">
                  *Besi siku menambah beban atap signifikan (+{10 - 4}kg/panel).
                </p>
              </div>

              {/* SLIDERS SECTION */}
              <div className="space-y-6 pt-4 border-t border-slate-50">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[15px] font-black text-slate-400 uppercase tracking-widest">
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
                    <span className="text-[15px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
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
                <div>
                  <div className="flex justify-between mb-3">
                    <label className="text-[15px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                      Jarak Kabel PV ke Inverter (M)
                    </label>
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
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
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <p className="text-[9px] text-slate-400 mt-2 italic">
                    *Estimasi jalur kabel dari atap ke ruang mesin.
                  </p>
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
                  {displayTargetKwh.toFixed(2)}
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
              <p className="text-slate-400 text-[12px] font-black uppercase tracking-widest mb-1">
                Total PV Array
              </p>
              <h4 className="text-2xl font-black text-slate-800">
                {jmlPanel}{" "}
                <span className="text-xs font-bold text-slate-400">Pcs</span>
              </h4>
            </div>
            <div className="bg-white p-7 rounded-4xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all">
              <Battery className="text-blue-500 mb-4" size={24} />
              <p className="text-slate-400 text-[12px] font-black uppercase tracking-widest mb-1">
                Storage Capacity
              </p>
              <h4 className="text-2xl font-black text-slate-800">
                {totalPacks * (selectedBattery?.capacity_ah || 0)}{" "}
                <span className="text-xs font-bold text-slate-400">Ah</span>
              </h4>
            </div>
            <div className="bg-white p-7 rounded-4xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all">
              <Cpu className="text-purple-500 mb-4" size={24} />
              <p className="text-slate-400 text-[12px] font-black uppercase tracking-widest mb-1">
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
                  <span className="text-[12px] font-black uppercase tracking-widest">
                    PV Configuration
                  </span>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div className="text-3xl font-black text-slate-800">
                    {finalS}S / {finalP}P
                  </div>
                  <p className="text-[10px] font-bold text-green-600 bg-green-50 inline-block px-2 py-0.5 rounded-md mt-2 uppercase">
                    Voc: {(finalS * pVoc).toFixed(1)}V (Safe) <br />
                    Amp: {(finalP * pIsc).toFixed(1)}A (Safe)
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-600">
                  <LayoutGrid size={14} />
                  <span className="text-[12px] font-black uppercase tracking-widest">
                    Space Required
                  </span>
                </div>
                <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                  <div className="text-3xl font-black text-slate-800">
                    {totalAreaNeeded} m²
                  </div>
                  <p className="text-[10px] font-bold text-emerald-600 mt-2 uppercase">
                    Est. Area (+20% Maintenance Space)
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-purple-600">
                  <LayoutGrid size={14} />
                  <span className="text-[12px] font-black uppercase tracking-widest">
                    Total System Weight
                  </span>
                </div>
                <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                  <div className="text-3xl font-black text-slate-800">
                    {totalWeight} kg
                  </div>
                  <p className="text-[10px] font-bold text-emerald-600 mt-2 uppercase">
                    Roof Load:{" "}
                    <span className="text-emerald-900">{loadPerSqm} kg/m²</span>
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-blue-600">
                  <Box size={14} />
                  <span className="text-[12px] font-black uppercase tracking-widest">
                    Battery Pack
                  </span>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div className="text-3xl font-black text-slate-800">
                    {totalPacks} Unit
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase">
                    {selectedBattery?.type || "N/A"} / {selectedPackCap}Ah
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-blue-600">
                  <Box size={14} />
                  <span className="text-[12px] font-black uppercase tracking-widest">
                    Battery Pack Weight
                  </span>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div className="text-3xl font-black text-slate-800">
                    {weightBattery} Kg
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase">
                    {selectedBattery?.type || "N/A"} / {selectedPackCap}Ah
                  </p>
                </div>
              </div>

              {/* PROTECTION & WIRING */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800">
                  <Zap size={14} />
                  <span className="text-[12px] font-black uppercase tracking-widest">
                    Cabling & Protection
                  </span>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
                  {/* Baris Kabel */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-white border-b border-slate-800 pb-2">
                      <span className="text-[9px] text-slate-900 font-bold uppercase tracking-widest">
                        PV Cable
                      </span>
                      <span className="text-xs font-black text-orange-400">
                        {pvCableSize} mm²
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-white border-b border-slate-800 pb-2">
                      <span className="text-[9px] text-slate-900 font-bold uppercase tracking-widest">
                        Battery Cable
                      </span>
                      <span className="text-xs font-black text-green-400">
                        {batteryCableSize} mm²
                      </span>
                    </div>
                  </div>

                  {/* Baris Fuse */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-white border-b border-slate-800 pb-2">
                      <span className="text-[9px] text-slate-900 font-bold uppercase tracking-widest">
                        PV Fuse
                      </span>
                      <span className="text-xs font-black text-orange-400">
                        {pvFuseSize} A
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-white">
                      <span className="text-[9px] text-slate-900 font-bold uppercase tracking-widest">
                        Battery Fuse
                      </span>
                      <span className="text-xs font-black text-green-400">
                        {batteryFuseSize} A
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                    {selectedBattery?.type || "N/A"}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                    {selectedBattery?.type || "N/A"} -{" "}
                    {selectedBattery?.brand || ""}{" "}
                  </p>
                </td>
                <td className="py-5 text-center font-black text-slate-700">
                  {totalPacks}
                </td>
                <td className="py-5 text-[11px] font-bold text-slate-400 uppercase">
                  Unit
                </td>
                <td className="py-5 text-right font-bold text-blue-600">
                  {selectedBattery?.voltage || 0}V /{" "}
                  {selectedBattery?.capacity_ah || 0}Ah
                </td>
              </tr>
              {/* --- LOGIKA MOUNTING DINAMIS --- */}
              {mountingType === "aluminum" ? (
                <>
                  {/* TAMPILKAN INI JIKA PILIH ALUMINIUM */}
                  <tr className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                    <td className="py-5">
                      <p className="font-black text-slate-800">
                        Aluminium Mounting Rails
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                        AL6005-T5 Anodized (Standar 4.2m/6m)
                      </p>
                    </td>
                    <td className="py-5 text-center font-black text-slate-700">
                      {Math.ceil(jmlPanel / 2)}
                    </td>
                    <td className="py-5 text-[11px] font-bold text-slate-400 uppercase">
                      Batang
                    </td>
                    <td className="py-5 text-right font-bold text-slate-500">
                      HD Rail System
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                    <td className="py-5">
                      <p className="font-black text-slate-800">
                        Module Clamps Kit
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                        End Clamps & Mid Clamps Set
                      </p>
                    </td>
                    <td className="py-5 text-center font-black text-slate-700">
                      {jmlPanel * 2 + 4}
                    </td>
                    <td className="py-5 text-[11px] font-bold text-slate-400 uppercase">
                      Pcs
                    </td>
                    <td className="py-5 text-right font-bold text-slate-500">
                      Universal 35-40mm
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                    <td className="py-5">
                      <p className="font-black text-slate-800">
                        Roof Attachment (L-Feet)
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                        Stainless Steel Bolt + EPDM Rubber
                      </p>
                    </td>
                    <td className="py-5 text-center font-black text-slate-700">
                      {Math.ceil(jmlPanel * 1.5)}
                    </td>
                    <td className="py-5 text-[11px] font-bold text-slate-400 uppercase">
                      Pcs
                    </td>
                    <td className="py-5 text-right font-bold text-slate-500">
                      Heavy Duty L-Feet
                    </td>
                  </tr>
                </>
              ) : (
                <>
                  {/* TAMPILKAN INI JIKA PILIH BESI SIKU */}
                  <tr className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                    <td className="py-5">
                      <p className="font-black text-slate-800">
                        Besi Siku L40 x 40
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                        Custom Fabricated Support Structure (Hot Dip Galvanized)
                      </p>
                    </td>
                    <td className="py-5 text-center font-black text-slate-700">
                      {Math.ceil(jmlPanel * 1.2)}
                    </td>
                    <td className="py-5 text-[11px] font-bold text-slate-400 uppercase">
                      Batang
                    </td>
                    <td className="py-5 text-right font-bold text-slate-500">
                      6 Meter Length
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                    <td className="py-5">
                      <p className="font-black text-slate-800">
                        Baut & Dynabolt Set
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                        High Tensile Bolt M10/M12 + Dynabolt Set
                      </p>
                    </td>
                    <td className="py-5 text-center font-black text-slate-700">
                      {jmlPanel * 6}
                    </td>
                    <td className="py-5 text-[11px] font-bold text-slate-400 uppercase">
                      Pcs
                    </td>
                    <td className="py-5 text-right font-bold text-slate-500">
                      Kebutuhan Konstruksi
                    </td>
                  </tr>
                </>
              )}

              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-5">
                  <p className="font-black text-slate-800">
                    Earthing & Grounding Kit
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                    Grounding Lug & Bonding Clips
                  </p>
                </td>
                <td className="py-5 text-center font-black text-slate-700">
                  1
                </td>
                <td className="py-5 text-[11px] font-bold text-slate-400 uppercase">
                  Lot
                </td>
                <td className="py-5 text-right font-bold text-slate-500">
                  Lightning Protection
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-5">
                  <p className="font-black text-slate-800">
                    MC4 Connector Pair
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                    IP68 Waterproof / 1500V Rated
                  </p>
                </td>
                <td className="py-5 text-center font-black text-slate-700">
                  {/* Logika: 2 pasang per string + cadangan */}
                  {jmlPanel * 2 + 2}
                </td>
                <td className="py-5 text-[11px] font-bold text-slate-400 uppercase">
                  Pair
                </td>
                <td className="py-5 text-right font-bold text-slate-500">
                  Multicontact Standard
                </td>
              </tr>

              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-5">
                  <p className="font-black text-slate-800">
                    PV Cable Management Kit
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                    Stainless Steel Clips & UV Resistant Ties
                  </p>
                </td>
                <td className="py-5 text-center font-black text-slate-700">
                  {jmlPanel * 2}
                </td>
                <td className="py-5 text-[11px] font-bold text-slate-400 uppercase">
                  Pcs
                </td>
                <td className="py-5 text-right font-bold text-slate-500">
                  Anti-Corrosive Clips
                </td>
              </tr>

              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-5">
                  <p className="font-black text-slate-800">
                    Solar PV Cable {getCable(totalIsc)}mm²
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                    XLPO Insulated / Halogen Free (Red & Black)
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                    Total sepasang (Merah & Hitam) termasuk margin 10%
                  </p>
                </td>
                <td className="py-5 text-center font-black text-slate-700">
                  {Math.ceil(totalKabelPV)}
                </td>
                <td className="py-5 text-[11px] font-bold text-slate-400 uppercase">
                  Meter
                </td>
                <td className="py-5 text-right font-bold text-blue-600">
                  Double Insulated
                </td>
              </tr>

              {/* Baris Pipa Conduit yang otomatis ikut berubah */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-5">
                  <p className="font-black text-slate-800">
                    Pipa Conduit Rigid 20mm
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                    High Impact PVC - Putih
                  </p>
                </td>
                <td className="py-5 text-center font-black text-slate-700">
                  {estimasiPipaConduit}
                </td>
                <td className="py-5 text-[11px] font-bold text-slate-400 uppercase">
                  Batang
                </td>
                <td className="py-5 text-right font-bold text-slate-500">
                  Clips & Socks Incl.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <TechnicalSummary
          loadPerSqm={loadPerSqm}
          estimationMode={estimationMode}
        />

        <div className="mt-10 p-8 bg-slate-900 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <p className="text-green-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-2">
              Technical Specification Ready
            </p>
            <h4 className="text-white text-xl font-black italic">
              Banjarmasin Solar Project Standard
            </h4>
          </div>
          <button
            onClick={exportToExcel}
            className="px-10 py-4 bg-green-500 hover:bg-green-400 text-slate-900 font-black rounded-2xl transition-all shadow-[0_8px_20px_rgba(34,197,94,0.3)] active:scale-95"
          >
            <FileSpreadsheet size={18} />
            Export Data to Sheet
          </button>
        </div>
      </div>
    </div>
  );
  function TechnicalSummary({
    loadPerSqm,
    estimationMode,
  }: {
    loadPerSqm: number | string;
    estimationMode: "safety" | "optimized";
  }) {
    return (
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Power Reliability */}
        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center mb-4 text-white">
            <Zap size={20} />
          </div>
          <h4 className="font-black text-emerald-900 text-sm uppercase tracking-wider mb-2">
            Power Reliability
          </h4>
          <p className="text-xs text-emerald-700 leading-relaxed font-medium">
            Sistem dikonfigurasi untuk menangani beban kritis secara kontinyu.
            Dengan {totalPacks} unit LFP Battery, anda punya cadangan energi
            mandiri yang aman untuk siklus harian tanpa merusak umur baterai.
          </p>
        </div>

        {/* Card 2: Structural Safety */}
        <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center mb-4 text-white">
            <Weight size={20} />
          </div>
          <h4 className="font-black text-blue-900 text-sm uppercase tracking-wider mb-2">
            Structural Safety
          </h4>
          <p className="text-xs text-blue-700 leading-relaxed font-medium">
            Estimasi beban struktur adalah{" "}
            <span className="font-black">{loadPerSqm} kg/m²</span>. Menggunakan
            mounting aluminium AL6005-T5 yang ringan namun standar industrial,
            menjamin atap tetap kokoh dalam jangka panjang.
          </p>
        </div>

        {/* Card 3: Quality Assurance */}
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center mb-4 text-white">
            <ShieldCheck size={20} />
          </div>
          <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider mb-2">
            Engineering Standard
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            Menggunakan kabel PV {getCable(totalIsc)}mm² untuk meminimalkan{" "}
            <span className="italic">voltage drop</span>. Proteksi kelistrikan
            lengkap dengan DC Breaker dan Arrester sesuai standar keamanan
            sistem PLTS profesional.
          </p>
        </div>
      </div>
    );
  }
}
