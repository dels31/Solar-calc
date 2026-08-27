import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { inputs, results, isPro } = body;

    if (!isPro) {
      return NextResponse.json(
        { error: "Fitur AI Solar Advisor Gemini hanya dapat diakses oleh Pro Member." },
        { status: 403 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY belum dikonfigurasi di server." },
        { status: 500 }
      );
    }

    const {
      dayaVA = 2200,
      psh = 4.5,
      jamOp = 24,
      selectedPanel,
      selectedInverter,
      selectedBattery,
      mountingType = "aluminum",
      tarifPLN = 1444.7,
    } = inputs || {};

    const {
      jmlPanel = 0,
      totalPacks = 0,
      loadPerSqm = "12",
      stringVoc = 0,
      isVocSafe = true,
      pvCableSize = 6,
      batteryCableSize = 35,
      pvFuseSize = 25,
      batteryFuseSize = 125,
      financial,
    } = results || {};

    const prompt = `Anda adalah "7 Layers AI Solar Engine Advisor", seorang Principal Solar PV & Energy Storage Engineer profesional.

Berikan analisis kelayakan teknis mendalam dan rekomendasi optimasi untuk rancangan sistem PLTS berikut:

DATA SISTEM PLTS:
- Daya Beban: ${dayaVA} VA (${dayaVA * 0.8} Watt)
- Jam Operasi Beban: ${jamOp} Jam/hari
- Insolasi Matahari (PSH): ${psh} Jam Puncak/hari
- Tarif PLN: Rp ${Number(tarifPLN).toLocaleString("id-ID")}/kWh
- Panel Surya: ${selectedPanel?.brand || "Tier-1"} ${selectedPanel?.model || ""} (${selectedPanel?.pmax || 550} Wp, Voc: ${selectedPanel?.voc || 49.8}V)
- Total Panel: ${jmlPanel} Unit (${jmlPanel * (selectedPanel?.pmax || 550)} Wp)
- Inverter: ${selectedInverter?.merk_tipe || "Smart Inverter"} (${selectedInverter?.rated_power_va || 5000} VA, Max Voc: ${selectedInverter?.max_voc_input || 450}V, System: ${selectedInverter?.system_voltage || 48}V)
- Konfigurasi String: ${results?.finalS || 1} Seri x ${results?.finalP || 1} Paralel (Tegangan String Voc: ${Number(stringVoc).toFixed(1)}V - Status: ${isVocSafe ? "AMAN" : "BAHAYA OVERVOLTAGE"})
- Baterai: ${selectedBattery?.brand || "LiFePO4"} ${selectedBattery?.model || ""} (${selectedBattery?.capacity_ah || 100}Ah, ${selectedBattery?.voltage || 48}V)
- Total Pack Baterai: ${totalPacks} Unit
- Beban Atap: ${loadPerSqm} kg/m² (Mounting: ${mountingType === "aluminum" ? "Aluminium AL6005-T5" : "Besi Siku Galvanis"})
- Kabel & Proteksi: Kabel PV ${pvCableSize} mm² (Fuse ${pvFuseSize}A), Kabel Baterai ${batteryCableSize} mm² (Fuse ${batteryFuseSize}A)
- Total Est. Investasi: Rp ${Number(financial?.totalInvestasi || 0).toLocaleString("id-ID")}
- Estimasi Payback: ${financial?.paybackYears || 0} Tahun (ROI 25 Tahun: +${financial?.roiPercent25Years || 0}%)

Instruksi Output:
Kembalikan respon HANYA dalam format JSON valid (tanpa markdown backticks) dengan format:
{
  "aiScore": 96,
  "summary": "Ringkasan eksekutif profesional mengenai sistem ini",
  "powerAutonomy": "Analisis daya, estimasi jam cadangan baterai malam hari, dan keseimbangan produksi",
  "structuralInsight": "Analisis keselamatan beban atap dan rekomendasi material mounting",
  "electricalCompliance": "Evaluasi koordinasi Voc, KHA kabel, dan proteksi DC Breaker/SPD sesuai PUIL",
  "financialProjection": "Evaluasi pengembalian modal dan keuntungan jangka panjang",
  "actionableTips": [
    "Poin rekomendasi 1 untuk teknisi lapangan",
    "Poin rekomendasi 2 untuk teknisi lapangan",
    "Poin rekomendasi 3 untuk teknisi lapangan",
    "Poin rekomendasi 4 untuk teknisi lapangan"
  ]
}`;

    // Try Gemini 2.5 Flash first, then 1.5 Flash
    const models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
    let rawText = "";

    for (const model of models) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 1024,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (rawText) break;
        }
      } catch (err) {
        console.warn(`Attempt with ${model} failed:`, err);
      }
    }

    if (!rawText) {
      throw new Error("Gagal mendapatkan respon dari Google Gemini.");
    }

    // Parse JSON safely
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    return NextResponse.json({
      success: true,
      model: "Google Gemini AI",
      data: parsed,
    });
  } catch (error) {
    console.error("AI Advisor API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Terjadi kesalahan saat memproses AI.",
      },
      { status: 500 }
    );
  }
}
