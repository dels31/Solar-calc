/**
 * Script untuk mengisi data awal (Seeder) ke Firebase Firestore
 * 
 * Cara menjalankan:
 * 1. Pastikan variabel Firebase sudah diisi di file .env.local
 * 2. Jalankan perintah:
 *    node --env-file=.env.local scripts/seed-firestore.mjs
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";

// Auto-load .env.local jika belum dimuat ke process.env
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const firstEq = trimmed.indexOf("=");
    if (firstEq !== -1) {
      const key = trimmed.slice(0, firstEq).trim();
      let val = trimmed.slice(firstEq + 1).trim();
      // Hilangkan quote jika ada
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("❌ Error: Firebase environment variables belum terisi di .env.local");
  console.error("Pastikan NEXT_PUBLIC_FIREBASE_API_KEY dan NEXT_PUBLIC_FIREBASE_PROJECT_ID sudah diisi.");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const samplePanels = [
  { id: "panel-450", tipe_wp: "Tier 1 Monocrystalline 450Wp", pmax: 450, voc: 49.5, isc: 11.5, length_mm: 2094, width_mm: 1038, weight_kg: 24.5 },
  { id: "panel-550", tipe_wp: "Tier 1 Monocrystalline 550Wp", pmax: 550, voc: 49.8, isc: 13.9, length_mm: 2278, width_mm: 1134, weight_kg: 28.0 },
  { id: "panel-600", tipe_wp: "Tier 1 Monocrystalline 600Wp", pmax: 600, voc: 52.0, isc: 14.5, length_mm: 2465, width_mm: 1134, weight_kg: 31.0 },
];

const sampleInverters = [
  { id: "inv-3kw", merk_tipe: "Growatt / Deye 3kW Hybrid", rated_power_va: 3000, max_voc_input: 500, max_isc_input: 18, system_voltage: 48, price_estimate: 12500000 },
  { id: "inv-5kw", merk_tipe: "Growatt / Deye 5kW Hybrid", rated_power_va: 5000, max_voc_input: 500, max_isc_input: 22, system_voltage: 48, price_estimate: 18000000 },
  { id: "inv-8kw", merk_tipe: "Growatt / Deye 8kW Hybrid", rated_power_va: 8000, max_voc_input: 500, max_isc_input: 26, system_voltage: 48, price_estimate: 28000000 },
  { id: "inv-10kw", merk_tipe: "Growatt / Deye 10kW Hybrid", rated_power_va: 10000, max_voc_input: 500, max_isc_input: 32, system_voltage: 48, price_estimate: 35000000 },
];

const sampleBatteries = [
  { id: "bat-50ah", brand: "Pylontech / Felicity", model: "LiFePO4 48V 50Ah", type: "LiFePO4", voltage: 48, capacity_ah: 50, weight_kg: 30, max_dod: 0.8, max_discharge: 50 },
  { id: "bat-100ah", brand: "Pylontech / Felicity", model: "LiFePO4 48V 100Ah", type: "LiFePO4", voltage: 48, capacity_ah: 100, weight_kg: 55, max_dod: 0.8, max_discharge: 100 },
  { id: "bat-200ah", brand: "Pylontech / Felicity", model: "LiFePO4 48V 200Ah", type: "LiFePO4", voltage: 48, capacity_ah: 200, weight_kg: 105, max_dod: 0.8, max_discharge: 150 },
];

const sampleKabel = [
  { max_ampere: 20, ukuran_mm2: 2.5 },
  { max_ampere: 32, ukuran_mm2: 4 },
  { max_ampere: 45, ukuran_mm2: 6 },
  { max_ampere: 65, ukuran_mm2: 10 },
  { max_ampere: 85, ukuran_mm2: 16 },
  { max_ampere: 115, ukuran_mm2: 25 },
  { max_ampere: 150, ukuran_mm2: 35 },
];

const sampleFuse = [
  { rating_ampere: 15 },
  { rating_ampere: 20 },
  { rating_ampere: 25 },
  { rating_ampere: 32 },
  { rating_ampere: 40 },
  { rating_ampere: 50 },
  { rating_ampere: 63 },
  { rating_ampere: 80 },
  { rating_ampere: 100 },
  { rating_ampere: 125 },
  { rating_ampere: 160 },
  { rating_ampere: 200 },
];

async function seed() {
  console.log("🚀 Memulai upload data ke Firebase Firestore...");

  try {
    for (const item of samplePanels) {
      await setDoc(doc(db, "database_panel", item.id), item);
    }
    console.log("✅ database_panel berhasil diisi");

    for (const item of sampleInverters) {
      await setDoc(doc(db, "database_inverter", item.id), item);
    }
    console.log("✅ database_inverter berhasil diisi");

    for (const item of sampleBatteries) {
      await setDoc(doc(db, "database_batteries", item.id), item);
    }
    console.log("✅ database_batteries berhasil diisi");

    let idx = 1;
    for (const item of sampleKabel) {
      await setDoc(doc(db, "database_kabel", `kabel-${idx++}`), item);
    }
    console.log("✅ database_kabel berhasil diisi");

    idx = 1;
    for (const item of sampleFuse) {
      await setDoc(doc(db, "database_fuse", `fuse-${idx++}`), item);
    }
    console.log("✅ database_fuse berhasil diisi");

    console.log("\n🎉 Semua data katalog berhasil di-upload ke Firestore!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Gagal upload data:", error);
    process.exit(1);
  }
}

seed();
