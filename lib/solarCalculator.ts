import { Panel, Inverter, Battery, Kabel, Fuse } from "./defaultData";

export interface TariffPreset {
  id: string;
  name: string;
  ratePerKwh: number;
}

export const PLN_TARIFF_PRESETS: TariffPreset[] = [
  { id: "R1_1300_2200", name: "R-1/TR (1.300 - 2.200 VA) - Rp 1.444,70/kWh", ratePerKwh: 1444.7 },
  { id: "R2_3500_5500", name: "R-2/TR (3.500 - 5.500 VA) - Rp 1.699,53/kWh", ratePerKwh: 1699.53 },
  { id: "R3_6600_UP", name: "R-3/TR (6.600 VA ke atas) - Rp 1.699,53/kWh", ratePerKwh: 1699.53 },
  { id: "B2_6600_200K", name: "B-2/TR (Bisnis 6.600 VA - 200 kVA) - Rp 1.444,70/kWh", ratePerKwh: 1444.7 },
  { id: "CUSTOM", name: "Custom Tarif", ratePerKwh: 1500 },
];

export interface SolarCalcInputs {
  dayaVA: number;
  psh: number;
  jamOp: number;
  selectedPanel: Panel | null;
  selectedBattery: Battery | null;
  selectedInverter: Inverter | null;
  mountingType: "aluminum" | "iron";
  jarakKeInverter: number;
  estimationMode: "safety" | "optimized";
  dbKabel: Kabel[];
  dbFuse: Fuse[];
  tarifPLN?: number; // Tarif listrik PLN per kWh (Rp)
}

export interface MountingOption {
  name: string;
  weight: number;
  desc: string;
  pricePerUnit: number;
}

export interface FinancialAnalysis {
  biayaPanel: number;
  biayaInverter: number;
  biayaBaterai: number;
  biayaBOMTambahan: number;
  biayaJasaInstalasi: number;
  totalInvestasi: number;
  penghematanBulanRp: number;
  penghematanTahunRp: number;
  penghematan25TahunRp: number;
  paybackYears: number;
  roiPercent25Years: number;
}

export interface GreenImpact {
  co2SavedKgPerYear: number;
  co2SavedTon25Years: number;
  treesEquivalent: number;
}

export interface SolarCalcResults {
  // 1. Energi & Panel
  energiHarianWh: number;
  targetEnergiKwh: number;
  displayTargetKwh: number;
  jmlPanel: number;

  // 2. Battery Storage
  energyPerUnitWh: number;
  usableEnergyPerUnitWh: number;
  totalPacks: number;
  totalBatteryCapacityAh: number;
  weightBattery: number;

  // 3. Konfigurasi String PV
  maxSeri: number;
  finalP: number;
  finalS: number;
  stringVoc: number;
  arrayIsc: number;
  isVocSafe: boolean;

  // 4. Cabling & Proteksi (Standar PUIL & NEC)
  batteryContinuousAmpere: number;
  batteryDesignAmpere: number;
  batteryCableSize: number | string;
  batteryCableKHA: number;
  batteryFuseSize: number | string;

  pvDesignAmpere: number;
  pvCableSize: number | string;
  pvCableKHA: number;
  pvFuseSize: number | string;

  // 5. Area, Beban & Struktur
  areaPerPanel: number;
  totalAreaNeeded: string;
  totalWeight: number;
  loadPerSqm: string;
  currentMounting: MountingOption;

  // 6. Material Tambahan
  totalKabelPV: number;
  estimasiPipaConduit: number;

  // 7. Analisis Finansial & ROI
  financial: FinancialAnalysis;

  // 8. Dampak Lingkungan (Green Metric)
  green: GreenImpact;
}

export const MOUNTING_OPTIONS: Record<"aluminum" | "iron", MountingOption> = {
  aluminum: {
    name: "Aluminium Rail AL6005-T5",
    weight: 4,
    desc: "High Corrosion Resistance - Standar Industrial",
    pricePerUnit: 250000, // per rail batang
  },
  iron: {
    name: "Besi Siku L40 (Custom)",
    weight: 10,
    desc: "Heavy Duty - Lebih Berat & Ekonomis",
    pricePerUnit: 160000,
  },
};

/**
 * Memilih rekomendasi Inverter terkecil yang sanggup menghandle dayaVA
 */
