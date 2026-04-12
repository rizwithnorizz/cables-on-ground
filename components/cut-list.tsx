"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type DrumCable = {
  id: string;
  drum_id: string;
  brand: number;
  type: number;
  size: string;
  curr_length: number;
  initial_length: number;
};

type CutItem = {
  id: string;
  size: string;
  type: number;
  drum_id: string;
  available: number;
  cutLength: string;
  refNo?: string;
  cut_version: number;
};

type Transaction = {
  refNo: string;
  items: CutItem[];
};

type CableType = { id: number; type_name: string };
type CableBrand = { id: number; brand_name: string };

export default function CutList() {
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

  const [items, setItems] = useState<CutItem[]>([]);
  const nextVersion = useRef(1);
  const [addedDisabled, setAddedDisabled] = useState<Record<string, boolean>>(
    {},
  );
  const [transactionRef, setTransactionRef] = useState("");
  const [reservationIdInput, setReservationIdInput] = useState<string>("");
  const [isLoadingReservation, setIsLoadingReservation] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [typesRes, brandsRes, cablesRes] = await Promise.all([
          supabase.from("type").select("*").order("id", { ascending: true }),
          supabase
            .from("brand")
            .select("*")
            .order("brand_name", { ascending: true }),
          supabase
            .from("drum_cables")
            .select("*")
            .gt("curr_length", 0)
            .order("id", { ascending: true }),
        ]);

        if (typesRes.error || brandsRes.error || cablesRes.error) {
          throw typesRes.error || brandsRes.error || cablesRes.error;
        }

        setTypes(typesRes.data ?? []);
        setBrands(brandsRes.data ?? []);
        setAvailableCables(cablesRes.data ?? []);
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
  }, [supabase]);

  // default filters
  useEffect(() => {
    if (!brandFilter && brands.length > 0) setBrandFilter(String(brands[0].id));
    if (!typeFilter && types.length > 0) setTypeFilter(String(types[0].id));
  }, [brands, types, brandFilter, typeFilter]);

  const brandMap = useMemo(
    () => Object.fromEntries(brands.map((b) => [b.id, b.brand_name])),
    [brands],
  );
  const typeMap = useMemo(
    () => Object.fromEntries(types.map((t) => [t.id, t.type_name])),
    [types],
  );

  const cablesFilteredByBrand = useMemo(() => {
    if (!brandFilter) return availableCables;
    return availableCables.filter(
      (c) => String(c.brand) === String(brandFilter),
    );
  }, [availableCables, brandFilter]);

  const availableTypes = useMemo(() => {
    const setIds = new Set<number>();
    cablesFilteredByBrand.forEach((c) => setIds.add(c.type));
    return types.filter((t) => setIds.has(t.id));
  }, [cablesFilteredByBrand, types]);

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

  const handleFindReservation = async () => {
    if (!reservationIdInput.trim()) {
      toast.error("Please enter a reservation ID");
      return;
    }

    setIsLoadingReservation(true);
    try {
      const { data: reservations, error } = await supabase
        .from("reservation")
        .select("*")
        .eq("reservation_id", reservationIdInput);

      if (error) throw error;
      if (reservations.length > 0) {
        setTransactionRef(reservations[0].ref_no ?? "");
      }
      if (reservations && reservations.length > 0) {
        const newItems: CutItem[] = [];
        for (const res of reservations) {
          const { data: cable, error: cableErr } = await supabase
            .from("drum_cables")
            .select("*")
            .eq("id", res.drum_id)
            .single();

          if (cableErr) throw cableErr;
          if (cable) {
            const version = nextVersion.current++;
            newItems.push({
              id: cable.id,
              size: cable.size,
              type: cable.type,
              drum_id: cable.drum_id,
              available: cable.curr_length,
              cutLength: String(res.length),
              refNo: reservationIdInput,
              cut_version: version,
            });
          }
        }
        setItems(newItems);
        toast.success(`Found ${newItems.length} cable(s) from reservation`);
      } else {
        toast.error("No reservations found with this ID");
        setItems([]);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load reservation",
      );
      setItems([]);
    } finally {
      setIsLoadingReservation(false);
    }
  };

  const addItemFromDrum = (id: string, cutLen?: string) => {
    console.log(id, cutLen);
    if (!id) return;
    const cable = availableCables.find((c) => c.id === id);
    if (!cable) return;
    const version = nextVersion.current++;
    setItems((prev) => [
      ...prev,
      {
        id: cable.id,
        size: cable.size,
        type: cable.type,
        drum_id: cable.drum_id,
        available: cable.curr_length,
        cutLength: cutLen ?? "",
        refNo: "",
        cut_version: version,
      },
    ]);
    setAddedDisabled((prev) => ({ ...prev, [id]: true }));
    setTimeout(
      () => setAddedDisabled((prev) => ({ ...prev, [id]: false })),
      700,
    );
  };

  const removeItem = (cut_version: number) =>
    setItems((prev) => prev.filter((i) => i.cut_version !== cut_version));
  const updateItem = (cut_version: number, patch: Partial<CutItem>) =>
    setItems((prev) =>
      prev.map((i) => (i.cut_version === cut_version ? { ...i, ...patch } : i)),
    );

  const submitCuts = async () => {
    if (items.length === 0) {
      toast.error("Add at least one cable to cut.");
      return;
    }

    for (const it of items) {
      const amt = Number(it.cutLength);
      if (!it.cutLength || Number.isNaN(amt) || amt <= 0) {
        toast.error(`Invalid cut length for ${it.drum_id}`);
        return;
      }
      if (amt > it.available) {
        toast.error(`Cut length for ${it.id} exceeds available length`);
        return;
      }
    }

    setSubmitting(true);
    try {
      if (!transactionRef) {
        toast.error("Please enter a reference number for this cut list.");
        setSubmitting(false);
        return;
      }

      for (const it of items) {
        const amt = Number(it.cutLength);
        const { data: cableRow, error: fetchErr } = await supabase
          .from("drum_cables")
          .select("*")
          .eq("id", it.id)
          .limit(1)
          .single();
        if (fetchErr) throw fetchErr;
        const newBalance = (cableRow.curr_length ?? 0) - amt;
        const { error: insertErr } = await supabase
          .from("cable_transactions")
          .insert([
            {
              drum_id: it.id,
              length_cut: amt,
              balance_cable: newBalance,
              ref_no: transactionRef || null,
            },
          ]);
        if (insertErr) throw insertErr;
        const { error: updateErr } = await supabase
          .from("drum_cables")
          .update({ curr_length: newBalance })
          .eq("id", it.id);
        if (updateErr) throw updateErr;
      }

      // delete reservation if one was loaded
      if (reservationIdInput) {
        const { error: resErr } = await supabase  
          .from("reservation")
          .select("*")
          .eq("reservation_id", reservationIdInput);
        if (resErr) throw resErr;
        
        for (const it of items) {
          const { error: deleteErr } = await supabase
            .from("reservation")
            .delete()
            .eq("reservation_id", reservationIdInput)
            .eq("drum_id", it.id);
          if (deleteErr) throw deleteErr;
          const { error: updateErr } = await supabase
            .from("drum_cables")
            .update({ reserved: false })
            .eq("id", it.id);
          if (updateErr) throw updateErr;
        }
      }

      toast.success("Cuts recorded successfully.");
      setItems([]);
      setReservationIdInput("");

      const { data } = await supabase
        .from("drum_cables")
        .select("*")
        .gt("curr_length", 0)
        .order("id", { ascending: true });
      setAvailableCables(data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit cuts");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Cutting</h1>
        <p className="mt-2 text-gray-400">
          Select cables to cut. Filters limit available brands, types and sizes.
        </p>
      </div>

      <div className="space-y-6 bg-[#111827]/80 border border-[#0047FF]/30 rounded-3xl p-8 shadow-lg shadow-[#0047FF]/10">
        {/* Notifications are shown via react-hot-toast */}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-5">
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
                  <div className="text-sm text-gray-500">
                    No sizes available
                  </div>
                ) : (
                  availableSizes
                    .sort((a, b) => {
                      const [numA1, numA2] = a.split("x").map(Number);
                      const [numB1, numB2] = b.split("x").map(Number);
                      return numA1 !== numB1 ? numA1 - numB1 : numA2 - numB2;
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

            <div className="mb-4">
              <label className="space-y-2 text-sm text-gray-300">
                Length to cut (m)
                <Input
                  type="number"
                  placeholder="Length to cut"
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
                      toast.error("Enter a valid cut length");
                      return;
                    }
                    if (!brandFilter || !typeFilter || !sizeFilter) {
                      toast.error("Select brand, type and size");
                      return;
                    }

                    const candidates = availableCables.filter(
                      (c) =>
                        String(c.brand) === String(brandFilter) &&
                        String(c.type) === String(typeFilter) &&
                        c.size === sizeFilter &&
                        (c.curr_length ?? 0) > 0,
                    );
                    if (candidates.length === 0) {
                      toast.error(
                        "No available drums for selected brand/type/size",
                      );
                      return;
                    }

                    const enough = candidates.filter(
                      (c) => (c.curr_length ?? 0) >= L,
                    );
                    let chosen: DrumCable | null = null;

                    if (enough.length > 0) {
                      const opened = enough.filter(
                        (c) => (c.initial_length ?? 0) > (c.curr_length ?? 0),
                      );
                      console.log(opened);
                      const pool = opened.length > 0 ? opened : enough;
                      pool.sort(
                        (a, b) => (a.curr_length ?? 0) - (b.curr_length ?? 0),
                      );
                      chosen = pool[0];
                    } else {
                      toast.error(
                        "No single drum has sufficient length to satisfy this cut",
                      );
                      return;
                    }

                    addItemFromDrum(chosen.id, String(L));
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
                Cut List
              </h3>
              <div className="mb-3 p-2 bg-[#0047FF]/10 border border-[#0047FF]/30 rounded text-sm text-gray-300">
                <label className="space-y-2 text-sm text-gray-300 mb-3 w-full">
                  Enter Reservation ID
                  <div className="flex gap-2">
                    <Input
                      className="flex-1"
                      placeholder="Reservation ID"
                      value={reservationIdInput}
                      onChange={(e) => setReservationIdInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleFindReservation();
                        }
                      }}
                    />
                    <Button
                      onClick={handleFindReservation}
                      disabled={isLoadingReservation}
                      className="px-4"
                    >
                      {isLoadingReservation ? "Finding…" : "Find"}
                    </Button>
                  </div>
                </label>
              </div>
              <label className="space-y-2 text-sm text-gray-300 mb-3">
                Reference
                <Input
                  className="mb-3"
                  placeholder="Reference/Description"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
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
                      key={it.cut_version}
                      className="flex items-center gap-3 bg-[#0b1220] p-3 rounded"
                    >
                      <div className="flex-1">
                        <Input
                          type="number"
                          placeholder="Length"
                          value={it.cutLength}
                          onChange={(e) =>
                            updateItem(it.cut_version, {
                              cutLength: e.target.value,
                            })
                          }
                          className="w-24"
                        />
                      </div>
                      <div className="">
                        {
                          brands.find((b) => String(b.id) === brandFilter)
                            ?.brand_name
                        }{" "}
                        - {types.find((i) => i.id === it.type)?.type_name}
                      </div>
                      <div className="text-lg text-white font-semibold">
                        {it.size} - {it.available}m
                      </div>
                      <div className="text-xs text-gray-400">{it.drum_id}</div>
                      <Button
                        variant="destructive"
                        type="button"
                        onClick={() => removeItem(it.cut_version)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={submitCuts}
                  disabled={submitting || items.length === 0}
                  className="flex-1"
                >
                  {submitting ? "Submitting…" : "Submit Cuts"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setItems([]);
                    setSizeFilter("");
                    setTypeFilter("");
                    setBrandFilter(brands[0]?.id ? String(brands[0].id) : "");
                    setTransactionRef("");
                    setReservationIdInput("");
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
