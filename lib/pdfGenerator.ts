import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SolarCalcInputs, SolarCalcResults, formatRupiah } from "./solarCalculator";

export interface PDFExportOptions {
  clientName?: string;
  projectName?: string;
  projectLocation?: string;
  preparedBy?: string;
}

/**
 * Generator PDF Proposal & Quotation Resmi PLTS
 */
export function generateSolarPDFProposal(
  inputs: SolarCalcInputs,
  results: SolarCalcResults,
  options: PDFExportOptions = {}
) {
  const {
    clientName = "Bapak/Ibu Klien",
    projectName = `Sistem PLTS Mandiri ${inputs.dayaVA} VA`,
    projectLocation = "Banjarmasin, Kalimantan Selatan",
    preparedBy = "Solar Engineering Team",
  } = options;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const today = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const quotationNo = `QT/PLTS/${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}/${Math.floor(1000 + Math.random() * 9000)}`;

  // =========================================================================
  // 1. HEADER & KOP DOKUMEN RESMI
  // =========================================================================
  // Top Accent Bar
  doc.setFillColor(16, 185, 129); // Emerald 500
  doc.rect(0, 0, pageWidth, 6, "F");

  // Company / Document Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text("SOLAR CALC PRO INDONESIA", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text("Clean Energy & Photovoltaic Engineering Solution", 14, 23);
  doc.text("Email: project@solarcalc.id | Web: www.solarcalc.id", 14, 27);

  // Quotation Info (Right aligned)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(16, 185, 129);
  doc.text("OFFICIAL QUOTATION", pageWidth - 14, 18, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`No. Ref : ${quotationNo}`, pageWidth - 14, 23, { align: "right" });
  doc.text(`Tanggal  : ${today}`, pageWidth - 14, 27, { align: "right" });

  // Divider Line
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.5);
  doc.line(14, 31, pageWidth - 14, 31);

  // =========================================================================
  // 2. PROJECT & CLIENT INFO BOX
  // =========================================================================
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.roundedRect(14, 34, pageWidth - 28, 20, 2, 2, "F");
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 34, pageWidth - 28, 20, 2, 2, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("DITUJUKAN KEPADA :", 18, 39);
  doc.text("PROYEK SPESIFIKASI :", pageWidth / 2 + 5, 39);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(clientName, 18, 44);
  doc.text(projectName, pageWidth / 2 + 5, 44);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Lokasi: ${projectLocation}`, 18, 49);
  doc.text(`Kapasitas: ${inputs.dayaVA} VA | Target: ${results.displayTargetKwh.toFixed(1)} kWh/hari`, pageWidth / 2 + 5, 49);

  // =========================================================================
  // 3. EXECUTIVE SUMMARY & FINANCIAL PROJECTION
  // =========================================================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("1. EXECUTIVE SUMMARY & ANALISIS FINANSIAL (ROI)", 14, 60);

  // 4 Metric Summary Boxes
  const boxWidth = (pageWidth - 28 - 9) / 4;
  const startY = 64;

  // Box 1: Total Investasi (Capex)
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, startY, boxWidth, 18, 2, 2, "F");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("ESTIMASI CAPEX", 17, startY + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(formatRupiah(results.financial.totalInvestasi), 17, startY + 11);
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Hardware + BoM + Jasa", 17, startY + 15);

  // Box 2: Hemat per Bulan
  doc.setFillColor(236, 253, 245); // Emerald 50
  doc.roundedRect(14 + boxWidth + 3, startY, boxWidth, 18, 2, 2, "F");
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105);
  doc.text("HEMAT / BULAN", 17 + boxWidth + 3, startY + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(4, 120, 87);
  doc.text(formatRupiah(results.financial.penghematanBulanRp), 17 + boxWidth + 3, startY + 11);
  doc.setFontSize(7);
  doc.text(`${formatRupiah(results.financial.penghematanTahunRp)}/thn`, 17 + boxWidth + 3, startY + 15);

  // Box 3: Payback Period
  doc.setFillColor(239, 246, 255); // Blue 50
  doc.roundedRect(14 + (boxWidth + 3) * 2, startY, boxWidth, 18, 2, 2, "F");
  doc.setFontSize(7.5);
  doc.setTextColor(37, 99, 235);
  doc.text("PAYBACK PERIOD", 17 + (boxWidth + 3) * 2, startY + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(29, 78, 216);
  doc.text(`${results.financial.paybackYears} Tahun`, 17 + (boxWidth + 3) * 2, startY + 11);
  doc.setFontSize(7);
  doc.text(`ROI 25 Thn: +${results.financial.roiPercent25Years}%`, 17 + (boxWidth + 3) * 2, startY + 15);

  // Box 4: Reduksi CO2
  doc.setFillColor(240, 253, 250); // Teal 50
  doc.roundedRect(14 + (boxWidth + 3) * 3, startY, boxWidth, 18, 2, 2, "F");
  doc.setFontSize(7.5);
  doc.setTextColor(13, 148, 136);
  doc.text("REDUKSI CO2 (25 THN)", 17 + (boxWidth + 3) * 3, startY + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 118, 110);
  doc.text(`${results.green.co2SavedTon25Years} Ton`, 17 + (boxWidth + 3) * 3, startY + 11);
  doc.setFontSize(7);
  doc.text(`Ekuivalen ${results.green.treesEquivalent} Pohon/thn`, 17 + (boxWidth + 3) * 3, startY + 15);

  // =========================================================================
  // 4. SPESIFIKASI TEKNIS & INFRASTRUKTUR SISTEM
  // =========================================================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("2. SPESIFIKASI TEKNIS & PROTEKSI KELISTRIKAN", 14, 89);

  autoTable(doc, {
    startY: 92,
    head: [["Parameter Teknis", "Keterangan / Spesifikasi Terpasang", "Parameter Proteksi", "Standar Keamanan"]],
    body: [
      [
        "Total PV Array",
        `${results.jmlPanel} Pcs (${inputs.selectedPanel?.tipe_wp || "550 Wp"})`,
        "Kabel PV Solar",
        `${results.pvCableSize} mm² XLPO (Min KHA ${results.pvDesignAmpere.toFixed(1)}A)`,
      ],
      [
        "Konfigurasi String",
        `${results.finalS} Seri / ${results.finalP} Paralel (Voc: ${results.stringVoc.toFixed(1)}V, Isc: ${results.arrayIsc.toFixed(1)}A)`,
        "PV Fuse / DC Breaker",
        `${results.pvFuseSize} A DC 1000V/1500V`,
      ],
      [
        "Inverter Rekomendasi",
        `${inputs.selectedInverter?.merk_tipe || "Smart Hybrid Inverter"}`,
        "Kabel Baterai DC",
        `${results.batteryCableSize} mm² (Min KHA ${results.batteryDesignAmpere.toFixed(1)}A)`,
      ],
      [
        "Battery Storage",
        `${results.totalPacks} Unit (${inputs.selectedBattery?.brand || "LiFePO4"} ${inputs.selectedBattery?.capacity_ah || 100}Ah)`,
        "Battery Fuse / Breaker",
        `${results.batteryFuseSize} A DC Heavy Duty`,
      ],
      [
        "Material Mounting",
        `${results.currentMounting.name}`,
        "Beban Atap (Roof Load)",
        `${results.loadPerSqm} kg/m² (Luas Area: ${results.totalAreaNeeded} m²)`,
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      overflow: "linebreak",
      lineWidth: 0.1,
      lineColor: [226, 232, 240],
    },
    margin: { left: 14, right: 14 },
  });

interface AutoTableDoc extends jsPDF {
  lastAutoTable?: { finalY: number };
}

  // =========================================================================
  // 5. BILL OF MATERIALS (BOM) & ESTIMASI BIAYA
  // =========================================================================
  const lastY = ((doc as AutoTableDoc).lastAutoTable?.finalY ?? 135) + 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("3. RINCIAN BIAYA & BILL OF MATERIALS (BOM)", 14, lastY);

  const bomRows = [
    [
      "1",
      "Solar Panel Monocrystalline Tier-1",
      `${results.jmlPanel} Pcs`,
      inputs.selectedPanel?.tipe_wp || "550 Wp Mono PERC",
      formatRupiah(inputs.selectedPanel?.price_estimate || 1850000),
      formatRupiah(results.financial.biayaPanel),
    ],
    [
      "2",
      "Smart Hybrid Solar Inverter",
      "1 Set",
      inputs.selectedInverter?.merk_tipe || "Inverter 3.5kW - 5kW",
      formatRupiah(results.financial.biayaInverter),
      formatRupiah(results.financial.biayaInverter),
    ],
    [
      "3",
      "Deep Cycle LiFePO4 Battery Pack",
      `${results.totalPacks} Unit`,
      `${inputs.selectedBattery?.brand || "LiFePO4"} 48V ${inputs.selectedBattery?.capacity_ah || 100}Ah`,
      formatRupiah(inputs.selectedBattery?.price_estimate || 16500000),
      formatRupiah(results.financial.biayaBaterai),
    ],
    [
      "4",
      `Struktur Mounting (${results.currentMounting.name})`,
      `${Math.ceil(results.jmlPanel / 2)} Batang`,
      "Module Clamps + L-Feet + Stainless Bolt Set",
      formatRupiah(results.currentMounting.pricePerUnit),
      formatRupiah(Math.ceil(results.jmlPanel / 2) * results.currentMounting.pricePerUnit + results.jmlPanel * 50000),
    ],
    [
      "5",
      `Solar PV Cable ${results.pvCableSize}mm² & Conduit 20mm`,
      `${Math.ceil(results.totalKabelPV)} Meter`,
      "XLPO Double Insulated + Pipa Conduit Clips",
      "Rp 22.000",
      formatRupiah(Math.ceil(results.totalKabelPV) * 22000 + results.estimasiPipaConduit * 38000),
    ],
    [
      "6",
      "Electrical Protection & Combiner Kit",
      "1 Lot",
      `DC Breaker, Fuse PV (${results.pvFuseSize}A), Fuse Bat (${results.batteryFuseSize}A), Arrester, Grounding`,
      "Rp 2.500.000",
      "Rp 2.500.000",
    ],
    [
      "7",
      "Jasa Instalasi, Testing & Commissioning",
      "1 Lot",
      "Pemasangan Standar Industrial + Garansi 1 Tahun",
      formatRupiah(results.financial.biayaJasaInstalasi),
      formatRupiah(results.financial.biayaJasaInstalasi),
    ],
  ];

  autoTable(doc, {
    startY: lastY + 3,
    head: [["No", "Deskripsi Komponen", "Qty", "Spesifikasi", "Harga Satuan", "Total (IDR)"]],
    body: bomRows,
    foot: [
      ["", "TOTAL ESTIMASI INVESTASI (CAPEX)", "", "", "", formatRupiah(results.financial.totalInvestasi)],
    ],
    theme: "striped",
    headStyles: {
      fillColor: [16, 185, 129], // Emerald 500
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    footStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 50 },
      2: { cellWidth: 16, halign: "center" },
      3: { cellWidth: 48 },
      4: { cellWidth: 28, halign: "right" },
      5: { cellWidth: 32, halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  // =========================================================================
  // 6. SYARAT, GARANSI & TANDA TANGAN
  // =========================================================================
  const finalY = ((doc as AutoTableDoc).lastAutoTable?.finalY ?? 200) + 6;

  // Cek apakah sisa halaman cukup, jika tidak buat halaman baru
  if (finalY > 235) {
    doc.addPage();
  }

  const termsY = finalY > 235 ? 15 : finalY;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("KETENTUAN & JAMINAN GARANSI :", 14, termsY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("1. Garansi Linear Output Solar Panel: 25 Tahun dari Pabrikan (Tier-1 Standard).", 14, termsY + 4);
  doc.text("2. Garansi Inverter: 5 Tahun penggantian/perbaikan resmi.", 14, termsY + 8);
  doc.text("3. Garansi Battery LiFePO4: 5 Tahun (Siklus hidup hingga 6000 cycles).", 14, termsY + 12);
  doc.text("4. Garansi Pemasangan & Free Maintenance: 1 Tahun sejak tanggal commissioning.", 14, termsY + 16);
  doc.text("5. Penawaran ini berlaku selama 14 hari sejak tanggal diterbitkan.", 14, termsY + 20);

  // Signature Block
  const sigY = termsY + 28;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  doc.text("Disetujui Oleh (Klien),", 25, sigY);
  doc.text("Dibuat Oleh (Solar Specialist),", pageWidth - 70, sigY);

  doc.setLineWidth(0.3);
  doc.setDrawColor(148, 163, 184);
  doc.line(20, sigY + 20, 65, sigY + 20);
  doc.line(pageWidth - 75, sigY + 20, pageWidth - 25, sigY + 20);

  doc.setFont("helvetica", "bold");
  doc.text(clientName, 25, sigY + 24);
  doc.text(preparedBy, pageWidth - 70, sigY + 24);

  // Save Document
  const fileName = `Proposal_PLTS_${inputs.dayaVA}VA_${Date.now()}.pdf`;
  doc.save(fileName);
}
