"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

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
    const loadData = async () => {
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
            .from("cable_reservations")
            .select("*")
            .order("created_at", { ascending: false }),
        ]);

        setCables(cablesRes.data ?? []);
        setTypes(typesRes.data ?? []);
        setTransactions(transRes.data ?? []);
        setReservations(reservRes.data ?? []);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [supabase]);

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
    const activity: any[] = [];

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

  const maxStockLength = Math.max(...stockByType.map((s) => s.length));

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0047FF] to-[#00C8FF] bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-gray-400 mt-2">Overview of your cable drum inventory</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Drums */}
        <div className="bg-[#111827]/80 border border-[#0047FF]/30 rounded-lg p-6 shadow-lg shadow-[#0047FF]/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Drums</p>
              <p className="text-3xl font-bold text-white mt-2">
                {stats.totalDrums}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.availableDrums} available
              </p>
            </div>
            <div className="text-2xl">📦</div>
          </div>
        </div>

        {/* Total Stock */}
        <div className="bg-[#111827]/80 border border-[#0047FF]/30 rounded-lg p-6 shadow-lg shadow-[#0047FF]/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Stock</p>
              <p className="text-3xl font-bold text-white mt-2">
                {stats.totalStock.toLocaleString()}m
              </p>
              <p className="text-xs text-gray-500 mt-1">across all drums</p>
            </div>
            <div className="text-2xl">📊</div>
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-[#111827]/80 border border-yellow-500/30 rounded-lg p-6 shadow-lg shadow-yellow-500/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Low Stock</p>
              <p className="text-3xl font-bold text-white mt-2">
                {stats.lowStockDrums}
              </p>
              <p className="text-xs text-gray-500 mt-1">drums need attention</p>
            </div>
            <div className="text-2xl">⚠️</div>
          </div>
        </div>

        {/* Empty Drums */}
        <div className="bg-[#111827]/80 border border-red-500/30 rounded-lg p-6 shadow-lg shadow-red-500/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Empty Drums</p>
              <p className="text-3xl font-bold text-white mt-2">
                {stats.emptyDrums}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.reservedCount} reserved
              </p>
            </div>
            <div className="text-2xl">📭</div>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockAlerts.length > 0 && (
        <div className="bg-[#111827]/80 border border-yellow-500/30 rounded-lg p-6 shadow-lg shadow-yellow-500/10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">⚠️</span>
            <h2 className="font-semibold text-yellow-400">Low Stock Alerts</h2>
          </div>
          <div className="space-y-2">
            {lowStockAlerts.map((cable) => (
              <div
                key={cable.id}
                className="flex items-center justify-between py-2 border-b border-[#0047FF]/20 last:border-0"
              >
                <div>
                  <p className="text-white font-medium">
                    {cable.drum_id} · {cable.size}
                  </p>
                </div>
                <p className="text-yellow-400 font-semibold">
                  {cable.curr_length}m left →
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock by Type and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Stock by Cable Type */}
        <div className="bg-[#111827]/80 border border-[#0047FF]/30 rounded-lg p-6 shadow-lg shadow-[#0047FF]/10">
          <h2 className="text-lg font-semibold text-white mb-6">
            Stock by Cable Type (meters)
          </h2>
          <div className="space-y-4">
            {stockByType.map((item) => (
              <div key={item.name}>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-gray-300">
                    {item.name}
                  </p>
                  <p className="text-sm font-semibold text-white">
                    {item.length}m
                  </p>
                </div>
                <div className="w-full bg-[#0b1220] rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-[#0047FF] to-[#00C8FF] h-2 rounded-full"
                    style={{
                      width: `${(item.length / maxStockLength) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <Link href="/cables_view">
            <p className="text-[#00C8FF] text-sm font-medium mt-6 hover:text-[#0047FF] transition-colors">
              View full breakdown →
            </p>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="bg-[#111827]/80 border border-[#0047FF]/30 rounded-lg p-6 shadow-lg shadow-[#0047FF]/10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            <Link href="/transactions">
              <p className="text-[#00C8FF] text-sm font-medium hover:text-[#0047FF] transition-colors">
                View all
              </p>
            </Link>
          </div>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent activity</p>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-b border-[#0047FF]/20 last:border-0">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        activity.type === "cut"
                          ? "bg-red-500/20"
                          : "bg-emerald-500/20"
                      }`}
                    >
                      <span className="text-sm">
                        {activity.type === "cut" ? "✂️" : "📌"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {activity.drum_id}
                        {activity.ref_no && ` — ${activity.ref_no}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.date).toLocaleDateString()} · {new Date(activity.date).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`font-semibold ${
                      activity.type === "cut"
                        ? "text-red-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {activity.type === "cut" ? "-" : "+"}
                    {activity.amount}m
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
