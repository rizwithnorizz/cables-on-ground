"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useEffect, useState } from "react";
type CutItem = {
  id: string;
  size: string;
  type: number;
  brand: number;
  drum_id: string;
  available: number;
  cutLength: string;
  refNo?: string;
  cut_version: number;
  reservationId?: string;
};

type CableBrand = { id: number; brand_name: string };
type CableType = { id: number; type_name: string };

interface PrintOrderProps {
  items: CutItem[];
  transactionRef: string;
  selectedLaborer: { id: number; name: string; mobile_no: string } | null;
  brands: CableBrand[];
  types: CableType[];
}

export function PrintOrder({
  items,
  transactionRef,
  selectedLaborer,
  brands,
  types,
}: PrintOrderProps) {
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
  }, []);

  const getBrandName = (brandId: number) => {
    return brands.find((b) => b.id === brandId)?.brand_name || `Brand ${brandId}`;
  };

  const getTypeName = (typeId: number) => {
    return types.find((t) => t.id === typeId)?.type_name || `Type ${typeId}`;
  };

  const generateHTML = () => {
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const tableRows = items
      .map((item) => {
        const balance = Number(item.available) - Number(item.cutLength);
        const cutLength = Math.floor(Number(item.cutLength));
        const currentLength = Math.floor(Number(item.available));
        const balanceLength = Math.floor(balance);

        return `
          <div class="item-row">
            <div class="item-code">${item.drum_id || "BALANCE CABLE"}</div>
            <div class="item-header">
              <div class="item-details">
                ${getBrandName(item.brand)} | <b>${getTypeName(item.type)} | ${item.size}</b>
              </div>
              <div class="current-length">${currentLength}m</div>
            </div>
            <div class="item-amounts">
              <div class="amount-row cut">
                <span>CUT:</span>
                <span>${cutLength}m</span>
              </div>
              <div class="amount-row balance">
                <span>Balance:</span>
                <span>${balanceLength}m</span>
              </div>
            </div>
          </div>
          <div class="divider"></div>
        `;
      })
      .join("");

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Cutting Order Receipt</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              color: #000;
              background: white;
              line-height: 1.4;
            }
            .receipt-container {
              width: 80mm;
              margin: 0 auto;
              padding: 0;
            }
            .header {
              text-align: center;
              margin-bottom: 10px;
              padding: 0 5mm;
            }
            .title {
              font-weight: bold;
              font-size: 14px;
              margin-bottom: 3px;
            }
            .subtitle {
              font-size: 10px;
              margin-bottom: 2px;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 5px 0;
            }
            .section {
              padding: 0 3mm;
              margin-bottom: 3px;
            }
            .info-line {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              margin-bottom: 2px;
            }
            .info-label {
              font-weight: bold;
            }
            .item {
              padding: 0 3mm;
              font-size: 11px;
              margin-bottom: 8px;
            }
            .item-code {
              font-weight: bold;
              margin-bottom: 2px;
              font-size: 12px;
            }
            .item-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 3px;
            }
            .item-details {
              font-size: 10px;
              color: #333;
              flex: 1;
            }
            .current-length {
              font-size: 16px;
              font-weight: bold;
              margin-left: 5px;
              white-space: nowrap;
            }
            .item-amounts {
              border-left: 1px solid #000;
              padding-left: 5px;
              margin-left: 5px;
            }
            .amount-row {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              margin-bottom: 1px;
            }
            .amount-row.cut {
              font-weight: bold;
              font-size: 13px;
              padding: 3px 4px;
              margin: 2px -4px;
              margin-top: 2px;
            }
            .amount-row.balance {
              font-weight: bold;
              border-top: 1px solid #000;
              padding-top: 2px;
              margin-top: 2px;
            }
            .footer {
              text-align: center;
              padding: 10px 3mm;
              font-size: 11px;
              font-weight: bold;
            }
            .item-row {
              padding: 0 3mm;
              margin-bottom: 0;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
                width: 80mm;
              }
              .receipt-container {
                width: 80mm;
                margin: 0;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <div class="title">CUTTING REQUEST</div>
              <div class="subtitle">Cables on Ground</div>
            </div>

            <div class="divider"></div>

            <div class="section">
              <div class="info-line">
                <span class="info-label">Date:</span>
                <span>${currentDate}</span>
              </div>
              <div class="info-line">
                <span class="info-label">Ref:</span>
                <span>${transactionRef || 'N/A'}</span>
              </div>
              ${
                selectedLaborer
                  ? `<div class="info-line">
                       <span class="info-label">Laborer:</span>
                       <span>${selectedLaborer.name}</span>
                     </div>`
                  : ''
              }
            </div>

            <div class="divider"></div>

            <div class="section">
              <div style="font-weight: bold; margin-bottom: 5px; text-align: center;">ITEMS</div>
            </div>

            ${tableRows}

            <div class="divider"></div>

            <div class="footer">
              THANK YOU
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(generateHTML());
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handlePreview = () => {
    const previewWindow = window.open("", "_blank");
    if (previewWindow) {
      previewWindow.document.write(generateHTML());
      previewWindow.document.close();
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex gap-2">
        <Button disabled variant="outline" size="sm" className="flex-1 gap-2">
          <Printer className="h-4 w-4" />
          Preview
        </Button>
        <Button disabled variant="outline" size="sm" className="flex-1 gap-2">
          <Printer className="h-4 w-4" />
          Print Order
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button onClick={handlePreview} variant="outline" size="sm" className="flex-1 gap-2">
        <Printer className="h-4 w-4" />
        Preview
      </Button>
      <Button onClick={handlePrint} variant="outline" size="sm" className="flex-1 gap-2">
        <Printer className="h-4 w-4" />
        Print Order
      </Button>
    </div>
  );
}
