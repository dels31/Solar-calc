import { Panel, Inverter, Battery, Kabel, Fuse } from "./defaultData";

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
}

export interface MountingOption {
  name: string;
  weight: number;
  desc: string;
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
}

export const MOUNTING_OPTIONS: Record<"aluminum" | "iron", MountingOption> = {
  aluminum: {
    name: "Aluminium Rail AL6005-T5",
    weight: 4,
    desc: "High Corrosion Resistance - Standar Industrial",
  },
  iron: {
    name: "Besi Siku L40 (Custom)",
    weight: 10,
    desc: "Heavy Duty - Lebih Berat & Ekonomis",
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

  // 1. Cari fuse yang >= designAmpere
  const candidates = dbFuse
    .filter((f) => f.rating_ampere >= designAmpere)
    .sort((a, b) => a.rating_ampere - b.rating_ampere);

  if (candidates.length === 0) return "Out of Range";

  // 2. Prioritaskan fuse yang <= KHA Kabel agar kabel aman
  const safeForCable = candidates.filter((f) => cableKHA === 0 || f.rating_ampere <= cableKHA);

  if (safeForCable.length > 0) {
    return safeForCable[0].rating_ampere;
  }

  // Jika tidak ada yang <= KHA (kabel terlalu kecil), pilih kandidat pertama terdekat
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

  // Seri maksimal dibatasi 90% dari Max VOC Inverter (Cold Weather Margin)
  const maxSeri = Math.max(1, Math.floor((invMaxVoc * 0.9) / pVoc));
  const finalP = Math.max(1, Math.ceil(jmlPanel / maxSeri));
  const finalS = Math.ceil(jmlPanel / finalP);

  const stringVoc = finalS * pVoc;
  const arrayIsc = finalP * pIsc;
  const isVocSafe = stringVoc <= invMaxVoc;

  // -------------------------------------------------------------
  // 4. Perhitungan Kabel & Proteksi (Cabling & Fusing)
  // -------------------------------------------------------------
  // A. Kabel & Fuse PV:
  // Arus desain PV = arrayIsc * 1.25 (Safety factor radiasi matahari berlebih)
  const pvDesignAmpere = arrayIsc * 1.25;
  const pvCable = selectCable(pvDesignAmpere, dbKabel);
  const pvCableSize = pvCable.size;
  const pvCableKHA = pvCable.maxAmp;

  // Fuse PV: Rating harus >= arrayIsc dan <= KHA kabel
  const pvFuseSize = selectFuse(arrayIsc, pvCableKHA, dbFuse);

  // B. Kabel & Fuse Baterai:
  // Arus kontinu baterai = Daya Inverter / (Voltase Bat * Efisiensi 0.85)
  const inverterVA = selectedInverter?.rated_power_va || dayaVA;
  const batteryContinuousAmpere = inverterVA / (batteryVoltage * 0.85);
  // Arus desain kabel baterai dengan safety margin 1.25x
  const batteryDesignAmpere = batteryContinuousAmpere * 1.25;

  const batteryCable = selectCable(batteryDesignAmpere, dbKabel);
  const batteryCableSize = batteryCable.size;
  const batteryCableKHA = batteryCable.maxAmp;

  // Fuse Baterai: Rating harus >= continuous ampere dan <= KHA kabel baterai
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

  // Faktor pengali estimasi
  const cableMargin = estimationMode === "safety" ? 1.1 : 1.03; // 10% vs 3%
  const areaMargin = estimationMode === "safety" ? 1.2 : 1.05; // 20% vs 5%
  const conduitFactor = estimationMode === "safety" ? 0.7 : 0.5;

  const totalKabelPV = jarakKeInverter * 2 * jmlPanel * cableMargin;
  const totalAreaNeeded = (jmlPanel * areaPerPanel * areaMargin).toFixed(1);
  const estimasiPipaConduit = Math.ceil((totalKabelPV * conduitFactor) / 2.9);

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
  };
}

