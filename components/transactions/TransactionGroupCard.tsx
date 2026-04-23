"use client";

import { Edit, Download, Trash2 } from "lucide-react";
import { TransactionTable } from "./TransactionTable";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "../auth-context";
import { toast } from "react-hot-toast";
import { useState } from "react";
import { ConfirmationModal } from "@/components/confirmation-modal";
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
  const [isReversing, setIsReversing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleReverseTransactions = async () => {
    if (!isAdmin || !isAuthenticated) {
      toast.error("Only admins can reverse transactions");
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmReverseTransactions = async () => {
    setShowConfirmModal(false);
    setIsReversing(true);
    try {
      for (const transaction of group.transactions) {
        // Get current drum data
        const { data: drum, error: drumError } = await supabase
          .from("drum_cables")
          .select("curr_length")
          .eq("id", transaction.drum_id.id)
          .single();

        if (drumError) throw drumError;

        // Add back the cut length
        const newAvailable = (drum?.curr_length || 0) + transaction.length_cut;

        const { error: updateError } = await supabase
          .from("drum_cables")
          .update({ curr_length: newAvailable })
          .eq("id", transaction.drum_id.id);

        if (updateError) throw updateError;
      }

      // Delete all transactions in this group
      const { error: deleteError } = await supabase
        .from("cable_transactions")
        .delete()
        .in(
          "id",
          group.transactions.map((t) => t.id)
        );

      if (deleteError) throw deleteError;

      toast.success(
        `Reversed ${group.transactions.length} transaction(s) successfully`
      );

      // Refresh the page to see updated data
      window.location.reload();
    } catch (error) {
      console.error("Error reversing transactions:", error);
      toast.error("Failed to reverse transactions. Please try again.");
    } finally {
      setIsReversing(false);
    }
  };

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
        <div className="flex items-center justify-end gap-2">
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
          {isAdmin && (
            <button
              onClick={handleReverseTransactions}
              disabled={isReversing}
              className="flex items-center justify-center gap-1 px-2 py-1 rounded text-xs text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
              title="Reverse transactions and restore cable to drums"
            >
              <Trash2 size={12} />
              {isReversing ? "Reversing..." : "Reverse"}
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <TransactionTable transactions={group.transactions} />

      {/* Reverse Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        title="Reverse Transactions"
        message={`Are you sure you want to reverse ${group.transactions.length} transaction(s)?`}
        confirmText="Reverse"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={isReversing}
        onConfirm={confirmReverseTransactions}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
}
