"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

type TransactionItem = {
  drum_id: string;
  size: string;
  type_name: string;
  brand_name: string;
  brand_id: number;
  length_cut: number;
  balance_cable: number;
};

interface PrintTransactionsProps {
  items: TransactionItem[];
  transactionRef: string;
  autoprint?: boolean;
  onAutoprintComplete?: () => void;
}

export function PrintTransactions({
  items,
  transactionRef,
  autoprint = false,
  onAutoprintComplete,
}: PrintTransactionsProps) {
  const printedRef = useRef(false);
  const generateHTML = () => {
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const brandsMap = {
      1: "DOH",
      3: "NEX",
    };

    const getBrandName = (brandId: number) => {
      return brandsMap[brandId as keyof typeof brandsMap] || `Brand ${brandId}`;
    };
    
    const tableRows = items
      .map((item) => {
        const available = item.balance_cable + item.length_cut;
        const balance = available - item.length_cut;
        const cutLength = Math.floor(item.length_cut);
        const currentLength = Math.floor(available);
        const balanceLength = Math.floor(balance);

        return `
          <div class="item-row">
            <div class="item-details">
              <b>${getBrandName(item.brand_id)} - ${item.type_name} - ${item.size}</b>
            </div>
            <div class="item-header">
            <div class="item-code">${item.drum_id || "BALANCE CABLE"}</div>
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
          <title>Reprint Order</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 15px;
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
              font-size: 18px;
              margin-bottom: 3px;
            }
            .subtitle {
              font-size: 15px;
              font-style: italic;
              font-weight: bold;
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
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 2px;
            }
            .info-label {
              font-weight: bold;
            }
            .item {
              padding: 0 3mm;
              font-size: 14px;
              margin-bottom: 8px;
            }
            .item-code {
              font-weight: bold;
              margin-bottom: 2px;
              font-size: 15px;
            }
            .item-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 3px;
            }
            .item-details {
              font-size: 17px;
              flex: 1;
            }
            .current-length {
              font-size: 19px;
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
              font-size: 14px;
              margin-bottom: 1px;
            }
            .amount-row.cut {
              font-weight: bold;
              font-size: 16px;
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
              font-size: 14px;
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
              <div class="title">REPRINT ORDER</div>
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
                <span>${transactionRef || "N/A"}</span>
              </div>
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
    const html = generateHTML();
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();
      
      iframe.contentWindow?.print();
      
      // Remove iframe after print dialog closes
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 500);
    }
  };    
  useEffect(() => {
    if (autoprint && items.length > 0 && !printedRef.current) {
      printedRef.current = true;
      setTimeout(() => {
        handlePrint();
        onAutoprintComplete?.();
      }, 500);
    }
  }, [autoprint, onAutoprintComplete, items]);

  useEffect(() => {
    if (!autoprint) {
      printedRef.current = false;
    }
  }, [autoprint]);

  return (
    <>
    </>
  );
}