export function recommendInverter(dayaVA: number, dbInverters: Inverter[]): Inverter | null {
  if (!dbInverters || dbInverters.length === 0) return null;

  const suitable = dbInverters
    .filter((inv) => inv.rated_power_va >= dayaVA)
    .sort((a, b) => a.rated_power_va - b.rated_power_va)[0];

  return suitable || [...dbInverters].sort((a, b) => b.rated_power_va - a.rated_power_va)[0];
}

/**
 * Memilih ukuran penampang kabel (mm2) berdasarkan Kuat Hantar Arus (KHA)
 */
export function selectCable(requiredAmpere: number, dbKabel: Kabel[]): { size: number | string; maxAmp: number } {
  if (!dbKabel || dbKabel.length === 0) return { size: "N/A", maxAmp: 0 };

  const suitable = dbKabel
    .filter((k) => k.max_ampere >= requiredAmpere)
    .sort((a, b) => a.max_ampere - b.max_ampere);

  if (suitable.length > 0) {
    return { size: suitable[0].ukuran_mm2, maxAmp: suitable[0].max_ampere };
  }
  return { size: "Out of Range", maxAmp: 0 };
}

/**
 * Memilih rating fuse/breaker berdasarkan prinsip proteksi:
 * Arus Desain <= Rating Fuse <= Kuat Hantar Arus (KHA) Kabel
 */
export function selectFuse(
  designAmpere: number,
  cableKHA: number,
  dbFuse: Fuse[]
): number | string {
  if (!dbFuse || dbFuse.length === 0) return "N/A";

  const candidates = dbFuse
    .filter((f) => f.rating_ampere >= designAmpere)
    .sort((a, b) => a.rating_ampere - b.rating_ampere);

  if (candidates.length === 0) return "Out of Range";

  const safeForCable = candidates.filter((f) => cableKHA === 0 || f.rating_ampere <= cableKHA);

  if (safeForCable.length > 0) {
    return safeForCable[0].rating_ampere;
  }

  return candidates[0].rating_ampere;
}

/**
 * Engine Kalkulasi Utama PLTS (Off-Grid / Hybrid Solar Calculator)
 */
