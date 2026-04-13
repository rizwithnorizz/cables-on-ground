"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from 'react-hot-toast';
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type DrumCable = {
  id: number;
  drum_id: string;
  brand: number;
  type: number;
  size: string;
  curr_length: number;
  available: number;
  initial_length: number;
};

type ReserveItem = {
  id: number;
  drum_id: string;
  brand: number;
  type: number;
  size: string;
  available: number;
  reserveLength: string;
  reservationRef?: string;
  reserve_version: number;
};

type CableType = { id: number; type_name: string };
type CableBrand = { id: number; brand_name: string };

export default function ReserveList() {
  const supabase = createClient();
  const [types, setTypes] = useState<CableType[]>([]);
  const [brands, setBrands] = useState<CableBrand[]>([]);
  const [availableCables, setAvailableCables] = useState<DrumCable[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [brandFilter, setBrandFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [inputLength, setInputLength] = useState("");

  const [items, setItems] = useState<ReserveItem[]>([]);
  const nextVersion = useRef(1);
  const [addedDisabled, setAddedDisabled] = useState<Record<string, boolean>>({});
  const timeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const [reservationRef, setReservationRef] = useState("");
  const [selectedDrumId, setSelectedDrumId] = useState<string>("");
  const [nextReservationId, setNextReservationId] = useState<number | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutRef.current).forEach(timeout => clearTimeout(timeout));
      timeoutRef.current = {};
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [typesRes, brandsRes, cablesRes, reservationsRes] = await Promise.all([
          supabase.from("type").select("*").order("id", { ascending: true }),
          supabase
            .from("brand")
            .select("*")
            .order("brand_name", { ascending: true }),
          supabase
            .from("drum_cables")
            .select("*")
            .gt("curr_length", 0)
            .order("size", { ascending: true })
            .order("curr_length", { ascending: false }),
          supabase
            .from("reservation")
            .select("drum_id, length")
            .order("created_at", { ascending: false }),
        ]);

        if (typesRes.error || brandsRes.error || cablesRes.error || reservationsRes.error) {
          throw typesRes.error || brandsRes.error || cablesRes.error || reservationsRes.error;
        }

        // Build map of drum_id -> total reserved length (single pass)
        const reservationMap = new Map<number, number>();
        (reservationsRes.data ?? []).forEach((res) => {
          const current = reservationMap.get(res.drum_id) ?? 0;
          reservationMap.set(res.drum_id, current + (res.length ?? 0));
        });

        // Calculate available length for each drum
        const cablesWithAvailable = (cablesRes.data ?? []).map((cable) => {
          const totalReserved = reservationMap.get(cable.id) ?? 0;
          const availableLength = cable.curr_length - totalReserved;

          return {
            ...cable,
            available: availableLength,
          };
        });

        // Filter out drums with no available length
        const filteredCables = cablesWithAvailable.filter((c) => c.available > 0);

        setTypes(typesRes.data ?? []);
        setBrands(brandsRes.data ?? []);
        setAvailableCables(filteredCables);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load data");
        setTypes([]);
        setBrands([]);
        setAvailableCables([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // default filters
  useEffect(() => {
    if (!brandFilter && brands.length > 0) setBrandFilter(String(brands[0].id));
    if (!typeFilter && types.length > 0) setTypeFilter(String(types[0].id));
  }, [brands, types, brandFilter, typeFilter]);

  // clear selected drum when filters change
  useEffect(() => {
    setSelectedDrumId("");
  }, [brandFilter, typeFilter, sizeFilter]);

  useEffect(() => {
    const randomId = Math.floor(Math.random() * 100000);
    setNextReservationId(randomId);
  }, []);

  const availableSizes = useMemo(() => {
    const setS = new Set<string>();
    availableCables.forEach((c) => {
      if (brandFilter && String(c.brand) !== String(brandFilter)) return;
      if (typeFilter && String(c.type) !== String(typeFilter)) return;
      setS.add(c.size);
    });
    return Array.from(setS).sort();
  }, [availableCables, brandFilter, typeFilter]);

  const drumsMatchingFilters = useMemo(() => {
    return availableCables.filter((c) => {
      if (brandFilter && String(c.brand) !== String(brandFilter)) return false;
      if (typeFilter && String(c.type) !== String(typeFilter)) return false;
      if (sizeFilter && c.size !== sizeFilter) return false;
      return (c.curr_length ?? 0) > 0;
    });
  }, [availableCables, brandFilter, typeFilter, sizeFilter]);

  const addItemFromDrum = async (id: number, reserveLen?: string) => {
    if (!id) return;
    const cable = availableCables.find((c) => c.id === id);
    if (!cable) return;

    const L = Number(reserveLen);

    const version = nextVersion.current++;
    setItems((prev) => [
      ...prev,
      {
        id: cable.id,
        drum_id: cable.drum_id,
        brand: cable.brand,
        type: cable.type,
        available: cable.curr_length,
        size: cable.size,
        reserveLength: reserveLen ?? "",
        reservationRef: "",
        reserve_version: version,
      },
    ]);
    setAddedDisabled((prev) => ({ ...prev, [String(id)]: true }));
    
    // Clear previous timeout if exists
    const timeoutKey = String(id);
    if (timeoutRef.current[timeoutKey]) {
      clearTimeout(timeoutRef.current[timeoutKey]);
    }
    
    // Store new timeout for cleanup on unmount
    timeoutRef.current[timeoutKey] = setTimeout(() => {
      setAddedDisabled((prev) => ({ ...prev, [timeoutKey]: false }));
      delete timeoutRef.current[timeoutKey];
    }, 700);
  };

  const removeItem = (reserve_version: number) =>
    setItems((prev) => prev.filter((i) => i.reserve_version !== reserve_version));
  const updateItem = (reserve_version: number, patch: Partial<ReserveItem>) =>
    setItems((prev) =>
      prev.map((i) => (i.reserve_version === reserve_version ? { ...i, ...patch } : i)),
    );

  const submitReservation = async () => {
    if (items.length === 0) {
      toast.error("Add at least one cable to reserve.");
      return;
    }

    for (const it of items) {
      const amt = Number(it.reserveLength);
      if (!it.reserveLength || Number.isNaN(amt) || amt <= 0) {
        toast.error(`Invalid reserve length for ${it.drum_id}`);
        return;
      }
    }

    if (!reservationRef) {
      toast.error("Please enter a reference number for this reservation.");
      return;
    }

    setSubmitting(true);
    try {
      for (const it of items) {
        const amt = Number(it.reserveLength);
        const { error: insertErr } = await supabase
          .from("reservation")
          .insert([
            {
              drum_id: it.id,
              length: amt,
              ref_no: reservationRef || null,
              reservation_id: nextReservationId,
            },
          ]);

        const { error: updateErr } = await supabase 
          .from("drum_cables")
          .update({reserved: true})
          .eq("id", it.id);

        if (updateErr) throw updateErr; 
        if (insertErr) throw insertErr;
      }
      toast.success("Reservation recorded successfully.");
      setItems([]);
      setReservationRef("");
      const newRandomId = Math.floor(Math.random() * 100000);
      setNextReservationId(newRandomId);
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit reservation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Reserve</h1>
        <p className="mt-2 text-gray-400">
          Select cables to reserve. Filters limit available brands, types and sizes.
        </p>
      </div>

      <div className="space-y-6 bg-[#111827]/80 border border-[#0047FF]/30 rounded-3xl p-8 shadow-lg shadow-[#0047FF]/10">
        {/* Notifications are shown via react-hot-toast */}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-5">
              <label className="space-y-2 text-sm text-gray-300">
                Brand
                <select
                  value={brandFilter}
                  onChange={(e) => {
                    setBrandFilter(e.target.value);
                    setTypeFilter("");
                    setSizeFilter("");
                  }}
                  className="w-full rounded-md border border-input bg-[#0b1220] px-3 py-2 text-base text-white"
                >
                  {brands.map((b) => (
                    <option
                      key={b.id}
                      value={String(b.id)}
                      className="bg-[#0b1220] text-white"
                    >
                      {b.brand_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm text-gray-300">
                Type
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setSizeFilter("");
                  }}
                  className="w-full rounded-md border border-input bg-[#0b1220] px-3 py-2 text-base text-white"
                >
                  <option value="">Select type</option>
                  {types.map((t) => (
                    <option
                      key={t.id}
                      value={String(t.id)}
                      className="bg-[#0b1220] text-white"
                    >
                      {t.type_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="space-y-2 text-sm text-gray-300">
              Size
              <div className="mt-2 grid grid-cols-4 gap-2">
              {availableSizes.length === 0 ? (
                <div className="text-sm text-gray-500">No sizes available</div>
              ) : (
                availableSizes
                .sort((a, b) => {
                  const [aPrefix, aPostfix] = a.split("x");
                  const [bPrefix, bPostfix] = b.split("x");
                  const prefixDiff = Number(aPrefix) - Number(bPrefix);
                  return prefixDiff !== 0 ? prefixDiff : Number(aPostfix) - Number(bPostfix);
                })
                .map((s) => (
                  <button
                  key={s}
                  onClick={() => setSizeFilter(s)}
                  className={`px-3 py-3 rounded ${sizeFilter === s ? "bg-emerald-500 text-white" : "bg-[#1b263b] text-gray-300"}`}
                  >
                  {s}
                  </button>
                ))
              )}
              </div>
            </label>

            {sizeFilter && (
              <label className="space-y-2 text-sm text-gray-300">
                Select Drum
                <select
                  value={selectedDrumId}
                  onChange={(e) => setSelectedDrumId(e.target.value)}
                  className="w-full rounded-md border border-input bg-[#0b1220] px-3 py-2 text-base text-white"
                >
                  <option value="">Choose a drum</option>
                  {drumsMatchingFilters.map((drum) => (
                    <option
                      key={drum.id}
                      value={String(drum.id)}
                      className="bg-[#0b1220] text-white"
                    >
                      {drum.available}m available - FROM {drum.curr_length}m
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="mb-4">
              <label className="space-y-2 text-sm text-gray-300">
                Length to reserve (m)
                <Input
                  type="number"
                  placeholder="Length to reserve"
                  value={inputLength}
                  onChange={(e) => setInputLength(e.target.value)}
                />
              </label>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  onClick={async () => {
                    const L = Number(inputLength);
                    if (!inputLength || Number.isNaN(L) || L <= 0) {
                      toast.error("Enter a valid reserve length");
                      return;
                    }
                    if (!selectedDrumId) {
                      toast.error("Select a drum");
                      return;
                    }
                    
                    const drum = availableCables.find((c) => c.id === Number(selectedDrumId));
                    if (!drum) {
                      toast.error("Selected drum not found");
                      return;
                    }

                    if (L > (drum.curr_length ?? 0)) {
                      toast.error(`Reserve length exceeds available length on this drum (${drum.curr_length}m)`);
                      return;
                    }

                    await addItemFromDrum(Number(selectedDrumId), String(L));
                    setInputLength("");
                    setSelectedDrumId("");
                  }}
                >
                  Add
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setInputLength("");
                    setBrandFilter(brands[0]?.id ? String(brands[0].id) : "");
                    setTypeFilter(types[0]?.id ? String(types[0].id) : "");
                    setSizeFilter("");
                    setSelectedDrumId("");
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>

          <div>
            <div className="bg-[#071025] border border-[#0b1220] rounded-md p-4">
              <h3 className="text-sm font-semibold text-white mb-2">
                Reservation List
              </h3>

              <div className="mb-3 p-2 bg-[#0047FF]/10 border border-[#0047FF]/30 rounded text-sm text-gray-300">
                <span className="text-gray-400">Reservation ID: </span>
                <span className="text-[#0047FF] font-semibold">{nextReservationId ?? "—"}</span>
              </div>

              <label className="space-y-2 text-sm text-gray-300 mb-3">
                Reference
                <Input
                  className="mb-3"
                  placeholder="Description"
                  value={reservationRef}
                  onChange={(e) => setReservationRef(e.target.value)}
                />
              </label>
              {items.length === 0 ? (
                <div className="text-sm text-gray-400 mb-4">
                  No cables added yet.
                </div>
              ) : (
                <div className="space-y-3 mb-4 max-h-[380px] overflow-auto">
                  {items.map((it) => (
                    <div
                      key={it.reserve_version}
                      className="flex items-center gap-3 bg-[#0b1220] p-3 rounded"
                    >
                      <div className="flex-1">
                        <Input
                          type="number"
                          placeholder="Length"
                          value={it.reserveLength}
                          onChange={(e) =>
                            updateItem(it.reserve_version, {
                              reserveLength: e.target.value,
                            })
                          }
                          className="w-24"
                        />
                      </div>
                      <div className=" flex flex-col w-full text-sm text-gray-400">
                        <div>
                          {brands.find((b) => String(b.id) === brandFilter)
                              ?.brand_name
                          }{" "}
                          - {types.find((i) => i.id === it.type)?.type_name}
                        </div>
                        <div>{it.drum_id}</div>
                      </div>
                      <div className="text-lg w-full flex justify-center text-white font-semibold">
                        {it.size} - {it.available}m
                      </div>
                      <Button
                        variant="destructive"
                        type="button"
                        onClick={() => removeItem(it.reserve_version)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={submitReservation}
                  disabled={submitting || items.length === 0}
                  className="flex-1"
                >
                  {submitting ? "Submitting…" : "Submit Reservation"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setItems([]);
                    setSizeFilter("");
                    setTypeFilter("");
                    setBrandFilter(brands[0]?.id ? String(brands[0].id) : "");
                    setReservationRef("");
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
