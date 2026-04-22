"use client";

import { Edit, Download } from "lucide-react";
import { TransactionTable } from "./TransactionTable";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "../auth-context";
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

type TransactionGroup = {
  ref_no: string | null;
  transactions: Transaction[];
  totalCables: number;
  totalLength: number;
  minDate: string;
  maxDate: string;
};

type TransactionGroupCardProps = {
  group: TransactionGroup;
  idx: number;
  isDownloading: boolean;
  onDownload: (group: TransactionGroup, idx: number) => void;
  hasDownloadableContent: boolean;
};

export function TransactionGroupCard({
  group,
  idx,
  isDownloading,
  onDownload,
  hasDownloadableContent,
}: TransactionGroupCardProps) {
  const supabase = createClient();
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <div className="dark:bg-[#0b1220] border dark:border-[#1f2937] shadow-lg rounded-lg p-4">
      {/* Group Header */}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-4 mb-4">
        {/* Reference Section */}
        <div>
          <p className="text-xs dark:text-gray-500 uppercase">Reference</p>

          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold dark:text-white">
                {group.ref_no || <span className="text-gray-500">—</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Total Length */}
        <div>
          <p className="text-xs dark:text-gray-500 uppercase">Total Length</p>
          <p className="text-sm font-semibold dark:text-white mt-2">
            {group.totalLength.toFixed(2)} m
          </p>
        </div>

        {/* Date Range */}
        <div>
          <p className="text-xs dark:text-gray-500 uppercase">Date Range</p>
          <p className="text-sm font-semibold dark:text-white mt-2">
            {group.minDate === group.maxDate
              ? group.minDate
              : `${group.minDate} to ${group.maxDate}`}
          </p>
        </div>

        {/* Download Button */}
        <div className="flex items-center justify-end">
          {hasDownloadableContent && (
            <button
              onClick={() => onDownload(group, idx)}
              disabled={isDownloading}
              className="flex items-center justify-center gap-1 px-2 w-1/2 py-1 rounded text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
              title="Download all certificates as zip"
            >
              <Download size={12} />
              {isDownloading ? "Downloading..." : "Download all"}
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <TransactionTable transactions={group.transactions} />
    </div>
  );
}
