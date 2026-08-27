export interface CityPSH {
  id: string;
  name: string;
  region: "Kalimantan" | "Jawa" | "Sumatera" | "Bali & Nusa Tenggara" | "Sulawesi" | "Maluku & Papua" | "Custom";
  psh: number;
  description?: string;
}

export const INDONESIA_CITIES_PSH: CityPSH[] = [
  // KALIMANTAN
  { id: "banjarmasin", name: "Banjarmasin", region: "Kalimantan", psh: 4.5, description: "Kalimantan Selatan (Optimal 4.5 H)" },
  { id: "banjarbaru", name: "Banjarbaru / Martapura", region: "Kalimantan", psh: 4.5, description: "Kalimantan Selatan" },
  { id: "balikpapan", name: "Balikpapan", region: "Kalimantan", psh: 4.3, description: "Kalimantan Timur" },
  { id: "samarinda", name: "Samarinda", region: "Kalimantan", psh: 4.3, description: "Kalimantan Timur" },
  { id: "ikn", name: "Ibu Kota Nusantara (IKN)", region: "Kalimantan", psh: 4.4, description: "Penajam Paser Utara" },
  { id: "pontianak", name: "Pontianak", region: "Kalimantan", psh: 4.6, description: "Kalimantan Barat (Khatulistiwa)" },
  { id: "palangkaraya", name: "Palangka Raya", region: "Kalimantan", psh: 4.4, description: "Kalimantan Tengah" },
  { id: "tarakan", name: "Tarakan", region: "Kalimantan", psh: 4.2, description: "Kalimantan Utara" },

  // JAWA
  { id: "jakarta", name: "DKI Jakarta / Jabodetabek", region: "Jawa", psh: 4.2, description: "DKI Jakarta" },
  { id: "surabaya", name: "Surabaya", region: "Jawa", psh: 4.9, description: "Jawa Timur (Radiasi Tinggi)" },
  { id: "bandung", name: "Bandung", region: "Jawa", psh: 4.0, description: "Jawa Barat (Dataran Tinggi)" },
  { id: "semarang", name: "Semarang", region: "Jawa", psh: 4.6, description: "Jawa Tengah" },
  { id: "yogyakarta", name: "Yogyakarta / Sleman", region: "Jawa", psh: 4.7, description: "D.I. Yogyakarta" },
  { id: "malang", name: "Malang", region: "Jawa", psh: 4.7, description: "Jawa Timur" },
  { id: "solo", name: "Surakarta / Solo", region: "Jawa", psh: 4.7, description: "Jawa Tengah" },
  { id: "cirebon", name: "Cirebon", region: "Jawa", psh: 4.8, description: "Jawa Barat Pesisir" },
  { id: "banyuwangi", name: "Banyuwangi", region: "Jawa", psh: 5.0, description: "Jawa Timur Ujung Timur" },

  // SUMATERA
  { id: "medan", name: "Medan", region: "Sumatera", psh: 4.1, description: "Sumatera Utara" },
  { id: "palembang", name: "Palembang", region: "Sumatera", psh: 4.4, description: "Sumatera Selatan" },
  { id: "pekanbaru", name: "Pekanbaru", region: "Sumatera", psh: 4.3, description: "Riau" },
  { id: "padang", name: "Padang", region: "Sumatera", psh: 4.2, description: "Sumatera Barat" },
  { id: "lampung", name: "Bandar Lampung", region: "Sumatera", psh: 4.6, description: "Lampung" },
  { id: "batam", name: "Batam / Kepulauan Riau", region: "Sumatera", psh: 4.1, description: "Kepri" },
  { id: "aceh", name: "Banda Aceh", region: "Sumatera", psh: 4.4, description: "Aceh" },
  { id: "jambi", name: "Jambi", region: "Sumatera", psh: 4.2, description: "Jambi" },
  { id: "bengkulu", name: "Bengkulu", region: "Sumatera", psh: 4.3, description: "Bengkulu" },

  // BALI & NUSA TENGGARA
  { id: "denpasar", name: "Denpasar / Badung (Bali)", region: "Bali & Nusa Tenggara", psh: 5.1, description: "Bali (Sangat Tinggi)" },
  { id: "mataram", name: "Mataram / Lombok", region: "Bali & Nusa Tenggara", psh: 5.2, description: "NTB (Radiasi Sangat Tinggi)" },
  { id: "kupang", name: "Kupang", region: "Bali & Nusa Tenggara", psh: 5.4, description: "NTT (Radiasi Tertinggi di RI)" },
  { id: "labuanbajo", name: "Labuan Bajo", region: "Bali & Nusa Tenggara", psh: 5.3, description: "NTT" },
  { id: "sumbawa", name: "Sumbawa Besar", region: "Bali & Nusa Tenggara", psh: 5.3, description: "NTB" },

  // SULAWESI
  { id: "makassar", name: "Makassar", region: "Sulawesi", psh: 4.9, description: "Sulawesi Selatan (Tinggi)" },
  { id: "manado", name: "Manado", region: "Sulawesi", psh: 4.2, description: "Sulawesi Utara" },
  { id: "palu", name: "Palu", region: "Sulawesi", psh: 4.7, description: "Sulawesi Tengah" },
  { id: "kendari", name: "Kendari", region: "Sulawesi", psh: 4.8, description: "Sulawesi Tenggara" },
  { id: "gorontalo", name: "Gorontalo", region: "Sulawesi", psh: 4.6, description: "Gorontalo" },
  { id: "mamuju", name: "Mamuju", region: "Sulawesi", psh: 4.5, description: "Sulawesi Barat" },

  // MALUKU & PAPUA
  { id: "ambon", name: "Ambon", region: "Maluku & Papua", psh: 4.3, description: "Maluku" },
  { id: "ternate", name: "Ternate", region: "Maluku & Papua", psh: 4.3, description: "Maluku Utara" },
  { id: "jayapura", name: "Jayapura", region: "Maluku & Papua", psh: 4.4, description: "Papua" },
  { id: "sorong", name: "Sorong", region: "Maluku & Papua", psh: 4.2, description: "Papua Barat Daya" },
  { id: "merauke", name: "Merauke", region: "Maluku & Papua", psh: 5.0, description: "Papua Selatan" },
];
