'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-require
const ExcelJS = require('exceljs');

type Transaction = {
  id: string;
  created_at: string;
  drum_id: {
    id: number;
    drum_id: string;
    size: string;
    type: { type_name: string };
    brand: { brand_name: string };
    testcertificate?: string | null;
  };
  length_cut: number;
  balance_cable: number;
  ref_no: string | null;
};

type TransactionExcelExportProps = {
  transactions: Transaction[];
};

export function TransactionExcelExport({ transactions }: TransactionExcelExportProps) {
  const downloadExcelFile = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transactions');

    // Define columns
    worksheet.columns = [
      { header: 'Reference', key: 'ref_no', width: 20 },
      { header: 'Drum ID', key: 'drum_id', width: 25 },
      { header: 'Brand', key: 'brand', width: 20 },
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Size', key: 'size', width: 15 },
      { header: 'Original Length (m)', key: 'original_length', width: 22 },
      { header: 'Length Cut (m)', key: 'length_cut', width: 18 },
      { header: 'Balance (m)', key: 'balance', width: 18 },
      { header: 'Date', key: 'date', width: 28 }
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Add data rows
    transactions.forEach((tx) => {
      const originalLength = tx.balance_cable + tx.length_cut;
      
      worksheet.addRow({
        ref_no: tx.ref_no || '—',
        drum_id: tx.drum_id.drum_id || 'N/A',
        brand: tx.drum_id.brand.brand_name,
        type: tx.drum_id.type.type_name,
        size: tx.drum_id.size,
        original_length: originalLength,
        length_cut: tx.length_cut,
        balance: tx.balance_cable,
        date: new Date(tx.created_at).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      });
    });

    // Format data rows
    worksheet.eachRow((row: any, rowNumber: number) => {
      if (rowNumber > 1) {
        row.alignment = { horizontal: 'left', vertical: 'middle' };
        
        // Alternate row colors for better readability
        if (rowNumber % 2 === 0) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
        }

        // Add borders
        row.eachCell((cell: any) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      }
    });

    // Add borders to header
    headerRow.eachCell((cell: any) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Button onClick={downloadExcelFile} className="bg-green-600 text-white hover:bg-green-700">
      <Download className="w-4 h-4 text-center " />
    </Button>
  );
}
