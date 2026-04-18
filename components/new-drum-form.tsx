"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { CertificateDragDrop } from "@/components/CertificateDragDrop";

type CableType = {
  id: number;
  type_name: string;
};

type CableBrand = {
  id: number;
  brand_name: string;
};

export default function NewDrumForm() {
  const router = useRouter();
  const supabase = createClient();

  const [types, setTypes] = useState<CableType[]>([]);
  const [brands, setBrands] = useState<CableBrand[]>([]);
  const [drumSizes, setDrumSizes] = useState<
    { size: string; brand: number; type: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [drumId, setDrumId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [size, setSize] = useState("");
  const [currLength, setCurrLength] = useState("");
  const [initialLength, setInitialLength] = useState("");
  const [certificateFile, setCertificateFile] = useState<File | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadLookupData = async () => {
      if (!isMounted) return;
      setLoading(true);
      try {
        const [typesResult, brandsResult, sizesResult] = await Promise.all([
          supabase.from("type").select("*").order("type_name", { ascending: true }),
          supabase
            .from("brand")
            .select("*")
            .order("brand_name", { ascending: true }),
          supabase
            .from("drum_cables")
            .select("size,brand,type")
            .order("id", { ascending: true }),
        ]);

        if (typesResult.error || brandsResult.error || sizesResult.error) {
          throw typesResult.error || brandsResult.error || sizesResult.error;
        }

        if (isMounted) {
          setTypes(typesResult.data ?? []);
          setBrands(brandsResult.data ?? []);
          setDrumSizes(sizesResult.data ?? []);
        }
      } catch (err) {
        if (isMounted) {
          toast.error(
            err instanceof Error ? err.message : "Failed to load lookup data",
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadLookupData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Default brand/type filters to first lookup values when available
  useEffect(() => {
    if (!brandId && brands.length > 0) {
      setBrandId(String(brands[0].id));
    }

    if (!typeId && types.length > 0) {
      setTypeId(String(types[0].id));
    }
  }, [brands, types, brandId, typeId]);

  const availableSizes = useMemo(() => {
    const setS = new Set<string>();
    drumSizes.forEach((r) => {
      if (brandId && String(r.brand) !== String(brandId)) return;
      if (typeId && String(r.type) !== String(typeId)) return;
      if (r.size) setS.add(r.size);
    });
    return Array.from(setS).sort();
  }, [drumSizes, brandId, typeId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !typeId ||
      !brandId ||
      !size ||
      !currLength ||
      !initialLength
    ) {
      toast.error("Please complete all required fields.");
      return;
    }

    const currentLengthNumber = Number(currLength);
    const initialLengthNumber = Number(initialLength);

    if (
      Number.isNaN(currentLengthNumber) ||
      Number.isNaN(initialLengthNumber)
    ) {
      toast.error("Length fields must be valid numbers.");
      return;
    }

    setSaving(true);

    let certificateUrl: string | null = null;

    if (certificateFile) {
      const uploadData = new FormData();
      uploadData.append("certificate", certificateFile, certificateFile.name);

      const uploadResponse = await fetch("/api/upload-certificate", {
        method: "POST",
        body: uploadData,
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok || !uploadResult.url) {
        setSaving(false);
        toast.error(uploadResult.error || "Failed to upload certificate");
        return;
      }

      certificateUrl = uploadResult.url;
    }

    const { error: insertError } = await supabase.from("drum_cables").insert([
      {
        drum_id: drumId,
        type: Number(typeId),
        brand: Number(brandId),
        size,
        curr_length: currentLengthNumber,
        initial_length: initialLengthNumber,
        testcertificate: certificateUrl,
      },
    ]);

    setSaving(false);

    if (insertError) {
      toast.error(insertError.message);
      return;
    }

    toast.success("Drum added successfully.");
    setDrumId("");
    setCurrLength("");
    setInitialLength("");
    setCertificateFile(null);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold dark:text-white text-blue-500">Add New Drum</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 dark:bg-[#111827]/80 border dark:border-[#0047FF]/30 rounded-3xl p-8 shadow-lg dark:shadow-[#0047FF]/10"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <label className="space-y-2 text-sm dark:text-gray-300">
            Brand
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              disabled={loading}
              className="w-full rounded-md border border-input dark:bg-[#0b1220] px-3 py-2 text-base dark:text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {brands.map((brand) => (
                <option
                  key={brand.id}
                  value={String(brand.id)}
                  className="dark:bg-[#0b1220] dark:text-white"
                >
                  {brand.brand_name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm dark:text-gray-300">
            Type
            <select
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              disabled={loading}
              className="w-full rounded-md border border-input dark:bg-[#0b1220] px-3 py-2 text-base dark:text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {types.map((type) => (
                <option
                  key={type.id}
                  value={String(type.id)}
                  className="dark:bg-[#0b1220] dark:text-white"
                >
                  {type.type_name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm dark:text-gray-300">
            Size
            <Input
              list="size-suggestions"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="Choose existing or enter new size"
            />
            <datalist id="size-suggestions">
              {availableSizes.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            {availableSizes.length === 0 && (
              <div className="text-xs text-gray-400 mt-1">
                No existing sizes for selected brand/type — entering a new size will create it.
              </div>
            )}
          </label>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <label className="space-y-2 text-sm dark:text-gray-300 md:col-span-2">
            Drum ID
            <Input
              value={drumId}
              onChange={(e) => setDrumId(e.target.value)}
              placeholder="Enter drum ID"
            />
          </label>

          <label className="space-y-2 text-sm dark:text-gray-300">
            Initial Length
            <Input
              value={initialLength}
              onChange={(e) => setInitialLength(e.target.value)}
              type="number"
              placeholder="Initial length"
            />
          </label>
          
          <label className="space-y-2 text-sm dark:text-gray-300">
            Current Length
            <Input
              value={currLength}
              onChange={(e) => setCurrLength(e.target.value)}
              type="number"
              placeholder="Current length"
            />
          </label>

        </div>

        <CertificateDragDrop
          certificateFile={certificateFile}
          onFileChange={setCertificateFile}
        />


        <div className="flex items-center justify-between gap-4 pt-2">
          <Button type="submit" disabled={saving} className="w-full md:w-auto">
            {saving ? "Saving…" : "Add Drum"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/cables_view")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
