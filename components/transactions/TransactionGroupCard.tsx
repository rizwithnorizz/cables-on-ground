'use client';

import { useEffect, useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit, Download } from "lucide-react";
import { TransactionTable } from "./TransactionTable";
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '../auth-context';
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
  isEditing: boolean;
  editValue: string;
  isSaving: boolean;
  isDownloading: boolean;
  onEditClick: (refNo: string | null, idx: number) => void;
  onCancel: () => void;
  onSave: (oldRefNo: string | null, idx: number) => void;
  onEditValueChange: (value: string) => void;
  onDownload: (group: TransactionGroup, idx: number) => void;
  hasDownloadableContent: boolean;
};

export function TransactionGroupCard({
  group,
  idx,
  isEditing,
  editValue,
  isSaving,
  isDownloading,
  onEditClick,
  onCancel,
  onSave,
  onEditValueChange,
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
          {isEditing ? (
            <div className="flex gap-2 mt-2">
              <Input
                value={editValue}
                onChange={(e) => onEditValueChange(e.target.value)}
                placeholder="Enter reference number"
                className="text-sm"
              />
              <Button
                onClick={() => onSave(group.ref_no, idx)}
                disabled={isSaving}
                variant="default"
                className="text-xs whitespace-nowrap"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button
                onClick={onCancel}
                disabled={isSaving}
                variant="secondary"
                className="text-xs whitespace-nowrap"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 mt-2">
              <div className="flex items-center gap-2">
                {!isAuthenticated && !isAdmin && (
                  <button
                    onClick={() => onEditClick(group.ref_no, idx)}
                    className="pr-2 hover:text-blue-400 transition"
                    title="Edit reference number"
                  >
                    <Edit size={14} />
                  </button>
                )}
                <p className="text-sm font-semibold dark:text-white">
                  {group.ref_no || <span className="text-gray-500">—</span>}
                </p>
              </div>
            </div>
          )}
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
