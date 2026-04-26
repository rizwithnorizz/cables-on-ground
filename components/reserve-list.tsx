"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { ReserveFilters, ReserveListPanel } from "./reservations";

type DrumCable = {
  id: number;
  drum_id: string;
  brand: number;
  type: number;
  size: string;
  curr_length: number;
  available: number;
  initial_length: number;
  disabled: boolean;
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

  // ---------------------------------------------------------------------------
  // Derived: recompute each item's `available` by walking the list in order.
  // The first reservation from a drum uses its stored baseline (captured at
  // add-time, before its own reservation). Every subsequent reservation from
  // the same drum chains: available = prev.available − prev.reserveLength.
  // Removing any item automatically cascades correct values to everything
  // below it — no manual recalculation needed anywhere.
  // ---------------------------------------------------------------------------
  const itemsWithAvailable = useMemo(() => {
    // running[drumId] = available length going into the NEXT reservation from that drum
    const running = new Map<number, number>();

    return items.map((item) => {
      const prev = running.get(item.id);
      // First reservation from this drum → use baseline stored at add-time
      // Subsequent reservations → chain from where the previous one left off
      const available = prev !== undefined ? prev : item.available;
      const reserve = Number(item.reserveLength) || 0;
      running.set(item.id, available - reserve);
      return { ...item, available };
    });
  }, [items]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutRef.current).forEach(clearTimeout);
      timeoutRef.current = {};
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Initial data load
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [typesRes, brandsRes, cablesRes, reservationsRes] = await Promise.all([
          supabase.from("type").select("*").order("id", { ascending: true }),
          supabase.from("brand").select("*").order("brand_name", { ascending: true }),
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

        if (typesRes.error) throw typesRes.error;
        if (brandsRes.error) throw brandsRes.error;
        if (cablesRes.error) throw cablesRes.error;
        if (reservationsRes.error) throw reservationsRes.error;

        // Build map of drum_id → total reserved length (single pass)
        const reservationMap = new Map<number, number>();
        (reservationsRes.data ?? []).forEach((res) => {
          const current = reservationMap.get(res.drum_id) ?? 0;
          reservationMap.set(res.drum_id, current + (res.length ?? 0));
        });

        // Subtract existing reservations from each drum's available length
        const cablesWithAvailable = (cablesRes.data ?? []).map((cable) => ({
          ...cable,
          available: cable.curr_length - (reservationMap.get(cable.id) ?? 0),
        }));

        setTypes(typesRes.data ?? []);
        setBrands(brandsRes.data ?? []);
        // Only show drums that still have unreserved length
        setAvailableCables(cablesWithAvailable.filter((c) => c.available > 0));
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

  // Default filters — apply once brand/type data arrives
  useEffect(() => {
    if (!brandFilter && brands.length > 0) setBrandFilter(String(brands[0].id));
    if (!typeFilter && types.length > 0) setTypeFilter(String(types[0].id));
  }, [brands, types, brandFilter, typeFilter]);

  // Clear selected drum when filters change
  useEffect(() => {
    setSelectedDrumId("");
  }, [brandFilter, typeFilter, sizeFilter]);

  // Fetch the next reservation ID on mount
  useEffect(() => {
    const getNextID = async () => {
      const { data } = await supabase
        .from("reservation")
        .select("id")
        .order("id", { ascending: false })
        .limit(1)
        .single();
      setNextReservationId(((data?.id ?? 0) + 1) + 10000);
    };
    getNextID();
  }, []);

  // ---------------------------------------------------------------------------
  // Available sizes derived from current filter selections
  // ---------------------------------------------------------------------------
  const availableSizes = useMemo(() => {
    const set = new Set<string>();
    for (const c of availableCables) {
      if (brandFilter && String(c.brand) !== brandFilter) continue;
      if (typeFilter && String(c.type) !== typeFilter) continue;
      set.add(c.size);
    }
    return Array.from(set).sort();
  }, [availableCables, brandFilter, typeFilter]);

  const drumsMatchingFilters = useMemo(() => {
    return availableCables.filter((c) => {
      if (brandFilter && String(c.brand) !== brandFilter) return false;
      if (typeFilter && String(c.type) !== typeFilter) return false;
      if (sizeFilter && c.size !== sizeFilter) return false;
      if (c.disabled) return false;
      return (c.curr_length ?? 0) > 0;
    });
  }, [availableCables, brandFilter, typeFilter, sizeFilter]);

  // ---------------------------------------------------------------------------
  // Add a drum cable to the reservation list
  // ---------------------------------------------------------------------------
  const addItemFromDrum = (id: number, reserveLen?: string) => {
    if (!id) return;
    const cable = availableCables.find((c) => c.id === id);
    if (!cable) return;

    const version = nextVersion.current++;
    setItems((prev) => [
      ...prev,
      {
        id: cable.id,
        drum_id: cable.drum_id,
        brand: cable.brand,
        type: cable.type,
        available: cable.curr_length, // baseline — before this reservation
        size: cable.size,
        reserveLength: reserveLen ?? "",
        reservationRef: "",
        reserve_version: version,
      },
    ]);

    // Briefly disable the add button to prevent accidental double-adds
    const key = String(id);
    if (timeoutRef.current[key]) clearTimeout(timeoutRef.current[key]);
    setAddedDisabled((prev) => ({ ...prev, [key]: true }));
    timeoutRef.current[key] = setTimeout(() => {
      setAddedDisabled((prev) => ({ ...prev, [key]: false }));
      delete timeoutRef.current[key];
    }, 700);
  };

  // ---------------------------------------------------------------------------
  // Remove an item and return its reserved length back to availableCables.
  //
  // Why we patch the next sibling's `available`:
  //   Each item stores the drum length at the moment it was added — AFTER all
  //   preceding items had already reduced `availableCables`. So item2.available
  //   is already item1.available − item1.reserveLength. When item1 is removed
  //   its reservation is gone, meaning item2 is now the new "first" in the
  //   chain but its stored baseline is too low by exactly item1.reserveLength.
  //
  //   Fix: find the first remaining sibling from the same drum that originally
  //   sat below the removed item, and add the removed reservation back to its
  //   stored `available`. The `itemsWithAvailable` memo then cascades the
  //   corrected value down the rest of the chain automatically.
  // ---------------------------------------------------------------------------
  const removeItem = (reserve_version: number) => {
    const itemToRemove = items.find((i) => i.reserve_version === reserve_version);
    if (!itemToRemove) return;

    const reserveAmount = Number(itemToRemove.reserveLength);

    // Return the reserved length to the local cable inventory
    setAvailableCables((prev) =>
      prev.map((c) =>
        c.id === itemToRemove.id
          ? { ...c, available: c.available + reserveAmount, curr_length: c.curr_length + reserveAmount }
          : c,
      ),
    );

    setItems((prev) => {
      const removedIdx = prev.findIndex((i) => i.reserve_version === reserve_version);
      const filtered = prev.filter((i) => i.reserve_version !== reserve_version);

      // Find the first remaining sibling from the same drum that originally
      // came after the removed item in the list
      const nextSiblingIdx = filtered.findIndex((item) => {
        if (item.id !== itemToRemove.id) return false;
        const origIdx = prev.findIndex((p) => p.reserve_version === item.reserve_version);
        return origIdx > removedIdx;
      });

      if (nextSiblingIdx === -1) return filtered;

      // Restore the removed reservation to the sibling's stored baseline so
      // the `itemsWithAvailable` memo starts the chain from the correct value
      const result = [...filtered];
      result[nextSiblingIdx] = {
        ...result[nextSiblingIdx],
        available: result[nextSiblingIdx].available + reserveAmount,
      };
      return result;
    });
  };

  const updateItem = (reserve_version: number, patch: Partial<ReserveItem>) =>
    setItems((prev) =>
      prev.map((i) => (i.reserve_version === reserve_version ? { ...i, ...patch } : i)),
    );

  // ---------------------------------------------------------------------------
  // Submit reservations
  // ---------------------------------------------------------------------------
  const submitReservation = async () => {
    if (items.length === 0) {
      toast.error("Add at least one cable to reserve.");
      return;
    }

    // Validate against the live computed chain
    for (const it of itemsWithAvailable) {
      const amt = Number(it.reserveLength);
      if (!it.reserveLength || Number.isNaN(amt) || amt <= 0) {
        toast.error(`Invalid reserve length for ${it.drum_id}`);
        return;
      }
      if (amt > it.available) {
        toast.error(`Reserve length for ${it.drum_id} exceeds available length`);
        return;
      }
    }

    if (!reservationRef) {
      toast.error("Please enter a reference number for this reservation.");
      return;
    }

    setSubmitting(true);
    try {
      for (const it of itemsWithAvailable) {
        const amt = Number(it.reserveLength);

        const { error: insertErr } = await supabase.from("reservation").insert([
          {
            drum_id: it.id,
            length: amt,
            ref_no: reservationRef || null,
            reservation_id: nextReservationId,
          },
        ]);
        if (insertErr) throw insertErr;

        const { error: updateErr } = await supabase
          .from("drum_cables")
          .update({ reserved: true })
          .eq("id", it.id);
        if (updateErr) throw updateErr;
      }

      toast.success("Reservation recorded successfully.");
      setItems([]);
      setReservationRef("");
      setNextReservationId(Math.floor(Math.random() * 100000));
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit reservation");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Add-from-filter handler
  // ---------------------------------------------------------------------------
  const handleAddClick = async () => {
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
    if (L > (drum.available ?? 0)) {
      toast.error(`Reserve length exceeds available length on this drum (${drum.available}m)`);
      return;
    }

    // Optimistically reduce both available and curr_length in local state
    setAvailableCables((prev) =>
      prev.map((c) =>
        c.id === Number(selectedDrumId)
          ? { ...c, available: (c.available ?? 0) - L, curr_length: (c.curr_length ?? 0) - L }
          : c,
      ),
    );

    addItemFromDrum(Number(selectedDrumId), String(L));
    setInputLength("");
    setSelectedDrumId("");
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="p-8 mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold dark:text-white text-blue-500">Reserve</h1>
        <p className="mt-2 text-gray-400 dark:text-gray-400">
          Select cables to reserve. Filters limit available brands, types and sizes.
        </p>
      </div>

      <div className="space-y-6 bg-card dark:bg-[#111827]/80 border border-[#0047FF]/30 rounded-3xl p-8 shadow-lg shadow-[#0047FF]/10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ReserveFilters
            brands={brands}
            types={types}
            availableSizes={availableSizes}
            availableCables={drumsMatchingFilters}
            brandFilter={brandFilter}
            typeFilter={typeFilter}
            sizeFilter={sizeFilter}
            inputLength={inputLength}
            selectedDrumId={selectedDrumId}
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
            onDrumSelect={setSelectedDrumId}
            onAddClick={handleAddClick}
            onResetClick={() => {
              setInputLength("");
              setBrandFilter(brands[0]?.id ? String(brands[0].id) : "");
              setTypeFilter(types[0]?.id ? String(types[0].id) : "");
              setSizeFilter("");
              setSelectedDrumId("");
            }}
          />

          <ReserveListPanel
            items={itemsWithAvailable}
            selectedDrumId={selectedDrumId}
            reservationRef={reservationRef}
            nextReservationId={nextReservationId}
            brands={brands}
            types={types}
            submitting={submitting}
            onDrumSelect={setSelectedDrumId}
            onReservationRefChange={setReservationRef}
            onLengthChange={(reserveVersion, value) =>
              updateItem(reserveVersion, { reserveLength: value })
            }
            onRemoveItem={removeItem}
            onSubmit={submitReservation}
            onClear={() => {
              setItems([]);
              setSizeFilter("");
              setTypeFilter("");
              setBrandFilter(brands[0]?.id ? String(brands[0].id) : "");
              setReservationRef("");
            }}
          />
        </div>
      </div>
    </div>
  );
}