export function calculateSolarSystem(inputs: SolarCalcInputs): SolarCalcResults {
  const {
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
    tarifPLN = 1444.7,
  } = inputs;

  // -------------------------------------------------------------
  // 1. Perhitungan Kebutuhan Energi & Jumlah Panel
  // -------------------------------------------------------------
  const efisiensiSistem = 0.8;
  const safetyFactor = 1.2;
  const energiHarianWh = dayaVA * efisiensiSistem * jamOp;
  const targetEnergiKwh = energiHarianWh * safetyFactor;
  const displayTargetKwh = targetEnergiKwh / 1000;

  const panelWatt = selectedPanel?.pmax || 550;
  const jmlPanel = Math.max(1, Math.ceil(targetEnergiKwh / (psh * panelWatt)));

  // -------------------------------------------------------------
  // 2. Perhitungan Baterai (Energy Storage)
  // -------------------------------------------------------------
  const batteryVoltage = selectedBattery?.voltage || 48;
  const batteryCapacity = selectedBattery?.capacity_ah || 100;
  const batteryDod = selectedBattery?.max_dod || 0.8;

  const energyPerUnitWh = batteryVoltage * batteryCapacity;
  const usableEnergyPerUnitWh = energyPerUnitWh * batteryDod;

  const totalPacks = usableEnergyPerUnitWh > 0
    ? Math.ceil((targetEnergiKwh / usableEnergyPerUnitWh) * 1.25)
    : 0;

  const totalBatteryCapacityAh = totalPacks * batteryCapacity;
  const weightBattery = totalPacks * (selectedBattery?.weight_kg || 0);

  // -------------------------------------------------------------
  // 3. Konfigurasi Stringing PV (Series / Parallel)
  // -------------------------------------------------------------
  const invMaxVoc = selectedInverter?.max_voc_input || 450;
  const pVoc = selectedPanel?.voc || 49.9;
  const pIsc = selectedPanel?.isc || 14;

  const maxSeri = Math.max(1, Math.floor((invMaxVoc * 0.9) / pVoc));
  const finalP = Math.max(1, Math.ceil(jmlPanel / maxSeri));
  const finalS = Math.ceil(jmlPanel / finalP);

  const stringVoc = finalS * pVoc;
  const arrayIsc = finalP * pIsc;
  const isVocSafe = stringVoc <= invMaxVoc;

  // -------------------------------------------------------------
  // 4. Perhitungan Kabel & Proteksi (Cabling & Fusing)
  // -------------------------------------------------------------
  const pvDesignAmpere = arrayIsc * 1.25;
  const pvCable = selectCable(pvDesignAmpere, dbKabel);
  const pvCableSize = pvCable.size;
  const pvCableKHA = pvCable.maxAmp;
  const pvFuseSize = selectFuse(arrayIsc, pvCableKHA, dbFuse);

  const inverterVA = selectedInverter?.rated_power_va || dayaVA;
  const batteryContinuousAmpere = inverterVA / (batteryVoltage * 0.85);
  const batteryDesignAmpere = batteryContinuousAmpere * 1.25;

  const batteryCable = selectCable(batteryDesignAmpere, dbKabel);
  const batteryCableSize = batteryCable.size;
  const batteryCableKHA = batteryCable.maxAmp;
  const batteryFuseSize = selectFuse(batteryContinuousAmpere, batteryCableKHA, dbFuse);

  // -------------------------------------------------------------
  // 5. Perhitungan Area, Beban Atap & Mounting
  // -------------------------------------------------------------
  const panelLengthM = (selectedPanel?.length_mm || 2279) / 1000;
  const panelWidthM = (selectedPanel?.width_mm || 1134) / 1000;
  const pWeight = selectedPanel?.weight_kg ?? 28;
  const areaPerPanel = panelLengthM * panelWidthM;

  const currentMounting = MOUNTING_OPTIONS[mountingType];
  const totalWeight = jmlPanel * (pWeight + currentMounting.weight);

  const loadPerSqm = areaPerPanel > 0
    ? (totalWeight / (jmlPanel * areaPerPanel)).toFixed(2)
    : "0";

  const cableMargin = estimationMode === "safety" ? 1.1 : 1.03;
  const areaMargin = estimationMode === "safety" ? 1.2 : 1.05;
  const conduitFactor = estimationMode === "safety" ? 0.7 : 0.5;

  const totalKabelPV = jarakKeInverter * 2 * jmlPanel * cableMargin;
  const totalAreaNeeded = (jmlPanel * areaPerPanel * areaMargin).toFixed(1);
  const estimasiPipaConduit = Math.ceil((totalKabelPV * conduitFactor) / 2.9);

  // -------------------------------------------------------------
  // 6. Analisis Finansial, Capex & ROI (Return on Investment)
  // -------------------------------------------------------------
  const hargaPerPanel = selectedPanel?.price_estimate || (panelWatt >= 550 ? 1850000 : 1550000);
  const hargaPerBaterai = selectedBattery?.price_estimate || (batteryCapacity >= 100 ? 16500000 : 9500000);
  const hargaInverter = selectedInverter?.price_estimate || 15000000;

  const biayaPanel = jmlPanel * hargaPerPanel;
  const biayaBaterai = totalPacks * hargaPerBaterai;
  const biayaInverter = hargaInverter;

  // Biaya Mounting & Material Tambahan (Kabel, MC4, Pipa, Box Panel, Arrester, Grounding)
  const jmlBatangMounting = Math.ceil(jmlPanel / 2);
  const biayaMounting = jmlBatangMounting * currentMounting.pricePerUnit;
  const biayaKabel = Math.ceil(totalKabelPV) * 22000; // ~Rp 22.000/meter
  const biayaAksesorisPanel = 2500000 + (jmlPanel * 75000); // Combiner box, breaker, grounding, clamps
  const biayaBOMTambahan = biayaMounting + biayaKabel + biayaAksesorisPanel;

  // Biaya Jasa Instalasi, Testing & Commissioning (~10% dari total hardware)
  const subtotalMaterial = biayaPanel + biayaBaterai + biayaInverter + biayaBOMTambahan;
  const biayaJasaInstalasi = Math.round((subtotalMaterial * 0.10) / 100000) * 100000;

  const totalInvestasi = subtotalMaterial + biayaJasaInstalasi;

  // Penghematan Tagihan Listrik Berdasarkan Produksi Energi Aktual
  // Produksi energi riil = Daya PV total * PSH * Efisiensi 0.8
  const totalWp = jmlPanel * panelWatt;
  const produksiHarianKwh = (totalWp * psh * 0.8) / 1000;
  const penghematanHarianRp = produksiHarianKwh * tarifPLN;
  const penghematanBulanRp = Math.round(penghematanHarianRp * 30);
  const penghematanTahunRp = Math.round(penghematanBulanRp * 12);
  const penghematan25TahunRp = Math.round(penghematanTahunRp * 25);

  // Payback Period (Tahun) & ROI
  const paybackYears = penghematanTahunRp > 0
    ? Number((totalInvestasi / penghematanTahunRp).toFixed(1))
    : 0;

  const roiPercent25Years = totalInvestasi > 0
    ? Number((((penghematan25TahunRp - totalInvestasi) / totalInvestasi) * 100).toFixed(0))
    : 0;

  const financial: FinancialAnalysis = {
    biayaPanel,
    biayaInverter,
    biayaBaterai,
    biayaBOMTambahan,
    biayaJasaInstalasi,
    totalInvestasi,
    penghematanBulanRp,
    penghematanTahunRp,
    penghematan25TahunRp,
    paybackYears,
    roiPercent25Years,
  };

  // -------------------------------------------------------------
  // 7. Dampak Lingkungan (Green Energy Impact)
  // Faktor emisi grid Indonesia: ~0.85 kg CO2 per kWh
  // -------------------------------------------------------------
  const produksiTahunanKwh = produksiHarianKwh * 365;
  const co2SavedKgPerYear = Math.round(produksiTahunanKwh * 0.85);
  const co2SavedTon25Years = Number(((co2SavedKgPerYear * 25) / 1000).toFixed(1));
  // 1 pohon menyerap ~21.77 kg CO2/tahun
  const treesEquivalent = Math.max(1, Math.round(co2SavedKgPerYear / 21.77));

  const green: GreenImpact = {
    co2SavedKgPerYear,
    co2SavedTon25Years,
    treesEquivalent,
  };

  return {
    energiHarianWh,
    targetEnergiKwh,
    displayTargetKwh,
    jmlPanel,
    energyPerUnitWh,
    usableEnergyPerUnitWh,
    totalPacks,
    totalBatteryCapacityAh,
    weightBattery,
    maxSeri,
    finalP,
    finalS,
    stringVoc,
    arrayIsc,
    isVocSafe,
    batteryContinuousAmpere,
    batteryDesignAmpere,
    batteryCableSize,
    batteryCableKHA,
    batteryFuseSize,
    pvDesignAmpere,
    pvCableSize,
    pvCableKHA,
    pvFuseSize,
    areaPerPanel,
    totalAreaNeeded,
    totalWeight,
    loadPerSqm,
    currentMounting,
    totalKabelPV,
    estimasiPipaConduit,
    financial,
    green,
  };
}