/**
 * Format data untuk Export Excel / Sheet (Bill of Materials)
 */
export function generateBoMData(
  inputs: SolarCalcInputs,
  results: SolarCalcResults
): (string | number)[][] {
  const { jmlPanel, totalPacks, totalWeight, loadPerSqm, totalKabelPV, estimasiPipaConduit, pvCableSize } = results;
  const { selectedPanel, selectedInverter, selectedBattery, mountingType, estimationMode } = inputs;

  const bomData: (string | number)[][] = [
    ["PROJECT QUOTATION - SOLAR PV SYSTEM"],
    ["Lokasi Proyek", "Banjarmasin / Indonesia"],
    [
      "Mode Estimasi",
      estimationMode === "safety"
        ? "Safety Mode (Engineering Standard 10%)"
        : "Optimized Mode (Competitive 3%)",
    ],
    [],
    ["ITEM DESCRIPTION", "QTY", "UNIT", "SPECIFICATION"],
    [
      "Solar Panel Mono PERC",
      jmlPanel,
      "Pcs",
      selectedPanel?.tipe_wp || "Tier-1 Mono PERC",
    ],
    [
      selectedInverter?.merk_tipe || "Smart Hybrid Inverter",
      1,
      "Unit",
      "Pure Sine Wave / MPPT High Voltage",
    ],
    [
      `${selectedBattery?.brand || "LiFePO4"} ${selectedBattery?.model || ""}`,
      totalPacks,
      "Unit",
      `Deep Cycle LiFePO4 ${selectedBattery?.voltage || 48}V / ${selectedBattery?.capacity_ah || 100}Ah`,
    ],
  ];

  if (mountingType === "aluminum") {
    bomData.push(
      [
        "Aluminium Mounting Rails",
        Math.ceil(jmlPanel / 2),
        "Batang",
        "AL6005-T5 Anodized (Standar Industrial)",
      ],
      ["Module Clamps Kit", jmlPanel * 2 + 4, "Pcs", "End & Mid Clamps Set"],
      [
        "Roof Attachment (L-Feet)",
        Math.ceil(jmlPanel * 1.5),
        "Pcs",
        "Stainless Steel Bolt + EPDM Rubber",
      ]
    );
  } else {
    bomData.push(
      [
        "Besi Siku L40 x 40",
        Math.ceil(jmlPanel * 1.2),
        "Batang",
        "Custom Fabricated (Hot Dip Galvanized)",
      ],
      ["Baut & Dynabolt Set", jmlPanel * 6, "Pcs", "High Tensile Bolt M10/M12 Set"]
    );
  }

  bomData.push(
    ["Earthing & Grounding Kit", 1, "Lot", "Grounding Rod, Lug & Bonding Clips"],
    ["MC4 Connector Pair IP68", jmlPanel * 2 + 2, "Pair", "1500V DC Rated Multi-Contact"],
    ["PV Cable Management Kit", jmlPanel * 2, "Pcs", "Stainless Steel UV Clips & Ties"],
    [
      `Solar PV Cable ${pvCableSize}mm²`,
      Math.ceil(totalKabelPV),
      "Meter",
      "XLPO Double Insulated / Halogen Free",
    ],
    [
      "Pipa Conduit Rigid 20mm",
      estimasiPipaConduit,
      "Batang",
      "High Impact PVC - Clips & Socks Incl.",
    ],
    [],
    ["TECHNICAL SUMMARY"],
    ["Total System Weight", `${totalWeight} kg`],
    ["Roof Load Pressure", `${loadPerSqm} kg/m²`],
    ["PV Protection Fuse", `${results.pvFuseSize} A`],
    ["Battery Protection Fuse", `${results.batteryFuseSize} A`],
    ["Battery Cable Spec", `${results.batteryCableSize} mm²`]
  );

  return bomData;
}
