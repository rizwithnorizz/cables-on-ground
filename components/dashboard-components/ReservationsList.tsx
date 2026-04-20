"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ReservationRecord = {
  id: bigint;
  created_at: string;
  reservation_id: number;
  drum_id: { id: number; size: string };
  length: number;
  size: string;
  ref_no: string;
};

type ReservationGroup = {
  reservation_id: string;
  ref_no: string;
  drums: Array<{
    size: string;
    length: number;
  }>;
  totalLength: number;
};

export function ReservationsList() {
  const supabase = createClient();
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Load reservations from Supabase
  useEffect(() => {
    let isMounted = true;
    const loadReservations = async () => {
      if (!isMounted) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("reservation")
          .select(`
            id,
            created_at,
            reservation_id,
            drum_id ( 
              id,
              size
            ),
            ref_no,
            length
            `)  
          .order("created_at", { ascending: false });
            console.log(data);
        if (error) throw error;

        if (isMounted) {
          setReservations(data as any ?? []);
          setError("");
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load reservations");
          setReservations([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadReservations();
    return () => {
      isMounted = false;
    };
  }, []);

  // Group reservations by ref_no
  const groupedReservations = useMemo(() => {
    const groups = new Map<string, ReservationGroup>();

    reservations.forEach((res) => {
      const key = res.ref_no || `reservation-${res.id}`;

      if (!groups.has(key)) {
        groups.set(key, {
          reservation_id: String(res.reservation_id),
          ref_no: res.ref_no || "N/A",
          drums: [],
          totalLength: 0,
        });
      }

      const group = groups.get(key)!;
      group.drums.push({
        size: res.drum_id.size,
        length: res.length,
      });
      group.totalLength += res.length;
    });

    return Array.from(groups.values());
  }, [reservations]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#111827]/80 border dark:border-[#0047FF]/30 border-gray-200 rounded-lg p-6 shadow-lg dark:shadow-[#0047FF]/10">
        <div className="text-center text-gray-400">Loading reservations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-[#111827]/80 border dark:border-[#0047FF]/30 border-gray-200 rounded-lg p-6 shadow-lg dark:shadow-[#0047FF]/10">
        <div className="text-center text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#111827]/80 border dark:border-[#0047FF]/30 border-gray-200 rounded-lg p-6 shadow-lg dark:shadow-[#0047FF]/10">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        Reservations ({groupedReservations.length})
      </h2>

      <div className="space-y-4 overflow-y-auto max-h-[50vh]">
        {groupedReservations.length > 0 ? (
          groupedReservations.map((group) => (
            <div
              key={group.reservation_id}
              className="p-4 bg-gray-50 dark:bg-[#0b1220] rounded-lg border border-gray-200 dark:border-[#0047FF]/30 hover:border-blue-500 dark:hover:border-[#0047FF] transition-colors"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Reference
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {group.ref_no}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Reservation Ticket
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {group.reservation_id}
                  </p>
                </div>
              </div>

              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  Drums ({group.drums.length})
                </p>
                <div className="space-y-1">
                  {group.drums.map((drum, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-xs text-gray-700 dark:text-gray-300 pl-2 border-l-2 border-blue-400 dark:border-[#0047FF]"
                    >
                      <span>{drum.size}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {drum.length}m
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-[#0047FF]/20">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Total Reserved
                  </p>
                  <p className="text-sm font-bold text-blue-600 dark:text-[#00C8FF]">
                    {group.totalLength}m
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            No reservations found
          </p>
        )}
      </div>
    </div>
  );
}
