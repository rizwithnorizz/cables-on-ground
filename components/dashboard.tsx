"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  StatsGrid,
  LowStockAlerts,
  StockByType,
  RecentActivity,
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

type CableType = {
  id: number;
  type_name: string;
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
  const [types, setTypes] = useState<CableType[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (!isMounted) return;
      setLoading(true);
      try {
        const [cablesRes, typesRes, transRes, reservRes] = await Promise.all([
          supabase.from("drum_cables").select("*"),
          supabase.from("type").select("*"),
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
          setTypes(typesRes.data ?? []);
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
    const availableDrums = cables.filter((c) => (c.curr_length ?? 0) > 0).length;
    const totalStock = cables.reduce((sum, c) => sum + (c.curr_length ?? 0), 0);
    const lowStockThreshold = 100;
    const lowStockDrums = cables.filter(
      (c) => (c.curr_length ?? 0) > 0 && (c.curr_length ?? 0) < lowStockThreshold
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

  // Get low stock alerts
  const lowStockAlerts = useMemo(() => {
    return cables
      .filter((c) => (c.curr_length ?? 0) > 0 && (c.curr_length ?? 0) < 100)
      .sort((a, b) => (a.curr_length ?? 0) - (b.curr_length ?? 0))
      .slice(0, 5);
  }, [cables]);

  // Stock by cable type
  const stockByType = useMemo(() => {
    const typeMap = Object.fromEntries(types.map((t) => [t.id, t.type_name]));
    const grouped = cables.reduce(
      (acc, cable) => {
        const typeId = cable.type;
        const typeName = typeMap[typeId] || "Unknown";
        if (!acc[typeName]) {
          acc[typeName] = 0;
        }
        acc[typeName] += cable.curr_length ?? 0;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(grouped)
      .map(([name, length]) => ({ name, length }))
      .sort((a, b) => b.length - a.length);
  }, [cables, types]);

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

  const maxStockLength = stockByType.length > 0 ? Math.max(...stockByType.map((s) => s.length)) : 1;

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
        <h1 className="text-3xl font-bold">
          Dashboard
        </h1>
        <p className="text-gray-400 mt-2">Overview of your cable drum inventory</p>
      </div>

      {/* Stats Cards */}
      <StatsGrid stats={statCards} />

      {/* Low Stock Alerts */}
      <LowStockAlerts alerts={lowStockAlerts} />

      {/* Stock by Type and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Stock by Cable Type */}
        <StockByType items={stockByType} maxLength={maxStockLength} />

        {/* Recent Activity */}
        <RecentActivity activities={recentActivity} />
      </div>
    </div>
  );
}
