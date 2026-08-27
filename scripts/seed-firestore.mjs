/**
 * Script untuk mengisi data awal (Seeder) ke Firebase Firestore
 * 
 * Cara menjalankan:
 *    node scripts/seed-firestore.mjs
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
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const samplePanels = [
  { id: "panel-jinko-550", tipe_wp: "Jinko Solar Tiger Pro 550Wp Mono-PERC", pmax: 550, voc: 49.8, isc: 13.98, length_mm: 2278, width_mm: 1134, weight_kg: 28.0, price_estimate: 1850000 },
  { id: "panel-longi-585", tipe_wp: "Longi Hi-MO 6 Explorer 585Wp HPBC", pmax: 585, voc: 51.6, isc: 14.36, length_mm: 2278, width_mm: 1134, weight_kg: 27.5, price_estimate: 2150000 },
  { id: "panel-canadian-550", tipe_wp: "Canadian Solar HiKu6 550Wp Mono", pmax: 550, voc: 49.6, isc: 14.00, length_mm: 2278, width_mm: 1134, weight_kg: 27.6, price_estimate: 1820000 },
  { id: "panel-trina-440", tipe_wp: "Trina Solar Vertex S+ 440Wp Bifacial", pmax: 440, voc: 52.2, isc: 10.67, length_mm: 1762, width_mm: 1134, weight_kg: 21.0, price_estimate: 1600000 },
  { id: "panel-ja-575", tipe_wp: "JA Solar DeepBlue 4.0 Pro 575Wp n-Type", pmax: 575, voc: 51.1, isc: 14.28, length_mm: 2278, width_mm: 1134, weight_kg: 27.8, price_estimate: 2050000 },
  { id: "panel-tier1-450", tipe_wp: "Tier 1 Monocrystalline 450Wp Half-Cut", pmax: 450, voc: 49.5, isc: 11.50, length_mm: 2094, width_mm: 1038, weight_kg: 24.5, price_estimate: 1550000 },
  { id: "panel-tier1-550", tipe_wp: "Tier 1 Monocrystalline 550Wp Standard", pmax: 550, voc: 49.8, isc: 13.90, length_mm: 2278, width_mm: 1134, weight_kg: 28.0, price_estimate: 1850000 },
  { id: "panel-tier1-600", tipe_wp: "Tier 1 Monocrystalline 600Wp High-Power", pmax: 600, voc: 52.0, isc: 14.50, length_mm: 2465, width_mm: 1134, weight_kg: 31.0, price_estimate: 2150000 },
  { id: "panel-tier1-650", tipe_wp: "Tier 1 Monocrystalline 650Wp Industrial", pmax: 650, voc: 55.4, isc: 15.10, length_mm: 2384, width_mm: 1303, weight_kg: 34.0, price_estimate: 2450000 },
];

const sampleInverters = [
  { id: "inv-growatt-3.5k", merk_tipe: "Growatt SPF 3500ES Hybrid (3.5kW / 48V)", rated_power_va: 3500, max_voc_input: 450, max_isc_input: 18, system_voltage: 48, price_estimate: 12500000 },
  { id: "inv-growatt-5k", merk_tipe: "Growatt SPF 5000ES Hybrid (5kW / 48V)", rated_power_va: 5000, max_voc_input: 450, max_isc_input: 22, system_voltage: 48, price_estimate: 17500000 },
  { id: "inv-growatt-6k", merk_tipe: "Growatt SPF 6000ES Plus (6kW / 48V Dual MPPT)", rated_power_va: 6000, max_voc_input: 500, max_isc_input: 27, system_voltage: 48, price_estimate: 21500000 },
  { id: "inv-deye-5k", merk_tipe: "Deye SUN-5K-SG03LP1 Hybrid Smart (5kW / 48V)", rated_power_va: 5000, max_voc_input: 500, max_isc_input: 26, system_voltage: 48, price_estimate: 22000000 },
  { id: "inv-deye-8k", merk_tipe: "Deye SUN-8K-SG01LP1 Hybrid Smart (8kW / 48V)", rated_power_va: 8000, max_voc_input: 500, max_isc_input: 30, system_voltage: 48, price_estimate: 29500000 },
  { id: "inv-deye-10k", merk_tipe: "Deye SUN-10K-SG04LP3 3-Phase (10kW / 48V)", rated_power_va: 10000, max_voc_input: 550, max_isc_input: 34, system_voltage: 48, price_estimate: 36500000 },
  { id: "inv-deye-12k", merk_tipe: "Deye SUN-12K-SG04LP3 3-Phase (12kW / 48V)", rated_power_va: 12000, max_voc_input: 550, max_isc_input: 34, system_voltage: 48, price_estimate: 42000000 },
  { id: "inv-victron-5k", merk_tipe: "Victron MultiPlus-II 48/5000 Pure Sine (5kVA)", rated_power_va: 5000, max_voc_input: 450, max_isc_input: 35, system_voltage: 48, price_estimate: 28500000 },
  { id: "inv-huawei-5k", merk_tipe: "Huawei SUN2000-5KTL-L1 Smart PV (5kW)", rated_power_va: 5000, max_voc_input: 600, max_isc_input: 25, system_voltage: 48, price_estimate: 23500000 },
];

const sampleBatteries = [
  { id: "bat-pylontech-50", brand: "Pylontech", model: "US3000C 48V 74Ah (3.55 kWh)", type: "LiFePO4", voltage: 48, capacity_ah: 74, weight_kg: 32, max_dod: 0.9, max_discharge: 74, price_estimate: 14500000 },
  { id: "bat-pylontech-100", brand: "Pylontech", model: "US5000 48V 100Ah (4.8 kWh)", type: "LiFePO4", voltage: 48, capacity_ah: 100, weight_kg: 38, max_dod: 0.95, max_discharge: 100, price_estimate: 19500000 },
  { id: "bat-felicity-100", brand: "Felicity Solar", model: "LPBA48100 Wall-Mount (5.12 kWh)", type: "LiFePO4", voltage: 48, capacity_ah: 100, weight_kg: 50, max_dod: 0.85, max_discharge: 100, price_estimate: 16500000 },
  { id: "bat-felicity-200", brand: "Felicity Solar", model: "LPBA48200 Floor-Stand (10.24 kWh)", type: "LiFePO4", voltage: 48, capacity_ah: 200, weight_kg: 95, max_dod: 0.85, max_discharge: 150, price_estimate: 29500000 },
  { id: "bat-dyness-100", brand: "Dyness", model: "BX51100 Modular 48V (5.12 kWh)", type: "LiFePO4", voltage: 48, capacity_ah: 100, weight_kg: 44, max_dod: 0.9, max_discharge: 100, price_estimate: 17200000 },
  { id: "bat-huawei-100", brand: "Huawei", model: "LUNA2000-5-E0 Smart Module (5 kWh)", type: "LiFePO4", voltage: 48, capacity_ah: 100, weight_kg: 50, max_dod: 1.0, max_discharge: 100, price_estimate: 26000000 },
  { id: "bat-byd-80", brand: "BYD", model: "Battery-Box Premium LVS 48V (4 kWh)", type: "LiFePO4", voltage: 48, capacity_ah: 80, weight_kg: 45, max_dod: 0.95, max_discharge: 80, price_estimate: 22500000 },
  { id: "bat-server-100", brand: "Narada / Brikens", model: "Rack-Mount 48V 100Ah Server", type: "LiFePO4", voltage: 48, capacity_ah: 100, weight_kg: 48, max_dod: 0.8, max_discharge: 100, price_estimate: 15500000 },
];

const sampleKabel = [
  { max_ampere: 20, ukuran_mm2: 2.5 },
  { max_ampere: 32, ukuran_mm2: 4 },
  { max_ampere: 45, ukuran_mm2: 6 },
  { max_ampere: 65, ukuran_mm2: 10 },
  { max_ampere: 85, ukuran_mm2: 16 },
  { max_ampere: 115, ukuran_mm2: 25 },
  { max_ampere: 150, ukuran_mm2: 35 },
  { max_ampere: 190, ukuran_mm2: 50 },
  { max_ampere: 240, ukuran_mm2: 70 },
  { max_ampere: 300, ukuran_mm2: 95 },
  { max_ampere: 360, ukuran_mm2: 120 },
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
  { rating_ampere: 150 },
  { rating_ampere: 160 },
  { rating_ampere: 200 },
  { rating_ampere: 250 },
  { rating_ampere: 300 },
  { rating_ampere: 400 },
];

async function seed() {
  console.log("🚀 Memulai upload data katalog lengkap ke Firebase Firestore...");

  try {
    for (const item of samplePanels) {
      await setDoc(doc(db, "database_panel", item.id), item);
    }
    console.log(`✅ database_panel berhasil diisi (${samplePanels.length} item)`);

    for (const item of sampleInverters) {
      await setDoc(doc(db, "database_inverter", item.id), item);
    }
    console.log(`✅ database_inverter berhasil diisi (${sampleInverters.length} item)`);

    for (const item of sampleBatteries) {
      await setDoc(doc(db, "database_batteries", item.id), item);
    }
    console.log(`✅ database_batteries berhasil diisi (${sampleBatteries.length} item)`);

    let idx = 1;
    for (const item of sampleKabel) {
      await setDoc(doc(db, "database_kabel", `kabel-${idx++}`), item);
    }
    console.log(`✅ database_kabel berhasil diisi (${sampleKabel.length} item)`);

    idx = 1;
    for (const item of sampleFuse) {
      await setDoc(doc(db, "database_fuse", `fuse-${idx++}`), item);
    }
    console.log(`✅ database_fuse berhasil diisi (${sampleFuse.length} item)`);

    console.log("\n🎉 Semua data katalog berhasil di-upload ke Firestore!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Gagal upload data:", error);
    process.exit(1);
  }
}

seed();
