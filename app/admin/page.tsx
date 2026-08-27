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
  updateDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
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
import { useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/AuthModal";
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
  Moon,
  Laptop,
  Users,
  Crown,
  MessageCircle,
  ShieldAlert,
  Loader2,
} from "lucide-react";

export interface AdminUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  isPro: boolean;
  role?: "user" | "superadmin";
  plan: "free" | "pro";
  proPlanType?: "project" | "monthly" | "lifetime";
  createdAt?: unknown;
  updatedAt?: unknown;
}

type ActiveTab = "panels" | "inverters" | "batteries" | "cables" | "fuses" | "users";
type ThemeMode = "light" | "dark" | "system";
type CatalogItemForm = Record<string, string | number | undefined>;

export default function AdminCatalogPage() {
  const { user, userProfile, isSuperAdmin, loading: authLoading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("users");
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
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [userFilter, setUserFilter] = useState<"all" | "free" | "pro">("all");

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
      const [panelSnap, inverterSnap, batterySnap, cableSnap, fuseSnap, userSnap] = await Promise.all([
        getDocs(collection(db, "database_panel")),
        getDocs(collection(db, "database_inverter")),
        getDocs(collection(db, "database_batteries")),
        getDocs(query(collection(db, "database_kabel"), orderBy("max_ampere"))),
        getDocs(query(collection(db, "database_fuse"), orderBy("rating_ampere"))),
        getDocs(collection(db, "users")),
      ]);
      if (!panelSnap.empty) setPanels(panelSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Panel[]);
      if (!inverterSnap.empty) setInverters(inverterSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Inverter[]);
      if (!batterySnap.empty) setBatteries(batterySnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Battery[]);
      if (!cableSnap.empty) setCables(cableSnap.docs.map((d) => ({ ...d.data() })) as Kabel[]);
      if (!fuseSnap.empty) setFuses(fuseSnap.docs.map((d) => ({ ...d.data() })) as Fuse[]);
      if (!userSnap.empty) {
        setUsersList(userSnap.docs.map((d) => ({ uid: d.id, ...d.data() })) as AdminUser[]);
      }
    } catch (err) {
      console.warn("Gagal memuat Firestore:", err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initFetch = async () => {
      try {
        const [panelSnap, inverterSnap, batterySnap, cableSnap, fuseSnap, userSnap] = await Promise.all([
          getDocs(collection(db, "database_panel")),
          getDocs(collection(db, "database_inverter")),
          getDocs(collection(db, "database_batteries")),
          getDocs(query(collection(db, "database_kabel"), orderBy("max_ampere"))),
          getDocs(query(collection(db, "database_fuse"), orderBy("rating_ampere"))),
          getDocs(collection(db, "users")),
        ]);
        if (!isMounted) return;
        if (!panelSnap.empty) setPanels(panelSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Panel[]);
        if (!inverterSnap.empty) setInverters(inverterSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Inverter[]);
        if (!batterySnap.empty) setBatteries(batterySnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Battery[]);
        if (!cableSnap.empty) setCables(cableSnap.docs.map((d) => ({ ...d.data() })) as Kabel[]);
        if (!fuseSnap.empty) setFuses(fuseSnap.docs.map((d) => ({ ...d.data() })) as Fuse[]);
        if (!userSnap.empty) {
          setUsersList(userSnap.docs.map((d) => ({ uid: d.id, ...d.data() })) as AdminUser[]);
        }
      } catch (err) {
        console.warn("Firestore offline, menggunakan default catalog data.", err);
      }
    };
    initFetch();
    return () => {
      isMounted = false;
    };
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // User Plan Approval Handler (ACC Pro)
  const handleUpdateUserPlan = async (
    targetUser: AdminUser,
    isPro: boolean,
    proPlanType: "project" | "monthly" | "lifetime" = "monthly"
  ) => {
    try {
      const userDocRef = doc(db, "users", targetUser.uid);
      await updateDoc(userDocRef, {
        isPro,
        plan: isPro ? "pro" : "free",
        proPlanType: isPro ? proPlanType : null,
        updatedAt: serverTimestamp(),
      });
      showToast(
        `✅ Akun ${targetUser.displayName || targetUser.email} berhasil diubah ke ${
          isPro ? `PRO (${proPlanType.toUpperCase()})` : "FREE"
        }!`
      );
      await reloadData();
    } catch (err) {
      console.error(err);
      const e = err as { message?: string };
      showToast("Gagal update status user: " + (e.message || ""), "error");
    }
  };

  // Delete Action
  const handleDelete = async (collectionName: string, id: string) => {
    if (!confirm(`Hapus item ID: ${id} dari database?`)) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
      showToast(`Item ${id} berhasil dihapus dari database.`);
      reloadData();
    } catch (err) {
      console.error(err);
      showToast("Gagal menghapus item dari database.", "error");
    }
  };

  // Save / Update Action
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      if (activeTab === "panels") {
        const id = (editingItem.id as string) || `panel-${Date.now()}`;
        const data: Panel = {
          id,
          tipe_wp: String(editingItem.tipe_wp || ""),
          pmax: Number(editingItem.pmax || 550),
          voc: Number(editingItem.voc || 49.8),
          isc: Number(editingItem.isc || 14.0),
          length_mm: Number(editingItem.length_mm || 2278),
          width_mm: Number(editingItem.width_mm || 1134),
          weight_kg: Number(editingItem.weight_kg || 28),
          price_estimate: Number(editingItem.price_estimate || 1850000),
        };
        await setDoc(doc(db, "database_panel", id), data);
      } else if (activeTab === "inverters") {
        const id = (editingItem.id as string) || `inv-${Date.now()}`;
        const data: Inverter = {
          id,
          merk_tipe: String(editingItem.merk_tipe || ""),
          rated_power_va: Number(editingItem.rated_power_va || 5000),
          max_voc_input: Number(editingItem.max_voc_input || 450),
          max_isc_input: Number(editingItem.max_isc_input || 22),
          system_voltage: Number(editingItem.system_voltage || 48),
          price_estimate: Number(editingItem.price_estimate || 17500000),
        };
        await setDoc(doc(db, "database_inverter", id), data);
      } else if (activeTab === "batteries") {
        const id = (editingItem.id as string) || `bat-${Date.now()}`;
        const data: Battery = {
          id,
          brand: String(editingItem.brand || ""),
          model: String(editingItem.model || ""),
          type: String(editingItem.type || "LiFePO4"),
          voltage: Number(editingItem.voltage || 48),
          capacity_ah: Number(editingItem.capacity_ah || 100),
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

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      (u.displayName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.uid.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (userFilter === "pro") return u.isPro;
    if (userFilter === "free") return !u.isPro;
    return true;
  });

  // Guard 1: Loading Auth State
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 size={36} className="animate-spin text-purple-600 mx-auto" />
          <p className="text-xs font-bold text-slate-500">Memverifikasi Hak Akses Superadmin...</p>
        </div>
      </div>
    );
  }

  // Guard 2: Unauthorized (Non-Superadmin) Screen
  if (!user || !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] flex items-center justify-center p-4 font-sans">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-8 shadow-2xl text-center space-y-6 relative">
          
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl mx-auto flex items-center justify-center shadow-inner">
            <ShieldAlert size={32} />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Akses Ditolak (403 Unauthorized)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Halaman Admin Center & Approval Plan dilindungi dan hanya dapat diakses oleh akun <strong>Super Administrator</strong> 7 Layers IT Solutions.
            </p>
            {user && (
              <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-300/30 font-medium">
                Akun aktif: <strong>{user.email}</strong>
                <p className="text-[10px] text-slate-400 mt-0.5">Role saat ini: {userProfile?.role || "User"}</p>
              </div>
            )}
          </div>

          <div className="space-y-2.5 pt-2">
            {!user ? (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
              >
                Login sebagai Superadmin
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Ganti Akun Superadmin Lain
              </button>
            )}

            <Link
              href="/"
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft size={14} />
              <span>Kembali ke Kalkulator</span>
            </Link>
          </div>

          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            title="Login Super Administrator"
            subtitle="Masukkan email superadmin untuk mengakses dashboard"
          />
        </div>
      </div>
    );
  }

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
                Admin Center & User Approval
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-300/40">
                  🗄️ Firestore Live
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manajemen Produk Katalog & Approval Plan Pembayaran QRIS (7 Layers IT Solutions)
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
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${theme === "system" ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-slate-400"}`}
              >
                <Laptop size={14} />
              </button>
            </div>
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
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
            {/* TABS */}
            <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              {/* USERS APPROVAL TAB */}
              <button
                onClick={() => { setActiveTab("users"); setSearchQuery(""); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === "users"
                    ? "bg-linear-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Users size={15} />
                <span>User & ACC Plan ({usersList.length})</span>
              </button>

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
                  placeholder={activeTab === "users" ? "Cari nama / email user..." : "Cari item katalog..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 outline-none focus:border-purple-500"
                />
              </div>

              {activeTab !== "users" && (
                <button
                  onClick={() => {
                    setEditingItem({});
                    setIsModalOpen(true);
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Tambah Produk</span>
                </button>
              )}
            </div>
          </div>

          {/* TAB 0: USER APPROVAL & PLAN MANAGEMENT */}
          {activeTab === "users" && (
            <div className="space-y-4">
              {/* USER FILTER TABS */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setUserFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    userFilter === "all"
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  Semua ({usersList.length})
                </button>
                <button
                  onClick={() => setUserFilter("free")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    userFilter === "free"
                      ? "bg-amber-500 text-slate-950 font-black"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  Free / Menunggu ACC ({usersList.filter((u) => !u.isPro).length})
                </button>
                <button
                  onClick={() => setUserFilter("pro")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    userFilter === "pro"
                      ? "bg-emerald-500 text-slate-950 font-black"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  👑 Pro Aktif ({usersList.filter((u) => u.isPro).length})
                </button>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="text-center py-16 text-slate-400 dark:text-slate-500">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-bold">Tidak ada data pengguna ditemukan.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="pb-3">Pengguna</th>
                        <th className="pb-3">Email</th>
                        <th className="pb-3">Status Plan</th>
                        <th className="pb-3">Tipe Paket</th>
                        <th className="pb-3 text-right">Aksi ACC / Manajemen Plan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                      {filteredUsers.map((u) => {
                        const waConfirmMessage = `Halo ${u.displayName || "Kak"}, pembayaran QRIS Anda sudah diverifikasi dan akun ${u.email} telah kami ACC menjadi PRO Member di Solar Calc Pro. Silakan nikmati akses proposal PDF & BoM Excel tanpa batas! Terima kasih - 7 Layers IT Solutions 🙏`;
                        const waDirectUrl = `https://wa.me/6281993507390?text=${encodeURIComponent(waConfirmMessage)}`;

                        return (
                          <tr key={u.uid} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                {u.photoURL ? (
                                  <Image
                                    src={u.photoURL}
                                    alt={u.displayName || "User"}
                                    width={32}
                                    height={32}
                                    className="w-8 h-8 rounded-full object-cover border border-emerald-500"
                                  />
                                ) : (
                                  <div className="w-8 h-8 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center font-black text-xs">
                                    {(u.displayName || u.email || "U").charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <p className="font-black text-slate-900 dark:text-white">{u.displayName || "User"}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">UID: {u.uid.slice(0, 10)}...</p>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 text-slate-600 dark:text-slate-300">
                              {u.email || "-"}
                            </td>

                            <td className="py-4">
                              {u.isPro ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-black text-[10px] uppercase border border-emerald-300/40">
                                  <Crown size={12} /> PRO MEMBER
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-[10px] uppercase border border-slate-300/40">
                                  FREE (Menunggu ACC)
                                </span>
                              )}
                            </td>

                            <td className="py-4 text-[11px] text-slate-500 dark:text-slate-400">
                              {u.proPlanType === "monthly" && "📅 Pro Bulanan (Rp 99rb)"}
                              {u.proPlanType === "project" && "⚡ Single Project (Rp 25rb)"}
                              {u.proPlanType === "lifetime" && "💎 Pro Lifetime"}
                              {!u.proPlanType && "-"}
                            </td>

                            <td className="py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {/* ACC PRO BULANAN */}
                                <button
                                  onClick={() => handleUpdateUserPlan(u, true, "monthly")}
                                  className="px-2.5 py-1.5 bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 text-[10px] font-black rounded-lg transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1"
                                  title="ACC Plan Pro Bulanan (Rp 99.000)"
                                >
                                  <Crown size={12} />
                                  <span>ACC Pro (Bulanan)</span>
                                </button>

                                {/* ACC PRO SINGLE */}
                                <button
                                  onClick={() => handleUpdateUserPlan(u, true, "project")}
                                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black rounded-lg transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1"
                                  title="ACC Plan Single Project (Rp 25.000)"
                                >
                                  <Zap size={12} />
                                  <span>ACC Single (25rb)</span>
                                </button>

                                {/* REVOKE TO FREE */}
                                {u.isPro && (
                                  <button
                                    onClick={() => handleUpdateUserPlan(u, false)}
                                    className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold rounded-lg border border-rose-200 dark:border-rose-800 transition-all cursor-pointer"
                                    title="Cabut akses / Downgrade ke Free"
                                  >
                                    Cabut Akses
                                  </button>
                                )}

                                {/* DIRECT WHATSAPP CONFIRMATION */}
                                <a
                                  href={waDirectUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 rounded-lg border border-emerald-300/40 transition-all"
                                  title="Kirim Konfirmasi ke WA"
                                >
                                  <MessageCircle size={14} />
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: SOLAR PANELS */}
          {activeTab === "panels" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="pb-3">Tipe / Model Panel</th>
                    <th className="pb-3 text-center">Pmax (Wp)</th>
                    <th className="pb-3 text-center">Voc (V)</th>
                    <th className="pb-3 text-center">Isc (A)</th>
                    <th className="pb-3 text-center">Dimensi (L x W mm)</th>
                    <th className="pb-3 text-center">Berat (kg)</th>
                    <th className="pb-3 text-right">Est. Harga Satuan</th>
                    <th className="pb-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                  {panels
                    .filter((p) => p.tipe_wp.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 text-slate-900 dark:text-white">{p.tipe_wp}</td>
                        <td className="py-4 text-center text-orange-500">{p.pmax} Wp</td>
                        <td className="py-4 text-center">{p.voc} V</td>
                        <td className="py-4 text-center">{p.isc} A</td>
                        <td className="py-4 text-center text-slate-400 font-mono text-[11px]">{p.length_mm} x {p.width_mm}</td>
                        <td className="py-4 text-center">{p.weight_kg} kg</td>
                        <td className="py-4 text-right text-emerald-600 dark:text-emerald-400 font-black">
                          {formatRupiah(p.price_estimate || 1850000)}
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingItem({ ...p });
                                setIsModalOpen(true);
                              }}
                              className="p-2 text-slate-400 hover:text-purple-600 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete("database_panel", p.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: INVERTER */}
          {activeTab === "inverters" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="pb-3">Merk / Tipe Inverter</th>
                    <th className="pb-3 text-center">Daya Rated (VA)</th>
                    <th className="pb-3 text-center">Max Voc Input (V)</th>
                    <th className="pb-3 text-center">Max Isc Input (A)</th>
                    <th className="pb-3 text-center">Tegangan Sistem</th>
                    <th className="pb-3 text-right">Est. Harga Satuan</th>
                    <th className="pb-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                  {inverters
                    .filter((inv) => inv.merk_tipe.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 text-slate-900 dark:text-white">{inv.merk_tipe}</td>
                        <td className="py-4 text-center text-purple-600 dark:text-purple-400 font-black">{inv.rated_power_va} VA</td>
                        <td className="py-4 text-center">{inv.max_voc_input} V</td>
                        <td className="py-4 text-center">{inv.max_isc_input} A</td>
                        <td className="py-4 text-center font-mono text-[11px]">{inv.system_voltage}V</td>
                        <td className="py-4 text-right text-emerald-600 dark:text-emerald-400 font-black">
                          {formatRupiah(inv.price_estimate)}
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingItem({ ...inv });
                                setIsModalOpen(true);
                              }}
                              className="p-2 text-slate-400 hover:text-purple-600 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete("database_inverter", inv.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: BATTERIES */}
          {activeTab === "batteries" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="pb-3">Brand & Model</th>
                    <th className="pb-3 text-center">Tipe Sel</th>
                    <th className="pb-3 text-center">Tegangan (V)</th>
                    <th className="pb-3 text-center">Kapasitas (Ah)</th>
                    <th className="pb-3 text-center">Berat (kg)</th>
                    <th className="pb-3 text-center">Max DoD</th>
                    <th className="pb-3 text-right">Est. Harga Satuan</th>
                    <th className="pb-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                  {batteries
                    .filter((b) => (b.brand + " " + b.model).toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 text-slate-900 dark:text-white">
                          <p className="font-black">{b.brand}</p>
                          <p className="text-[10px] text-slate-400">{b.model}</p>
                        </td>
                        <td className="py-4 text-center text-blue-600 dark:text-blue-400">{b.type}</td>
                        <td className="py-4 text-center">{b.voltage} V</td>
                        <td className="py-4 text-center font-black">{b.capacity_ah} Ah</td>
                        <td className="py-4 text-center">{b.weight_kg} kg</td>
                        <td className="py-4 text-center font-mono text-[11px]">{(b.max_dod * 100).toFixed(0)}%</td>
                        <td className="py-4 text-right text-emerald-600 dark:text-emerald-400 font-black">
                          {formatRupiah(b.price_estimate || 16500000)}
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingItem({ ...b });
                                setIsModalOpen(true);
                              }}
                              className="p-2 text-slate-400 hover:text-purple-600 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete("database_batteries", b.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: CABLES */}
          {activeTab === "cables" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="pb-3">Ukuran Penampang (mm²)</th>
                    <th className="pb-3 text-center">KHA Maksimal (A)</th>
                    <th className="pb-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                  {cables.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 text-slate-900 dark:text-white font-black">{c.ukuran_mm2} mm²</td>
                      <td className="py-4 text-center text-emerald-600 dark:text-emerald-400 font-mono">{c.max_ampere} Ampere</td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => handleDelete("database_kabel", `kabel-${c.ukuran_mm2}mm`)}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: FUSES */}
          {activeTab === "fuses" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="pb-3">Rating Arus Sekring / Breaker (A)</th>
                    <th className="pb-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                  {fuses.map((f, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 text-slate-900 dark:text-white font-black">{f.rating_ampere} Ampere</td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => handleDelete("database_fuse", `fuse-${f.rating_ampere}a`)}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL: ADD / EDIT CATALOG ITEM */}
        {isModalOpen && activeTab !== "users" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {editingItem?.id ? "Edit Item Katalog" : "Tambah Item Katalog Baru"}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
                {activeTab === "panels" && (
                  <>
                    <div>
                      <label className="font-bold text-slate-400 block mb-1">Tipe / Model Panel</label>
                      <input
                        type="text"
                        required
                        value={editingItem?.tipe_wp || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, tipe_wp: e.target.value })}
                        placeholder="Contoh: Jinko Tiger Pro 550Wp"
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
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="font-bold text-slate-400 block mb-1">Panjang (mm)</label>
                        <input
                          type="number"
                          required
                          value={editingItem?.length_mm || 2278}
                          onChange={(e) => setEditingItem({ ...editingItem, length_mm: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-400 block mb-1">Lebar (mm)</label>
                        <input
                          type="number"
                          required
                          value={editingItem?.width_mm || 1134}
                          onChange={(e) => setEditingItem({ ...editingItem, width_mm: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-400 block mb-1">Berat (kg)</label>
                        <input
                          type="number"
                          required
                          value={editingItem?.weight_kg || 28}
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
                        value={editingItem?.merk_tipe || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, merk_tipe: e.target.value })}
                        placeholder="Contoh: Deye 5kW Hybrid"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-400 block mb-1">Daya Rated (VA)</label>
                        <input
                          type="number"
                          required
                          value={editingItem?.rated_power_va || ""}
                          onChange={(e) => setEditingItem({ ...editingItem, rated_power_va: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-400 block mb-1">Tegangan Sistem (V)</label>
                        <input
                          type="number"
                          required
                          value={editingItem?.system_voltage || 48}
                          onChange={(e) => setEditingItem({ ...editingItem, system_voltage: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-400 block mb-1">Max Voc Input (V)</label>
                        <input
                          type="number"
                          required
                          value={editingItem?.max_voc_input || 500}
                          onChange={(e) => setEditingItem({ ...editingItem, max_voc_input: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-400 block mb-1">Max Isc Input (A)</label>
                        <input
                          type="number"
                          required
                          value={editingItem?.max_isc_input || 22}
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
                        placeholder="17500000"
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
                          value={editingItem?.brand || ""}
                          onChange={(e) => setEditingItem({ ...editingItem, brand: e.target.value })}
                          placeholder="Pylontech"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-slate-200 dark:border-slate-700 outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-400 block mb-1">Model</label>
                        <input
                          type="text"
                          required
                          value={editingItem?.model || ""}
                          onChange={(e) => setEditingItem({ ...editingItem, model: e.target.value })}
                          placeholder="US5000 48V"
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
