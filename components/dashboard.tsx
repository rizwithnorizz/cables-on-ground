"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  StatsGrid,
  StockByType,
  RecentActivity,
  ReservationsList,
} from "./dashboard-components";

type DrumCable = {
  id: string;
  drum_id: string;
  brand: number;
  type: number;
  size: string;
  curr_length: number;
  initial_length: number;
};

type Transaction = {
  id: bigint;
  created_at: string;
  drum_id: string;
  length_cut: number;
  balance_cable: number;
  ref_no: string;
};

type Reservation = {
  id: bigint;
  created_at: string;
  drum_id: string;
  length: number;
  ref_no: string;
};

export function Dashboard() {
  const supabase = createClient();
  const [cables, setCables] = useState<DrumCable[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (!isMounted) return;
      setLoading(true);
      try {
        const [cablesRes, transRes, reservRes] = await Promise.all([
          supabase.from("drum_cables").select("*"),
          supabase
            .from("cable_transactions")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("reservation")
            .select("*")
            .order("created_at", { ascending: false }),
        ]);

        if (isMounted) {
          setCables(cablesRes.data ?? []);
          setTransactions(transRes.data ?? []);
          setReservations(reservRes.data ?? []);
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    const totalDrums = cables.length;
    const availableDrums = cables.filter(
      (c) => (c.curr_length ?? 0) > 0,
    ).length;
    const totalStock = cables.reduce((sum, c) => sum + (c.curr_length ?? 0), 0);
    const lowStockThreshold = 100;
    const lowStockDrums = cables.filter(
      (c) =>
        (c.curr_length ?? 0) > 0 && (c.curr_length ?? 0) < lowStockThreshold,
    ).length;
    const emptyDrums = cables.filter((c) => (c.curr_length ?? 0) === 0).length;
    const reservedCount = reservations.length;

    return {
      totalDrums,
      availableDrums,
      totalStock,
      lowStockDrums,
      emptyDrums,
      reservedCount,
    };
  }, [cables, reservations]);

  // Recent activity (combined transactions and reservations)
  const recentActivity = useMemo(() => {
    const activity: Array<{
      id: string | bigint;
      type: "cut" | "reserve";
      drum_id: string;
      amount: number;
      date: string;
      ref_no: string | null;
    }> = [];

    transactions.forEach((t) => {
      activity.push({
        id: t.id,
        type: "cut",
        drum_id: t.drum_id,
        amount: t.length_cut,
        date: t.created_at,
        ref_no: t.ref_no,
      });
    });

    reservations.forEach((r) => {
      activity.push({
        id: r.id,
        type: "reserve",
        drum_id: r.drum_id,
        amount: r.length,
        date: r.created_at,
        ref_no: r.ref_no,
      });
    });

    return activity
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [transactions, reservations]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Drums",
      value: stats.totalDrums,
      subtext: `${stats.availableDrums} available`,
      emoji: "📦",
      borderColor: "border-[#0047FF]/30",
      shadowColor: "shadow-[#0047FF]/10",
    },
    {
      label: "Total Stock",
      value: `${stats.totalStock.toLocaleString()}m`,
      subtext: "across all drums",
      emoji: "📊",
      borderColor: "border-[#0047FF]/30",
      shadowColor: "shadow-[#0047FF]/10",
    },
    {
      label: "Low Stock",
      value: stats.lowStockDrums,
      subtext: "drums need attention",
      emoji: "⚠️",
      borderColor: "border-yellow-500/30",
      shadowColor: "shadow-yellow-500/10",
    },
    {
      label: "Empty Drums",
      value: stats.emptyDrums,
      subtext: `${stats.reservedCount} reserved`,
      emoji: "📭",
      borderColor: "border-red-500/30",
      shadowColor: "shadow-red-500/10",
    },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold dark:text-white text-blue-500">
          Dashboard
        </h1>
        <p className="text-gray-400 mt-2">
          Overview of your cable drum inventory
        </p>
      </div>

      {/* Stats Cards */}
      <StatsGrid stats={statCards} />

      {/* Main Content: Stock by Type and Reservations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Stock by Type - Takes 2 columns */}
        <div className="lg:col-span-3">
          <StockByType />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ReservationsList />
        <RecentActivity activities={recentActivity} />
      </div>
    </div>
  );
}