/**
 * Format angka mata uang Rupiah
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format data untuk Export Excel / Sheet (Bill of Materials)
 */
export function generateBoMData(
  inputs: SolarCalcInputs,
  results: SolarCalcResults
): (string | number)[][] {
  const { jmlPanel, totalPacks, totalWeight, loadPerSqm, totalKabelPV, estimasiPipaConduit, pvCableSize, financial, green } = results;
  const { selectedPanel, selectedInverter, selectedBattery, mountingType, estimationMode, tarifPLN = 1444.7 } = inputs;

  const bomData: (string | number)[][] = [
    ["PROJECT QUOTATION - SOLAR PV SYSTEM"],
    ["Lokasi Proyek", "Banjarmasin / Indonesia"],
    [
      "Mode Estimasi",
      estimationMode === "safety"
        ? "Safety Mode (Engineering Standard 10%)"
        : "Optimized Mode (Competitive 3%)",
    ],
    ["Tarif Dasar Listrik PLN", `Rp ${tarifPLN.toLocaleString("id-ID")}/kWh`],
    [],
    ["ITEM DESCRIPTION", "QTY", "UNIT", "SPECIFICATION", "EST. HARGA SATUAN (IDR)", "EST. TOTAL (IDR)"],
    [
      "Solar Panel Mono PERC",
      jmlPanel,
      "Pcs",
      selectedPanel?.tipe_wp || "Tier-1 Mono PERC",
      selectedPanel?.price_estimate || 1850000,
      financial.biayaPanel,
    ],
    [
      selectedInverter?.merk_tipe || "Smart Hybrid Inverter",
      1,
      "Unit",
      "Pure Sine Wave / MPPT High Voltage",
      financial.biayaInverter,
      financial.biayaInverter,
    ],
    [
      `${selectedBattery?.brand || "LiFePO4"} ${selectedBattery?.model || ""}`,
      totalPacks,
      "Unit",
      `Deep Cycle LiFePO4 ${selectedBattery?.voltage || 48}V / ${selectedBattery?.capacity_ah || 100}Ah`,
      selectedBattery?.price_estimate || 16500000,
      financial.biayaBaterai,
    ],
  ];

  if (mountingType === "aluminum") {
    bomData.push(
      [
        "Aluminium Mounting Rails",
        Math.ceil(jmlPanel / 2),
        "Batang",
        "AL6005-T5 Anodized (Standar Industrial)",
        250000,
        Math.ceil(jmlPanel / 2) * 250000,
      ],
      ["Module Clamps Kit", jmlPanel * 2 + 4, "Pcs", "End & Mid Clamps Set", 25000, (jmlPanel * 2 + 4) * 25000],
      [
        "Roof Attachment (L-Feet)",
        Math.ceil(jmlPanel * 1.5),
        "Pcs",
        "Stainless Steel Bolt + EPDM Rubber",
        45000,
        Math.ceil(jmlPanel * 1.5) * 45000,
      ]
    );
  } else {
    bomData.push(
      [
        "Besi Siku L40 x 40",
        Math.ceil(jmlPanel * 1.2),
        "Batang",
        "Custom Fabricated (Hot Dip Galvanized)",
        160000,
        Math.ceil(jmlPanel * 1.2) * 160000,
      ],
      ["Baut & Dynabolt Set", jmlPanel * 6, "Pcs", "High Tensile Bolt M10/M12 Set", 12000, jmlPanel * 6 * 12000]
    );
  }

  bomData.push(
    ["Earthing & Grounding Kit", 1, "Lot", "Grounding Rod, Lug & Bonding Clips", 1200000, 1200000],
    ["MC4 Connector Pair IP68", jmlPanel * 2 + 2, "Pair", "1500V DC Rated Multi-Contact", 35000, (jmlPanel * 2 + 2) * 35000],
    ["PV Cable Management Kit", jmlPanel * 2, "Pcs", "Stainless Steel UV Clips & Ties", 15000, jmlPanel * 2 * 15000],
    [
      `Solar PV Cable ${pvCableSize}mm²`,
      Math.ceil(totalKabelPV),
      "Meter",
      "XLPO Double Insulated / Halogen Free",
      22000,
      Math.ceil(totalKabelPV) * 22000,
    ],
    [
      "Pipa Conduit Rigid 20mm",
      estimasiPipaConduit,
      "Batang",
      "High Impact PVC - Clips & Socks Incl.",
      38000,
      estimasiPipaConduit * 38000,
    ],
    [
      "Jasa Instalasi, Testing & Commissioning",
      1,
      "Lot",
      "Pemasangan Standar Industrial + Garansi 1 Thn",
      financial.biayaJasaInstalasi,
      financial.biayaJasaInstalasi,
    ],
    [],
    ["SUMMARY INVESTASI & KEUANGAN"],
    ["Total Estimasi Investasi Sistem (Capex)", `${formatRupiah(financial.totalInvestasi)}`],
    ["Estimasi Penghematan Listrik per Bulan", `${formatRupiah(financial.penghematanBulanRp)} / bulan`],
    ["Estimasi Penghematan Listrik per Tahun", `${formatRupiah(financial.penghematanTahunRp)} / tahun`],
    ["Estimasi Masa Balik Modal (Payback Period)", `${financial.paybackYears} Tahun`],
    ["Total Penghematan 25 Tahun", `${formatRupiah(financial.penghematan25TahunRp)}`],
    [],
    ["TECHNICAL & ENVIRONMENTAL SUMMARY"],
    ["Total System Weight", `${totalWeight} kg`],
    ["Roof Load Pressure", `${loadPerSqm} kg/m²`],
    ["PV Protection Fuse", `${results.pvFuseSize} A`],
    ["Battery Protection Fuse", `${results.batteryFuseSize} A`],
    ["Battery Cable Spec", `${results.batteryCableSize} mm²`],
    ["CO2 Reduction per Year", `${green.co2SavedKgPerYear} kg CO2/thn`],
    ["Pohon Diselamatkan Ekuivalen", `${green.treesEquivalent} Pohon/thn`]
  );

  return bomData;
}
