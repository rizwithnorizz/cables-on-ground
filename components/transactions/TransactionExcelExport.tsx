'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import ExcelJS from 'exceljs';
import type { Workbook, Worksheet, Row, Cell, Borders } from 'exceljs';

type DrumInfo = {
  id: number;
  drum_id: string;
  size: string;
  type: { type_name: string };
  brand: { brand_name: string };
  testcertificate?: string | null;
};

type Transaction = {
  id: string;
  created_at: string;
  drum_id: DrumInfo;
  length_cut: number;
  balance_cable: number;
  ref_no: string | null;
};

type TransactionExcelExportProps = {
  transactions: Transaction[];
};

type TransactionRow = {
  ref_no: string;
  drum_id: string;
  brand: string;
  type: string;
  size: string;
  original_length: number;
  length_cut: number;
  balance: number;
  date: string;
};

const BORDER_STYLE: Partial<Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' }
};

const HEADER_COLOR = 'FF366092';
const ALTERNATE_ROW_COLOR = 'FFF0F0F0';
const FILE_NAME_PREFIX = 'transactions';

export function TransactionExcelExport({ transactions }: TransactionExcelExportProps) {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const createTransactionRow = (transaction: Transaction): TransactionRow => {
    const originalLength = transaction.balance_cable + transaction.length_cut;
    return {
      ref_no: transaction.ref_no || '—',
      drum_id: transaction.drum_id.drum_id || 'N/A',
      brand: transaction.drum_id.brand.brand_name,
      type: transaction.drum_id.type.type_name,
      size: transaction.drum_id.size,
      original_length: originalLength,
      length_cut: transaction.length_cut,
      balance: transaction.balance_cable,
      date: formatDate(transaction.created_at)
    };
  };

  const applyHeaderFormatting = (worksheet: Worksheet): void => {
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_COLOR } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    headerRow.eachCell((cell: Cell) => {
      cell.border = BORDER_STYLE;
    });
  };

  const applyDataRowFormatting = (worksheet: Worksheet): void => {
    worksheet.eachRow((row: Row, rowNumber: number) => {
      if (rowNumber > 1) {
        row.alignment = { horizontal: 'left', vertical: 'middle' };

        // Alternate row colors for better readability
        if (rowNumber % 2 === 0) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ALTERNATE_ROW_COLOR } };
        }

        // Add borders to all cells
        row.eachCell((cell: Cell) => {
          cell.border = BORDER_STYLE;
        });
      }
    });
  };

  const generateFileName = (): string => {
    const today = new Date().toISOString().split('T')[0] ?? new Date().toLocaleDateString('en-CA');
    return `${FILE_NAME_PREFIX}-${today}.xlsx`;
  };

  const downloadFile = (blob: Blob, fileName: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadExcelFile = async (): Promise<void> => {
    try {
      const workbook: Workbook = new ExcelJS.Workbook();
      const worksheet: Worksheet = workbook.addWorksheet('Transactions');

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

      // Apply header formatting
      applyHeaderFormatting(worksheet);

      // Add data rows
      transactions.forEach((transaction: Transaction) => {
        const row = createTransactionRow(transaction);
        worksheet.addRow(row);
      });

      // Apply data row formatting
      applyDataRowFormatting(worksheet);

      // Generate and download
      const buffer = await workbook.xlsx.writeBuffer();
      if (!Buffer.isBuffer(buffer)) {
        throw new Error('Failed to generate Excel file buffer');
      }

      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const fileName = generateFileName();
      downloadFile(blob, fileName);
    } catch (error) {
      console.error('Error downloading Excel file:', error);
      // Optionally, you can add toast notification here for user feedback
    }
  };

  return (
    <Button onClick={downloadExcelFile} className="bg-green-600 text-white hover:bg-green-700">
      <Download className="w-4 h-4 text-center" />
    </Button>
  );
}
