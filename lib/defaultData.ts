export interface Panel {
  id: string;
  tipe_wp: string;
  pmax: number;
  voc: number;
  isc: number;
  length_mm: number;
  width_mm: number;
  weight_kg: number;
}

export interface Inverter {
  id: string;
  merk_tipe: string;
  rated_power_va: number;
  max_voc_input: number;
  max_isc_input: number;
  system_voltage: number;
  price_estimate: number;
}

export interface Battery {
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

export interface Kabel {
  max_ampere: number;
  ukuran_mm2: number;
}

export interface Fuse {
  rating_ampere: number;
}

export const defaultPanels: Panel[] = [
  { id: "panel-450", tipe_wp: "Tier 1 Monocrystalline 450Wp", pmax: 450, voc: 49.5, isc: 11.5, length_mm: 2094, width_mm: 1038, weight_kg: 24.5 },
  { id: "panel-550", tipe_wp: "Tier 1 Monocrystalline 550Wp", pmax: 550, voc: 49.8, isc: 13.9, length_mm: 2278, width_mm: 1134, weight_kg: 28.0 },
  { id: "panel-600", tipe_wp: "Tier 1 Monocrystalline 600Wp", pmax: 600, voc: 52.0, isc: 14.5, length_mm: 2465, width_mm: 1134, weight_kg: 31.0 },
];

export const defaultInverters: Inverter[] = [
  { id: "inv-3kw", merk_tipe: "Growatt SPF 3500ES Hybrid", rated_power_va: 3500, max_voc_input: 450, max_isc_input: 18, system_voltage: 48, price_estimate: 12500000 },
  { id: "inv-5kw", merk_tipe: "Growatt SPF 5000ES Hybrid", rated_power_va: 5000, max_voc_input: 450, max_isc_input: 22, system_voltage: 48, price_estimate: 18000000 },
  { id: "inv-8kw", merk_tipe: "Deye SUN-8K-SG01LP1", rated_power_va: 8000, max_voc_input: 500, max_isc_input: 26, system_voltage: 48, price_estimate: 28000000 },
  { id: "inv-10kw", merk_tipe: "Deye SUN-10K-SG04LP3", rated_power_va: 10000, max_voc_input: 500, max_isc_input: 32, system_voltage: 48, price_estimate: 35000000 },
];

export const defaultBatteries: Battery[] = [
  { id: "bat-50ah", brand: "Pylontech", model: "US3000C 48V", type: "LiFePO4", voltage: 48, capacity_ah: 50, weight_kg: 32, max_dod: 0.8, max_discharge: 50 },
  { id: "bat-100ah", brand: "Felicity Solar", model: "LPBA48100 48V", type: "LiFePO4", voltage: 48, capacity_ah: 100, weight_kg: 55, max_dod: 0.8, max_discharge: 100 },
  { id: "bat-200ah", brand: "Felicity Solar", model: "LPBA48200 48V", type: "LiFePO4", voltage: 48, capacity_ah: 200, weight_kg: 105, max_dod: 0.8, max_discharge: 150 },
];

export const defaultKabel: Kabel[] = [
  { max_ampere: 20, ukuran_mm2: 2.5 },
  { max_ampere: 32, ukuran_mm2: 4 },
  { max_ampere: 45, ukuran_mm2: 6 },
  { max_ampere: 65, ukuran_mm2: 10 },
  { max_ampere: 85, ukuran_mm2: 16 },
  { max_ampere: 115, ukuran_mm2: 25 },
  { max_ampere: 150, ukuran_mm2: 35 },
  { max_ampere: 190, ukuran_mm2: 50 },
  { max_ampere: 240, ukuran_mm2: 70 },
];

export const defaultFuse: Fuse[] = [
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
];
