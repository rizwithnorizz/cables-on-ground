"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
    brand: { id: number; brand_name: string };
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

type TransactionPage = {
  groups: TransactionGroup[];
  total_count: number;
  has_more: boolean;
  next_cursor: { created_at: string; ref_no: string | null } | null;
};

type CachedPage = { value: TransactionPage; expiresAt: number };

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 50;
const transactionPageCache = new Map<string, CachedPage>();
const itemsPerPage = 15;

function getCachedPage(key: string) {
  const cached = transactionPageCache.get(key);
  if (!cached || cached.expiresAt <= Date.now()) {
    transactionPageCache.delete(key);
    return null;
  }
  transactionPageCache.delete(key);
  transactionPageCache.set(key, cached);
  return cached.value;
}

function setCachedPage(key: string, value: TransactionPage) {
  transactionPageCache.delete(key);
  transactionPageCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  while (transactionPageCache.size > CACHE_MAX_ENTRIES) {
    transactionPageCache.delete(transactionPageCache.keys().next().value!);
  }
}

export default function TransactionsList() {
  const [supabase] = useState(createClient);
  const [transactionPage, setTransactionPage] = useState<TransactionPage>({
    groups: [],
    total_count: 0,
    has_more: false,
    next_cursor: null,
  });
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingGroupIdx, setDownloadingGroupIdx] = useState<number | null>(
    null,
  );
  const cursorByPage = useRef(
    new Map<string, { created_at: string; ref_no: string | null } | null>(),
  );
  const handleDownloadCertificates = async (
    group: TransactionGroup,
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

          const txWithCert = group.transactions.find(
            (tx) => tx.drum_id.testcertificate === certUrl
          );
          let filename = `certificate_${i + 1}`;
          
          if (txWithCert) {
            const cut = txWithCert.length_cut;
            const type = txWithCert.drum_id.type.type_name;
            const size = txWithCert.drum_id.size;
            const drumId = txWithCert.drum_id.drum_id.replace(/\//g, "_");
            filename = `${cut}m -${size} - ${type} ${drumId ? ` - ${drumId}` : ""}`;
          }
          
          const ext = blob.type === "application/pdf" ? "pdf" : "jpg";
          filename = `${filename}.${ext}`;

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
    const timeout = window.setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let isMounted = true;
    const filterKey = JSON.stringify({ searchQuery, fromDate, toDate });
    const cursor = currentPage === 1
      ? null
      : cursorByPage.current.get(`${filterKey}:${currentPage}`) ?? null;
    const cacheKey = JSON.stringify({ filterKey, cursor });
    const cachedPage = getCachedPage(cacheKey);

    if (cachedPage) {
      setTransactionPage(cachedPage);
      setLoading(false);
      return () => { isMounted = false; };
    }

    setLoading(true);
    const loadTransactions = async () => {
      try {
        const { data, error } = await supabase.rpc("get_transaction_page", {
          p_cursor_created_at: cursor?.created_at ?? null,
          p_cursor_ref: cursor?.ref_no ?? null,
          p_page_size: itemsPerPage,
          p_search: searchQuery || null,
          p_from_date: fromDate || null,
          p_to_date: toDate || null,
        });
        if (error) throw error;
        const page = (data as TransactionPage) ?? {
          groups: [], total_count: 0, has_more: false, next_cursor: null,
        };
        setCachedPage(cacheKey, page);
        if (page.next_cursor) {
          cursorByPage.current.set(`${filterKey}:${currentPage + 1}`, page.next_cursor);
        }
        if (isMounted) setTransactionPage(page);
      } catch (err) {
        console.error("Failed to load transactions:", err);
        if (err && typeof err === "object" && "code" in err && err.code === "PGRST202") {
          console.error(
            "The get_transaction_page migration has not been applied to this Supabase project.",
          );
        }
        if (isMounted) {
          setTransactionPage({
            groups: [],
            total_count: 0,
            has_more: false,
            next_cursor: null,
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadTransactions();
    return () => { isMounted = false; };
  }, [currentPage, searchQuery, fromDate, toDate, supabase]);

  const groupedTransactions = transactionPage.groups;
  const totalPages = Math.ceil(transactionPage.total_count / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;

  useEffect(() => {
    cursorByPage.current.clear();
    cursorByPage.current.set(JSON.stringify({ searchQuery, fromDate, toDate }) + ":1", null);
    setCurrentPage(1);
  }, [searchQuery, fromDate, toDate]);

  const loadedTransactions = groupedTransactions.flatMap((group) => group.transactions);

  const goToLastPage = async () => {
    if (currentPage >= totalPages) return;

    const filterKey = JSON.stringify({ searchQuery, fromDate, toDate });
    let page = currentPage;
    let cursor = transactionPage.next_cursor;

    while (page < totalPages && cursor) {
      const nextPage = page + 1;
      const cursorKey = `${filterKey}:${nextPage}`;
      cursorByPage.current.set(cursorKey, cursor);
      const cacheKey = JSON.stringify({ filterKey, cursor });
      let next = getCachedPage(cacheKey);

      if (!next) {
        const { data, error } = await supabase.rpc("get_transaction_page", {
          p_cursor_created_at: cursor.created_at,
          p_cursor_ref: cursor.ref_no,
          p_page_size: itemsPerPage,
          p_search: searchQuery || null,
          p_from_date: fromDate || null,
          p_to_date: toDate || null,
        });
        if (error) {
          console.error("Failed to find the last transaction page:", error);
          return;
        }
        next = data as TransactionPage;
        setCachedPage(cacheKey, next);
      }

      cursor = next.next_cursor;
      page = nextPage;
    }

    setCurrentPage(page);
  };

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
              searchQuery={searchInput}
              fromDate={fromDate}
              toDate={toDate}
              onSearchChange={setSearchInput}
              onFromDateChange={setFromDate}
              onToDateChange={setToDate}
              onClearFilters={() => {
                setSearchInput("");
                setSearchQuery("");
                setFromDate("");
                setToDate("");
              }}
            />
          </div>
          {loadedTransactions.length > 0 && (
            <div className="mt-2">
              <TransactionExcelExport transactions={loadedTransactions} />
            </div>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center dark:text-gray-400">
            Loading transactions...
          </div>
        ) : transactionPage.total_count === 0 ? (
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
              totalItems={transactionPage.total_count}
              onFirst={() => setCurrentPage(1)}
              onLast={goToLastPage}
              onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
              onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              hasMore={transactionPage.has_more}
            />
            <div className="space-y-4">
              {groupedTransactions.map((group, idx) => (
                <TransactionGroupCard
                  key={`${group.ref_no ?? "no-ref"}-${group.maxDate}`}
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
