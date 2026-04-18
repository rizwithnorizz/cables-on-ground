'use client';

import { Button } from '@/components/ui/button';

// eslint-disable-next-line @typescript-eslint/no-require
const ExcelJS = require('exceljs');

type DrumCable = {
  id: bigint;
  drum_id: string;
  brand: number | string;
  type: number | string;
  size: string;
  reserved: boolean;
  curr_length: number;
  initial_length: number;
  testcertificate?: string | null;
};

type CableType = {
  id: number;
  type_name: string;
};

type CableBrand = {
  id: number;
  brand_name: string;
};

type ExcelExportProps = {
  cables: DrumCable[];
  types: CableType[];
  brands: CableBrand[];
  brandMap: Record<string, string>;
  typeMap: Record<string, string>;
};

export function ExcelExport({ cables, types, brands, brandMap, typeMap }: ExcelExportProps) {
  const downloadExcelFile = async () => {
    const workbook = new ExcelJS.Workbook();

    // Get all unique sizes sorted numerically
    const uniqueSizes = Array.from(new Set(cables.map(c => c.size))).sort((a, b) => {
      const [aPrefix, aPostfix] = a.split('x').map(Number);
      const [bPrefix, bPostfix] = b.split('x').map(Number);
      return aPrefix !== bPrefix ? aPrefix - bPrefix : aPostfix - bPostfix;
    });

    // Sort cables by brand, type, and size
    const sortedCables = [...cables].sort((a, b) => {
      const brandCompare = String(a.brand).localeCompare(String(b.brand));
      if (brandCompare !== 0) return brandCompare;
      
      const typeCompare = String(a.type).localeCompare(String(b.type));
      if (typeCompare !== 0) return typeCompare;
      
      const [aPrefix, aPostfix] = a.size.split('x').map(Number);
      const [bPrefix, bPostfix] = b.size.split('x').map(Number);
      return aPrefix !== bPrefix ? aPrefix - bPrefix : aPostfix - bPostfix;
    });

    const rawSheet = workbook.addWorksheet('All Data');
    rawSheet.columns = [
      { header: 'Drum ID', key: 'drum_id', width: 15 },
      { header: 'Brand', key: 'brand', width: 20 },
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Size', key: 'size', width: 15 },
      { header: 'Available Length (m)', key: 'curr_length', width: 18 },
      { header: 'Reserved', key: 'reserved', width: 12 }
    ];

    const rawHeaderRow = rawSheet.getRow(1);
    rawHeaderRow.font = { bold: true };
    rawHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC0C0C0' } };

    sortedCables.forEach(cable => {
      rawSheet.addRow({
        drum_id: cable.drum_id,
        brand: brandMap[String(cable.brand)] || 'Unknown',
        type: typeMap[String(cable.type)] || 'Unknown',
        size: cable.size,
        curr_length: cable.curr_length,
        initial_length: cable.initial_length,
        reserved: cable.reserved ? 'Yes' : 'No'
      });
    });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cables-inventory-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Button onClick={downloadExcelFile} className="bg-green-400 text-white hover:bg-emerald-700">
      Download Excel
    </Button>
  );
}
