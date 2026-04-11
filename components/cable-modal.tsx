"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

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
  drum_id: number;
  length: number;
  ref_no: string | null;
  reservation_id: number;
};

type DrumCable = {
  id: bigint;
  drum_id: string;
  brand: number | string;
  type: number | string;
  size: string;
  curr_length: number;
  initial_length: number;
  testcertificate?: string | null;
};

export default function CableModal({
  cable,
  onClose,
  brandName,
  typeName,
}: {
  cable: DrumCable | null;
  onClose: () => void;
  brandName?: string;
  typeName?: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user ?? null);
    };
    checkAuth();
  }, [supabase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!cable) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("cable_transactions")
          .select("*")
          .eq("drum_id", cable.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (mounted) setTransactions(data ?? []);
      } catch (err) {
        console.error("Failed to load transactions", err);
        if (mounted) setTransactions([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [cable, supabase]);

  useEffect(() => {
    if (!cable) return;
    let mounted = true;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("reservation")
          .select("*")
          .eq("drum_id", cable.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (mounted) setReservations(data ?? []);
      } catch (err) {
        console.error("Failed to load reservations", err);
        if (mounted) setReservations([]);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [cable, supabase]);

  if (!cable) return null;

  const percentUsed =
    cable.initial_length > 0
      ? Math.min(
          100,
          Math.round(
            ((cable.initial_length - cable.curr_length) /
              cable.initial_length) *
              100,
          ),
        )
      : 0;

  const handleUpload = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("certificate", file, file.name);
      const res = await fetch("/api/upload-certificate", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");

      // update drum_cables row with certificate url
      await supabase
        .from("drum_cables")
        .update({ testcertificate: json.url })
        .eq("id", cable.id);
      cable.testcertificate = json.url; // optimistically update UI
    } catch (err) {
      console.error("Upload failed", err);
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
    <div className="fixed md:ml-64 inset-0 flex items-center justify-center z-[999]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative z-10 w-full max-w-5xl mx-4 bg-[#0f1724] rounded-2xl border border-[#0047FF]/30 p-6 shadow-lg flex gap-6 max-h-[85vh] overflow-hidden">
        {/* Left column */}
        <div className="w-2/3 overflow-y-auto pr-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-200">
                {cable.drum_id}
              </h2>
              <div className="text-sm text-gray-400">
                {brandName ?? "Unknown brand"} · {typeName ?? "Unknown type"}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-300 px-2 py-1 rounded hover:bg-white/5"
            >
              ✕
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <div className="bg-[#1a1f3a] p-4 rounded-lg border border-[#0047FF]/10">
              <div className="text-sm text-gray-400">Remaining Length</div>
              <div className="flex items-baseline justify-between mt-2">
                <div className="text-3xl font-bold text-gray-100">
                  {cable.curr_length}m
                </div>
              </div>
              <div className="w-full bg-[#0b1220] h-3 rounded-full mt-3">
                <div
                  className="h-3 rounded-full bg-emerald-500"
                  style={{ width: `${100 - percentUsed}%` }}
                />
              </div>
              <div className="flex justify-between">
                <div className="text-sm text-gray-400 mt-1">
                  {percentUsed}% used
                </div>
                <div className="text-sm text-gray-400">
                  {cable.initial_length}m initial
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1a1f3a] p-3 rounded-lg border border-[#0047FF]/10 text-sm">
                  <div className="text-xs text-gray-400"># Drum No.</div>
                  <div className="font-medium text-gray-100">
                    {cable.drum_id}
                  </div>
                </div>
                <div className="bg-[#1a1f3a] p-3 rounded-lg border border-[#0047FF]/10 text-sm">
                  <div className="text-xs text-gray-400">Brand</div>
                  <div className="font-medium text-gray-100">
                    {brandName ?? "-"}
                  </div>
                </div>
                <div className="bg-[#1a1f3a] p-3 rounded-lg border border-[#0047FF]/10 text-sm">
                  <div className="text-xs text-gray-400">Cable Type</div>
                  <div className="font-medium text-gray-100">
                    {typeName ?? "-"}
                  </div>
                </div>
                <div className="bg-[#1a1f3a] p-3 rounded-lg border border-[#0047FF]/10 text-sm">
                  <div className="text-xs text-gray-400">Size</div>
                  <div className="font-medium text-gray-100">{cable.size}</div>
                </div>
              </div>

              <div className="bg-[#1a1f3a] p-3 rounded-lg border border-[#0047FF]/10 text-sm">
                <div className="text-xs text-gray-400">Test Certificate</div>
                <div className="mt-2">
                  {cable.testcertificate ? (
                    <a
                      href={cable.testcertificate}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#00C8FF] underline"
                    >
                      View certificate
                    </a>
                  ) : !user ? (
                    <div className="text-sm text-gray-500">
                      No certificate available. Sign in to upload.
                    </div>
                  ) : (
                    <label className="block w-full cursor-pointer rounded border-dashed border-2 border-[#0047FF]/20 p-4 text-center text-gray-400">
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleUpload(e.target.files?.[0] ?? null)
                        }
                      />
                      {uploading ? "Uploading…" : "+ Upload Certificate (PDF)"}
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          {reservations.length > 0 && (
            <div className="mt-6 bg-[#1a1f3a] p-4 rounded-lg border border-[#0047FF]/10">
              <h4 className="text-sm font-semibold text-gray-200 mb-3">Reservations</h4>
              <div className="space-y-2">
                {reservations.map((res) => (
                  <div key={res.id} className="flex items-center justify-between bg-[#0b1220] p-2 rounded text-sm">
                    <div>
                      <div className="text-gray-300 font-medium">
                        {res.length}m {res.ref_no && `- ${res.ref_no}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {res.reservation_id}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(res.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Transaction history */}
        <div className="w-1/2 border-l border-[#ffffff0a] pl-6 overflow-y-auto max-h-[65vh]">
          <h3 className="text-lg font-semibold text-gray-100">
            Transaction History
          </h3>
          <div className="mt-4 space-y-4">
            {loading ? (
              <div className="text-sm text-gray-400">Loading…</div>
            ) : transactions.length === 0 ? (
              <div className="text-sm text-gray-400">No transactions</div>
            ) : (
              <ul className="space-y-4 divide-y">
                {transactions.map((t) => {
                  const isCut = t.length_cut > 0;
                  const amount = isCut ? -t.length_cut : Math.abs(t.length_cut);
                  return (
                    <li key={t.id} className="flex items-start justify-between ">
                      <div>
                        <div className="text-md font-medium text-gray-200">
                          REF: {t.ref_no}
                        </div>
                      </div>
                      <div
                        className={`text-sm font-semibold items-end flex flex-col ${isCut ? "text-red-500" : "text-emerald-500"}`}
                      >
                        {isCut
                          ? `-${t.length_cut}m`
                          : `+${Math.abs(t.length_cut)}m`}
                        <div className="text-xs text-gray-400">
                          {new Date(t.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
