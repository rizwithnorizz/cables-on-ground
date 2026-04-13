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

type BrandOption = {
  id: number | string;
  brand_name: string;
};

type TypeOption = {
  id: number | string;
  type_name: string;
};

type SmallCable = {
  id: bigint;
  drum_id: string;
  brand: number;
  type: number;
  size: string;
  testcertificate: string;
};

export default function CableModal({
  cable,
  onClose,
  brandName,
  typeName,
  onDelete,
}: {
  cable: DrumCable | null;
  onClose: () => void;
  brandName?: string;
  typeName?: string;
  onDelete?: (cableId: bigint) => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCurrLength, setEditedCurrLength] = useState<number>(cable?.curr_length ?? 0);
  const [editedInitialLength, setEditedInitialLength] = useState<number>(cable?.initial_length ?? 0);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDraggingCert, setIsDraggingCert] = useState(false);
  const [isRemovingCert, setIsRemovingCert] = useState(false);
  const [selectedCertFile, setSelectedCertFile] = useState<File | null>(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editedDrumId, setEditedDrumId] = useState<string>(cable?.drum_id ?? "");
  const [editedBrand, setEditedBrand] = useState<number | string>(cable?.brand ?? "");
  const [editedType, setEditedType] = useState<number | string>(cable?.type ?? "");
  const [editedSize, setEditedSize] = useState<string>(cable?.size ?? "");
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [types, setTypes] = useState<TypeOption[]>([]);
  const [loadingBrandTypes, setLoadingBrandTypes] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [showSmallCableSelector, setShowSmallCableSelector] = useState(false);
  const [smallCables, setSmallCables] = useState<SmallCable[]>([]);
  const [loadingSmallCables, setLoadingSmallCables] = useState(false);
  const [selectedSmallCableId, setSelectedSmallCableId] = useState<string>("");
  const [isCopyingCert, setIsCopyingCert] = useState(false);

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
    if (cable) {
      setEditedCurrLength(cable.curr_length);
      setEditedInitialLength(cable.initial_length);
      setEditedDrumId(cable.drum_id);
      setEditedBrand(cable.brand);
      setEditedType(cable.type);
      setEditedSize(cable.size);
      setIsEditing(false);
      setIsEditingDetails(false);
    }
  }, [cable?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        setShowSmallCableSelector(false);
      };
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

  useEffect(() => {
    const loadBrandTypes = async () => {
      setLoadingBrandTypes(true);
      try {
        const [{ data: brandData, error: brandError }, { data: typeData, error: typeError }] = await Promise.all([
          supabase.from("brand").select("id, brand_name"),
          supabase.from("type").select("id, type_name"),
        ]);

        if (brandError) throw brandError;
        if (typeError) throw typeError;

        setBrands(brandData ?? []);
        setTypes(typeData ?? []);
      } catch (err) {
        console.error("Failed to load brands and types", err);
      } finally {
        setLoadingBrandTypes(false);
      }
    };

    loadBrandTypes();
  }, [supabase]);

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

  const handleUpload = async () => {
    if (!selectedCertFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("certificate", selectedCertFile, selectedCertFile.name);
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
      setSelectedCertFile(null); // Clear the selected file after upload
    } catch (err) {
      console.error("Upload failed", err);
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveCertificate = async () => {
    if (!cable) return;
    
    setIsRemovingCert(true);
    try {
      // Update database to remove certificate reference
      const { error } = await supabase
        .from("drum_cables")
        .update({ testcertificate: null })
        .eq("id", cable.id);

      if (error) throw error;

      // Update local state
      cable.testcertificate = null;
      router.refresh();
    } catch (err) {
      console.error("Failed to remove certificate", err);
      alert(err instanceof Error ? err.message : "Failed to remove certificate");
    } finally {
      setIsRemovingCert(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCert(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCert(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCert(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      // Validate file type
      if (file.type === "application/pdf" || file.type.startsWith("image/")) {
        setSelectedCertFile(file);
      } else {
        alert("Please upload a PDF or image file");
      }
    }
  };

  const handleSaveLengths = async () => {
    if (!cable) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("drum_cables")
        .update({ 
          curr_length: editedCurrLength, 
          initial_length: editedInitialLength 
        })
        .eq("id", cable.id);

      if (error) throw error;

      // Update local state
      cable.curr_length = editedCurrLength;
      cable.initial_length = editedInitialLength;
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      console.error("Failed to save lengths", err);
      alert(err instanceof Error ? err.message : "Failed to save lengths");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (cable) {
      setEditedCurrLength(cable.curr_length);
      setEditedInitialLength(cable.initial_length);
    }
    setIsEditing(false);
  };

  const handleSaveDetails = async () => {
    if (!cable) return;
    setIsSavingDetails(true);
    try {
      const { error } = await supabase
        .from("drum_cables")
        .update({
          drum_id: editedDrumId,
          brand: editedBrand,
          type: editedType,
          size: editedSize,
        })
        .eq("id", cable.id);

      if (error) throw error;

      // Update local state
      cable.drum_id = editedDrumId;
      cable.brand = editedBrand;
      cable.type = editedType;
      cable.size = editedSize;
      setIsEditingDetails(false);
      router.refresh();
    } catch (err) {
      console.error("Failed to save details", err);
      alert(err instanceof Error ? err.message : "Failed to save details");
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleCancelEditDetails = () => {
    if (cable) {
      setEditedDrumId(cable.drum_id);
      setEditedBrand(cable.brand);
      setEditedType(cable.type);
      setEditedSize(cable.size);
    }
    setIsEditingDetails(false);
  };

  const fetchSmallCablesWithSameCriteria = async () => {
    if (!cable) return;
    setLoadingSmallCables(true);
    try {
      const { data, error } = await supabase
        .from("drum_cables")
        .select("id, drum_id, brand, type, size, testcertificate")
        .eq("brand", cable.brand)
        .eq("type", cable.type)
        .eq("size", cable.size)
        .not("testcertificate", "is", null)
        .neq("id", cable.id);

      // Filter for unique certificates
      const uniqueData = Array.from(
        new Map(data?.map((item) => [item.testcertificate, item]) || []).values()
      );

      if (error) throw error;
      setSmallCables(uniqueData ?? []);
      setShowSmallCableSelector(true);
    } catch (err) {
      console.error("Failed to load small cables", err);
      alert(err instanceof Error ? err.message : "Failed to load cables");
    } finally {
      setLoadingSmallCables(false);
    }
  };

  const handleSaveCertificateFromSmallCable = async () => {
    if (!cable || !selectedSmallCableId) return;
    
    setIsCopyingCert(true);
    try {
      // Get the certificate from the selected small cable
      const selectedSmallCable = smallCables.find((c) => c.id.toString() === selectedSmallCableId);

      if (!selectedSmallCable?.testcertificate) {
        throw new Error("Selected cable has no certificate");
      }

      // Update current cable with the certificate URL
      const { error } = await supabase
        .from("drum_cables")
        .update({ testcertificate: selectedSmallCable.testcertificate })
        .eq("id", cable.id);

      if (error) throw error;

      // Update local state
      cable.testcertificate = selectedSmallCable.testcertificate;
      setShowSmallCableSelector(false);
      setSelectedSmallCableId("");
      setSmallCables([]);
      router.refresh();
    } catch (err) {
      console.error("Failed to copy certificate", err);
      alert(err instanceof Error ? err.message : "Failed to copy certificate");
    } finally {
      setIsCopyingCert(false);
    }
  };

  const handleCancelSmallCableSelector = () => {
    setShowSmallCableSelector(false);
    setSelectedSmallCableId("");
    setSmallCables([]);
  };

  const handleDeleteCable = async () => {
    if (!cable) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("drum_cables")
        .delete()
        .eq("id", cable.id);

      if (error) throw error;

      // Call onDelete callback to remove from client-side list
      onDelete?.(cable.id);
      
      setShowDeleteConfirm(false);
      onClose();
      router.refresh();
    } catch (err) {
      console.error("Failed to delete cable", err);
      alert(err instanceof Error ? err.message : "Failed to delete cable");
    } finally {
      setIsDeleting(false);
    }
  };


  return (
    <>
    <div className="fixed md:ml-64 inset-0 flex items-center justify-center z-[999]">
      <div className="absolute inset-0 bg-black/60" onClick={() => { onClose(); setShowSmallCableSelector(false);}} />

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
            <div className="flex gap-2">
              {user && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="text-red-500 hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/10 disabled:opacity-50"
                  title="Delete cable"
                >
                  {isDeleting ? "Deleting…" : "🗑️"}
                </button>
              )}
              <button
                onClick={() => { onClose(); setShowSmallCableSelector(false);}} 
                className="text-gray-300 px-2 py-1 rounded hover:bg-white/5"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <div className="bg-[#1a1f3a] p-4 rounded-lg border border-[#0047FF]/10">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">Remaining Length</div>
                {user && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-[#00C8FF] hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>
              <div className="flex items-baseline justify-between mt-2">
                {isEditing ? (
                  <div className="flex gap-2 items-baseline">
                    <input
                      type="number"
                      value={editedCurrLength}
                      onChange={(e) => setEditedCurrLength(parseFloat(e.target.value) || 0)}
                      className="bg-[#0b1220] text-3xl font-bold text-gray-100 border border-[#0047FF]/30 rounded px-2 py-1 w-32"
                    />
                    <span className="text-3xl font-bold text-gray-100">m</span>
                  </div>
                ) : (
                  <div className="text-3xl font-bold text-gray-100">
                    {cable.curr_length}m
                  </div>
                )}
              </div>
              <div className="w-full bg-[#0b1220] h-3 rounded-full mt-3">
                <div
                  className="h-3 rounded-full bg-emerald-500"
                  style={{ width: `${100 - (editedInitialLength > 0 ? Math.min(100, Math.round(((editedInitialLength - editedCurrLength) / editedInitialLength) * 100)) : 0)}%` }}
                />
              </div>
              <div className="flex justify-between">
                <div className="text-sm text-gray-400 mt-1">
                  {editedInitialLength > 0 ? Math.min(100, Math.round(((editedInitialLength - editedCurrLength) / editedInitialLength) * 100)) : 0}% used
                </div>
                {isEditing ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      value={editedInitialLength}
                      onChange={(e) => setEditedInitialLength(parseFloat(e.target.value) || 0)}
                      className="bg-[#0b1220] text-sm text-gray-400 border border-[#0047FF]/30 rounded px-2 py-1 w-20"
                    />
                    <span className="text-sm text-gray-400">m initial</span>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">
                    {cable.initial_length}m initial
                  </div>
                )}
              </div>
              {isEditing && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleSaveLengths}
                    disabled={isSaving}
                    className="flex-1 bg-[#0047FF] text-white px-3 py-2 rounded text-sm font-medium hover:bg-[#0047FF]/80 disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="flex-1 bg-[#0047FF]/20 text-gray-300 px-3 py-2 rounded text-sm font-medium hover:bg-[#0047FF]/30 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {isEditingDetails ? (
                <div className="space-y-3 bg-[#1a1f3a] p-4 rounded-lg border border-[#0047FF]/10">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-sm">
                      <label className="text-xs text-gray-400 block mb-1"># Drum No.</label>
                      <input
                        type="text"
                        value={editedDrumId}
                        onChange={(e) => setEditedDrumId(e.target.value)}
                        className="w-full bg-[#0b1220] text-gray-100 border border-[#0047FF]/30 rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="text-sm">
                      <label className="text-xs text-gray-400 block mb-1">Brand</label>
                      <select
                        value={editedBrand}
                        onChange={(e) => setEditedBrand(e.target.value ? (isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value)) : "")}
                        disabled={loadingBrandTypes}
                        className="w-full bg-[#0b1220] text-gray-100 border border-[#0047FF]/30 rounded px-2 py-1 text-sm disabled:opacity-50"
                      >
                        <option value="">Select brand</option>
                        {brands.map((brand) => (
                          <option key={brand.id} value={brand.id}>
                            {brand.brand_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-sm">
                      <label className="text-xs text-gray-400 block mb-1">Cable Type</label>
                      <select
                        value={editedType}
                        onChange={(e) => setEditedType(e.target.value ? (isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value)) : "")}
                        disabled={loadingBrandTypes}
                        className="w-full bg-[#0b1220] text-gray-100 border border-[#0047FF]/30 rounded px-2 py-1 text-sm disabled:opacity-50"
                      >
                        <option value="">Select type</option>
                        {types.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.type_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-sm">
                      <label className="text-xs text-gray-400 block mb-1">Size</label>
                      <input
                        type="text"
                        value={editedSize}
                        onChange={(e) => setEditedSize(e.target.value)}
                        className="w-full bg-[#0b1220] text-gray-100 border border-[#0047FF]/30 rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSaveDetails}
                      disabled={isSavingDetails}
                      className="flex-1 bg-[#0047FF] text-white px-3 py-2 rounded text-sm font-medium hover:bg-[#0047FF]/80 disabled:opacity-50"
                    >
                      {isSavingDetails ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={handleCancelEditDetails}
                      disabled={isSavingDetails}
                      className="flex-1 bg-[#0047FF]/20 text-gray-300 px-3 py-2 rounded text-sm font-medium hover:bg-[#0047FF]/30 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-200">Cable Details</h4>
                    {user && (
                      <button
                        onClick={() => setIsEditingDetails(true)}
                        className="text-xs text-[#00C8FF] hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </div>
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
                </>
              )}

              <div className="bg-[#1a1f3a] p-3 rounded-lg border border-[#0047FF]/10 text-sm">
                <div className="text-xs text-gray-400">Test Certificate</div>
                <div className="mt-2">
                  {showSmallCableSelector ? (
                    <div className="space-y-3">
                      {loadingSmallCables ? (
                        <div className="text-sm text-gray-400">Loading cables...</div>
                      ) : smallCables.length === 0 ? (
                        <div className="text-sm text-gray-500">
                          No cables found with the same brand, type, and size that have a certificate.
                        </div>
                      ) : (
                        <>
                          <select
                            value={selectedSmallCableId?.toString() ?? ""}
                            onChange={(e) => setSelectedSmallCableId(e.target.value)}
                            disabled={isCopyingCert}
                            className="w-full bg-[#0b1220] text-gray-100 border border-[#0047FF]/30 rounded px-2 py-2 text-sm disabled:opacity-50"
                          >
                            <option value="">Select a test certificate</option>
                            {smallCables.map((smallCable) => (
                              <option key={smallCable.id} value={smallCable.id.toString()}>
                                {smallCable.testcertificate?.split('/').pop()}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveCertificateFromSmallCable}
                              disabled={isCopyingCert || !selectedSmallCableId}
                              className="flex-1 bg-emerald-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {isCopyingCert ? "Copying..." : "Save"}
                            </button>
                            <button
                              onClick={handleCancelSmallCableSelector}
                              disabled={isCopyingCert}
                              className="flex-1 bg-[#0047FF]/20 text-gray-300 px-3 py-2 rounded text-sm font-medium hover:bg-[#0047FF]/30 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : cable.testcertificate && !selectedCertFile ? (
                    <div className="flex items-center justify-between gap-2">
                      <a
                        href={cable.testcertificate}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#00C8FF] underline flex-1"
                      >
                        View certificate
                      </a>
                      <button
                        onClick={handleRemoveCertificate}
                        disabled={isRemovingCert}
                        className="text-red-500 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-red-500/10 disabled:opacity-50"
                        title="Remove certificate"
                      >
                        {isRemovingCert ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  ) : !user ? (
                    <div className="text-sm text-gray-500">
                      No certificate available. Sign in to upload.
                    </div>
                  ) : selectedCertFile ? (
                    <div className="space-y-3">
                      <div className="bg-[#0b1220] p-3 rounded border border-[#0047FF]/20 flex items-center justify-between">
                        <div className="flex-1 truncate">
                          <div className="text-xs text-gray-500">Selected file:</div>
                          <div className="text-sm text-gray-200 font-medium truncate">
                            {selectedCertFile.name}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 ml-2">
                          {(selectedCertFile.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleUpload}
                          disabled={uploading}
                          className="flex-1 bg-emerald-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {uploading ? "Uploading..." : "Upload"}
                        </button>
                        <button
                          onClick={() => setSelectedCertFile(null)}
                          disabled={uploading}
                          className="flex-1 bg-[#0047FF]/20 text-gray-300 px-3 py-2 rounded text-sm font-medium hover:bg-[#0047FF]/30 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label
                        className={`block w-full cursor-pointer rounded border-dashed border-2 p-4 text-center transition-colors ${
                          isDraggingCert
                            ? "border-[#0047FF] bg-[#0047FF]/10 text-gray-300"
                            : "border-[#0047FF]/20 text-gray-400 hover:border-[#0047FF]/40"
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <input
                          type="file"
                          accept="application/pdf,image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSelectedCertFile(file);
                            }
                          }}
                        />
                        {isDraggingCert ? "Drop certificate here" : "+ Upload Certificate (PDF)"}
                      </label>
                      <button
                        onClick={fetchSmallCablesWithSameCriteria}
                        disabled={loadingSmallCables}
                        className="w-full bg-[#0047FF]/30 text-gray-300 px-3 py-2 rounded text-sm font-medium hover:bg-[#0047FF]/50 disabled:opacity-50 transition"
                      >
                        {loadingSmallCables ? "Loading..." : "Select Test Certificate"}
                      </button>
                    </div>
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

    {/* Delete Confirmation Modal */}
    {showDeleteConfirm && (
      <div className="fixed md:ml-64 inset-0 flex items-center justify-center z-[1000]">
        <div className="absolute inset-0 bg-black/80" onClick={() => !isDeleting && setShowDeleteConfirm(false)} />
        <div className="relative z-10 w-full max-w-sm mx-4 bg-[#0f1724] rounded-2xl border border-red-500/30 p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-gray-100 mb-2">Delete Cable</h2>
          <p className="text-gray-300 mb-6">
            Are you sure you want to delete cable <span className="font-semibold">{cable?.drum_id}</span>? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="px-4 py-2 bg-[#0047FF]/20 text-gray-300 rounded-lg font-medium hover:bg-[#0047FF]/30 disabled:opacity-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteCable}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
