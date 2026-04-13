"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  const itemsPerPage = 20;

  useEffect(() => {
    const loadTransactions = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("cable_transactions")
          .select(`
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
            `)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setTransactions(data as any?? []);
      } catch (err) {
        console.error("Failed to load transactions:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
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
        const totalLength = txs.reduce((sum, t) => sum + (t.length_cut || 0), 0);
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
        (a, b) =>
          new Date(b.maxDate).getTime() - new Date(a.maxDate).getTime(),
      );
  }, [filteredTransactions]);

  // Pagination
  const totalPages = Math.ceil(groupedTransactions.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedTransactions = groupedTransactions.slice(startIdx, endIdx);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, fromDate, toDate]);

  return (
    <div className="p-8 mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Transactions</h1>
        <p className="mt-2 text-gray-400">
          View and search all cable cutting transactions grouped by reference number.
        </p>
      </div>

      <div className="space-y-6 bg-[#111827]/80 border border-[#0047FF]/30 rounded-3xl p-8 shadow-lg shadow-[#0047FF]/10">
        {/* Filters */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm text-gray-300">
            Search (Ref or Drum ID)
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
            />
          </label>
          <label className="space-y-2 text-sm text-gray-300">
            From Date
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm text-gray-300">
            To Date
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
        </div>

        {/* Clear Filters */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setSearchQuery("");
              setFromDate("");
              setToDate("");
            }}
          >
            Clear Filters
          </Button>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center text-gray-400">Loading transactions...</div>
        ) : groupedTransactions.length === 0 ? (
          <div className="text-center text-gray-400">No transactions found.</div>
        ) : (
          <>
            <div className="space-y-4">
              {paginatedTransactions.map((group, idx) => (
                <div
                  key={idx}
                  className="bg-[#0b1220] border border-[#1f2937] rounded-lg p-4"
                >
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Reference</p>
                      <p className="text-sm font-semibold text-white">
                        {group.ref_no || <span className="text-gray-500">—</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Total Length</p>
                      <p className="text-sm font-semibold text-white">
                        {group.totalLength.toFixed(2)} m
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Date Range</p>
                      <p className="text-sm font-semibold text-white">
                        {group.minDate === group.maxDate
                          ? group.minDate
                          : `${group.minDate} to ${group.maxDate}`}
                      </p>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#1f2937]">
                          <th className="text-left px-2 py-2 text-xs font-semibold text-gray-400">
                            Drum ID
                          </th>
                          <th className="text-left px-2 py-2 text-xs font-semibold text-gray-400">
                            Brand
                          </th>
                          <th className="text-left px-2 py-2 text-xs font-semibold text-gray-400">
                            Type
                          </th>
                          <th className="text-left px-2 py-2 text-xs font-semibold text-gray-400">
                            Size
                          </th>
                          <th className="text-left px-2 py-2 text-xs font-semibold text-gray-400">
                            Original Length (m)
                          </th>
                          <th className="text-left px-2 py-2 text-xs font-semibold text-gray-400">
                            Length Cut (m)
                          </th>
                          <th className="text-left px-2 py-2 text-xs font-semibold text-gray-400">
                            Balance (m)
                          </th>
                          <th className="text-left px-2 py-2 text-xs font-semibold text-gray-400">
                            Date
                          </th>
                          <th className="text-left px-2 py-2 text-xs font-semibold text-gray-400">
                            Test Certificate
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.transactions.map((tx) => (
                          <tr
                            key={tx.id}
                            className="border-b border-[#0b1220] hover:bg-[#111827] transition"
                          >
                            <td className="px-2 py-2 text-white">
                              { tx.drum_id.drum_id ? tx.drum_id.drum_id : <span className="text-gray-500">Unavailable Drum Number</span> }
                            </td>
                            <td className="px-2 py-2 text-white">
                              {tx.drum_id.brand.brand_name}
                            </td>
                            <td className="px-2 py-2 text-white">
                              {tx.drum_id.type.type_name}
                            </td>
                            <td className="px-2 py-2 text-white">
                              {tx.drum_id.size}
                            </td>
                            
                            <td className="px-2 py-2 text-white">
                              {tx.balance_cable + tx.length_cut} METERS
                            </td>
                            <td className="px-2 py-2 text-white">
                              {tx.length_cut} METERS
                            </td>
                            <td className="px-2 py-2 text-white">
                              {tx.balance_cable} METERS
                            </td>
                            <td className="px-2 py-2 text-gray-400">
                              {new Date(tx.created_at).toLocaleDateString(
                                undefined,
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {tx.drum_id.testcertificate ? (
                                <a
                                  href={tx.drum_id.testcertificate}
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:underline"
                                >
                                  View Certificate
                                </a>
                              ) : (
                                <span className="text-gray-500">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 border-t border-[#1f2937]">
                <div className="text-sm text-gray-400">
                  Showing {startIdx + 1} to {Math.min(endIdx, groupedTransactions.length)} of{" "}
                  {groupedTransactions.length} transactions
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded text-sm transition ${
                            currentPage === page
                              ? "bg-blue-500 text-white"
                              : "bg-[#1f2937] text-gray-300 hover:bg-[#2d3748]"
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
