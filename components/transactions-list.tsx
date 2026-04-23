"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Edit, Download } from "lucide-react";
import JSZip from "jszip";
import { toast } from "react-hot-toast";
import {
  TransactionFilters,
  TransactionGroupCard,
  PaginationControls,
  TransactionExcelExport,
} from "./transactions";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { saveAs } = require("file-saver");

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

export default function TransactionsList() {
  const supabase = createClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingGroupIdx, setDownloadingGroupIdx] = useState<number | null>(
    null,
  );
  const itemsPerPage = 15;


  const handleDownloadCertificates = async (
    group: (typeof groupedTransactions)[0],
    groupIdx: number,
  ) => {
    setDownloadingGroupIdx(groupIdx);
    try {
      const certificateUrls = group.transactions
        .map((tx) => tx.drum_id.testcertificate)
        .filter((cert) => cert !== null && cert !== undefined) as string[];

      if (certificateUrls.length === 0) {
        toast.error("No certificates available for download in this group.");
        setDownloadingGroupIdx(null);
        return;
      }

      const uniqueCerts = Array.from(new Set(certificateUrls));

      const zip = new JSZip();
      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < uniqueCerts.length; i++) {
        try {
          const certUrl = uniqueCerts[i];
          const response = await fetch(certUrl);

          if (!response.ok) {
            failedCount++;
            continue;
          }

          const blob = await response.blob();

          const urlParts = certUrl.split("/");
          let filename = urlParts[urlParts.length - 1].split("?")[0];

          if (!filename || filename.length < 3) {
            const drumIds = group.transactions
              .filter((tx) => tx.drum_id.testcertificate === certUrl)
              .map((tx) => tx.drum_id.drum_id)
              .join("_");
            const ext = blob.type === "application/pdf" ? "pdf" : "jpg";
            filename = `certificate_${drumIds}_${i + 1}.${ext}`;
          }

          zip.file(filename, blob);
          successCount++;
        } catch (err) {
          console.error(`Failed to download certificate ${i + 1}:`, err);
          failedCount++;
        }
      }

      if (successCount === 0) {
        toast.error("Failed to download any certificates.");
        setDownloadingGroupIdx(null);
        return;
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });

      const refNo = group.ref_no
        ? group.ref_no.replace(/\s+/g, "_")
        : "transactions";
      const timestamp = new Date().toISOString().split("T")[0];
      const zipFilename = `certificates_${refNo}_${timestamp}.zip`;

      saveAs(zipBlob, zipFilename);

      if (failedCount > 0) {
        toast.success(
          `Downloaded ${successCount} certificate(s) (${failedCount} failed)`,
        );
      } else {
        toast.success(`Downloaded ${successCount} certificate(s) successfully`);
      }
    } catch (err) {
      console.error("Failed to create zip file:", err);
      toast.error("Failed to download certificates. Please try again.");
    } finally {
      setDownloadingGroupIdx(null);
    }
  };


  useEffect(() => {
    let isMounted = true;
    const loadTransactions = async () => {
      if (!isMounted) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("cable_transactions")
          .select(
            `
            id,
            created_at,
            drum_id (
              id,
              drum_id,
              size,
              type ( type_name ),
              brand ( brand_name ),
              testcertificate
            ),
            length_cut,
            balance_cable,
            ref_no
            `,
          )
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (isMounted) setTransactions((data as any) ?? []);
      } catch (err) {
        console.error("Failed to load transactions:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadTransactions();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const createdDate = new Date(t.created_at);

      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        if (createdDate < from) return false;
      }

      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        if (createdDate > to) return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesRef = t.ref_no?.toLowerCase().includes(query);
        const matchesDrumId = t.drum_id.drum_id.toLowerCase().includes(query);
        if (!matchesRef && !matchesDrumId) return false;
      }

      return true;
    });
  }, [transactions, searchQuery, fromDate, toDate]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};

    filteredTransactions.forEach((t) => {
      const key = t.ref_no || "NO_REF";
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });

    return Object.entries(groups)
      .map(([ref_no, txs]) => {
        const totalLength = txs.reduce(
          (sum, t) => sum + (t.length_cut || 0),
          0,
        );
        const dates = txs.map((t) => new Date(t.created_at));
        const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
          .toISOString()
          .split("T")[0];
        const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))
          .toISOString()
          .split("T")[0];

        return {
          ref_no: ref_no === "NO_REF" ? null : ref_no,
          transactions: txs,
          totalCables: txs.length,
          totalLength,
          minDate,
          maxDate,
        };
      })
      .sort(
        (a, b) => new Date(b.maxDate).getTime() - new Date(a.maxDate).getTime(),
      );
  }, [filteredTransactions]);

  const totalPages = Math.ceil(groupedTransactions.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedTransactions = groupedTransactions.slice(startIdx, endIdx);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, fromDate, toDate]);

  return (
    <div className="p-8 mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-500 dark:text-white">Transactions</h1>
        <p className="mt-2 text-gray-400">
          View and search all cable cutting transactions grouped by reference
          number.
        </p>
      </div>

      <div className="space-y-6 dark:bg-[#111827]/80 border dark:border-[#0047FF]/30 rounded-3xl p-8 shadow-lg dark:shadow-[#0047FF]/10">
        {/* Filter and Export Controls */}
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-fit">
            <TransactionFilters
              searchQuery={searchQuery}
              fromDate={fromDate}
              toDate={toDate}
              onSearchChange={setSearchQuery}
              onFromDateChange={setFromDate}
              onToDateChange={setToDate}
              onClearFilters={() => {
                setSearchQuery("");
                setFromDate("");
                setToDate("");
              }}
            />
          </div>
          {filteredTransactions.length > 0 && (
            <div className="mt-2">
              <TransactionExcelExport transactions={filteredTransactions} />
            </div>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center dark:text-gray-400">
            Loading transactions...
          </div>
        ) : groupedTransactions.length === 0 ? (
          <div className="text-center dark:text-gray-400">
            No transactions found.
          </div>
        ) : (
          <>
          

            {/* Pagination Controls */}
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              startIdx={startIdx}
              endIdx={endIdx}
              totalItems={groupedTransactions.length}
              onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
              onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              onPageChange={setCurrentPage}
            />
            <div className="space-y-4">
              {paginatedTransactions.map((group, idx) => (
                <TransactionGroupCard
                  key={idx}
                  group={group}
                  idx={idx}
                  isDownloading={downloadingGroupIdx === idx}
                  onDownload={handleDownloadCertificates}
                  hasDownloadableContent={group.transactions.some(
                    (tx) => tx.drum_id.testcertificate,
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
