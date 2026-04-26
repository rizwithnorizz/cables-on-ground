"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { CutFilters, CutListPanel } from "./cutting";
import { LaborerDropdown } from "@/components/laborer-dropdown";
import LaborerSettings from "@/components/laborer-settings";

type DrumCable = {
  id: string;
  drum_id: string;
  brand: number;
  type: number;
  size: string;
  curr_length: number;
  initial_length: number;
  open: boolean;
  disabled: boolean;
};

type CutItem = {
  id: string;
  size: string;
  type: number;
  brand: number;
  drum_id: string;
  available: number;
  cutLength: string;
  refNo?: string;
  cut_version: number;
  reservationId?: string;
};

type Laborers = {
  id: number;
  created_at: string;
  name: string;
  mobile_no: string;
  default: boolean;
  last_initiated: string;
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

  const [laborers, setLaborers] = useState<Laborers[]>([]);
  const [selectedLaborer, setSelectedLaborer] = useState<Laborers | null>(null);
  const [openLaborSettings, setOpenLaborSettings] = useState(false);

  // ---------------------------------------------------------------------------
  // Derived: recompute each item's `available` by walking the list in order.
  // The first cut from a drum uses its stored baseline (captured at add-time,
  // before its own cut). Every subsequent cut from the same drum chains off the
  // previous: available = prev.available − prev.cutLength.
  // Removing or reordering any item automatically cascades correct values to
  // everything below it — no manual recalculation needed anywhere.
  // ---------------------------------------------------------------------------
  const itemsWithAvailable = useMemo(() => {
    // running[cableId] = available length going into the NEXT cut from that drum
    const running = new Map<string, number>();

    return items.map((item) => {
      const prev = running.get(item.id);
      // First cut from this drum → use baseline stored at add-time
      // Subsequent cuts → chain from where the previous cut left off
      const available = prev !== undefined ? prev : item.available;
      const cut = Number(item.cutLength) || 0;
      running.set(item.id, available - cut);
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
  // Send a WhatsApp initiation message to a laborer if more than 12 hours have
  // passed since the last one.
  // ---------------------------------------------------------------------------
  const checkInitiatedMessage = (date: string) => {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    return new Date(date) < twelveHoursAgo;
  };

  useEffect(() => {
    if (!selectedLaborer) return;
    if (!checkInitiatedMessage(selectedLaborer.last_initiated)) return;

    const sendInitiatedMessage = async () => {
      const response = await fetch("/api/whatsapp/send/initiate-laborer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: selectedLaborer.mobile_no,
          laborerName: selectedLaborer.name,
          laborerId: selectedLaborer.id,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error("Failed to send initiated message:", data);
      }

      const { error: supabaseError } = await supabase
        .from("laborer")
        .update({ last_initiated: new Date().toISOString() })
        .eq("id", selectedLaborer.id);
      if (supabaseError) {
        console.error("Supabase update error:", supabaseError);
      }
    };

    sendInitiatedMessage();
  }, [selectedLaborer]);

  // ---------------------------------------------------------------------------
  // Initial data load
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [typesRes, brandsRes, cablesRes, laborersRes] = await Promise.all([
          supabase.from("type").select("*").order("id", { ascending: true }),
          supabase.from("brand").select("*").order("brand_name", { ascending: true }),
          supabase.from("drum_cables").select("*").gt("curr_length", 0).order("id", { ascending: true }),
          supabase.from("laborer").select("*").order("default", { ascending: false }),
        ]);

        if (typesRes.error) throw typesRes.error;
        if (brandsRes.error) throw brandsRes.error;
        if (cablesRes.error) throw cablesRes.error;
        if (laborersRes.error) {
          toast.error("Failed to load laborers");
          throw laborersRes.error;
        }

        const laborersData = laborersRes.data ?? [];
        setLaborers(laborersData);
        setSelectedLaborer(
          laborersData.find((l) => l.default) ?? laborersData[0] ?? null,
        );
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

  // Default filters — apply once brand/type data arrives
  useEffect(() => {
    if (!brandFilter && brands.length > 0) setBrandFilter(String(brands[0].id));
    if (!typeFilter && types.length > 0) setTypeFilter(String(types[0].id));
  }, [brands, types, brandFilter, typeFilter]);

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

  // ---------------------------------------------------------------------------
  // Load items from a reservation ticket
  // ---------------------------------------------------------------------------
  const handleFindReservation = async () => {
    if (!reservationIdInput.trim()) {
      toast.error("Please enter a reservation ticket");
      return;
    }

    setIsLoadingReservation(true);
    try {
      const { data: reservations, error } = await supabase
        .from("reservation")
        .select("*")
        .eq("reservation_id", reservationIdInput);

      if (error) throw error;

      if (!reservations || reservations.length === 0) {
        toast.error("No reservations found with this ID");
        setItems([]);
        return;
      }

      setTransactionRef(reservations[0].ref_no ?? "");

      const newItems: CutItem[] = [];
      // Track the running available per cable within this batch so chained
      // reservations on the same drum are computed correctly.
      const cableRunning = new Map<string, number>();

      for (const res of reservations) {
        const { data: cable, error: cableErr } = await supabase
          .from("drum_cables")
          .select("*")
          .eq("id", res.drum_id)
          .single();

        if (cableErr) throw cableErr;
        if (!cable) continue;

        const version = nextVersion.current++;
        const prevAvailable = cableRunning.get(cable.id);
        const available = prevAvailable !== undefined ? prevAvailable : cable.curr_length;
        const cutLength = Number(res.length);

        newItems.push({
          id: cable.id,
          size: cable.size,
          type: cable.type,
          brand: cable.brand,
          drum_id: cable.drum_id,
          available,
          cutLength: String(cutLength),
          refNo: reservationIdInput,
          cut_version: version,
          reservationId: res.id,
        });

        cableRunning.set(cable.id, available - cutLength);
      }

      setItems((prev) => [...prev, ...newItems]);
      toast.success(`Found ${newItems.length} cable(s) from reservation`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load reservation");
      setItems([]);
    } finally {
      setIsLoadingReservation(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Add a drum cable to the cut list
  // ---------------------------------------------------------------------------
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
        brand: cable.brand,
        drum_id: cable.drum_id,
        available: cable.curr_length, // baseline — before this cut
        cutLength: cutLen ?? "",
        refNo: "",
        cut_version: version,
      },
    ]);

    // Briefly disable the add button to prevent accidental double-adds
    setAddedDisabled((prev) => ({ ...prev, [id]: true }));
    if (timeoutRef.current[id]) clearTimeout(timeoutRef.current[id]);
    timeoutRef.current[id] = setTimeout(() => {
      setAddedDisabled((prev) => ({ ...prev, [id]: false }));
      delete timeoutRef.current[id];
    }, 700);
  };

  // ---------------------------------------------------------------------------
  // Remove an item and return its cut length back to availableCables.
  //
  // Why we patch the next sibling's `available`:
  //   Each item stores the drum length at the moment it was added — AFTER all
  //   preceding items had already reduced `availableCables`. So item2.available
  //   is already item1.available − item1.cutLength. When item1 is removed its
  //   cut is gone, meaning item2 is now the new "first" in the chain but its
  //   stored baseline is too low by exactly item1.cutLength.
  //
  //   Fix: find the first remaining sibling from the same drum that originally
  //   sat below the removed item, and add the removed cut back to its stored
  //   `available`. The `itemsWithAvailable` memo then cascades the corrected
  //   value down the rest of the chain automatically.
  // ---------------------------------------------------------------------------
  const removeItem = (cut_version: number) => {
    const itemToRemove = items.find((i) => i.cut_version === cut_version);
    if (!itemToRemove) return;

    const cutAmount = Number(itemToRemove.cutLength);

    // Return the cut length to the local cable inventory
    setAvailableCables((prev) =>
      prev.map((c) =>
        c.id === itemToRemove.id
          ? { ...c, curr_length: c.curr_length + cutAmount }
          : c,
      ),
    );

    setItems((prev) => {
      const removedIdx = prev.findIndex((i) => i.cut_version === cut_version);
      const filtered = prev.filter((i) => i.cut_version !== cut_version);

      // Find the first remaining sibling from the same drum that originally
      // came after the removed item in the list
      const nextSiblingIdx = filtered.findIndex((item) => {
        if (item.id !== itemToRemove.id) return false;
        const origIdx = prev.findIndex((p) => p.cut_version === item.cut_version);
        return origIdx > removedIdx;
      });

      if (nextSiblingIdx === -1) return filtered;

      // Restore the removed cut to the sibling's stored baseline so the
      // `itemsWithAvailable` memo starts the chain from the correct value
      const result = [...filtered];
      result[nextSiblingIdx] = {
        ...result[nextSiblingIdx],
        available: result[nextSiblingIdx].available + cutAmount,
      };
      return result;
    });
  };

  const updateItem = (cut_version: number, patch: Partial<CutItem>) =>
    setItems((prev) =>
      prev.map((i) => (i.cut_version === cut_version ? { ...i, ...patch } : i)),
    );

  // ---------------------------------------------------------------------------
  // WhatsApp notification
  // ---------------------------------------------------------------------------
  const sendWhatsAppMessage = async (cutItems: CutItem[]) => {
    const response = await fetch("/api/whatsapp/send/cut-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionRef,
        phoneNumber: selectedLaborer?.mobile_no,
        items: cutItems,
        brands,
        types,
        laborerName: selectedLaborer?.name,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to send WhatsApp message");
    return data;
  };

  // ---------------------------------------------------------------------------
  // Submit cuts
  // ---------------------------------------------------------------------------
  const submitCuts = async () => {
    if (items.length === 0) {
      toast.error("Add at least one cable to cut.");
      return;
    }
    if (!selectedLaborer) {
      toast.error("Please select a laborer.");
      return;
    }
    if (!transactionRef) {
      toast.error("Please enter a reference number for this cut list.");
      return;
    }

    // Validate each item against its computed available (from the live chain)
    for (const it of itemsWithAvailable) {
      const amt = Number(it.cutLength);
      if (!it.cutLength || Number.isNaN(amt) || amt <= 0) {
        toast.error(`Invalid cut length for ${it.drum_id}`);
        return;
      }
      if (amt > it.available) {
        toast.error(`Cut length for ${it.drum_id} exceeds available length`);
        return;
      }
    }

    setSubmitting(true);
    try {
      for (const it of itemsWithAvailable) {
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
          .insert([{
            drum_id: it.id,
            length_cut: amt,
            balance_cable: newBalance,
            ref_no: transactionRef || null,
          }]);
        if (insertErr) throw insertErr;

        const { data: updatedCable, error: updateErr } = await supabase
          .from("drum_cables")
          .update({ curr_length: newBalance })
          .eq("id", it.id)
          .select()
          .single();
        if (updateErr) throw updateErr;

        // Mark drum as open on first cut
        if (updatedCable && updatedCable.open === false) {
          const { error: openErr } = await supabase
            .from("drum_cables")
            .update({ open: true })
            .eq("id", it.id);
          if (openErr) throw openErr;
        }

        // Clear reservation if this cut came from one
        if (reservationIdInput && it.reservationId) {
          const { error: deleteErr } = await supabase
            .from("reservation")
            .delete()
            .eq("id", it.reservationId);
          if (deleteErr) throw deleteErr;

          // Remove the `reserved` flag from the drum if no other reservations remain
          const { data: otherReservation } = await supabase
            .from("reservation")
            .select("id")
            .eq("drum_id", it.id)
            .limit(1)
            .single();

          if (!otherReservation) {
            const { error: unreserveErr } = await supabase
              .from("drum_cables")
              .update({ reserved: false })
              .eq("id", it.id);
            if (unreserveErr) throw unreserveErr;
          }
        }
      }

      const waResponse = await sendWhatsAppMessage(itemsWithAvailable);
      if (waResponse.error) toast.error("Failed to send WhatsApp message");

      toast.success("Cuts recorded successfully.");

      // Reset form state
      setItems([]);
      setReservationIdInput("");
      setTransactionRef("");
      setInputLength("");

      // Refresh cable inventory
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

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const resetFilters = () => {
    setInputLength("");
    setBrandFilter(brands[0]?.id ? String(brands[0].id) : "");
    setTypeFilter(types[0]?.id ? String(types[0].id) : "");
    setSizeFilter("");
  };

  const clearAll = () => {
    setItems([]);
    setSizeFilter("");
    setTypeFilter("");
    setBrandFilter(brands[0]?.id ? String(brands[0].id) : "");
    setTransactionRef("");
    setReservationIdInput("");
  };

  // ---------------------------------------------------------------------------
  // Add-from-filter handler (selects the best drum automatically)
  // ---------------------------------------------------------------------------
  const handleAddClick = async () => {
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
        String(c.brand) === brandFilter &&
        String(c.type) === typeFilter &&
        c.size === sizeFilter &&
        (c.curr_length ?? 0) > 0,
    );

    if (candidates.length === 0) {
      toast.error("No available drums for selected brand/type/size");
      return;
    }

    // Fetch reservations for each candidate drum
    const candidatesWithReservations = await Promise.all(
      candidates.map(async (candidate) => {
        const { data: reservations, error } = await supabase
          .from("reservation")
          .select("length")
          .eq("drum_id", candidate.id);
        if (error) throw error;
        const totalReserved = reservations?.reduce((sum, r) => sum + (r.length ?? 0), 0) ?? 0;
        return { cable: candidate, reservationLength: totalReserved };
      }),
    );

    const reservationMap = new Map(
      candidatesWithReservations.map(({ cable, reservationLength }) => [
        cable.id,
        reservationLength,
      ]),
    );

    // Exclude disabled drums and drums whose full length is reserved
    const validCandidates = candidatesWithReservations
      .filter(({ cable, reservationLength }) => {
        const available = (cable.curr_length ?? 0) - reservationLength;
        return available > 0 && !cable.disabled;
      })
      .map(({ cable }) => cable);

    if (validCandidates.length === 0) {
      toast.error("No available drums (all have unmet reservations)");
      return;
    }

    // Keep only drums that have enough unreserved length for this cut
    const enough = validCandidates.filter((c) => {
      const totalReserved = reservationMap.get(c.id) ?? 0;
      return (c.curr_length ?? 0) - totalReserved >= L;
    });

    if (enough.length === 0) {
      toast.error("No single drum has sufficient length to satisfy this cut");
      return;
    }

    // Prefer already-opened drums (partially used); within that group pick the
    // shortest remaining so we empty drums before opening fresh ones.
    const opened = enough.filter((c) => c.open === true);
    let chosen: DrumCable;

    if (opened.length > 0) {
      chosen = opened.reduce((a, b) =>
        (a.curr_length ?? 0) <= (b.curr_length ?? 0) ? a : b,
      );
    } else {
      // No opened drums — pick the largest unopened one
      chosen = enough.reduce((a, b) =>
        (a.curr_length ?? 0) >= (b.curr_length ?? 0) ? a : b,
      );
    }

    // Optimistically reduce the drum's length in local state
    setAvailableCables((prev) =>
      prev.map((c) =>
        c.id === chosen.id ? { ...c, curr_length: (c.curr_length ?? 0) - L } : c,
      ),
    );

    addItemFromDrum(chosen.id, String(L));
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="p-8 mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold dark:text-white text-blue-500">Cutting</h1>
      </div>

      <div className="space-y-6 bg-card dark:bg-[#111827]/80 border border-[#0047FF]/30 rounded-3xl p-8 shadow-lg shadow-[#0047FF]/10">
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
            onAddClick={handleAddClick}
            onResetClick={resetFilters}
          />

          <div>
            <CutListPanel
              items={itemsWithAvailable}
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
              onClear={clearAll}
            />

            <div className="mt-4">
              <LaborerDropdown
                laborers={laborers}
                selectedLaborer={selectedLaborer}
                onLaborerChange={setSelectedLaborer}
                onOpenSettings={() => setOpenLaborSettings(true)}
              />
            </div>
          </div>
        </div>
      </div>

      <LaborerSettings
        isOpen={openLaborSettings}
        onClose={() => setOpenLaborSettings(false)}
        onLaborersUpdated={(updatedLaborers) => {
          setLaborers(updatedLaborers);
          if (!updatedLaborers.find((l) => l.id === selectedLaborer?.id)) {
            setSelectedLaborer(
              updatedLaborers.find((l) => l.default) ?? updatedLaborers[0] ?? null,
            );
          } else {
            const updated = updatedLaborers.find((l) => l.id === selectedLaborer?.id);
            if (updated) setSelectedLaborer(updated);
          }
        }}
      />
    </div>
  );
}