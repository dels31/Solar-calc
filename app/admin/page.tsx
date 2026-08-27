"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
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
import { formatRupiah } from "@/lib/solarCalculator";
import {
  Sun,
  Battery as BatteryIcon,
  Zap,
  ShieldCheck,
  Cpu,
  Plus,
  Trash2,
  Edit2,
  ArrowLeft,
  Search,
  CheckCircle2,
  X,
  Sliders,
  Moon,
  Laptop,
} from "lucide-react";

type ActiveTab = "panels" | "inverters" | "batteries" | "cables" | "fuses";
type ThemeMode = "light" | "dark" | "system";
type CatalogItemForm = Record<string, string | number | undefined>;

export default function AdminCatalogPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("panels");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Theme state
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("solar_calc_theme") as ThemeMode) || "system";
    }
    return "system";
  });

  // State Collections
  const [panels, setPanels] = useState<Panel[]>(defaultPanels);
  const [inverters, setInverters] = useState<Inverter[]>(defaultInverters);
  const [batteries, setBatteries] = useState<Battery[]>(defaultBatteries);
  const [cables, setCables] = useState<Kabel[]>(defaultKabel);
  const [fuses, setFuses] = useState<Fuse[]>(defaultFuse);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItemForm | null>(null);

  // Apply Theme
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      if (theme === "dark") {
        root.classList.add("dark");
      } else if (theme === "light") {
        root.classList.remove("dark");
      } else {
        if (mediaQuery.matches) root.classList.add("dark");
        else root.classList.remove("dark");
      }
    };

    applyTheme();
    localStorage.setItem("solar_calc_theme", theme);
  }, [theme]);

  // Fetch Live Collections from Firestore
  const reloadData = async () => {
    try {
      const [panelSnap, inverterSnap, batterySnap, cableSnap, fuseSnap] = await Promise.all([
        getDocs(collection(db, "database_panel")),
        getDocs(collection(db, "database_inverter")),
        getDocs(collection(db, "database_batteries")),
        getDocs(query(collection(db, "database_kabel"), orderBy("max_ampere"))),
        getDocs(query(collection(db, "database_fuse"), orderBy("rating_ampere"))),
      ]);
      if (!panelSnap.empty) setPanels(panelSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Panel[]);
      if (!inverterSnap.empty) setInverters(inverterSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Inverter[]);
      if (!batterySnap.empty) setBatteries(batterySnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Battery[]);
      if (!cableSnap.empty) setCables(cableSnap.docs.map((d) => ({ ...d.data() })) as Kabel[]);
      if (!fuseSnap.empty) setFuses(fuseSnap.docs.map((d) => ({ ...d.data() })) as Fuse[]);
    } catch (err) {
      console.warn("Gagal memuat Firestore:", err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initFetch = async () => {
      try {
        const [panelSnap, inverterSnap, batterySnap, cableSnap, fuseSnap] = await Promise.all([
          getDocs(collection(db, "database_panel")),
          getDocs(collection(db, "database_inverter")),
          getDocs(collection(db, "database_batteries")),
          getDocs(query(collection(db, "database_kabel"), orderBy("max_ampere"))),
          getDocs(query(collection(db, "database_fuse"), orderBy("rating_ampere"))),
        ]);
        if (!isMounted) return;
        if (!panelSnap.empty) setPanels(panelSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Panel[]);
        if (!inverterSnap.empty) setInverters(inverterSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Inverter[]);
        if (!batterySnap.empty) setBatteries(batterySnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Battery[]);
        if (!cableSnap.empty) setCables(cableSnap.docs.map((d) => ({ ...d.data() })) as Kabel[]);
        if (!fuseSnap.empty) setFuses(fuseSnap.docs.map((d) => ({ ...d.data() })) as Fuse[]);
      } catch (err) {
        console.warn("Gagal inisialisasi Firestore:", err);
      }
    };
    initFetch();
    return () => {
      isMounted = false;
    };
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Delete Handlers
  const handleDelete = async (collectionName: string, id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus komponen ini dari database?")) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
      showToast("Komponen berhasil dihapus dari Firestore!");
      reloadData();
    } catch (err) {
      console.error(err);
      showToast("Gagal menghapus komponen.", "error");
    }
  };

  // Save / Update Handler
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      if (activeTab === "panels") {
        const id = (editingItem.id as string) || `panel-${editingItem.pmax}`;
        const data: Panel = {
          id,
          tipe_wp: String(editingItem.tipe_wp || ""),
          pmax: Number(editingItem.pmax),
          voc: Number(editingItem.voc),
          isc: Number(editingItem.isc),
          length_mm: Number(editingItem.length_mm || 2278),
          width_mm: Number(editingItem.width_mm || 1134),
          weight_kg: Number(editingItem.weight_kg || 28),
          price_estimate: Number(editingItem.price_estimate || 1850000),
        };
        await setDoc(doc(db, "database_panel", id), data);
      } else if (activeTab === "inverters") {
        const id = (editingItem.id as string) || `inv-${editingItem.rated_power_va}va`;
        const data: Inverter = {
          id,
          merk_tipe: String(editingItem.merk_tipe || ""),
          rated_power_va: Number(editingItem.rated_power_va),
          max_voc_input: Number(editingItem.max_voc_input),
          max_isc_input: Number(editingItem.max_isc_input),
          system_voltage: Number(editingItem.system_voltage || 48),
          price_estimate: Number(editingItem.price_estimate || 15000000),
        };
        await setDoc(doc(db, "database_inverter", id), data);
      } else if (activeTab === "batteries") {
        const id = (editingItem.id as string) || `bat-${editingItem.capacity_ah}ah`;
        const data: Battery = {
          id,
          brand: String(editingItem.brand || ""),
          model: String(editingItem.model || ""),
          type: String(editingItem.type || "LiFePO4"),
          voltage: Number(editingItem.voltage || 48),
          capacity_ah: Number(editingItem.capacity_ah),
          weight_kg: Number(editingItem.weight_kg || 55),
          max_dod: Number(editingItem.max_dod || 0.8),
          max_discharge: Number(editingItem.max_discharge || editingItem.capacity_ah),
          price_estimate: Number(editingItem.price_estimate || 16500000),
        };
        await setDoc(doc(db, "database_batteries", id), data);
      } else if (activeTab === "cables") {
        const id = (editingItem.docId as string) || `kabel-${editingItem.ukuran_mm2}mm`;
        const data: Kabel = {
          ukuran_mm2: Number(editingItem.ukuran_mm2),
          max_ampere: Number(editingItem.max_ampere),
        };
        await setDoc(doc(db, "database_kabel", id), data);
      } else if (activeTab === "fuses") {
        const id = (editingItem.docId as string) || `fuse-${editingItem.rating_ampere}a`;
        const data: Fuse = {
          rating_ampere: Number(editingItem.rating_ampere),
        };
        await setDoc(doc(db, "database_fuse", id), data);
      }

      showToast("Data katalog berhasil disimpan ke Firestore!");
      setIsModalOpen(false);
      setEditingItem(null);
      reloadData();
    } catch (err) {
      console.error(err);
      showToast("Gagal menyimpan ke Firestore.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] p-4 lg:p-10 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* TOP NAVBAR */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <Link
              href="/"
              className="w-10 h-10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm"
              title="Kembali ke Kalkulator"
            >
              <ArrowLeft size={18} />
            </Link>

            <div className="w-11 h-11 bg-white dark:bg-slate-800/80 rounded-2xl flex items-center justify-center p-1 border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
              <Image
                src="/logo-7layers.png"
                alt="7 Layers IT Solutions Logo"
                width={44}
                height={44}
                className="w-full h-full object-contain"
              />
            </div>

            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Catalog Admin Center
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-300/40">
                  🗄️ Firestore Live CRUD
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manajemen Spesifikasi & Estimasi Harga Komponen 7 Layers IT Solutions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* THEME TOGGLE */}
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-xl border border-slate-300/50 dark:border-slate-700/50">
              <button
                onClick={() => setTheme("light")}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${theme === "light" ? "bg-white text-amber-600 shadow-sm" : "text-slate-400"}`}
              >
                <Sun size={14} />
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${theme === "dark" ? "bg-slate-900 text-blue-400 shadow-sm" : "text-slate-400"}`}
              >
                <Moon size={14} />
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${theme === "system" ? "bg-white dark:bg-slate-700 text-emerald-500 shadow-sm" : "text-slate-400"}`}
              >
                <Laptop size={14} />
              </button>
            </div>

            <Link
              href="/"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <Sliders size={14} />
              Buka Kalkulator
            </Link>
          </div>
        </header>

        {/* TOAST FEEDBACK NOTIFICATION */}
        {statusMessage && (
          <div className={`p-4 rounded-2xl border flex items-center gap-2 text-xs font-bold animate-in fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300"
          }`}>
            <CheckCircle2 size={16} />
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* CATEGORY TABS & ACTION BAR */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 shadow-md space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
            {/* TABS */}
            <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <button
                onClick={() => { setActiveTab("panels"); setSearchQuery(""); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === "panels"
                    ? "bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Sun size={15} /> Solar Panel ({panels.length})
              </button>

              <button
                onClick={() => { setActiveTab("inverters"); setSearchQuery(""); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === "inverters"
                    ? "bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Cpu size={15} /> Inverter ({inverters.length})
              </button>

              <button
                onClick={() => { setActiveTab("batteries"); setSearchQuery(""); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === "batteries"
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <BatteryIcon size={15} /> Baterai ({batteries.length})
              </button>

              <button
                onClick={() => { setActiveTab("cables"); setSearchQuery(""); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === "cables"
                    ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Zap size={15} /> Kabel ({cables.length})
              </button>

              <button
                onClick={() => { setActiveTab("fuses"); setSearchQuery(""); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === "fuses"
                    ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <ShieldCheck size={15} /> Fuse ({fuses.length})
              </button>
            </div>

            {/* SEARCH & ADD BUTTON */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari komponen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 outline-none focus:border-purple-500"
                />
              </div>

              <button
                onClick={() => {
                  setEditingItem({});
                  setIsModalOpen(true);
                }}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-purple-600/20 active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus size={16} /> Tambah
              </button>
            </div>
          </div>

          {/* TABLE CONTENT */}
          <div className="overflow-x-auto">
            {activeTab === "panels" && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                    <th className="pb-3 px-3">Tipe / Merk</th>
                    <th className="pb-3 px-3 text-center">Pmax (Wp)</th>
                    <th className="pb-3 px-3 text-center">Voc (V)</th>
                    <th className="pb-3 px-3 text-center">Isc (A)</th>
                    <th className="pb-3 px-3 text-center">Dimensi (mm)</th>
                    <th className="pb-3 px-3 text-center">Berat (kg)</th>
                    <th className="pb-3 px-3 text-right">Est. Harga (IDR)</th>
                    <th className="pb-3 px-3 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {panels
                    .filter((p) => p.tipe_wp.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-3 font-bold text-slate-800 dark:text-white flex items-center gap-2">
                          <Sun size={15} className="text-orange-500" />
                          <span>{item.tipe_wp}</span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-black text-orange-600 dark:text-orange-400">{item.pmax} Wp</td>
                        <td className="py-3.5 px-3 text-center font-bold text-slate-600 dark:text-slate-300">{item.voc} V</td>
                        <td className="py-3.5 px-3 text-center font-bold text-slate-600 dark:text-slate-300">{item.isc} A</td>
                        <td className="py-3.5 px-3 text-center text-slate-500">{item.length_mm} x {item.width_mm}</td>
                        <td className="py-3.5 px-3 text-center text-slate-500">{item.weight_kg} kg</td>
                        <td className="py-3.5 px-3 text-right font-black text-slate-900 dark:text-white">
                          {formatRupiah(item.price_estimate || 1850000)}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => { setEditingItem({ ...item }); setIsModalOpen(true); }}
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:text-purple-600 rounded-lg text-slate-500 transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete("database_panel", item.id)}
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:text-rose-600 rounded-lg text-slate-500 transition-colors cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {activeTab === "inverters" && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                    <th className="pb-3 px-3">Merk / Tipe Inverter</th>
                    <th className="pb-3 px-3 text-center">Rated Power (VA)</th>
                    <th className="pb-3 px-3 text-center">Max Voc Input (V)</th>
                    <th className="pb-3 px-3 text-center">Max Isc Input (A)</th>
                    <th className="pb-3 px-3 text-center">Tegangan Sistem (V)</th>
                    <th className="pb-3 px-3 text-right">Est. Harga (IDR)</th>
                    <th className="pb-3 px-3 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {inverters
                    .filter((inv) => inv.merk_tipe.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-3 font-bold text-slate-800 dark:text-white flex items-center gap-2">
                          <Cpu size={15} className="text-purple-500" />
                          <span>{item.merk_tipe}</span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-black text-purple-600 dark:text-purple-400">{item.rated_power_va} VA</td>
                        <td className="py-3.5 px-3 text-center font-bold text-slate-600 dark:text-slate-300">{item.max_voc_input} V</td>
                        <td className="py-3.5 px-3 text-center font-bold text-slate-600 dark:text-slate-300">{item.max_isc_input} A</td>
                        <td className="py-3.5 px-3 text-center text-slate-500">{item.system_voltage}V DC</td>
                        <td className="py-3.5 px-3 text-right font-black text-slate-900 dark:text-white">
                          {formatRupiah(item.price_estimate)}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => { setEditingItem({ ...item }); setIsModalOpen(true); }}
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:text-purple-600 rounded-lg text-slate-500 transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete("database_inverter", item.id)}
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:text-rose-600 rounded-lg text-slate-500 transition-colors cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {activeTab === "batteries" && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                    <th className="pb-3 px-3">Brand & Model</th>
                    <th className="pb-3 px-3 text-center">Tipe Kimia</th>
                    <th className="pb-3 px-3 text-center">Tegangan (V)</th>
                    <th className="pb-3 px-3 text-center">Kapasitas (Ah)</th>
                    <th className="pb-3 px-3 text-center">Berat (kg)</th>
                    <th className="pb-3 px-3 text-center">Max DoD</th>
                    <th className="pb-3 px-3 text-right">Est. Harga (IDR)</th>
                    <th className="pb-3 px-3 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {batteries
                    .filter((b) => (b.brand + " " + b.model).toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-3 font-bold text-slate-800 dark:text-white flex items-center gap-2">
                          <BatteryIcon size={15} className="text-blue-500" />
                          <span>{item.brand} {item.model}</span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-blue-600 dark:text-blue-400">{item.type}</td>
                        <td className="py-3.5 px-3 text-center font-bold text-slate-600 dark:text-slate-300">{item.voltage} V</td>
                        <td className="py-3.5 px-3 text-center font-black text-slate-800 dark:text-white">{item.capacity_ah} Ah</td>
                        <td className="py-3.5 px-3 text-center text-slate-500">{item.weight_kg} kg</td>
                        <td className="py-3.5 px-3 text-center text-slate-500">{Math.round(item.max_dod * 100)}%</td>
                        <td className="py-3.5 px-3 text-right font-black text-slate-900 dark:text-white">
                          {formatRupiah(item.price_estimate || 16500000)}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => { setEditingItem({ ...item }); setIsModalOpen(true); }}
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:text-purple-600 rounded-lg text-slate-500 transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete("database_batteries", item.id)}
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:text-rose-600 rounded-lg text-slate-500 transition-colors cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {activeTab === "cables" && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                    <th className="pb-3 px-3">Ukuran Penampang Kabel</th>
                    <th className="pb-3 px-3 text-center">Kuat Hantar Arus / KHA Maksimal (A)</th>
                    <th className="pb-3 px-3 text-right w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {cables.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-3 font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Zap size={15} className="text-emerald-500" />
                        <span>Kabel DC {item.ukuran_mm2} mm²</span>
                      </td>
                      <td className="py-3.5 px-3 text-center font-black text-emerald-600 dark:text-emerald-400">
                        {item.max_ampere} A
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => { setEditingItem({ ...item, docId: `kabel-${item.ukuran_mm2}mm` }); setIsModalOpen(true); }}
                          className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:text-purple-600 rounded-lg text-slate-500 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "fuses" && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                    <th className="pb-3 px-3">Rating Sekring / Breaker</th>
                    <th className="pb-3 px-3 text-center">Kapasitas Arus Putus (A)</th>
                    <th className="pb-3 px-3 text-right w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {fuses.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-3 font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <ShieldCheck size={15} className="text-rose-500" />
                        <span>Fuse / DC Breaker {item.rating_ampere}A</span>
                      </td>
                      <td className="py-3.5 px-3 text-center font-black text-rose-600 dark:text-rose-400">
                        {item.rating_ampere} A
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => { setEditingItem({ ...item, docId: `fuse-${item.rating_ampere}a` }); setIsModalOpen(true); }}
                          className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:text-purple-600 rounded-lg text-slate-500 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* MODAL: ADD / EDIT ITEM */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {editingItem?.id || editingItem?.docId ? "Edit Komponen" : "Tambah Komponen Baru"}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
                {activeTab === "panels" && (
                  <>
                    <div>
                      <label className="font-bold text-slate-400 block mb-1">Tipe / Nama Panel</label>
                      <input
                        type="text"
                        required
                        value={String(editingItem?.tipe_wp || "")}
                        onChange={(e) => setEditingItem({ ...editingItem, tipe_wp: e.target.value })}
                        placeholder="Contoh: Tier 1 Mono 550Wp"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="font-bold text-slate-400 block mb-1">Pmax (Wp)</label>
                        <input
                          type="number"
                          required
                          value={editingItem?.pmax || ""}
                          onChange={(e) => setEditingItem({ ...editingItem, pmax: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-400 block mb-1">Voc (V)</label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={editingItem?.voc || ""}
                          onChange={(e) => setEditingItem({ ...editingItem, voc: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-400 block mb-1">Isc (A)</label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={editingItem?.isc || ""}
                          onChange={(e) => setEditingItem({ ...editingItem, isc: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="font-bold text-slate-400 block mb-1">Estimasi Harga Satuan (IDR)</label>
                      <input
                        type="number"
                        required
                        value={editingItem?.price_estimate || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, price_estimate: e.target.value })}
                        placeholder="1850000"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                      />
                    </div>
                  </>
                )}

                {activeTab === "inverters" && (
                  <>
                    <div>
                      <label className="font-bold text-slate-400 block mb-1">Merk / Tipe Inverter</label>
                      <input
                        type="text"
                        required
                        value={String(editingItem?.merk_tipe || "")}
                        onChange={(e) => setEditingItem({ ...editingItem, merk_tipe: e.target.value })}
                        placeholder="Contoh: Growatt SPF 5000ES Hybrid"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="font-bold text-slate-400 block mb-1">Rated Power (VA)</label>
                        <input
                          type="number"
                          required
                          value={editingItem?.rated_power_va || ""}
                          onChange={(e) => setEditingItem({ ...editingItem, rated_power_va: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-400 block mb-1">Max Voc Input (V)</label>
                        <input
                          type="number"
                          required
                          value={editingItem?.max_voc_input || ""}
                          onChange={(e) => setEditingItem({ ...editingItem, max_voc_input: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-400 block mb-1">Max Isc (A)</label>
                        <input
                          type="number"
                          required
                          value={editingItem?.max_isc_input || ""}
                          onChange={(e) => setEditingItem({ ...editingItem, max_isc_input: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="font-bold text-slate-400 block mb-1">Estimasi Harga Satuan (IDR)</label>
                      <input
                        type="number"
                        required
                        value={editingItem?.price_estimate || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, price_estimate: e.target.value })}
                        placeholder="18000000"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                      />
                    </div>
                  </>
                )}

                {activeTab === "batteries" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-400 block mb-1">Brand</label>
                        <input
                          type="text"
                          required
                          value={String(editingItem?.brand || "")}
                          onChange={(e) => setEditingItem({ ...editingItem, brand: e.target.value })}
                          placeholder="Pylontech / Felicity"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-400 block mb-1">Model</label>
                        <input
                          type="text"
                          required
                          value={String(editingItem?.model || "")}
                          onChange={(e) => setEditingItem({ ...editingItem, model: e.target.value })}
                          placeholder="LPBA48100 48V"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="font-bold text-slate-400 block mb-1">Tegangan (V)</label>
                        <input
                          type="number"
                          required
                          value={editingItem?.voltage || 48}
                          onChange={(e) => setEditingItem({ ...editingItem, voltage: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-400 block mb-1">Kapasitas (Ah)</label>
                        <input
                          type="number"
                          required
                          value={editingItem?.capacity_ah || ""}
                          onChange={(e) => setEditingItem({ ...editingItem, capacity_ah: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-400 block mb-1">Berat (kg)</label>
                        <input
                          type="number"
                          required
                          value={editingItem?.weight_kg || 55}
                          onChange={(e) => setEditingItem({ ...editingItem, weight_kg: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="font-bold text-slate-400 block mb-1">Estimasi Harga Satuan (IDR)</label>
                      <input
                        type="number"
                        required
                        value={editingItem?.price_estimate || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, price_estimate: e.target.value })}
                        placeholder="16500000"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                      />
                    </div>
                  </>
                )}

                {activeTab === "cables" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-400 block mb-1">Ukuran Penampang (mm²)</label>
                      <input
                        type="number"
                        step="0.5"
                        required
                        value={editingItem?.ukuran_mm2 || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, ukuran_mm2: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-400 block mb-1">KHA Maksimal (A)</label>
                      <input
                        type="number"
                        required
                        value={editingItem?.max_ampere || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, max_ampere: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                      />
                    </div>
                  </div>
                )}

                {activeTab === "fuses" && (
                  <div>
                    <label className="font-bold text-slate-400 block mb-1">Rating Arus Fuse / Breaker (A)</label>
                    <input
                      type="number"
                      required
                      value={editingItem?.rating_ampere || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, rating_ampere: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    Simpan ke Firestore
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
