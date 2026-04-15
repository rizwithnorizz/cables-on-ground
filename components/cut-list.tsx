"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { CutFilters, CutListPanel } from "./cutting";


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
  const [addedDisabled, setAddedDisabled] = useState<Record<string, boolean>>({});
  const timeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const [transactionRef, setTransactionRef] = useState("");
  const [reservationIdInput, setReservationIdInput] = useState<string>("");
  const [isLoadingReservation, setIsLoadingReservation] = useState(false);

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
  }, []);

  // default filters
  useEffect(() => {
    if (!brandFilter && brands.length > 0) setBrandFilter(String(brands[0].id));
    if (!typeFilter && types.length > 0) setTypeFilter(String(types[0].id));
  }, [brands, types, brandFilter, typeFilter]);

  const availableSizes = useMemo(() => {
    const setS = new Set<string>();
    availableCables.forEach((c) => {
      if (brandFilter && String(c.brand) !== String(brandFilter)) return;
      if (typeFilter && String(c.type) !== String(typeFilter)) return;
      setS.add(c.size);
    });
    return Array.from(setS).sort();
  }, [availableCables, brandFilter, typeFilter]);

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
            setItems((prev) => [
              ...prev,
              {
                id: cable.id,
                size: cable.size,
                type: cable.type,
                drum_id: cable.drum_id,
                available: cable.curr_length,
                cutLength: String(res.length),
                refNo: reservationIdInput,
                cut_version: version,
              },
            ]);
          }
        }
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
    
    // Clear previous timeout if exists
    if (timeoutRef.current[id]) {
      clearTimeout(timeoutRef.current[id]);
    }
    
    // Store new timeout for cleanup on unmount
    timeoutRef.current[id] = setTimeout(() => {
      setAddedDisabled((prev) => ({ ...prev, [id]: false }));
      delete timeoutRef.current[id];
    }, 700);
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
      setTransactionRef("");
      setInputLength("");

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
          <CutFilters
            brands={brands}
            types={types}
            availableSizes={availableSizes}
            brandFilter={brandFilter}
            typeFilter={typeFilter}
            sizeFilter={sizeFilter}
            inputLength={inputLength}
            onBrandChange={(value) => {
              setBrandFilter(value);
              setTypeFilter("");
              setSizeFilter("");
            }}
            onTypeChange={(value) => {
              setTypeFilter(value);
              setSizeFilter("");
            }}
            onSizeChange={setSizeFilter}
            onLengthChange={setInputLength}
            onAddClick={async () => {
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

              // Check reservations for each candidate
              const candidatesWithReservations = await Promise.all(
                candidates.map(async (candidate) => {
                  const { data: reservations, error } = await supabase
                    .from("reservation")
                    .select("length")
                    .eq("drum_id", candidate.id);

                  if (error) throw error;
                  return {
                    cable: candidate,
                    hasReservation: reservations && reservations.length > 0,
                    reservationLength: reservations?.[0]?.length ?? 0,
                  };
                }),
              );

              // Filter candidates: exclude drums with unmet reservations
              const validCandidates = candidatesWithReservations
                .filter(({ cable, hasReservation, reservationLength }) => {
                  // If drum has a reservation, check if available length meets it
                  if (hasReservation) {
                    return (cable.curr_length ?? 0) > reservationLength;
                  }
                  return true;
                })
                .map(({ cable }) => cable);
              console.log(validCandidates);
              if (validCandidates.length === 0) {
                toast.error(
                  "No available drums (all have unmet reservations)",
                );
                return;
              }

              const enough = validCandidates.filter(
                (c) => (c.curr_length ?? 0) >= L,
              );
              let chosen: DrumCable | null = null;

              if (enough.length > 0) {
                // Prefer opened drums (ones that have been partially used)
                const opened = enough.filter(
                  (c) => (c.initial_length ?? 0) > (c.curr_length ?? 0),
                );
                
                if (opened.length > 0) {
                  // Sort opened drums by remaining length (pick one with least remaining)
                  opened.sort(
                    (a, b) => (a.curr_length ?? 0) - (b.curr_length ?? 0),
                  );
                  chosen = opened[0];
                } else {
                  // No opened drums, pick the biggest unopened drum
                  enough.sort(
                    (a, b) => (b.curr_length ?? 0) - (a.curr_length ?? 0),
                  );
                  chosen = enough[0];
                }
              } else {
                toast.error(
                  "No single drum has sufficient length to satisfy this cut",
                );
                return;
              }
              addItemFromDrum(chosen.id, String(L));
            }}
            onResetClick={() => {
              setInputLength("");
              setBrandFilter(brands[0]?.id ? String(brands[0].id) : "");
              setTypeFilter(types[0]?.id ? String(types[0].id) : "");
              setSizeFilter("");
            }}
          />

          <CutListPanel
            items={items}
            transactionRef={transactionRef}
            reservationIdInput={reservationIdInput}
            isLoadingReservation={isLoadingReservation}
            brands={brands}
            types={types}
            submitting={submitting}
            onReservationIdChange={setReservationIdInput}
            onFindReservation={handleFindReservation}
            onTransactionRefChange={setTransactionRef}
            onLengthChange={(cutVersion, value) =>
              updateItem(cutVersion, { cutLength: value })
            }
            onRemoveItem={removeItem}
            onSubmit={submitCuts}
            onClear={() => {
              setItems([]);
              setSizeFilter("");
              setTypeFilter("");
              setBrandFilter(brands[0]?.id ? String(brands[0].id) : "");
              setTransactionRef("");
              setReservationIdInput("");
            }}
          />
        </div>
      </div>
    </div>
  );
}
