"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

type Reservation = {
  id: number;
  reservation_id: number;
  length: number;
  ref_no: string | null;
  created_at: string;
  drum_cables: {
    id: number;
    drum_id: string;
    curr_length: number;
    size: string;
    brand: { id: number; brand_name: string } | { id: number; brand_name: string }[];
    type: { id: number; type_name: string } | { id: number; type_name: string }[];
  };
};

export default function ReservationsList() {
  const supabase = createClient();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("reservation")
          .select(
            `id,
            reservation_id,
            length,
            ref_no,
            created_at,
            drum_cables (
              id,
              drum_id,
              size,
              curr_length,
              brand (id, brand_name),
              type (id, type_name)
            )`
          )
          .order("created_at", { ascending: false });

        if (error) throw error;

        setReservations((data as any) ?? []);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load reservations"
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleDeleteReservation = async (reservationId: number, drumCableId: number) => {
    setDeletingId(reservationId);
    try {
      // Delete the reservation
      const { error: deleteErr } = await supabase
        .from("reservation")
        .delete()
        .eq("id", reservationId);

      if (deleteErr) throw deleteErr;

      // Check if there are other reservations for this drum
      const { data: remainingReservations, error: queryErr } = await supabase
        .from("reservation")
        .select("id")
        .eq("drum_id", drumCableId);

      if (queryErr) throw queryErr;

      // If no other reservations, set reserved to false
      if (!remainingReservations || remainingReservations.length === 0) {
        const { error: updateErr } = await supabase
          .from("drum_cables")
          .update({ reserved: false })
          .eq("id", drumCableId);

        if (updateErr) throw updateErr;
      }

      // Remove from local state
      setReservations(prev => prev.filter(r => r.id !== reservationId));
      toast.success("Reservation deleted successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete reservation");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      const createdDate = new Date(r.created_at);

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
        const matchesRef = r.ref_no?.toLowerCase().includes(query) ?? false;
        const matchesDrumId = r.drum_cables.drum_id.toLowerCase().includes(query);
        if (!matchesRef && !matchesDrumId) return false;
      }

      return true;
    });
  }, [reservations, searchQuery, fromDate, toDate]);

  const groupedReservations = useMemo(() => {
    const groups: Record<number, Reservation[]> = {};

    filteredReservations.forEach((r) => {
      const key = r.reservation_id;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });

    return Object.entries(groups)
      .map(([reservationId, reservs]) => {
        const totalLength = reservs.reduce((sum, r) => sum + (r.length || 0), 0);
        const dates = reservs.map((r) => new Date(r.created_at));
        const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
          .toISOString()
          .split("T")[0];
        const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))
          .toISOString()
          .split("T")[0];

        return {
          reservation_id: Number(reservationId),
          ref_no: reservs[0].ref_no,
          reservations: reservs,
          totalCables: reservs.length,
          totalLength,
          minDate,
          maxDate,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.maxDate).getTime() - new Date(a.maxDate).getTime()
      );
  }, [filteredReservations]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-400">Loading reservations...</div>
      </div>
    );
  }

  return (
    <div className="p-8 mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Reservations</h1>
        <p className="mt-2 text-gray-400">
          View and manage existing cable reservations.
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-4 bg-[#111827]/80 border border-[#0047FF]/30 rounded-3xl p-8 shadow-lg shadow-[#0047FF]/10 mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Search by Reference or Drum ID
            </label>
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0b1220] border-[#0047FF]/30 text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-md border border-[#0047FF]/30 bg-[#0b1220] px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-md border border-[#0047FF]/30 bg-[#0b1220] px-3 py-2 text-white"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {groupedReservations.length === 0 ? (
          <div className="text-center text-gray-400 py-8 bg-[#111827]/80 border border-[#0047FF]/30 rounded-3xl p-8">
            No reservations found
          </div>
        ) : (
          groupedReservations.map((group) => (
            <div
              key={group.reservation_id}
              className="bg-[#111827]/80 border border-[#0047FF]/30 rounded-3xl p-6 shadow-lg shadow-[#0047FF]/10"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Reservation {group.reservation_id}
                  </h3>
                  {group.ref_no && (
                    <p className="text-sm text-gray-400">
                      Reference: {group.ref_no}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {group.minDate === group.maxDate
                      ? group.minDate
                      : `${group.minDate} to ${group.maxDate}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">
                    Total cables: <span className="text-white font-semibold">{group.totalCables}</span>
                  </p>
                  <p className="text-sm text-gray-400">
                    Total length: <span className="text-white font-semibold">{group.totalLength} M</span>
                  </p>
                </div>
              </div>

              {/* Cables in reservation */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-fixed">
                  <thead>
                    <tr className="border-b border-[#0047FF]/20">
                      <th className="w-1/6 text-left py-2 px-3 text-gray-300 font-medium">Brand</th>
                      <th className="w-1/6 text-left py-2 px-3 text-gray-300 font-medium">Type</th>
                      <th className="w-1/6 text-left py-2 px-3 text-gray-300 font-medium">Size</th>
                      <th className="w-1/6 text-left py-2 px-3 text-gray-300 font-medium">Drum Length</th>
                      <th className="w-1/6 text-right py-2 px-3 text-gray-300 font-medium">Reserved Length (M)</th>
                      <th className="w-1/6 text-right py-2 px-3 text-gray-300 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.reservations.map((res) => (
                      <tr
                        key={res.id}
                        className="border-b border-[#0047FF]/10 hover:bg-[#0047FF]/5"
                      >
                        <td className="w-1/6 py-2 px-3 text-gray-400">
                          {(Array.isArray(res.drum_cables.brand) ? res.drum_cables.brand[0]?.brand_name : res.drum_cables.brand?.brand_name) || "Unknown"}
                        </td>
                        <td className="w-1/6 py-2 px-3 text-gray-400">
                          {(Array.isArray(res.drum_cables.type) ? res.drum_cables.type[0]?.type_name : res.drum_cables.type?.type_name) || "Unknown"}
                        </td>
                        <td className="w-1/6 py-2 px-3 text-gray-400">
                          {res.drum_cables.size}
                        </td>
                        <td className="w-1/6 py-2 px-3 text-white">{res.drum_cables.curr_length} m</td>
                        <td className="w-1/6 py-2 px-3 text-right text-white font-semibold">
                          {res.length} m
                        </td>
                        <td className="w-1/6 py-2 px-3 text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deletingId === res.id}
                            onClick={() => handleDeleteReservation(res.id, res.drum_cables.id)}
                            className="text-xs"
                          >
                            {deletingId === res.id ? "Deleting..." : "Delete"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
